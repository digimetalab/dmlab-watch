import { Router } from "express";
import { getDb } from "../db.js";
import { log } from "../logger.js";

const router = Router();

function parseCells(cells) {
  const arr = JSON.parse(cells ?? "[]");
  return Array.isArray(arr) ? arr.slice(0, 9).map(Number).filter(Number.isInteger) : [];
}

function toLayout(row) {
  return {
    id: row.id,
    name: row.name,
    cells: parseCells(row.cells),
    is_default: !!row.is_default,
  };
}

// GET /api/layouts
router.get("/", (req, res) => {
  const rows = getDb().prepare("SELECT * FROM layouts ORDER BY is_default DESC, name").all();
  res.json({ data: rows.map(toLayout) });
});

// POST /api/layouts  { name, cells? }
router.post("/", (req, res) => {
  const name = (req.body?.name ?? "").toString().trim();
  if (!name) return res.status(400).json({ error: "name required" });
  const cells = req.body?.cells ?? [];
  if (!Array.isArray(cells) || cells.length !== 9) {
    return res.status(400).json({ error: "cells must be an array of 9 ids" });
  }
  try {
    const info = getDb()
      .prepare("INSERT INTO layouts (name, cells, created_at) VALUES (?, ?, ?)")
      .run(name, JSON.stringify(cells.map(Number)), Date.now());
    const row = getDb().prepare("SELECT * FROM layouts WHERE id = ?").get(info.lastInsertRowid);
    log("info", "layout", `created layout "${name}"`, { id: info.lastInsertRowid });
    res.status(201).json(toLayout(row));
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) return res.status(409).json({ error: "name exists" });
    throw e;
  }
});

// PUT /api/layouts/:id  { name?, cells? }
router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const row = getDb().prepare("SELECT * FROM layouts WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "not found" });
  const name = req.body?.name != null ? req.body.name.toString().trim() : row.name;
  const cells = req.body?.cells != null ? JSON.stringify(req.body.cells.map(Number)) : row.cells;
  try {
    getDb().prepare("UPDATE layouts SET name = ?, cells = ? WHERE id = ?").run(name, cells, id);
    const updated = getDb().prepare("SELECT * FROM layouts WHERE id = ?").get(id);
    log("info", "layout", `updated layout #${id}`, { name: updated.name, cells: JSON.parse(updated.cells) });
    res.json(toLayout(updated));
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) return res.status(409).json({ error: "name exists" });
    throw e;
  }
});

// DELETE /api/layouts/:id
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const row = getDb().prepare("SELECT * FROM layouts WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "not found" });
  getDb().prepare("DELETE FROM layouts WHERE id = ?").run(id);
  log("info", "layout", `deleted layout #${id}`, { name: row.name });
  res.json({ ok: true });
});

export default router;
