const express = require("express");
const db = require("../db");

const router = express.Router();



router.get("/api/site-content", (req, res) => {
  const blockRows = db.prepare("SELECT key, data FROM content_blocks").all();
  const content = {};
  blockRows.forEach((row) => {
    content[row.key] = JSON.parse(row.data);
  });

  const stores = db.prepare("SELECT * FROM stores ORDER BY sort_order ASC, id ASC").all();
  const menu = db.prepare(`
  SELECT
    menu_items.*,
    stores.id AS store_id,
    stores.nama AS store_nama,
    stores.alamat AS store_alamat
  FROM menu_items
  LEFT JOIN stores ON stores.id = menu_items.store_id
  ORDER BY menu_items.sort_order ASC, menu_items.id ASC
`).all();
  const testimonials = db
    .prepare("SELECT * FROM testimonials WHERE approved = 1 ORDER BY sort_order ASC, id ASC")
    .all();
  const faqs = db.prepare("SELECT * FROM faqs ORDER BY sort_order ASC, id ASC").all();

  res.json({ content, stores, menu, testimonials, faqs });
});

// Submit a new testimonial. Requires the visitor to be logged in
// (shares the same session as /api/user routes). New testimonials are
// unapproved by default and only appear publicly after an admin
// approves them from the admin panel.
router.post("/api/testimonials", (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Kamu harus login dulu untuk menulis ulasan." });
  }

  const { ulasan, stars, target_type, target_id } = req.body || {};

  if (!ulasan || !String(ulasan).trim()) {
    return res.status(400).json({ error: "Ulasan tidak boleh kosong." });
  }

  if (target_type !== "store" && target_type !== "menu") {
    return res.status(400).json({ error: "Pilih dulu toko atau menu yang mau kamu ulas." });
  }

  const targetIdNum = Number(target_id);
  if (!Number.isInteger(targetIdNum)) {
    return res.status(400).json({ error: "Toko/menu yang dipilih tidak valid." });
  }

  // Look up the real name ourselves instead of trusting whatever the
  // client sends, and confirm the store/menu actually exists.
  const targetRow =
    target_type === "store"
      ? db.prepare("SELECT id, nama FROM stores WHERE id = ?").get(targetIdNum)
      : db.prepare("SELECT id, nama FROM menu_items WHERE id = ?").get(targetIdNum);

  if (!targetRow) {
    return res.status(400).json({ error: "Toko/menu yang dipilih tidak ditemukan." });
  }

  const starsNum = Number(stars);
  const finalStars = Number.isInteger(starsNum) && starsNum >= 1 && starsNum <= 5 ? starsNum : 5;

  db.prepare(
    `INSERT INTO testimonials (nama, ulasan, waktu, stars, approved, sort_order, target_type, target_id, target_nama)
     VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?)`
  ).run(
    req.session.userNama || "Pengguna",
    String(ulasan).trim(),
    "Baru saja",
    finalStars,
    target_type,
    targetRow.id,
    targetRow.nama
  );

  res.status(201).json({
    ok: true,
    message: "Terima kasih! Ulasan kamu akan tampil setelah disetujui admin.",
  });
});

module.exports = router;