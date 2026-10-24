import { query } from "./db.js";
import { recordAudit, requestMeta } from "./audit.js";

export async function getDocumentRow(id) {
  const { rows } = await query(
    `SELECT d.*, u.email AS owner_email, u.name AS owner_name, f.name AS folder_name
     FROM documents d
     JOIN users u ON u.id = d.owner_id
     LEFT JOIN folders f ON f.id = d.folder_id
     WHERE d.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function getPermission(documentId, userId) {
  const { rows } = await query(
    "SELECT * FROM permissions WHERE document_id = $1 AND user_id = $2",
    [documentId, userId]
  );
  return rows[0] || null;
}

export function canRead(user, doc, perm) {
  if (!user || !doc) return false;
  if (doc.owner_id === user.id) return true;
  return Boolean(perm?.can_read || perm?.can_edit);
}

export function canEdit(user, doc, perm) {
  if (!user || !doc) return false;
  if (doc.owner_id === user.id) return true;
  return Boolean(perm?.can_edit);
}

export function stripContent(doc) {
  if (!doc) return null;
  const { content, ...rest } = doc;
  return {
    ...rest,
    size_bytes: Number(rest.size_bytes),
  };
}

export async function deny(req, res, status, error, extra = {}) {
  await recordAudit({
    actorId: req.user?.id,
    actorEmail: req.user?.email,
    action: extra.action || "access.denied",
    resourceType: extra.resourceType || "document",
    resourceId: extra.resourceId || null,
    success: false,
    ...requestMeta(req),
    metadata: { error, path: req.originalUrl, ...extra.metadata },
  });
  return res.status(status).json({ error });
}
