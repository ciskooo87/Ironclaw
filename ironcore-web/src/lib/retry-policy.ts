export const RETRY_ATTEMPTS = 3;
export const RETRY_BACKOFF_MS = [400, 900, 1600];

export async function withRetry<T>(fn: () => Promise<T>, attempts = RETRY_ATTEMPTS) {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const wait = RETRY_BACKOFF_MS[i] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1];
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastError;
}
