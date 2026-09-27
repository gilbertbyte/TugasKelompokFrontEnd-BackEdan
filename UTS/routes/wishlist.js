const express = require("express");
const db = require("../db");

const router = express.Router();

function requireUserAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: "Kamu harus login dulu." });
}

router.use(requireUserAuth);

router.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT item_type, item_id FROM wishlist_items WHERE user_id = ?")
    .all(req.session.userId);

  const menuIds = rows.filter((r) => r.item_type === "menu").map((r) => r.item_id);
  const storeIds = rows.filter((r) => r.item_type === "store").map((r) => r.item_id);

  const menu = menuIds.length
    ? db
        .prepare(
          `SELECT menu_items.*, stores.nama AS store_nama
           FROM menu_items LEFT JOIN stores ON stores.id = menu_items.store_id
           WHERE menu_items.id IN (${menuIds.map(() => "?").join(",")})`
        )
        .all(...menuIds)
    : [];

  const stores = storeIds.length
    ? db
        .prepare(
          `SELECT * FROM stores WHERE id IN (${storeIds.map(() => "?").join(",")})`
        )
        .all(...storeIds)
    : [];

  res.json({ menu, stores });
});

router.get("/ids", (req, res) => {
  const rows = db
    .prepare("SELECT item_type, item_id FROM wishlist_items WHERE user_id = ?")
    .all(req.session.userId);
  res.json(rows);
});

router.post("/", (req, res) => {
  const { item_type, item_id } = req.body || {};
  if (!["menu", "store"].includes(item_type) || !item_id) {
    return res.status(400).json({ error: "item_type dan item_id wajib diisi." });
  }

  try {
    db.prepare(
      "INSERT INTO wishlist_items (user_id, item_type, item_id) VALUES (?, ?, ?)"
    ).run(req.session.userId, item_type, item_id);
  } catch (err) {
    // Sudah ada di wishlist — anggap saja berhasil.
  }

  res.status(201).json({ ok: true });
});

router.delete("/:item_type/:item_id", (req, res) => {
  const { item_type, item_id } = req.params;
  db.prepare(
    "DELETE FROM wishlist_items WHERE user_id = ? AND item_type = ? AND item_id = ?"
  ).run(req.session.userId, item_type, item_id);
  res.json({ ok: true });
});

module.exports = router;