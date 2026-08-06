export function log(level = "info", message = "", data) {
  try {
    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, source: "web", message, data }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}
