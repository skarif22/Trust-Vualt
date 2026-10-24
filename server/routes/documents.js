import { Router } from "express";
import multer from "multer";
import { newId, query } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { recordAudit, requestMeta } from "../audit.js";
import {
  canEdit,
  canRead,
  deny,
  getDocumentRow,
  getPermission,
  stripContent,
} from "../access.js";

const router = Router();
const maxBytes = Number(process.env.MAX_UPLOAD_BYTES || 8 * 1024 * 1024);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes, files: 1 },
});

function visibleWhere(user) {
  if (user.role === "admin") {
    // Admins see metadata for oversight, not file bytes, via list endpoint.
    return {
      sql: "TRUE",
      params: [],
    };
  }
  return {
    sql: `(d.owner_id = $1 OR EXISTS (
      SELECT 1 FROM permissions p
      WHERE p.document_id = d.id AND p.user_id = $1 AND (p.can_read = TRUE OR p.can_edit = TRUE)
    ))`,
    params: [user.id],
  };
}

router.get("/", requireAuth, async (req, res) => {
  const q = String(req.query.q || "").trim();
  const folderId = req.query.folderId || null;
  const vis = visibleWhere(req.user);
  const params = [...vis.params];
  const filters = [vis.sql];

  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    filters.push(
      `(LOWER(d.title) LIKE $${params.length} OR LOWER(d.description) LIKE $${params.length} OR LOWER(d.filename) LIKE $${params.length})`
    );
  }
  if (folderId) {
    params.push(folderId);
    filters.push(`d.folder_id = $${params.length}`);
  }

  const { rows } = await query(
    `SELECT d.id, d.owner_id, d.folder_id, d.title, d.description, d.filename,
            d.mime_type, d.size_bytes, d.created_at, d.updated_at,
            u.email AS owner_email, u.name AS owner_name, f.name AS folder_name
     FROM documents d
     JOIN users u ON u.id = d.owner_id
     LEFT JOIN folders f ON f.id = d.folder_id
     WHERE ${filters.join(" AND ")}
     ORDER BY d.updated_at DESC`,
    params
  );
  res.json({ documents: rows });
});

router.get("/folders", requireAuth, async (req, res) => {
  const { rows } = await query(
    "SELECT * FROM folders WHERE owner_id = $1 ORDER BY name",
    [req.user.id]
  );
  res.json({ folders: rows });
});

router.post("/folders", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "Folder name is required" });
  const id = newId();
  await query("INSERT INTO folders (id, owner_id, name) VALUES ($1,$2,$3)", [
    id,
    req.user.id,
    name,
  ]);
  await recordAudit({
    actorId: req.user.id,
    actorEmail: req.user.email,
    action: "folder.create",
    resourceType: "folder",
    resourceId: id,
    success: true,
    ...requestMeta(req),
    metadata: { name },
  });
  const folder = (await query("SELECT * FROM folders WHERE id = $1", [id])).rows[0];
  res.status(201).json({ folder });
});

