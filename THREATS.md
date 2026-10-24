# SilicaVault threat model

This document is a working threat model for the shipped demo, not a certification. The goal is to show how isolation and the hash-chained ledger shrink the blast radius of common failures.

## Assets

| Asset | Why it matters |
| --- | --- |
| Document bytes | Confidential files (contracts, budgets, notes) |
| Permission map | Who may read or edit each document |
| JWT sessions | Proof of role and identity |
| Audit ledger | Evidence of uploads, downloads, grants, denials |
| Admin dashboard | Oversight of activity, not a backdoor into files |

## Actors

- **Administrator** — views the global ledger and document metadata; cannot download a file unless granted or they own it.
- **Document owner** — uploads, organizes, grants, and revokes.
- **Viewer** — reads or edits only where a grant exists.
- **Anonymous / attacker** — no token, stolen token, or a legitimate low-privilege account probing isolation.

## Trust boundaries

1. Browser → API (JWT in `Authorization`, not cookies).
2. API → PostgreSQL (parameterized SQL).
3. Owner grant table → enforcement on every read/edit/download.
4. Audit writer → append-only chain (`prev_hash` + SHA-256 `entry_hash`).

## STRIDE

### Spoofing

- Stolen JWT: tokens expire (`JWT_EXPIRES_IN`, default 8h). Production requires `JWT_SECRET`.
- Password guessing: bcrypt (cost 12), login rate limit, failed logins written to the ledger.
- Self-promotion: registration cannot choose `admin`.

### Tampering

- SQL injection: parameterized queries only.
- Document overwrite: `PUT` requires owner **or** `can_edit`.
- Ledger rewrite: each event hashes the previous tip. `GET /api/admin/audit/verify` recomputes the chain. Tests flip a hash and expect `intact: false`.
- Residual access: revoke deletes the grant row; the next download is 403 and audited.

### Repudiation

- Uploads, downloads, grants, revokes, failed logins, and 403s are appended with actor email, IP, and user agent.
- Owners can read the chain for **their** documents; admins see the global ledger.

### Information disclosure

- List endpoints filter by ownership or grant. The seeded “Q3 budget (restricted)” never appears in the viewer library.
- Admin may open metadata (`adminMetadataOnly`) but **download is denied** without a grant. Automated tests assert this.
- File bytes live in PostgreSQL `BYTEA`, not a public object URL.

### Denial of service

- Upload cap (`MAX_UPLOAD_BYTES`, default 8 MiB).
- JSON body cap 2 MiB.
- Login rate limiter (30 / 15 minutes / IP).

### Elevation of privilege

- Role checks on upload (`owner` or `admin`).
- Grant/revoke is **owner only**. Viewers cannot mint access for peers.
- Admin is not an implicit super-reader of file bytes.

## Residual risks (demo)

- No HSM or WORM storage; a DBA who can `UPDATE audit_logs` can corrupt the chain, but verification will fail.
- No object-lock / legal hold.
- JWT is not revoked server-side (logout is client-side).
- Embedded PGlite is for local/tests only; production must use PostgreSQL.
- Demo passwords are public by design.

## Mitigations implemented

1. Per-document `permissions` with immediate revoke.
2. Failed attempts recorded (`success = false`).
3. Hash chaining with genesis `0{64}` and admin verification.
4. Isolation tests in `tests/isolation.test.js`.
5. Helmet, CORS, parameterized SQL, bcrypt, JWT, upload limits.
