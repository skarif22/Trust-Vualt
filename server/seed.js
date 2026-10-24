import { newId, query } from "./db.js";
import { hashPassword } from "./auth.js";
import { recordAudit } from "./audit.js";

export const TEST_ACCOUNTS = [
  {
    email: "admin@trustvault.dev",
    password: "Admin123!",
    name: "Amina Okonkwo",
    role: "admin",
  },
  {
    email: "owner@trustvault.dev",
    password: "Owner123!",
    name: "Jordan Hale",
    role: "owner",
  },
  {
    email: "viewer@trustvault.dev",
    password: "Viewer123!",
    name: "Priya Shah",
    role: "viewer",
  },
];

function textFile(name, body) {
  const buffer = Buffer.from(body, "utf8");
  return {
    filename: name,
    mime_type: "text/plain",
    size_bytes: buffer.length,
    content: buffer,
  };
}

export async function seedIfEmpty() {
  const existing = await query("SELECT COUNT(*)::int AS count FROM users");
  if (existing.rows[0].count > 0) return { seeded: false };

  const ids = {};
  for (const account of TEST_ACCOUNTS) {
    const id = newId();
    ids[account.role] = id;
    await query(
      "INSERT INTO users (id, email, password_hash, name, role) VALUES ($1,$2,$3,$4,$5)",
      [id, account.email, await hashPassword(account.password), account.name, account.role]
    );
  }

  await recordAudit({
    actorId: ids.admin,
    actorEmail: "admin@trustvault.dev",
    action: "system.seed",
    success: true,
    metadata: { message: "SilicaVault demo dataset created" },
  });

  const contracts = newId();
  const research = newId();
  await query("INSERT INTO folders (id, owner_id, name) VALUES ($1,$2,$3), ($4,$5,$6)", [
    contracts,
    ids.owner,
    "Contracts",
    research,
    ids.owner,
    "Research",
  ]);

  const nda = newId();
  const ndaFile = textFile(
    "nda-acme.txt",
    "SILICAVAULT NDA — ACME PARTNERSHIP\nConfidential. Not for redistribution.\nHash-chained copies are authoritative."
  );
  await query(
    `INSERT INTO documents (id, owner_id, folder_id, title, description, filename, mime_type, size_bytes, content)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      nda,
      ids.owner,
      contracts,
      "ACME mutual NDA",
      "Shared with Priya as read-only.",
      ndaFile.filename,
      ndaFile.mime_type,
      ndaFile.size_bytes,
      ndaFile.content,
    ]
  );

  const budget = newId();
  const budgetFile = textFile(
    "q3-budget.txt",
    "Q3 budget (owner-only). Contains salary bands. Isolation test target."
  );
  await query(
    `INSERT INTO documents (id, owner_id, folder_id, title, description, filename, mime_type, size_bytes, content)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      budget,
      ids.owner,
      contracts,
      "Q3 budget (restricted)",
      "No grants. Viewers and admins must be denied downloads.",
      budgetFile.filename,
      budgetFile.mime_type,
      budgetFile.size_bytes,
      budgetFile.content,
    ]
  );

  const notes = newId();
  const notesFile = textFile(
    "lab-notes.txt",
    "Lab notes — Priya has edit access for collaborative review."
  );
  await query(
    `INSERT INTO documents (id, owner_id, folder_id, title, description, filename, mime_type, size_bytes, content)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      notes,
      ids.owner,
      research,
      "Lab collaboration notes",
      "Viewer granted edit.",
      notesFile.filename,
      notesFile.mime_type,
      notesFile.size_bytes,
      notesFile.content,
    ]
  );

  await query(
    `INSERT INTO permissions (document_id, user_id, can_read, can_edit, granted_by)
     VALUES ($1,$2,TRUE,FALSE,$3), ($4,$5,TRUE,TRUE,$3)`,
    [nda, ids.viewer, ids.owner, notes, ids.viewer]
  );

  await recordAudit({
    actorId: ids.owner,
    actorEmail: "owner@trustvault.dev",
    action: "document.upload",
    resourceType: "document",
    resourceId: nda,
    success: true,
    metadata: { title: "ACME mutual NDA", seeded: true },
  });
  await recordAudit({
    actorId: ids.owner,
    actorEmail: "owner@trustvault.dev",
    action: "document.upload",
    resourceType: "document",
    resourceId: budget,
    success: true,
    metadata: { title: "Q3 budget (restricted)", seeded: true },
  });
  await recordAudit({
    actorId: ids.owner,
    actorEmail: "owner@trustvault.dev",
    action: "permission.grant",
    resourceType: "document",
    resourceId: nda,
    success: true,
    metadata: { grantee: "viewer@trustvault.dev", canRead: true, canEdit: false },
  });

  return { seeded: true, ids: { ...ids, nda, budget, notes } };
}

export async function resetAndSeed() {
  await query("DELETE FROM audit_logs");
  await query("DELETE FROM permissions");
  await query("DELETE FROM documents");
  await query("DELETE FROM folders");
  await query("DELETE FROM users");
  return seedIfEmpty();
}
