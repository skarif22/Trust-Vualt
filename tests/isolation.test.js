import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { bootTestApp, shutdownTestApp, query } from "../server/test-harness.js";

let url;
let server;
let seed;

async function login(email, password) {
  const res = await fetch(`${url}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  return body.token;
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

before(async () => {
  const boot = await bootTestApp();
  seed = boot.seed;
  server = await new Promise((resolve) => {
    const s = boot.app.listen(0, "127.0.0.1", () => resolve(s));
  });
  url = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await shutdownTestApp();
});

test("viewer can list only granted documents, never the restricted budget", async () => {
  const token = await login("viewer@trustvault.dev", "Viewer123!");
  const res = await fetch(`${url}/api/documents`, { headers: auth(token) });
  const body = await res.json();
  const titles = body.documents.map((d) => d.title);
  assert.ok(titles.includes("ACME mutual NDA"));
  assert.ok(titles.includes("Lab collaboration notes"));
  assert.equal(titles.includes("Q3 budget (restricted)"), false);
});

test("viewer is denied download of an unshared document and the failure is audited", async () => {
  const token = await login("viewer@trustvault.dev", "Viewer123!");
  const res = await fetch(`${url}/api/documents/${seed.ids.budget}/download`, {
    headers: auth(token),
  });
  assert.equal(res.status, 403);
  const logs = await query(
    `SELECT * FROM audit_logs WHERE action = 'document.download' AND success = FALSE
     AND resource_id = $1 ORDER BY id DESC LIMIT 1`,
    [seed.ids.budget]
  );
  assert.equal(logs.rowCount, 1);
  assert.equal(logs.rows[0].actor_email, "viewer@trustvault.dev");
});

test("admin cannot download owner-only files (metadata isolation)", async () => {
  const token = await login("admin@trustvault.dev", "Admin123!");
  const meta = await fetch(`${url}/api/documents/${seed.ids.budget}`, {
    headers: auth(token),
  });
  const detail = await meta.json();
  assert.equal(meta.status, 200);
  assert.equal(detail.access.adminMetadataOnly, true);
  assert.equal(detail.access.canDownload, false);

  const dl = await fetch(`${url}/api/documents/${seed.ids.budget}/download`, {
    headers: auth(token),
  });
  assert.equal(dl.status, 403);
});

test("read grant cannot edit; edit grant can update title", async () => {
  const token = await login("viewer@trustvault.dev", "Viewer123!");
  const denied = await fetch(`${url}/api/documents/${seed.ids.nda}`, {
    method: "PUT",
    headers: { ...auth(token), "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Hacked NDA" }),
  });
  assert.equal(denied.status, 403);

  const allowed = await fetch(`${url}/api/documents/${seed.ids.notes}`, {
    method: "PUT",
    headers: { ...auth(token), "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Lab notes (viewer edit)" }),
  });
  assert.equal(allowed.status, 200);
  const body = await allowed.json();
  assert.equal(body.document.title, "Lab notes (viewer edit)");
});

test("owner revoke is immediate — subsequent download fails", async () => {
  const owner = await login("owner@trustvault.dev", "Owner123!");
  const viewer = await login("viewer@trustvault.dev", "Viewer123!");

  const before = await fetch(`${url}/api/documents/${seed.ids.nda}/download`, {
    headers: auth(viewer),
  });
  assert.equal(before.status, 200);

  const revoke = await fetch(
    `${url}/api/documents/${seed.ids.nda}/permissions/${seed.ids.viewer}`,
    { method: "DELETE", headers: auth(owner) }
  );
  assert.equal(revoke.status, 200);

  const after = await fetch(`${url}/api/documents/${seed.ids.nda}/download`, {
    headers: auth(viewer),
  });
  assert.equal(after.status, 403);
});

test("viewer cannot grant permissions on someone else's document", async () => {
  const viewer = await login("viewer@trustvault.dev", "Viewer123!");
  const res = await fetch(`${url}/api/documents/${seed.ids.notes}/permissions`, {
    method: "POST",
    headers: { ...auth(viewer), "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@trustvault.dev", canRead: true }),
  });
  assert.equal(res.status, 403);
});
