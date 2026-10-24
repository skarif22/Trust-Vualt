# TrustVault demo video script (~3 minutes)

Record at 1920×1080. Speak at a calm, precise pace. Show the URL and test accounts on a title card for 5 seconds.

---

**[0:00–0:15] Title**

> “TrustVault is secure document sharing with a hash-chained audit trail. Three roles: administrator, document owner, and viewer. Isolation is enforced on every download — and proven with tests.”

Show the GitHub README credentials.

**[0:15–0:40] Owner login and library**

Log in as `owner@trustvault.dev` / `Owner123!`.

> “Jordan Hale is a document owner. The library is organized into folders. Search filters by title and file name. The Q3 budget is restricted — nobody else has a grant.”

Open **Q3 budget (restricted)**. Point at empty grants.

**[0:40–1:10] Grant and viewer isolation**

Open **ACME mutual NDA**. Show Priya’s read grant.

> “Priya the viewer may read the NDA. She must never see the budget.”

Sign out. Log in as `viewer@trustvault.dev` / `Viewer123!`.

Show the library: NDA and lab notes appear; **budget does not**.

Click into the NDA, download it. Attempt to edit — denied if you open the network panel, or skip to lab notes which have edit.

**[1:10–1:35] Instant revoke**

Switch back to the owner. On the NDA, click **Revoke**.

Switch to the viewer, refresh, try download.

> “Revoke is a row delete, not a cache flag. The next request is 403 and lands on the ledger as a failed attempt.”

**[1:35–2:10] Admin dashboard — not a master key**

Log in as `admin@trustvault.dev` / `Admin123!`.

Open **Admin ledger**. Point at **Chain intact**, failed events, hash prefixes.

Open the restricted budget from the library.

> “Admins can inspect metadata. Download stays blocked. Oversight without silent super-user access.”

Click **Download blocked** / show the banner “Admin metadata view”.

**[2:10–2:35] Chain verification**

Stay on the ledger. Filter **Denied / failed**.

> “Every event hashes the previous tip. If someone tampers with a stored hash, verification fails. Our automated suite flips a hash on purpose and expects the chain to report broken.”

Optionally show a terminal: `npm test`.

**[2:35–3:00] Close**

> “TrustVault: JWT auth, per-document read and edit grants, instant revoke, and a tamper-evident trail. Test accounts are in the README. Isolation is not a slide — it is a failing status code and a test.”

Fade to repo URL + live URL.
