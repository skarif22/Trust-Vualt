# TrustVault

Secure document sharing with a **tamper-evident, hash-chained audit trail**. Owners grant and revoke access per file. Administrators watch the ledger — they do not get a silent master key to file bytes.

## Roles

| Role | Capabilities |
| --- | --- |
| **Administrator** | Global activity ledger, chain verification, document metadata. **Cannot** download a file without a grant or ownership. |
| **Document owner** | Upload, folders, search, grant/revoke read or edit, delete own files, see that file’s trail. |
| **Viewer** | See and download only granted documents. Edit only when `can_edit` is set. |

## Test accounts (seeded)

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@trustvault.dev` | `Admin123!` |
| Document owner | `owner@trustvault.dev` | `Owner123!` |
| Viewer | `viewer@trustvault.dev` | `Viewer123!` |

Seeded files:

- **ACME mutual NDA** — viewer has read.
- **Lab collaboration notes** — viewer has edit.
- **Q3 budget (restricted)** — no grants (isolation target).

## Live demo

- **App URL:** _set after Render/Heroku deploy_
- **Source:** _set after the GitHub repository is published_

Until those are live, run locally (below). The Docker image and `render.yaml` are ready for a single web service plus PostgreSQL.

## Architecture

```
React (Vite)  →  Express 5  →  PostgreSQL
                     │
                     ├─ JWT (Authorization: Bearer)
                     ├─ documents + permissions
                     └─ audit_logs (prev_hash → SHA-256 entry_hash)
```

Local tests and laptop demos can use **PGlite** (embedded Postgres) when `DATABASE_URL` is unset. Production should always set a Postgres `DATABASE_URL`.

## Local setup

Requires **Node.js 20+**.

```bash
copy .env.example .env
npm install
cd client && npm install && cd ..
npm test
```

API (serves the built UI if `client/dist` exists):

```bash
npm run build
npm start
```

Open [http://localhost:8080](http://localhost:8080).

Frontend hot reload (proxy to the API):

```bash
npm run dev
# other terminal
npm run dev:client
```

Then open [http://localhost:5173](http://localhost:5173).

### PostgreSQL instead of PGlite

```bash
docker compose up db -d
# .env
# DATABASE_URL=postgres://trustvault:trustvault@localhost:5432/trustvault
npm start
```

Full stack in containers:

```bash
docker compose up --build
```

## Deploy (Render or Heroku)

### Render

1. Create a PostgreSQL instance and a **Web Service** from this repo using the Dockerfile.
2. Set `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `SEED_ON_START=true`.
3. Health check: `/api/health`.
4. Blueprint: `render.yaml`.

### Heroku

```bash
heroku create trustvault-demo
heroku addons:create heroku-postgresql:essential-0
heroku config:set NODE_ENV=production JWT_SECRET=long-random SEED_ON_START=true
heroku stack:set container   # or build the Node process after npm run build
git push heroku main
```

The `Procfile` runs `node server/index.js`. Run `npm run build` in a Heroku Node build, or deploy the Docker image (`heroku stack:set container` + `heroku.yml` equivalent: this repo’s Dockerfile).

Environment:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres URL (required in production) |
| `JWT_SECRET` | Signing key (required in production) |
| `PORT` | Bound by the platform |
| `SEED_ON_START` | `true` to load demo accounts if the DB is empty |
| `MAX_UPLOAD_BYTES` | Default 8388608 (8 MiB) |

## API sketch

- `POST /api/auth/register` `{ name, email, password, role: "viewer"|"owner" }`
- `POST /api/auth/login`
- `GET /api/documents?q=&folderId=`
- `POST /api/documents` multipart `file`, `title`, `description`, `folderId`
- `GET|PUT|DELETE /api/documents/:id`
- `GET /api/documents/:id/download`
- `POST /api/documents/:id/permissions` `{ email, canRead, canEdit }`
- `DELETE /api/documents/:id/permissions/:userId`
- `GET /api/admin/audit` · `GET /api/admin/audit/verify`

## Tests

```bash
npm test
```

`tests/isolation.test.js` proves list filtering, download denial, admin byte isolation, read vs edit, instant revoke, and owner-only grants.

`tests/audit-chain.test.js` proves genesis chaining, failed-login append, and tamper detection.

## Hash chain

```
entry_hash = SHA-256(
  prev_hash | ISO timestamp | actor_id | actor_email |
  action | resource_type | resource_id | success | JSON metadata
)
```

The first `prev_hash` is 64 zero hex characters.

## Docs

- [THREATS.md](./THREATS.md) — STRIDE model
- [PROMPTS.md](./PROMPTS.md) — specification prompts
- [DEMO.md](./DEMO.md) — video script

## License

MIT
