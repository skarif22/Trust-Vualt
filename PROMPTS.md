# Prompts used to build TrustVault

This file records the product brief and the follow-through prompts a builder (human or agent) should reuse. It is the audit trail of **how the system was specified**, not of runtime events.

## 1. Original product brief

```
Build a full-stack web app called TrustVault:
- Purpose: Secure document sharing with tamper-proof audit trail
- Roles: Administrator, Document Owner, Viewer
- Features:
  • Authentication with JWT
  • Upload, organize, search documents
  • Per-document permissions (read/edit)
  • Owners grant/revoke access instantly
  • Audit trail of all actions (uploads, downloads, permission changes,
    failed attempts) with hash chaining
  • Admin dashboard for activity logs
  • Automated tests proving isolation
- Tech stack: Node.js + Express backend, PostgreSQL database, React frontend
- Deployment: Render/Heroku with Dockerfile
- Deliverables:
  • Public GitHub repo with commit history
  • Live deployed URL with seed data and test accounts
  • THREATS.md and PROMPTS.md
  • README with setup + credentials
  • Demo video script
```

## 2. Implementation constraints (applied during build)

```
Keep the demo deployable on a single web process plus PostgreSQL.
Store file bytes in the database so Render/Heroku do not need a persistent disk.
Administrators may see metadata and the global ledger, but must not download
unshared documents. Register may create owner or viewer accounts, never admin.
Use SHA-256 chaining: entry_hash = SHA256(prev_hash | timestamp | actor |
action | resource | success | metadata). Provide GET /api/admin/audit/verify.
Seed three accounts and a restricted budget document for isolation demos.
```

## 3. Test prompt

```
Write automated tests that prove:
1. A viewer cannot list or download an unshared document.
2. A failed download is written to audit_logs with success=false.
3. An administrator cannot download owner-only bytes.
4. Read-only grants cannot edit; edit grants can.
5. Revoke is immediate.
6. Tampering with entry_hash makes chain verification fail.
```

## 4. UI prompt

```
Design a vault/ledger aesthetic (ink, gold, serif headlines) rather than a
generic purple SaaS dashboard. Surface hash prefixes, chain integrity, and
role pills. One-click demo logins on the sign-in screen.
```

## 5. Ops prompt

```
Ship Dockerfile + docker-compose + render.yaml + Procfile.
README must include local setup, Postgres vs PGlite, test accounts,
and a demo video script in DEMO.md.
```

## 6. Suggested hardening follow-ups (not in this demo)

```
Add refresh-token rotation, virus scanning on upload, object storage with
customer-managed keys, WORM audit export to S3 Object Lock, and SSO (OIDC).
```
