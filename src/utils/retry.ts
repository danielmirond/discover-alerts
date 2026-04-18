import { logger, getErrorMessage } from './logger.js';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULTS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10_000,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  options?: RetryOptions,
): Promise<T> {
  const opts = { ...DEFAULTS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === opts.maxAttempts) break;

      const delay = Math.min(opts.baseDelayMs * 2 ** (attempt - 1), opts.maxDelayMs);
      logger.warn(`[retry] ${label} attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${delay}ms`, {
        error: getErrorMessage(err),
      });
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}
