const fs = require("fs");
const path = require("path");

// Di Railway: pasang Volume (mount path /data) lalu set variable DATA_DIR=/data
// Di lokal: tanpa DATA_DIR, semuanya tetap di lokasi lama (./data dan ./public/uploads)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "app.db");
const UPLOADS_DIR = process.env.DATA_DIR
  ? path.join(DATA_DIR, "uploads")
  : path.join(__dirname, "public", "uploads");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

module.exports = { DATA_DIR, DB_PATH, UPLOADS_DIR };