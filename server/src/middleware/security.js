import { HttpError } from './errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Rejects state-changing requests that a browser sends from another site.
 * Browsers always attach Origin to cross-site POST/DELETE requests; tools like curl send none.
 * Combined with SameSite=Lax session cookies, this blocks cross-site request forgery.
 */
export function sameOriginWrites(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return next(new HttpError(403, 'This request came from an unrecognized origin.'));
  }
  if (originHost !== req.get('host')) {
    return next(new HttpError(403, 'Requests from other sites are not allowed.'));
  }
  return next();
}

/** In-memory limiter for failed sign-in attempts, keyed by client address. */
export function createLoginLimiter({ maxFailures = 10, windowMs = 10 * 60 * 1000 } = {}) {
  const failures = new Map();

  function entryFor(key) {
    const now = Date.now();
    const entry = failures.get(key);
    if (!entry || entry.resetAt <= now) {
      const fresh = { count: 0, resetAt: now + windowMs };
      failures.set(key, fresh);
      return fresh;
    }
    return entry;
  }

  return {
    check(req) {
      if (entryFor(req.ip).count >= maxFailures) {
        throw new HttpError(429, 'Too many sign-in attempts. Wait a few minutes and try again.');
      }
    },
    fail(req) {
      entryFor(req.ip).count += 1;
    },
    succeed(req) {
      failures.delete(req.ip);
    },
  };
}
