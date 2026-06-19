# One-Pager Mailer — Google Apps Script

A bound Google Apps Script that turns rows of prospect data into personalized
BrandsIQ "one-pager" flyers (Google Slides → PDF) and drafts a cold email with
the flyer attached.

> **This is not part of the Next.js build.** These `.gs` files are pasted into
> the Google Apps Script editor. They are version-controlled here for review and
> history only — nothing imports, compiles, or lints them as part of the app.

**Authoritative spec:** [`docs/MVP_Phase-1/ONE_PAGER_MAILER_DESIGN.md`](../../docs/MVP_Phase-1/ONE_PAGER_MAILER_DESIGN.md)

---

## What it does

Two manually-run phases with a human review step between:

1. **Generate one-pagers** — for each eligible prospect row: call BrandsIQ for an
   AI reply to the prospect's own review, copy the slide template, substitute
   tokens, and record the deck link. Decks sit loose in the parent folder.
2. **(You) review** — open each generated deck, confirm the text fits, set
   `Status = Approved` on the rows that are ready.
3. **Draft approved** — for each approved row: export the deck to PDF into a
   dated subfolder, move the deck there, and create a Gmail **draft** (never
   sent) to the prospect with the PDF attached.

It is **profile-driven**: one row per campaign in the bound `Marketing Profiles`
registry. Adding a campaign is pure data entry — no code change.

---

## Files

| File | Responsibility |
| --- | --- |
| `appsscript.json` | Manifest: timezone (`Europe/Berlin`), V8, OAuth scopes |
| `Config.gs` | Constants: headers, token map, property keys, defaults |
| `Menu.gs` | `onOpen` menu + the two handlers + the profile picker |
| `Engine.gs` | `runPhase1` / `runPhase2`, row loops, skip logic, error guard |
| `Brandsiq.gs` | The generate-response call + 429 backoff |
| `Sheets.gs` | Registry/profile loading, header map, by-header cell access |
| `Slides.gs` | Template copy, token substitution, PDF export |
| `Drive.gs` | Dated subfolder find-or-create, deck move |
| `Gmail.gs` | Draft creation |

Apps Script merges all `.gs` files into one global scope, so the split is purely
for readability — function names are globally unique.

---

## Install

1. **Open the editor under the right account.** Open the `Marketing Profiles`
   spreadsheet, then **Extensions → Apps Script**. If you have multiple Google
   accounts signed in and it fails to open, use an **Incognito window signed into
   only the account that owns the spreadsheet**.
2. **Paste the files.** In the editor, create one script file per `.gs` above
   (the `+` next to "Files") and paste each file's contents. Replace the default
   `Code.gs` or leave it empty.
3. **Set the manifest.** In **Project Settings**, tick *"Show appsscript.json
   manifest file in editor"*, then open `appsscript.json` and replace it with
   this folder's `appsscript.json` (sets the timezone and OAuth scopes).
4. **Confirm the timezone** is `Europe/Berlin` (Project Settings → Time zone, or
   the manifest above).
5. **Set Script Properties** (Project Settings → Script Properties → Add):
   - `BRANDSIQ_BASE_URL` — the deployed BrandsIQ URL, no trailing slash
     (e.g. `https://brandsiq.app`).
   - `INTEGRATIONS_API_KEY` — the same key set on the BrandsIQ server
     (Vercel env var `INTEGRATIONS_API_KEY`). They must match exactly.
6. **Authorize.** Reload the spreadsheet; the **BrandsIQ Mailer** menu appears.
   The first run triggers Google's OAuth consent screen — approve the requested
   scopes (Sheets, Slides, Drive, Gmail compose, external requests).

---

## Operate

- **BrandsIQ Mailer → Generate one-pagers…** → pick a profile → Phase 1 runs.
  A toast reports how many were generated / skipped / errored.
- Open each generated deck from its `One Pager Link`, confirm the text fits
  (see the autofit note below), and set `Status = Approved`.
- **BrandsIQ Mailer → Draft approved…** → pick a profile → Phase 2 runs.
  Check Gmail → Drafts.

### Registry (`Marketing Profiles` → `Profiles` tab)

One row per campaign. Required: `ProfileName`, `SpreadsheetId`, `TabName`,
`SlideTemplateId`, `EmailSubject`, `EmailBody`. `FolderId` may be blank (falls
back to the default ColdEmails folder). The rest are human-readable labels.

### Prospect sheet

Read columns (exact header names): `Business Name`, `Num of reviews per month`,
`Ratings`, `Address`, `Review`, `Email`. Written columns: `Generated Response`,
`One Pager Link`, `Status`, `First Contact Date`, `Follow-up 1 Date`. These
written columns **must exist** (the script validates headers before processing).

### Tokens

`{{Business Name}}`, `{{Address}}`, `{{NRPM}}`, `{{Ratings}}`, `{{Review}}`,
`{{Generated Response}}` — usable in the slide template and the email
subject/body. Exact, case-sensitive match (braces included). A mismatch leaves
the literal token visible.

---

## Things to know

- **Draft-only.** v1 never sends email. It creates Gmail drafts.
- **Idempotent + resumable.** Phase 1 skips rows that already have a
  `One Pager Link` or a completed `Status`, and reuses an existing
  `Generated Response` (no re-call). If a run hits Apps Script's 6-minute limit,
  just **run it again** — it continues from where it stopped.
- **Autofit caveat.** The Review/response text boxes use "shrink text on
  overflow". The script saves the deck but a server-side save does **not**
  recompute autofit — only opening the deck in the editor does. **Open each deck
  during review**; approving without opening risks clipped text in the PDF.
- **Bad reviews.** An empty or >4000-char `Review` is marked
  `Status = Error: …` and skipped (the API would reject it).
- **Errors don't stop the batch.** Any per-row failure sets
  `Status = Error: <message>` and the run continues. Fix and re-run; `Error`
  rows are eligible again.
- **Status lifecycle:** `(empty)` → `Generated` → `Approved` (you) → `Draft`.
  To exclude historical rows, set their `Status` to a terminal value like
  `Sent` (avoid `Generated` / `Approved` / `Draft`).
