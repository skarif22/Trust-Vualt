# SilicaVault five-minute demo video script

**Recording status:** This script is ready; an actual video recording has not been created yet. Record the live app and a terminal at a readable resolution. Use the public demo accounts listed in `README.md` and avoid displaying real or personal files.

## 0:00–0:25 — What the app does

**Show:** Title card, then `https://silicavault.netlify.app`.

**Say:** “SilicaVault is a document-sharing demo built around per-document permissions and a hash-chained activity ledger. It has administrator, document-owner, and viewer roles. In this walkthrough I’ll show what each role can see, how a read grant works, and what the audit trail can and cannot prove.”

## 0:25–1:05 — Owner library and document permissions

**Show:** Sign in with the Document owner demo button. Open the library and the seeded **ACME mutual NDA**.

**Say:** “Jordan owns these documents. A grant belongs to one document and one named account; folders are for organization and do not grant inherited access. The NDA has a read-only grant for Priya. The lab notes have edit access. The restricted Q3 budget has no viewer grant.”

Point out the owner controls, grant rows, and document details. Do not change or revoke seeded grants during this recording.

## 1:05–1:45 — Viewer access

**Show:** Sign out, choose the Viewer demo button, then open the library and the NDA.

**Say:** “Priya sees the NDA and the lab notes because she has grants for those specific documents. The restricted budget is not in her library. Opening a document and downloading its bytes use separate server routes; the download route checks the current owner or grant before returning content.”

Point out the NDA’s description and the available Download control. Do not claim that opening the detail page creates a successful-view audit event; that event is not currently implemented.

## 1:45–2:30 — Read and edit boundaries, plus revoke behavior

**Show:** Open the NDA and point out that it is read-only. Then show the isolation test names in `tests/isolation.test.js` or a pre-run test result.

**Say:** “A read grant permits viewing and downloading, but does not permit edits. An edit grant also allows reading. Revoke removes the grant row, and the next request checks the database again. The automated test downloads before revoke and verifies that the next download is denied afterward. I’m showing that behavior through the test suite so this recording does not alter the shared production demo grants.”

## 2:30–3:15 — Administrator oversight

**Show:** Sign out, use the Administrator demo button, and open **Admin ledger**. Then open the restricted budget’s metadata page and point to **Download blocked**.

**Say:** “The administrator can review global activity and document metadata, including this restricted budget’s record. Admin role alone does not grant access to file bytes. The API has a separate download check, so the metadata view is not a download permission.”

## 3:15–4:00 — Audit events and tests

**Show:** Return to the ledger. Point out upload, permission-grant, sign-in, and failed-event rows. Then show `npm test` with the passing test summary.

**Say:** “Each audit entry stores the previous hash and a SHA-256 hash of the event fields. The tests include denied downloads, administrator byte isolation, read-versus-edit behavior, immediate revoke, failed login recording, and hash-tamper detection. The suite passed all ten tests in the checked workspace.”

## 4:00–5:00 — Design choices, limits, and close

**Show:** Briefly show the permission table in `README.md`, then finish on the live URL and repository.

**Say:** “The permission model is intentionally per document: owner access is implicit, and named grants provide read or edit. There are no folder-inherited grants or public links. File bytes are stored in PostgreSQL, and the audit chain is tamper-evident: changing a row breaks verification. The demo does not use WORM storage or an external hash anchor, so a database operator with write access could rewrite the ledger. A successful document-detail view is not currently logged; search lacks owner and date filters; uploads are size-limited but do not validate file signatures or scan for malware. Those are unfinished items, documented in the threat and prompt records. The demo shows the current implementation and its limits.”

Fade out with the app URL, repository URL, and “Demo credentials are in README.md.”

