# Prompts used to build SilicaVault

Sections 1–6 preserve reusable project prompts and constraints. Section 7 is a dated record of the prompts, what the tool produced, what review found, and the commits that addressed those gaps. This is a development record, not the application's runtime audit log.

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

## 7. Dated prompt and review log

The entries below are fair summaries of the prompts and follow-up decisions used during the build. Commit links point to the changes that addressed each noted gap; they do not imply that every remaining requirement is complete.

### 2026-10-24 — Server-side authorization and isolation tests

- **Prompt:** Build the API with administrator, owner, and viewer roles; enforce document-specific read/edit permissions, grants, and revocation.
- **Produced:** Express routes and shared `canRead` / `canEdit` checks for document detail, download, edit, delete, and permission operations.
- **What needed correction:** The first API commit had no HTTP-level tests proving those boundaries. A front end hiding a button would not prove that a direct API request was denied.
- **What I did:** Kept authorization in the server routes and added request-level tests for viewer listing/download denial, admin byte isolation, read-versus-edit grants, immediate revoke, and non-owner grant denial. [Security tests and threat notes](https://github.com/skarif22/Trust-Vualt/commit/29e87fbac17e5f2c870c901186f716d4e6a624d7).

### 2026-10-24 — Audit-chain tamper checks

- **Prompt:** Add a SHA-256 hash chain, record failed attempts, and let an administrator verify the chain.
- **Produced:** Audit rows with `prev_hash` and `entry_hash`, plus a verifier endpoint.
- **What needed correction:** The initial implementation did not include a regression test proving that a changed stored hash is detected; the security claim had not been challenged with tampered data.
- **What I did:** Added tests that corrupt a stored `entry_hash`, verify the chain reports failure, check failed-login logging, and check deterministic hash calculation. [Audit-chain tests](https://github.com/skarif22/Trust-Vualt/commit/29e87fbac17e5f2c870c901186f716d4e6a624d7).

### 2026-10-24 — Rework the interface and brand

- **Prompt:** Build the React portal with role-based demo sign-in; after reviewing it, the user asked for a different visual style and the SilicaVault name.
- **Produced:** A working portal with library, document, and admin-ledger screens.
- **What needed correction:** The first pass still used the earlier TrustVault identity and visual direction, which did not match the user's follow-up.
- **What I did:** Rebranded the app and refreshed the sign-in presentation while retaining the demo-role flow. [Rebrand](https://github.com/skarif22/Trust-Vualt/commit/f2dbdad5b80f94590af2c398ab0790c79ba0de03) and [sign-in/deployment refresh](https://github.com/skarif22/Trust-Vualt/commit/9cdff9749eb0875935cba05f7a9c0d358dd212ef).

### 2026-10-24 — Make the project runnable and reviewable

- **Prompt:** Include setup instructions, demo credentials, a threat model, tests, and a demo script with the app.
- **Produced:** The API and client worked, but the initial code commits did not include the hand-in documentation or test suite.
- **What needed correction:** A reviewer could not get the seeded accounts and clean-clone setup from the initial commits, and there was no written threat model or reproducible isolation evidence.
- **What I did:** Added the README, seeded-account instructions, `THREATS.md`, the automated tests, and `DEMO.md`. [Documentation, threats, and tests](https://github.com/skarif22/Trust-Vualt/commit/29e87fbac17e5f2c870c901186f716d4e6a624d7).

### 2026-10-24 — Put the live locations in the README

- **Prompt:** Publish the app and make it straightforward for a reviewer to find the live site and API.
- **Produced:** The service was deployed, but the README did not yet provide the confirmed Netlify and Render URLs.
- **What needed correction:** Deployment existed, but reviewers still had to discover the entry points themselves.
- **What I did:** Added the verified app and backend URLs to the README. [Live links in README](https://github.com/skarif22/Trust-Vualt/commit/28d2eed923b3008e03d64ba5d2f914f234a3854d).

### 2026-10-25 — Compare the challenge brief with the implementation (open)

- **Prompt:** Check the supplied challenge requirements against the project code and tests.
- **Produced:** The review found that successful document-detail reads are not recorded as audit events; search does not filter by owner or date; upload checks size/count but not file type/content; and the tests do not cover every direct read/delete denial path.
- **What was wrong:** Earlier documentation described a broad audit and isolation story without making these limits prominent. The review also found that the current demo script is about three minutes, and `PROMPTS.md` lacked the required dated retrospective.
- **What I did:** Recorded these findings here instead of claiming they were fixed. **No fixing commit exists yet for these open implementation gaps.** The cited source is the [API baseline](https://github.com/skarif22/Trust-Vualt/commit/cc5845fed221ac44181d51894a1a525e1a54c611) and [security-test commit](https://github.com/skarif22/Trust-Vualt/commit/29e87fbac17e5f2c870c901186f716d4e6a624d7); those links identify the reviewed code, not a fix.

