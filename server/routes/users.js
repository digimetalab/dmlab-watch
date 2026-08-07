import { Router } from "express";
import { getDb } from "../db.js";
import { hashPassword } from "../auth.js";
import { requireAuth, requireAdmin } from "../middleware.js";
import { log } from "../logger.js";

const router = Router();

router.use(requireAuth, requireAdmin);

async function countAdmins() {
  const rs = await getDb().execute("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'");
  return Number(rs.rows[0].c);
}

function toUser(row) {
  return {
    id: row.id,
    username: row.username || null,
    email: row.email || null,
    name: row.name || row.username || (row.email ? row.email.split("@")[0] : ""),
    role: row.role || "user",
    google: !!row.google_id,
    hasPassword: !!row.password_hash,
    created_at: row.created_at,
  };
}

// GET /api/users
router.get("/", async (req, res) => {
  try {
    const rs = await getDb().execute("SELECT * FROM users ORDER BY role DESC, id ASC");
    res.json({ data: rs.rows.map(toUser) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function findUser(id) {
  return (
    await getDb().execute({ sql: "SELECT * FROM users WHERE id = ?", args: [id] })
  ).rows[0];
}

// PUT /api/users/:id  { role }
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await findUser(id);
    if (!user) return res.status(404).json({ error: "not found" });
    const role = req.body?.role;
    if (!["admin", "user"].includes(role)) return res.status(400).json({ error: "role tidak valid" });
    if (id === req.userId && role !== "admin") {
      return res.status(400).json({ error: "Tidak bisa menurunkan role sendiri" });
    }
    if (user.role === "admin" && role !== "admin" && (await countAdmins()) <= 1) {
      return res.status(400).json({ error: "Harus ada minimal satu admin" });
    }
    await getDb().execute({
      sql: "UPDATE users SET role = ? WHERE id = ?",
      args: [role, id],
    });
    log("info", "users", `role changed`, { target: id, role, by: req.userId });
    const updated = await findUser(id);
    res.json({ data: toUser(updated) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/users/:id/reset-password  { password }
router.post("/:id/reset-password", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await findUser(id);
    if (!user) return res.status(404).json({ error: "not found" });
    const password = (req.body?.password ?? "").toString();
    if (password.length < 6) return res.status(400).json({ error: "Password minimal 6 karakter" });
    await getDb().execute({
      sql: "UPDATE users SET password_hash = ? WHERE id = ?",
      args: [hashPassword(password), id],
    });
    log("info", "users", `password reset`, { target: id, by: req.userId });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/users/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await findUser(id);
    if (!user) return res.status(404).json({ error: "not found" });
    if (id === req.userId) return res.status(400).json({ error: "Tidak bisa menghapus akun sendiri" });
    if (user.role === "admin" && (await countAdmins()) <= 1) {
      return res.status(400).json({ error: "Harus ada minimal satu admin" });
    }
    await getDb().execute({ sql: "DELETE FROM sessions WHERE user_id = ?", args: [id] });
    await getDb().execute({ sql: "DELETE FROM layouts WHERE user_id = ?", args: [id] });
    await getDb().execute({ sql: "DELETE FROM users WHERE id = ?", args: [id] });
    log("info", "users", `deleted user`, { target: id, by: req.userId });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
