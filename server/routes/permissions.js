import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../auth.js";
import { recordAudit, requestMeta } from "../audit.js";
import { deny, getDocumentRow } from "../access.js";

const router = Router();

router.post("/:id/permissions", requireAuth, async (req, res) => {
  const doc = await getDocumentRow(req.params.id);
  if (!doc) return res.status(404).json({ error: "Document not found" });
  if (doc.owner_id !== req.user.id) {
    return deny(req, res, 403, "Only the owner can grant access", {
      action: "permission.grant",
      resourceId: doc.id,
    });
  }
  const { email, canRead = true, canEdit = false } = req.body || {};
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  const target = (await query("SELECT * FROM users WHERE email = $1", [normalized])).rows[0];
  if (!target) return res.status(404).json({ error: "No user with that email" });
  if (target.id === req.user.id) {
    return res.status(400).json({ error: "Owner already has full access" });
  }
  await query(
    `INSERT INTO permissions (document_id, user_id, can_read, can_edit, granted_by)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (document_id, user_id)
     DO UPDATE SET can_read = EXCLUDED.can_read, can_edit = EXCLUDED.can_edit, granted_by = EXCLUDED.granted_by`,
    [doc.id, target.id, Boolean(canRead || canEdit), Boolean(canEdit), req.user.id]
  );
  await recordAudit({
    actorId: req.user.id,
    actorEmail: req.user.email,
    action: "permission.grant",
    resourceType: "document",
    resourceId: doc.id,
    success: true,
    ...requestMeta(req),
    metadata: {
      grantee: target.email,
      canRead: Boolean(canRead || canEdit),
      canEdit: Boolean(canEdit),
    },
  });
  const grants = (
    await query(
      `SELECT p.*, u.email, u.name, u.role FROM permissions p
       JOIN users u ON u.id = p.user_id WHERE p.document_id = $1 ORDER BY u.email`,
      [doc.id]
    )
  ).rows;
  res.json({ permissions: grants });
});

router.delete("/:id/permissions/:userId", requireAuth, async (req, res) => {
  const doc = await getDocumentRow(req.params.id);
  if (!doc) return res.status(404).json({ error: "Document not found" });
  if (doc.owner_id !== req.user.id) {
    return deny(req, res, 403, "Only the owner can revoke access", {
      action: "permission.revoke",
      resourceId: doc.id,
    });
  }
  const existing = await query(
    "DELETE FROM permissions WHERE document_id = $1 AND user_id = $2 RETURNING user_id",
    [doc.id, req.params.userId]
  );
  if (!existing.rowCount) return res.status(404).json({ error: "Grant not found" });
  const grantee = (await query("SELECT email FROM users WHERE id = $1", [req.params.userId]))
    .rows[0];
  await recordAudit({
    actorId: req.user.id,
    actorEmail: req.user.email,
    action: "permission.revoke",
    resourceType: "document",
    resourceId: doc.id,
    success: true,
    ...requestMeta(req),
    metadata: { grantee: grantee?.email || req.params.userId },
  });
  const grants = (
    await query(
      `SELECT p.*, u.email, u.name, u.role FROM permissions p
       JOIN users u ON u.id = p.user_id WHERE p.document_id = $1 ORDER BY u.email`,
      [doc.id]
    )
  ).rows;
  res.json({ permissions: grants });
});

export default router;
