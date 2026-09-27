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
    stores.alamat AS store_alamat,
    stores.status AS store_status
  FROM menu_items
  LEFT JOIN stores ON stores.id = menu_items.store_id
  ORDER BY menu_items.sort_order ASC, menu_items.id ASC
`).all();
  const testimonials = db
    .prepare("SELECT * FROM testimonials ORDER BY sort_order ASC, id ASC")
    .all();
  const faqs = db.prepare("SELECT * FROM faqs ORDER BY sort_order ASC, id ASC").all();

  res.json({ content, stores, menu, testimonials, faqs });
});

module.exports = router;
