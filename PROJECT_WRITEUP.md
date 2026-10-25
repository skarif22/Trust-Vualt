# SilicaVault project write-up

## What I built

SilicaVault is a web demo for document sharing with three roles: administrator, document owner, and viewer. The React client uses an Express API and PostgreSQL. Users authenticate with JWTs; file bytes are stored in PostgreSQL rather than in public file URLs. The app supports folders, per-document read/edit grants, owner grant/revoke controls, and an administrator activity ledger with SHA-256 hash chaining.

## Permission model

The document is the access boundary. Its owner has full control. A named account can receive a read grant or an edit grant; edit also implies read. A read grant allows the document metadata page and download, while an edit grant additionally allows changes. Editing does not grant delete permission. The server reloads the caller's user record and checks the current document owner or grant on each protected request. Revocation removes the grant, so the next API request is denied. The administrator can inspect document metadata and the global ledger, but admin role alone does not provide file-byte access.

## What I chose not to build

This demo has no folder-inherited permissions, public share links, document version history, malware scanning, SSO, or external WORM audit storage. Keeping the implementation focused made the core per-document permission checks easier to inspect and test. The hash chain detects ordinary row changes, but a database operator with write access could rewrite the chain; a separately controlled immutable anchor is not implemented.

## AI use and review

AI helped draft the API, React screens, threat notes, and tests. The first API pass did not include HTTP-level tests proving isolation, and the first hash-chain implementation had no test that changed a stored hash. I added route-level isolation tests and a tamper-detection test after reviewing those gaps. The first interface also missed the requested SilicaVault branding and visual direction, so it was revised. The dated prompts, findings, and correction commits are in [`PROMPTS.md`](./PROMPTS.md).

## Unfinished work and limits

- Successful document-detail page reads are not currently recorded as audit events; downloads and other implemented actions are logged.
- Search covers title, filename, description, and folder, but not owner or date.
- Uploads are limited by size and file count, but file type/signature validation and malware scanning are absent.
- The test suite does not yet cover every direct unauthorized detail-read and delete path.
- Document changes and their audit writes are separate operations, and concurrent audit writers are not serialized. The chain may therefore be incomplete or fork under a failure or concurrent writes.
- The local test suite passed all 10 tests when checked on 2026-10-25. That result does not cover the gaps above or replace a security review of the deployed service.

The live demo is at [silicavault.netlify.app](https://silicavault.netlify.app/); seeded account credentials are in [`README.md`](./README.md). The five-minute walkthrough is in [`DEMO.md`](./DEMO.md). The script is ready, but an actual video recording still needs to be made.

