import prisma from '../../utils/prisma';
import config from '../../config';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Prunes old request logs and expired idempotency records. Safe to run repeatedly. */
export const pruneApiData = async () => {
  const logCutoff = new Date(Date.now() - config.api_log_retention_days * DAY_MS);
  const idemCutoff = new Date(Date.now() - DAY_MS);
  await Promise.all([
    prisma.apiRequestLog.deleteMany({ where: { createdAt: { lt: logCutoff } } }),
    prisma.apiIdempotencyKey.deleteMany({ where: { createdAt: { lt: idemCutoff } } }),
  ]);
};

export const startApiMaintenance = () => {
  const run = () => pruneApiData().catch((e: unknown) => console.error('API maintenance failed:', e instanceof Error ? e.message : e));
  setTimeout(run, 30_000).unref();
  setInterval(run, 6 * 60 * 60 * 1000).unref();
};
