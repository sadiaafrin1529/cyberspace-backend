import { ApiKey, User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      /** Set only by the external-API key authentication middleware (never by JWT auth). */
      apiKey?: ApiKey;
      /** Normalised client IP seen by the external API. */
      apiClientIp?: string | null;
    }
  }
}
