const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "app.db");
const UPLOADS_DIR = process.env.DATA_DIR
  ? path.join(DATA_DIR, "uploads")
  : path.join(__dirname, "public", "uploads");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

module.exports = { DATA_DIR, DB_PATH, UPLOADS_DIR };