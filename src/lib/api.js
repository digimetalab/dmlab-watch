const TOKEN_KEY = "dml_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function api(path, opts) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { headers, ...opts });
  if (res.status === 401 && !path.includes("/auth/")) {
    setToken(null);
  }
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

export function login(identifier, password) {
  return api("/api/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) });
}

export function register(email, password, name) {
  return api("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) });
}

export function loginGoogle(credential) {
  return api("/api/auth/google", { method: "POST", body: JSON.stringify({ credential }) });
}

export function getMe() {
  return api("/api/auth/me");
}

export function logout() {
  return api("/api/auth/logout", { method: "POST" }).catch(() => ({}));
}

export function updateProfile(patch) {
  return api("/api/auth/profile", { method: "PUT", body: JSON.stringify(patch) });
}

export function changePassword(current, next) {
  return api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ current, new: next }) });
}

export function getUsers() {
  return api("/api/users");
}

export function setUserRole(id, role) {
  return api(`/api/users/${id}`, { method: "PUT", body: JSON.stringify({ role }) });
}

export function resetUserPassword(id, password) {
  return api(`/api/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ password }) });
}

export function deleteUser(id) {
  return api(`/api/users/${id}`, { method: "DELETE" });
}
