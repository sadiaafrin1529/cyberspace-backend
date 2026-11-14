import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import AppError from '../errors/AppError';

/** Minimal in-memory per-IP limiter (single instance). */
const rateLimit = (max: number, windowMs: number) => {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req: Request, _res: Response, next: NextFunction) => {
    const now = Date.now();
    // Behind the Next.js proxy every request shares one socket IP; use the forwarded client IP.
    const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const key = fwd || req.ip || 'unknown';
    const entry = hits.get(key);
    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      return next(new AppError(httpStatus.TOO_MANY_REQUESTS, 'Too many requests. Try again later.'));
    }
    next();
  };
};

export default rateLimit;
