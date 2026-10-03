const db = require("../db");

function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  if (req.originalUrl.startsWith("/admin/api/")) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  return res.redirect("/admin/login");
}

function requireTokoAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Kamu harus login dulu." });
  }
  const user = db
    .prepare("SELECT id, role, status, store_id FROM users WHERE id = ?")
    .get(req.session.userId);

  if (!user || user.role !== "toko") {
    return res.status(403).json({ error: "Akses khusus akun toko." });
  }
  if (user.status !== "approved") {
    return res.status(403).json({ error: "Akun toko kamu belum disetujui admin." });
  }
  req.tokoUser = user;
  next();
}

module.exports = { requireAuth, requireTokoAuth };