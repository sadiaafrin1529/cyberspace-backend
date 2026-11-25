import crypto from 'crypto';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import config from '../../config';
import { API_KEY_PATTERN, apiKeyStatus, hashApiKey, isIpAllowed, normalizeIp, safeEqualHex } from '../apiKey/apiKey.utils';
import type { ApiPermission } from '../apiKey/apiKey.permissions';
import { ApiError, FixedWindowLimiter, truncate } from './externalApi.support';

const ipLimiter = new FixedWindowLimiter(600, 60_000); // every request, per client IP
const authFailLimiter = new FixedWindowLimiter(20, 60_000); // failed authentications, per client IP
const keyLimiter = new FixedWindowLimiter(config.api_rate_limit_per_minute, 60_000); // per API key

const LAST_USED_WRITE_INTERVAL_MS = 60_000;
const lastUsedWrites = new Map<number, number>();

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

const setRateHeaders = (res: Response, s: ReturnType<FixedWindowLimiter['hit']>) => {
  res.setHeader('X-RateLimit-Limit', String(s.limit));
  res.setHeader('X-RateLimit-Remaining', String(s.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(s.resetAt / 1000)));
};

const tooMany = (res: Response, s: ReturnType<FixedWindowLimiter['hit']>) => {
  res.setHeader('Retry-After', String(s.retryAfterSec));
  res.locals.skipLog = true; // rejected floods must not be able to fill the log table
  return new ApiError(httpStatus.TOO_MANY_REQUESTS, 'RATE_LIMITED', 'Too many requests. Slow down and retry later.');
};

/** Always first: records one row per request once the response is sent. Never stores bodies, query strings or headers. */
export const requestLogger: RequestHandler = (req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    if (res.locals.skipLog) return;
    const failure = res.locals.apiError as { code: string; message: string } | undefined;
    prisma.apiRequestLog
      .create({
        data: {
          apiKeyId: req.apiKey?.id ?? null,
          method: req.method,
          path: truncate(req.originalUrl.split('?')[0], 200) ?? '',
          statusCode: res.statusCode,
          durationMs: Date.now() - started,
          ip: req.apiClientIp ?? null,
          userAgent: truncate(req.get('user-agent'), 200),
          errorCode: failure?.code ?? null,
          errorMessage: truncate(failure?.message, 300),
        },
      })
      .catch((e: unknown) => console.error('API log write failed:', e instanceof Error ? e.message : e));
  });
  next();
};

export const preAuthRateLimit: RequestHandler = (req, res, next) => {
  req.apiClientIp = normalizeIp(req.ip);
  const ip = req.apiClientIp ?? 'unknown';
  const s = ipLimiter.hit(ip);
  if (!s.allowed) return next(tooMany(res, s));
  const f = authFailLimiter.peek(ip);
  if (!f.allowed) return next(tooMany(res, f));
  next();
};

const extractKey = (req: Request): string | null => {
  const header = req.get('x-api-key');
  if (header) return header.trim();
  const auth = req.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    // Only treat it as an API key when it looks like one; website JWTs are never accepted here.
    if (token.startsWith('cs_')) return token;
  }
  return null;
};

