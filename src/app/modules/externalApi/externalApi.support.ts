import AppError from '../../errors/AppError';

/** AppError plus a stable machine-readable code that API clients can switch on. */
export class ApiError extends AppError {
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(statusCode, message);
    this.code = code;
  }
}

/** Fixed-window counter. In-memory: correct for a single instance; use a shared store if you scale out. */
export class FixedWindowLimiter {
  private hits = new Map<string, { count: number; reset: number }>();

  private readonly max: number;
  private readonly windowMs: number;

  constructor(max: number, windowMs: number) {
    this.max = max;
    this.windowMs = windowMs;
  }

  /** Registers one hit and reports the window state. */
  hit(key: string) {
    const now = Date.now();
    let entry = this.hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + this.windowMs };
      this.hits.set(key, entry);
      if (this.hits.size > 10000) this.sweep(now);
    }
    entry.count += 1;
    return this.state(entry, now);
  }

  /** Reads the window state without counting. */
  peek(key: string) {
    const now = Date.now();
    const entry = this.hits.get(key);
    if (!entry || entry.reset <= now) return { allowed: true, limit: this.max, remaining: this.max, resetAt: now + this.windowMs, retryAfterSec: 0 };
    return this.state(entry, now);
  }

  private state(entry: { count: number; reset: number }, now: number) {
    return {
      allowed: entry.count <= this.max,
      limit: this.max,
      remaining: Math.max(0, this.max - entry.count),
      resetAt: entry.reset,
      retryAfterSec: Math.max(1, Math.ceil((entry.reset - now) / 1000)),
    };
  }

  private sweep(now: number) {
    for (const [k, v] of this.hits) if (v.reset <= now) this.hits.delete(k);
  }
}

export const truncate = (value: string | undefined | null, max: number): string | null =>
  value ? (value.length > max ? value.slice(0, max) : value) : null;