router.post(
  "/",
  requireAuth,
  requireRole("owner", "admin"),
  upload.single("file"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "A file is required" });
    const title = String(req.body?.title || req.file.originalname).trim();
    const description = String(req.body?.description || "");
    const folderId = req.body?.folderId || null;
    if (folderId) {
      const folder = await query("SELECT * FROM folders WHERE id = $1 AND owner_id = $2", [
        folderId,
        req.user.id,
      ]);
      if (!folder.rowCount) return res.status(400).json({ error: "Unknown folder" });
    }
    const id = newId();
    await query(
      `INSERT INTO documents (
        id, owner_id, folder_id, title, description, filename, mime_type, size_bytes, content
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id,
        req.user.id,
        folderId,
        title,
        description,
        req.file.originalname,
        req.file.mimetype || "application/octet-stream",
        req.file.size,
        req.file.buffer,
      ]
    );
    await recordAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: "document.upload",
      resourceType: "document",
      resourceId: id,
      success: true,
      ...requestMeta(req),
      metadata: { title, filename: req.file.originalname, size: req.file.size },
    });
    const doc = stripContent(await getDocumentRow(id));
    res.status(201).json({ document: doc });
  }
);

router.get("/:id", requireAuth, async (req, res) => {
  const doc = await getDocumentRow(req.params.id);
  if (!doc) return res.status(404).json({ error: "Document not found" });
  const perm = await getPermission(doc.id, req.user.id);
  const ownerOrGranted = canRead(req.user, doc, perm);
  if (!ownerOrGranted && req.user.role !== "admin") {
    return deny(req, res, 403, "You do not have access to this document", {
      action: "document.view",
      resourceId: doc.id,
    });
  }
  const { rows: grants } = await query(
    `SELECT p.*, u.email, u.name, u.role
     FROM permissions p JOIN users u ON u.id = p.user_id
     WHERE p.document_id = $1 ORDER BY u.email`,
    [doc.id]
  );
  res.json({
    document: stripContent(doc),
    access: {
      isOwner: doc.owner_id === req.user.id,
      canRead: ownerOrGranted || req.user.role === "admin",
      canEdit: canEdit(req.user, doc, perm),
      canDownload: ownerOrGranted,
      adminMetadataOnly: req.user.role === "admin" && !ownerOrGranted,
    },
    permissions: doc.owner_id === req.user.id || req.user.role === "admin" ? grants : [],
  });
});

router.put("/:id", requireAuth, upload.single("file"), async (req, res) => {
  const doc = await getDocumentRow(req.params.id);
  if (!doc) return res.status(404).json({ error: "Document not found" });
  const perm = await getPermission(doc.id, req.user.id);
  if (!canEdit(req.user, doc, perm)) {
    return deny(req, res, 403, "Edit access denied", {
      action: "document.edit",
      resourceId: doc.id,
    });
  }
  const title = String(req.body?.title || doc.title).trim();
  const description =
    req.body?.description !== undefined ? String(req.body.description) : doc.description;
  const folderId = req.body?.folderId === "" ? null : req.body?.folderId || doc.folder_id;
  if (req.file) {
    await query(
      `UPDATE documents SET title=$1, description=$2, folder_id=$3, filename=$4,
        mime_type=$5, size_bytes=$6, content=$7, updated_at=NOW() WHERE id=$8`,
      [
        title,
        description,
        folderId,
        req.file.originalname,
        req.file.mimetype || "application/octet-stream",
        req.file.size,
        req.file.buffer,
        doc.id,
      ]
    );
  } else {
    await query(
      `UPDATE documents SET title=$1, description=$2, folder_id=$3, updated_at=NOW() WHERE id=$4`,
      [title, description, folderId, doc.id]
    );
  }
  await recordAudit({
    actorId: req.user.id,
    actorEmail: req.user.email,
    action: "document.edit",
    resourceType: "document",
    resourceId: doc.id,
    success: true,
    ...requestMeta(req),
    metadata: { title, replacedFile: Boolean(req.file) },
  });
  res.json({ document: stripContent(await getDocumentRow(doc.id)) });
});

router.get("/:id/download", requireAuth, async (req, res) => {
  const doc = await getDocumentRow(req.params.id);
  if (!doc) return res.status(404).json({ error: "Document not found" });
  const perm = await getPermission(doc.id, req.user.id);
  if (!canRead(req.user, doc, perm)) {
    return deny(req, res, 403, "Download denied", {
      action: "document.download",
      resourceId: doc.id,
      metadata: { isolation: true },
    });
  }
  await recordAudit({
    actorId: req.user.id,
    actorEmail: req.user.email,
    action: "document.download",
    resourceType: "document",
    resourceId: doc.id,
    success: true,
    ...requestMeta(req),
    metadata: { filename: doc.filename },
  });
  const buffer = Buffer.isBuffer(doc.content) ? doc.content : Buffer.from(doc.content);
  res.setHeader("Content-Type", doc.mime_type);
  res.setHeader("Content-Disposition", `attachment; filename="${doc.filename}"`);
  res.send(buffer);
});

router.get("/:id/audit", requireAuth, async (req, res) => {
  const doc = await getDocumentRow(req.params.id);
  if (!doc) return res.status(404).json({ error: "Document not found" });
  if (doc.owner_id !== req.user.id && req.user.role !== "admin") {
    return deny(req, res, 403, "Only the owner or an admin can view this trail", {
      action: "audit.view",
      resourceId: doc.id,
    });
  }
  const { rows } = await query(
    `SELECT id, created_at, actor_email, action, success, metadata, prev_hash, entry_hash
     FROM audit_logs
     WHERE resource_type = 'document' AND resource_id = $1
     ORDER BY id DESC`,
    [doc.id]
  );
  res.json({ events: rows });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const doc = await getDocumentRow(req.params.id);
  if (!doc) return res.status(404).json({ error: "Document not found" });
  if (doc.owner_id !== req.user.id) {
    return deny(req, res, 403, "Only the owner can delete this document", {
      action: "document.delete",
      resourceId: doc.id,
    });
  }
  await query("DELETE FROM documents WHERE id = $1", [doc.id]);
  await recordAudit({
    actorId: req.user.id,
    actorEmail: req.user.email,
    action: "document.delete",
    resourceType: "document",
    resourceId: doc.id,
    success: true,
    ...requestMeta(req),
    metadata: { title: doc.title },
  });
  res.json({ ok: true });
});

export default router;
