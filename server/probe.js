const CACHE_TTL = 60_000;
const TIMEOUT = 8_000;
const BATCH_CONCURRENCY = 16;
const cache = new Map();

async function fetchOnce(url, useRange) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: ctrl.signal,
      ...(useRange ? { headers: { Range: "bytes=0-1000" } } : {}),
    });
    return res.ok;
  } finally {
    clearTimeout(timer);
  }
}

export async function probeStream(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.status;

  let status = "offline";
  try {
    status = (await fetchOnce(url, true)) ? "online" : "offline";
  } catch {
    // Retry once without Range header (mirrors atcs.denpasarkota.go.id behavior)
    try {
      status = (await fetchOnce(url, false)) ? "online" : "offline";
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

export async function probeMany(urls) {
  const now = Date.now();
  const fresh = (u) => {
    const hit = cache.get(u);
    return hit && now - hit.ts < CACHE_TTL ? hit.status : null;
  };

  const results = new Map(urls.map((u) => [u, fresh(u)]));
  const pending = urls.filter((u) => results.get(u) === null);

  let i = 0;
  async function worker() {
    while (i < pending.length) {
      const url = pending[i++];
      results.set(url, await probeStream(url));
    }
  }
  const workers = Array.from(
    { length: Math.min(BATCH_CONCURRENCY, pending.length) },
    () => worker()
  );
  await Promise.all(workers);

  return urls.map((u) => ({ url: u, status: results.get(u) }));
}
