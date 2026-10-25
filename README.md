# SilicaVault

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

- **App URL (Netlify):** [https://silicavault.netlify.app](https://silicavault.netlify.app)
- **Backend and API (Render):** [https://silicavault.onrender.com](https://silicavault.onrender.com)
- **Source:** [https://github.com/skarif22/Trust-Vualt](https://github.com/skarif22/Trust-Vualt)

The app is deployed on Render with PostgreSQL. The optional `netlify.toml` publishes the React client on Netlify and proxies `/api/*` requests to the Render backend.

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

## API and access permissions

Unless an endpoint is marked **Public**, send the JWT as `Authorization: Bearer <token>`. The API reloads the account and checks the document owner/grant on each request. An administrator can inspect document metadata, but has no implicit permission to read file bytes.

### Authentication

| Method and endpoint | Who may call it | Behavior |
| --- | --- | --- |
| `GET /api/health` | Public | Health check; returns service status only. |
| `POST /api/auth/register` | Public | Creates a viewer by default or an owner when `role` is `owner`. Registration cannot create an administrator. |
| `POST /api/auth/login` | Public | Authenticates an account; rate-limited. Failed credentials are audited. |
| `GET /api/auth/me` | Any signed-in user | Returns the caller's own account details. |
| `GET /api/auth/users` | Owner or administrator | Lists account names, emails, roles, and creation dates for the grant picker. |

### Documents and folders

| Method and endpoint | Who may call it | Behavior |
| --- | --- | --- |
| `GET /api/documents?q=&folderId=` | Any signed-in user | Owners see their documents; viewers see only documents with a read or edit grant; administrators see document metadata. Search and folder filtering do not bypass those visibility rules. |
| `GET /api/documents/folders` | Any signed-in user | Lists folders owned by the caller. |
| `POST /api/documents/folders` | Owner or administrator | Creates a folder owned by the caller. Body: `{ "name": "..." }`. |
| `POST /api/documents` | Owner or administrator | Uploads one file (maximum 8 MiB by default). Multipart fields: `file`, `title`, `description`, optional `folderId`. A supplied folder must belong to the caller. |
| `GET /api/documents/:id` | Document owner, user with read/edit grant, or administrator | Returns metadata. An administrator without a grant receives metadata only; an ungranted viewer is denied. |
| `PUT /api/documents/:id` | Document owner or user with edit grant | Updates document details and may replace the file. Read-only grants and administrators without ownership/edit grant are denied. |
| `DELETE /api/documents/:id` | Document owner only | Deletes the document. Edit grants do not include delete permission. |
| `GET /api/documents/:id/download` | Document owner or user with read/edit grant | Returns file bytes. Administrators need an explicit grant or ownership; metadata access alone is insufficient. |
| `GET /api/documents/:id/audit` | Document owner or administrator | Reads the document's audit events. A viewer grant does not include access to this trail. |

### Permissions

| Method and endpoint | Who may call it | Behavior |
| --- | --- | --- |
| `POST /api/documents/:id/permissions` | Document owner only | Grants or updates access for an existing account. Body: `{ "email": "person@example.com", "canRead": true, "canEdit": false }`. Edit also implies read. |
| `DELETE /api/documents/:id/permissions/:userId` | Document owner only | Revokes that account's grant. The next document request rechecks the database grant. |

### Administrator

| Method and endpoint | Who may call it | Behavior |
| --- | --- | --- |
| `GET /api/admin/overview` | Administrator only | Counts users, documents, grants, failed events, and returns recent activity. |
| `GET /api/admin/audit?q=&action=&success=` | Administrator only | Searches the global audit ledger (up to 400 events). |
| `GET /api/admin/audit/verify` | Administrator only | Recomputes the SHA-256 chain and reports integrity. |
| `GET /api/admin/users` | Administrator only | Lists account metadata and document counts. |

Requests that fail authentication or authorization return `401` or `403` and are audited where the route can identify the attempted action. A missing document returns `404`.

## Tests

```bash
npm test
```

`tests/isolation.test.js` proves list filtering, direct detail-read and download denial, admin byte isolation, read vs edit, immediate revoke for detail and download routes, viewer delete denial (including an edit-granted file), and owner-only grants. Denied direct read/delete attempts are checked in the audit log, and delete tests verify the documents remain stored.

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
- [PROMPTS.md](./PROMPTS.md) — dated prompt and review log
- [PROJECT_WRITEUP.md](./PROJECT_WRITEUP.md) — permission model, design choices, AI use, and open work
- [DEMO.md](./DEMO.md) — five-minute video script; recording status is stated in the file

## License

MIT

