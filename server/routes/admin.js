import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { verifyAuditChain } from "../audit.js";

const router = Router();

router.get("/overview", requireAuth, requireRole("admin"), async (_req, res) => {
  const users = await query("SELECT COUNT(*)::int AS count FROM users");
  const docs = await query("SELECT COUNT(*)::int AS count FROM documents");
  const grants = await query("SELECT COUNT(*)::int AS count FROM permissions");
  const failed = await query(
    "SELECT COUNT(*)::int AS count FROM audit_logs WHERE success = FALSE"
  );
  const recent = await query(
    `SELECT id, created_at, actor_email, action, resource_type, resource_id, success, entry_hash
     FROM audit_logs ORDER BY id DESC LIMIT 8`
  );
  res.json({
    stats: {
      users: users.rows[0].count,
      documents: docs.rows[0].count,
      grants: grants.rows[0].count,
      failedEvents: failed.rows[0].count,
    },
    recent: recent.rows,
  });
});

router.get("/audit", requireAuth, requireRole("admin"), async (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const action = String(req.query.action || "").trim();
  const success = req.query.success;
  const params = [];
  const filters = [];
  if (q) {
    params.push(`%${q}%`);
    filters.push(
      `(LOWER(COALESCE(actor_email,'')) LIKE $${params.length} OR LOWER(COALESCE(action,'')) LIKE $${params.length} OR LOWER(COALESCE(resource_id,'')) LIKE $${params.length})`
    );
  }
  if (action) {
    params.push(action);
    filters.push(`action = $${params.length}`);
  }
  if (success === "true" || success === "false") {
    params.push(success === "true");
    filters.push(`success = $${params.length}`);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT id, created_at, actor_id, actor_email, action, resource_type, resource_id,
            success, ip_address, metadata, prev_hash, entry_hash
     FROM audit_logs ${where}
     ORDER BY id DESC
     LIMIT 400`,
    params
  );
  res.json({ events: rows });
});

router.get("/audit/verify", requireAuth, requireRole("admin"), async (_req, res) => {
  res.json(await verifyAuditChain());
});

router.get("/users", requireAuth, requireRole("admin"), async (_req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.email, u.name, u.role, u.created_at,
            (SELECT COUNT(*)::int FROM documents d WHERE d.owner_id = u.id) AS document_count
     FROM users u ORDER BY u.created_at`
  );
  res.json({ users: rows });
});

export default router;
