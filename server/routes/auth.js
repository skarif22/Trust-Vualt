import { Router } from "express";
import rateLimit from "express-rate-limit";
import { newId, query } from "../db.js";
import {
  hashPassword,
  publicUser,
  requireAuth,
  signToken,
  verifyPassword,
} from "../auth.js";
import { recordAudit, requestMeta } from "../audit.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, trustProxy: false },
});

router.post("/register", async (req, res) => {
  const { email, password, name, role } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  const requestedRole = role === "owner" ? "owner" : "viewer";
  const normalized = String(email).trim().toLowerCase();
  const existing = await query("SELECT id FROM users WHERE email = $1", [normalized]);
  if (existing.rowCount) {
    await recordAudit({
      actorEmail: normalized,
      action: "auth.register",
      success: false,
      ...requestMeta(req),
      metadata: { reason: "duplicate_email" },
    });
    return res.status(409).json({ error: "An account with that email already exists" });
  }
  const user = {
    id: newId(),
    email: normalized,
    password_hash: await hashPassword(password),
    name: String(name).trim(),
    role: requestedRole,
  };
  await query(
    "INSERT INTO users (id, email, password_hash, name, role) VALUES ($1,$2,$3,$4,$5)",
    [user.id, user.email, user.password_hash, user.name, user.role]
  );
  const stored = (await query("SELECT * FROM users WHERE id = $1", [user.id])).rows[0];
  await recordAudit({
    actorId: stored.id,
    actorEmail: stored.email,
    action: "auth.register",
    success: true,
    ...requestMeta(req),
    metadata: { role: stored.role },
  });
  return res.status(201).json({ token: signToken(stored), user: publicUser(stored) });
});

router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  const { rows } = await query("SELECT * FROM users WHERE email = $1", [normalized]);
  const user = rows[0];
  const ok = user && (await verifyPassword(String(password || ""), user.password_hash));
  if (!ok) {
    await recordAudit({
      actorEmail: normalized || null,
      action: "auth.login",
      success: false,
      ...requestMeta(req),
      metadata: { reason: "invalid_credentials" },
    });
    return res.status(401).json({ error: "Invalid email or password" });
  }
  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "auth.login",
    success: true,
    ...requestMeta(req),
    metadata: { role: user.role },
  });
  return res.json({ token: signToken(user), user: publicUser(user) });
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.get("/users", requireAuth, async (req, res) => {
  if (!["admin", "owner"].includes(req.user.role)) {
    return res.status(403).json({ error: "Owners and admins can list users" });
  }
  const { rows } = await query(
    "SELECT id, email, name, role, created_at FROM users ORDER BY name"
  );
  res.json({ users: rows });
});

export default router;
