const CACHE_TTL = 60_000;
const TIMEOUT = 8_000;
const cache = new Map();

export async function probeStream(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.status;

  let status = "offline";
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-1000" },
      cache: "no-store",
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    status = res.ok ? "online" : "offline";
  } catch {
    // Retry once without Range header (mirrors atcs.denpasarkota.go.id behavior)
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
      await fetch(url, { method: "GET", cache: "no-store", signal: ctrl.signal });
      clearTimeout(timer);
      status = "online";
    } catch {
      status = "offline";
    }
  }

  cache.set(url, { status, ts: Date.now() });
  if (cache.size > 500) {
    const now = Date.now();
    for (const [k, v] of cache) if (now - v.ts > CACHE_TTL) cache.delete(k);
  }
  return status;
}
