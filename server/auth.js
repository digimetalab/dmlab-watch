import crypto from "node:crypto";

const SESSION_TTL_MS = 30 * 24 * 3600 * 1000; // 30 days

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const calc = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return calc.length === expected.length && crypto.timingSafeEqual(calc, expected);
}

export function newToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function sessionAlive(createdAt) {
  return !createdAt || Date.now() - Number(createdAt) < SESSION_TTL_MS;
}
