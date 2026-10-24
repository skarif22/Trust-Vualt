import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { query } from "./db.js";
import { recordAudit, requestMeta } from "./audit.js";

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
}

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.created_at,
  };
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
  } catch {
    req.user = null;
  }
  next();
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    await recordAudit({
      action: "auth.denied",
      success: false,
      ...requestMeta(req),
      metadata: { reason: "missing_token", path: req.originalUrl },
    });
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query(
      "SELECT id, email, name, role, created_at FROM users WHERE id = $1",
      [payload.sub]
    );
    if (!rows[0]) {
      await recordAudit({
        actorEmail: payload.email,
        action: "auth.denied",
        success: false,
        ...requestMeta(req),
        metadata: { reason: "user_missing", path: req.originalUrl },
      });
      return res.status(401).json({ error: "Authentication required" });
    }
    req.user = rows[0];
    next();
  } catch {
    await recordAudit({
      action: "auth.denied",
      success: false,
      ...requestMeta(req),
      metadata: { reason: "invalid_token", path: req.originalUrl },
    });
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return async (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      await recordAudit({
        actorId: req.user?.id,
        actorEmail: req.user?.email,
        action: "auth.forbidden",
        success: false,
        ...requestMeta(req),
        metadata: { reason: "role", required: roles, path: req.originalUrl },
      });
      return res.status(403).json({ error: "Insufficient role" });
    }
    next();
  };
}
