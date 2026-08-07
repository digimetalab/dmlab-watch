import { Router } from "express";
import { getDb, ensureUserDefault } from "../db.js";
import { hashPassword, verifyPassword, newToken, sessionAlive } from "../auth.js";
import { verifyGoogleCredential } from "../google.js";
import { requireAuth } from "../middleware.js";
import { log } from "../logger.js";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_AVATAR = 400_000; // ~390KB base64

function publicUser(row) {
  return {
    id: row.id,
    username: row.username || null,
    email: row.email || null,
    name: row.name || row.username || (row.email ? row.email.split("@")[0] : ""),
    role: row.role || "user",
    avatar_url: row.avatar_url || null,
    google: !!row.google_id,
  };
}

async function sessionUserFor(token) {
  const rs = await getDb().execute({
    sql: `SELECT s.token, s.created_at, u.id, u.username, u.email, u.name, u.role, u.avatar_url, u.google_id
          FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    args: [token],
  });
  const row = rs.rows[0];
  if (!row || !sessionAlive(row.created_at)) return null;
  return row;
}

// GET /api/auth/me
router.get("/me", async (req, res) => {
  try {
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return res.status(401).json({ error: "unauthorized" });
    const row = await sessionUserFor(token);
    if (!row) return res.status(401).json({ error: "unauthorized" });
    res.json({ user: publicUser(row) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function createSessionFor(res, userRow) {
  const token = newToken();
  await getDb().execute({
    sql: "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
    args: [token, userRow.id, Date.now()],
  });
  res.json({ token, user: publicUser(userRow) });
}

// POST /api/auth/register  { email, password, name? }
router.post("/register", async (req, res) => {
  try {
    const email = (req.body?.email ?? "").toString().trim().toLowerCase();
    const password = (req.body?.password ?? "").toString();
    const name = (req.body?.name ?? "").toString().trim();
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Email tidak valid" });
    if (password.length < 6) return res.status(400).json({ error: "Password minimal 6 karakter" });
    const info = await getDb().execute({
      sql: "INSERT INTO users (email, password_hash, name, role, created_at) VALUES (?, ?, ?, 'user', ?)",
      args: [email, hashPassword(password), name || email.split("@")[0], Date.now()],
    });
    const userId = Number(info.lastInsertRowid);
    await ensureUserDefault(userId);
    log("info", "auth", `registered ${email}`);
    const row = (
      await getDb().execute({ sql: "SELECT * FROM users WHERE id = ?", args: [userId] })
    ).rows[0];
    await createSessionFor(res, row);
  } catch (e) {
    if (String(e.message).includes("UNIQUE") || String(e.message).includes("email"))
      return res.status(409).json({ error: "Email sudah terdaftar" });
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/login  { identifier, password }  (identifier = email atau username)
router.post("/login", async (req, res) => {
  try {
    const identifier = (req.body?.identifier ?? req.body?.username ?? req.body?.email ?? "").toString().trim();
    const password = (req.body?.password ?? "").toString();
    if (!identifier || !password) return res.status(400).json({ error: "Email & password wajib" });
    const rs = await getDb().execute({
      sql: "SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)",
      args: [identifier, identifier],
    });
    const user = rs.rows[0];
    if (!user?.password_hash || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Email atau password salah" });
    }
    log("info", "auth", `login ${user.email || user.username}`);
    await createSessionFor(res, user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/google  { credential }
router.post("/google", async (req, res) => {
  try {
    const profile = await verifyGoogleCredential(req.body?.credential);
    if (!profile.email) return res.status(400).json({ error: "Akun Google tanpa email" });
    const rs = await getDb().execute({
      sql: "SELECT * FROM users WHERE google_id = ? OR LOWER(email) = ?",
      args: [profile.googleId, profile.email],
    });
    let user = rs.rows[0];
    if (user) {
      // Link google id / refresh identity if not yet connected.
      if (!user.google_id || !user.email) {
        await getDb().execute({
          sql: "UPDATE users SET google_id = ?, email = COALESCE(email, ?), name = COALESCE(NULLIF(name, ''), ?), avatar_url = COALESCE(avatar_url, ?) WHERE id = ?",
          args: [profile.googleId, profile.email, profile.name, profile.picture, user.id],
        });
        user = (
          await getDb().execute({ sql: "SELECT * FROM users WHERE id = ?", args: [user.id] })
        ).rows[0];
      }
    } else {
      const info = await getDb().execute({
        sql: "INSERT INTO users (email, google_id, name, avatar_url, role, created_at) VALUES (?, ?, ?, ?, 'user', ?)",
        args: [profile.email, profile.googleId, profile.name || profile.email.split("@")[0], profile.picture, Date.now()],
      });
      const userId = Number(info.lastInsertRowid);
      await ensureUserDefault(userId);
      user = (
        await getDb().execute({ sql: "SELECT * FROM users WHERE id = ?", args: [userId] })
      ).rows[0];
    }
    log("info", "auth", `google login ${profile.email}`);
    await createSessionFor(res, user);
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  try {
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
    if (token) {
      await getDb().execute({ sql: "DELETE FROM sessions WHERE token = ?", args: [token] });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/auth/profile  { name?, avatar? }
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const sets = [];
    const args = [];
    if (req.body?.name != null) {
      const name = req.body.name.toString().trim().slice(0, 80);
      sets.push("name = ?");
      args.push(name);
    }
    if (req.body?.avatar !== undefined) {
      const avatar = req.body.avatar == null ? "" : String(req.body.avatar);
      if (avatar && (!avatar.startsWith("data:image/") || avatar.length > MAX_AVATAR)) {
        return res.status(400).json({ error: "Foto tidak valid (maks ~300KB, format gambar)" });
      }
      sets.push("avatar_url = ?");
      args.push(avatar || null);
    }
    if (!sets.length) return res.status(400).json({ error: "tidak ada field" });
    args.push(req.userId);
    await getDb().execute({
      sql: `UPDATE users SET ${sets.join(", ")} WHERE id = ?`,
      args,
    });
    log("info", "auth", `profile updated`, { user: req.userId });
    const row = (
      await getDb().execute({ sql: "SELECT * FROM users WHERE id = ?", args: [req.userId] })
    ).rows[0];
    res.json({ user: publicUser(row) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/change-password  { current?, new }
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const current = (req.body?.current ?? "").toString();
    const next = (req.body?.new ?? "").toString();
    if (next.length < 6) return res.status(400).json({ error: "Password baru minimal 6 karakter" });
    const row = (
      await getDb().execute({ sql: "SELECT * FROM users WHERE id = ?", args: [req.userId] })
    ).rows[0];
    if (row.password_hash && !verifyPassword(current, row.password_hash)) {
      return res.status(401).json({ error: "Password saat ini salah" });
    }
    await getDb().execute({
      sql: "UPDATE users SET password_hash = ? WHERE id = ?",
      args: [hashPassword(next), req.userId],
    });
    log("info", "auth", `password changed`, { user: req.userId });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
