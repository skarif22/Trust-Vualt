import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { bootTestApp, shutdownTestApp, query } from "../server/test-harness.js";
import { computeEntryHash, GENESIS_HASH, verifyAuditChain } from "../server/audit.js";

let url;
let server;

before(async () => {
  const boot = await bootTestApp();
  server = await new Promise((resolve) => {
    const s = boot.app.listen(0, "127.0.0.1", () => resolve(s));
  });
  url = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await shutdownTestApp();
});

test("seeded audit log forms an intact SHA-256 chain from genesis", async () => {
  const report = await verifyAuditChain();
  assert.equal(report.intact, true);
  assert.ok(report.count >= 4);
  assert.notEqual(report.tipHash, GENESIS_HASH);
});

test("failed login is recorded without breaking the chain", async () => {
  const res = await fetch(`${url}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "owner@trustvault.dev", password: "wrong" }),
  });
  assert.equal(res.status, 401);
  const report = await verifyAuditChain();
  assert.equal(report.intact, true);
  const failed = await query(
    `SELECT * FROM audit_logs WHERE action = 'auth.login' AND success = FALSE ORDER BY id DESC LIMIT 1`
  );
  assert.equal(failed.rowCount, 1);
});

test("tampering with an entry_hash is detected by verification", async () => {
  const last = await query("SELECT id FROM audit_logs ORDER BY id DESC LIMIT 1");
  await query("UPDATE audit_logs SET entry_hash = $1 WHERE id = $2", [
    "deadbeef".repeat(8),
    last.rows[0].id,
  ]);
  const report = await verifyAuditChain();
  assert.equal(report.intact, false);
  assert.ok(report.breaks.length >= 1);
});

test("computeEntryHash is deterministic", () => {
  const input = {
    prevHash: GENESIS_HASH,
    createdAt: "2026-01-01T00:00:00.000Z",
    actorId: "user-1",
    actorEmail: "a@b.c",
    action: "document.upload",
    resourceType: "document",
    resourceId: "doc-1",
    success: true,
    metadata: { title: "x" },
  };
  assert.equal(computeEntryHash(input), computeEntryHash(input));
  assert.notEqual(computeEntryHash(input), computeEntryHash({ ...input, action: "other" }));
});
