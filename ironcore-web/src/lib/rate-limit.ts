type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const curr = store.get(key);

  if (!curr || now > curr.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (curr.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: curr.resetAt - now };
  }

  curr.count += 1;
  store.set(key, curr);
  return { ok: true, remaining: Math.max(0, limit - curr.count) };
}
