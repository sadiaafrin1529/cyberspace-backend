import { ApiKey, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import config from '../../config';
import { API_PERMISSIONS } from './apiKey.permissions';
import { apiKeyStatus, decryptSecret, encryptSecret, generateApiKey } from './apiKey.utils';
import type { CreateApiKeyInput, LogsQuery, UpdateApiKeyInput } from './apiKey.validation';

export const MAX_REQUEST_BYTES = 256 * 1024;
const MAX_ACTIVE_KEYS = 50;
const CREATED_BY = { select: { id: true, name: true, email: true } } as const;

type KeyWithOwner = ApiKey & { createdBy?: { id: number; name: string | null; email: string } | null };

/** Never expose keyHash. Adds the derived status. */
const toPublic = (k: KeyWithOwner) => ({
  id: k.id,
  name: k.name,
  prefix: k.prefix,
  canCopy: !!k.secretEnc && !k.revokedAt,
  permissions: k.permissions,
  allowedIps: k.allowedIps,
  status: apiKeyStatus(k),
  expiresAt: k.expiresAt,
  revokedAt: k.revokedAt,
  lastUsedAt: k.lastUsedAt,
  lastUsedIp: k.lastUsedIp,
  createdAt: k.createdAt,
  createdBy: k.createdBy ?? null,
});

const publicBaseUrl = (requestOrigin: string) =>
  `${(config.api_public_url ?? requestOrigin).replace(/\/+$/, '')}/api/v1`;

const GetMeta = (requestOrigin: string) => ({
  permissions: API_PERMISSIONS,
  baseUrl: publicBaseUrl(requestOrigin),
  rateLimitPerMinute: config.api_rate_limit_per_minute,
  logRetentionDays: config.api_log_retention_days,
  maxRequestBytes: MAX_REQUEST_BYTES,
});

const ListKeys = async () => {
  const keys = await prisma.apiKey.findMany({ orderBy: { createdAt: 'desc' }, include: { createdBy: CREATED_BY } });
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const counts = await prisma.apiRequestLog.groupBy({
    by: ['apiKeyId'],
    where: { createdAt: { gte: since }, apiKeyId: { not: null } },
    _count: { _all: true },
  });
  const byKey = new Map(counts.map((c) => [c.apiKeyId, c._count._all]));
  return keys.map((k) => ({ ...toPublic(k), requests24h: byKey.get(k.id) ?? 0 }));
};

const CreateKey = async (data: CreateApiKeyInput, userId: number) => {
  const active = await prisma.apiKey.count({ where: { revokedAt: null } });
  if (active >= MAX_ACTIVE_KEYS) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Limit of ${MAX_ACTIVE_KEYS} active API keys reached. Revoke unused keys first.`,
    );
  }
  const { plain, prefix, hash } = generateApiKey();
  const key = await prisma.apiKey.create({
    data: {
      name: data.name,
      prefix,
      keyHash: hash,
      secretEnc: encryptSecret(plain),
      permissions: data.permissions,
      allowedIps: data.allowedIps,
      expiresAt: data.expiresAt ?? null,
      createdById: userId,
    },
    include: { createdBy: CREATED_BY },
  });
  return { ...toPublic(key), secret: plain };
};

/** Returns the full key again (only for keys that have an encrypted copy and are not revoked). */
const RevealKey = async (id: number) => {
  const key = await getOrThrow(id);
  if (key.revokedAt) throw new AppError(httpStatus.CONFLICT, 'A revoked API key cannot be copied');
  const secret = key.secretEnc ? decryptSecret(key.secretEnc) : null;
  if (!secret) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'This key was created before copying was supported (or the encryption secret changed). Generate a new key.',
    );
  }
  return { id: key.id, secret };
};

const getOrThrow = async (id: number) => {
  const key = await prisma.apiKey.findUnique({ where: { id } });
  if (!key) throw new AppError(httpStatus.NOT_FOUND, 'API key not found');
  return key;
};

const UpdateKey = async (id: number, data: UpdateApiKeyInput) => {
  const existing = await getOrThrow(id);
  if (existing.revokedAt) throw new AppError(httpStatus.CONFLICT, 'A revoked API key cannot be modified');
  const key = await prisma.apiKey.update({ where: { id }, data, include: { createdBy: CREATED_BY } });
  return toPublic(key);
};

/** Idempotent: revoking an already-revoked key keeps its original revocation time. */
const RevokeKey = async (id: number) => {
  const existing = await getOrThrow(id);
  const key = existing.revokedAt
    ? existing
    : await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  return toPublic(key);
};

const ListLogs = async (q: LogsQuery) => {
  const where: Prisma.ApiRequestLogWhereInput = {
    apiKeyId: q.apiKeyId,
    method: q.method,
    ...(q.outcome === 'success'
      ? { statusCode: { lt: 400 } }
      : q.outcome === 'failure'
        ? { statusCode: { gte: 400 } }
        : {}),
  };
  const [items, total] = await Promise.all([
    prisma.apiRequestLog.findMany({
      where,
      orderBy: { id: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: { apiKey: { select: { name: true, prefix: true } } },
    }),
    prisma.apiRequestLog.count({ where }),
  ]);
  return {
    items: items.map((l) => ({
      id: l.id,
      apiKeyId: l.apiKeyId,
      keyName: l.apiKey?.name ?? null,
      keyPrefix: l.apiKey?.prefix ?? null,
      method: l.method,
      path: l.path,
      statusCode: l.statusCode,
      success: l.statusCode < 400,
      durationMs: l.durationMs,
      ip: l.ip,
      userAgent: l.userAgent,
      errorCode: l.errorCode,
      errorMessage: l.errorMessage,
      createdAt: l.createdAt,
    })),
    meta: { page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)) },
  };
};

const GetOverview = async () => {
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [keys, requests, errors, avg] = await Promise.all([
    prisma.apiKey.findMany({ select: { revokedAt: true, expiresAt: true } }),
    prisma.apiRequestLog.count({ where: { createdAt: { gte: since } } }),
    prisma.apiRequestLog.count({ where: { createdAt: { gte: since }, statusCode: { gte: 400 } } }),
    prisma.apiRequestLog.aggregate({ where: { createdAt: { gte: since } }, _avg: { durationMs: true } }),
  ]);
  const statuses = keys.map((k) => apiKeyStatus(k, now));
  return {
    keys: {
      total: keys.length,
      active: statuses.filter((s) => s === 'ACTIVE').length,
      revoked: statuses.filter((s) => s === 'REVOKED').length,
      expired: statuses.filter((s) => s === 'EXPIRED').length,
    },
    last24h: { requests, errors, avgDurationMs: Math.round(avg._avg.durationMs ?? 0) },
  };
};

export const ApiKeyService = { GetMeta, ListKeys, CreateKey, RevealKey, UpdateKey, RevokeKey, ListLogs, GetOverview };