/** Authenticates `X-API-Key: <key>` (or `Authorization: Bearer <key>`). Does not touch website JWT auth. */
export const authenticateApiKey: RequestHandler = async (req, res, next) => {
  try {
    const ip = req.apiClientIp ?? 'unknown';
    const fail = (status: number, code: string, message: string) => {
      authFailLimiter.hit(ip);
      return new ApiError(status, code, message);
    };

    const presented = extractKey(req);
    if (!presented) {
      return next(fail(httpStatus.UNAUTHORIZED, 'MISSING_API_KEY', 'Missing API key. Send it in the X-API-Key header.'));
    }
    if (!API_KEY_PATTERN.test(presented)) {
      return next(fail(httpStatus.UNAUTHORIZED, 'INVALID_API_KEY', 'Invalid API key.'));
    }

    const hash = hashApiKey(presented);
    const key = await prisma.apiKey.findUnique({
      where: { keyHash: hash },
      include: { createdBy: { select: { role: true, isActive: true } } },
    });
    if (!key || !safeEqualHex(key.keyHash, hash)) {
      return next(fail(httpStatus.UNAUTHORIZED, 'INVALID_API_KEY', 'Invalid API key.'));
    }

    req.apiKey = key; // attached early so even rejected requests are attributed in the log
    const status = apiKeyStatus(key);
    if (status === 'REVOKED') return next(fail(httpStatus.UNAUTHORIZED, 'API_KEY_REVOKED', 'This API key has been revoked.'));
    if (status === 'EXPIRED') return next(fail(httpStatus.UNAUTHORIZED, 'API_KEY_EXPIRED', 'This API key has expired.'));
    // A key is only as trustworthy as the admin who issued it.
    if (key.createdBy && (!key.createdBy.isActive || key.createdBy.role !== 'ADMIN')) {
      return next(fail(httpStatus.UNAUTHORIZED, 'API_KEY_OWNER_INACTIVE', 'The administrator who issued this key is no longer active.'));
    }
    if (!isIpAllowed(req.apiClientIp ?? null, key.allowedIps)) {
      return next(new ApiError(httpStatus.FORBIDDEN, 'IP_NOT_ALLOWED', 'Requests from this IP address are not allowed for this API key.'));
    }

    const s = keyLimiter.hit(String(key.id));
    setRateHeaders(res, s);
    if (!s.allowed) return next(tooMany(res, s));

    const now = Date.now();
    if (now - (lastUsedWrites.get(key.id) ?? 0) >= LAST_USED_WRITE_INTERVAL_MS) {
      lastUsedWrites.set(key.id, now);
      prisma.apiKey
        .update({ where: { id: key.id }, data: { lastUsedAt: new Date(now), lastUsedIp: req.apiClientIp ?? null } })
        .catch(() => lastUsedWrites.delete(key.id));
    }
    next();
  } catch (e) {
    next(e);
  }
};

/** Least privilege: a key may only do what its permission list explicitly contains. */
export const requirePermission =
  (permission: ApiPermission): RequestHandler =>
  (req, _res, next) => {
    if (!req.apiKey?.permissions.includes(permission)) {
      return next(
        new ApiError(httpStatus.FORBIDDEN, 'INSUFFICIENT_PERMISSIONS', `This API key lacks the "${permission}" permission.`),
      );
    }
    next();
  };

/**
 * Optional `Idempotency-Key` header for POST: the first successful response is stored for 24h and
 * replayed for a retry with the same key and identical request. Same key + different request => 422.
 */
export const idempotency: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.get('idempotency-key');
    if (!raw || req.method !== 'POST' || !req.apiKey) return next();
    if (!IDEMPOTENCY_KEY_PATTERN.test(raw)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key must be 1-128 characters: letters, digits, "_", ".", ":" or "-".');
    }
    const apiKeyId = req.apiKey.id;
    const requestHash = crypto
      .createHash('sha256')
      .update(`${req.method} ${req.originalUrl.split('?')[0]}\n${JSON.stringify(req.body ?? null)}`)
      .digest('hex');

    const existing = await prisma.apiIdempotencyKey.findUnique({ where: { apiKeyId_key: { apiKeyId, key: raw } } });
    if (existing && Date.now() - existing.createdAt.getTime() < IDEMPOTENCY_TTL_MS) {
      if (existing.requestHash !== requestHash) {
        throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'IDEMPOTENCY_KEY_REUSED', 'This Idempotency-Key was already used with a different request.');
      }
      res.setHeader('Idempotent-Replayed', 'true');
      res.status(existing.statusCode).json(existing.response);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const data = { apiKeyId, key: raw, requestHash, statusCode: res.statusCode, response: (body ?? null) as Prisma.InputJsonValue };
        // Replace an expired record with the same key; otherwise insert. Reply only after it is stored.
        prisma.apiIdempotencyKey
          .upsert({ where: { apiKeyId_key: { apiKeyId, key: raw } }, create: data, update: { ...data, createdAt: new Date() } })
          .catch((e: unknown) => console.error('Idempotency store failed:', e instanceof Error ? e.message : e))
          .finally(() => originalJson(body));
        return res;
      }
      return originalJson(body);
    };
    next();
  } catch (e) {
    next(e);
  }
};
