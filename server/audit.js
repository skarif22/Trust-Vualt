import { createHash } from "node:crypto";
import { query, withTransaction } from "./db.js";

export const GENESIS_HASH = "0".repeat(64);

export function canonicalize(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return stableStringify(value);
}

export function stableStringify(value) {
  if (value === undefined) return JSON.stringify({});
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

export function computeEntryHash({
  prevHash,
  createdAt,
  actorId,
  actorEmail,
  action,
  resourceType,
  resourceId,
  success,
  metadata,
}) {
  const payload = [
    prevHash,
    new Date(createdAt).toISOString(),
    canonicalize(actorId),
    canonicalize(actorEmail),
    action,
    canonicalize(resourceType),
    canonicalize(resourceId),
    success ? "1" : "0",
    stableStringify(metadata ?? {}),
  ].join("|");
  return createHash("sha256").update(payload).digest("hex");
}

function jsonMetadata(metadata) {
  return JSON.stringify(metadata ?? {});
}

export async function recordAudit(event) {
  return withTransaction(async (tx) => {
    const last = await tx.query(
      "SELECT entry_hash FROM audit_logs ORDER BY id DESC LIMIT 1"
    );
    const prevHash = last.rows[0]?.entry_hash || GENESIS_HASH;
    const createdAt = new Date().toISOString();
    const metadata = event.metadata ?? {};
    const entryHash = computeEntryHash({
      prevHash,
      createdAt,
      actorId: event.actorId ?? null,
      actorEmail: event.actorEmail ?? null,
      action: event.action,
      resourceType: event.resourceType ?? null,
      resourceId: event.resourceId ?? null,
      success: Boolean(event.success),
      metadata,
    });

    const inserted = await tx.query(
      `INSERT INTO audit_logs (
        created_at, actor_id, actor_email, action, resource_type, resource_id,
        success, ip_address, user_agent, metadata, prev_hash, entry_hash
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12)
      RETURNING id, created_at, actor_id, actor_email, action, resource_type,
                resource_id, success, ip_address, metadata, prev_hash, entry_hash`,
      [
        createdAt,
        event.actorId ?? null,
        event.actorEmail ?? null,
        event.action,
        event.resourceType ?? null,
        event.resourceId ?? null,
        event.success,
        event.ipAddress ?? null,
        event.userAgent ?? null,
        jsonMetadata(metadata),
        prevHash,
        entryHash,
      ]
    );
    return inserted.rows[0];
  });
}

export async function verifyAuditChain() {
  const { rows } = await query(
    `SELECT id, created_at, actor_id, actor_email, action, resource_type,
            resource_id, success, metadata, prev_hash, entry_hash
     FROM audit_logs ORDER BY id ASC`
  );

  let expectedPrev = GENESIS_HASH;
  const breaks = [];

  for (const row of rows) {
    if (row.prev_hash !== expectedPrev) {
      breaks.push({
        id: row.id,
        reason: "prev_hash does not match previous entry_hash",
        expectedPrev,
        actualPrev: row.prev_hash,
      });
    }
    const expectedHash = computeEntryHash({
      prevHash: row.prev_hash,
      createdAt: row.created_at,
      actorId: row.actor_id,
      actorEmail: row.actor_email,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      success: row.success,
      metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
    });
    if (expectedHash !== row.entry_hash) {
      breaks.push({
        id: row.id,
        reason: "entry_hash does not match recomputed SHA-256",
        expectedHash,
        actualHash: row.entry_hash,
      });
    }
    expectedPrev = row.entry_hash;
  }

  return {
    intact: breaks.length === 0,
    count: rows.length,
    tipHash: rows.at(-1)?.entry_hash || GENESIS_HASH,
    breaks,
  };
}

export function requestMeta(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : null) ||
    req.ip ||
    req.socket?.remoteAddress ||
    null;
  return {
    ipAddress: ip,
    userAgent: req.headers["user-agent"] || null,
  };
}
