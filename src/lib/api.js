async function api(path, opts) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const j = await res.json();
      msg = j.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export function getCameras(q) {
  return api(`/api/cameras${q ? `?q=${encodeURIComponent(q)}` : ""}`);
}

export function getHealth() {
  return api("/api/health");
}

export function getLayouts() {
  return api("/api/layouts");
}

export function createLayout(name, cells) {
  return api("/api/layouts", { method: "POST", body: JSON.stringify({ name, cells }) });
}

export function updateLayout(id, patch) {
  return api(`/api/layouts/${id}`, { method: "PUT", body: JSON.stringify(patch) });
}

export function deleteLayout(id) {
  return api(`/api/layouts/${id}`, { method: "DELETE" });
}

export function scrapeNow() {
  return api("/api/scrape", { method: "POST" });
}

export function probeStream(url) {
  return api(`/api/probe?url=${encodeURIComponent(url)}`);
}

export function probeStreams(urls) {
  return api("/api/probe", { method: "POST", body: JSON.stringify({ urls }) });
}
