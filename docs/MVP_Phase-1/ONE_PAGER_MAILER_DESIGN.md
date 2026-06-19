# BrandsIQ One-Pager Mailer — Design Document

**Purpose:** Spec for a Google Apps Script tool that turns rows of prospect data into
personalized BrandsIQ "one-pager" flyers (Google Slides → PDF) and drafts a cold email
with the flyer attached. Hand this document to Claude Code for implementation.

**Status:** Design agreed. The BrandsIQ API contract is now resolved and implemented
(see Section 10): `POST /api/integrations/generate-response`, key-authenticated.

---

## 1. Goal

For each prospect (one row in a data sheet), produce a personalized one-pager that
demonstrates what BrandsIQ would write in reply to one of the prospect's own Google
reviews, then draft a cold email to that prospect with the one-pager attached as a PDF.

The workflow is split into **two manually-run phases** with a **human review step**
in between, so the operator can inspect and adjust each generated deck before any email
is drafted.

---

## 2. Architecture

- **One engine, many profiles.** The logic (read row → call BrandsIQ → build deck →
  substitute tokens → export PDF → draft email) is identical for every campaign. Only a
  small set of inputs varies per campaign, and those live in a **registry sheet**.
- **Bound to the registry sheet.** The script is bound to the `Marketing Profiles`
  spreadsheet. Being bound lets it expose a **custom menu built dynamically from the
  registry rows**, so adding a campaign is pure data entry (a new row) and a new menu
  item appears automatically. No code change per campaign.
- **Everything else is reached by ID.** Prospect spreadsheets, slide templates, and
  output folders are all opened by ID from the active profile. Prospect spreadsheets
  contain **no script** — they are data only.
- **Manual operation.** The operator runs Phase 1, reviews the decks, marks rows
  approved, then runs Phase 2. Nothing is scheduled or auto-sent in v1.

---

## 3. Resources

| Resource | Name | ID | Role |
| --- | --- | --- | --- |
| Registry spreadsheet | `Marketing Profiles` | `1_LBnyXwrgwdUxYRvkxGoEDl9mvqTlWcEMYCjnYJt_0Q` | Holds all campaign profiles; the script is **bound** to this file. Tab: `Profiles`. |
| Prospect spreadsheet (first profile) | `Germany Prospects` | `1D-sVXeOuCiKxdzBnOBzaarLtaseu22PEIE7BKkDsAyE` | Source data. Tab: `Berlin`. |
| Slide template (first profile) | `One pager_BrandsIQ_DE` | `1gDjt9fQggs4d5iiJXvu-Fg82F9Sp9WmUnBC5yYF4abw` | Template deck copied per prospect. |
| Output parent folder | `ColdEmails` | `1ZDtlh49nW7HMX9TC1Bi80ni_eN2j8ofL` | Where decks are generated and dated subfolders are created. |

Because the script is bound to `Marketing Profiles`, the registry ID does not need to be
hardcoded — the script reads its own active spreadsheet, tab `Profiles`. All other IDs
come from the profile being run.

---

## 4. Registry — `Marketing Profiles`, tab `Profiles`

One row per campaign. Header row is row 1.

| Column | Required | Used by script | Notes |
| --- | --- | --- | --- |
| `ProfileName` | yes | yes | Unique key, e.g. `DE-Berlin`, `DE-Hamburg`, `UK`. Drives the menu. |
| `SpreadsheetName` | no | no | Human-readable label only. |
| `SpreadsheetId` | yes | yes | Prospect data spreadsheet. |
| `TabName` | yes | yes | Tab within that spreadsheet. |
| `SlideTemplateName` | no | no | Human-readable label only. |
| `SlideTemplateId` | yes | yes | Template deck for this campaign. |
| `EmailSubject` | yes | yes | Subject template, may contain `{{tokens}}`. |
| `EmailBody` | yes | yes | Body template (multi-line cell OK), may contain `{{tokens}}`. |
| `FolderId` | yes | yes | Parent output folder. Defaults to `ColdEmails` if blank. |
| `FolderName` | no | no | Human-readable label only. |

First row already populated: **`DE-Berlin`**, pointing at `Germany Prospects` / `Berlin`,
template `One pager_BrandsIQ_DE`, folder `ColdEmails`, with German subject and body.

**Note on the email body cell:** line breaks inside the cell (Alt/Ctrl+Enter) are read as-is.
Tokens in the body resolve using the same global mapping as the slides (Section 5).

---

## 5. Global configuration (shared by all profiles)

These do **not** vary per campaign and live once in code.

### 5.1 Prospect-sheet columns the tool reads
- `Business Name`
- `Num of reviews per month`
- `Ratings`
- `Address`
- `Review`
- `Email`

Columns are referenced **by header name**, not position. The prospect sheet may contain
any number of other columns; they are ignored and untouched. Required columns must have
**unique, exactly-matching** headers.

### 5.2 Working columns the tool writes
- `Generated Response` — the BrandsIQ output (Section 7).
- `One Pager Link` — URL of the generated deck (written in Phase 1).
- `Status` — phase state (Section 8).
- `First Contact Date` — date the draft is created (written in Phase 2).
- `Follow-up 1 Date` — `First Contact Date` + 7 days (written in Phase 2).

### 5.3 Placeholder mapping (token → source)

There are two kinds of tokens. All are column lookups **except** `{{Generated Response}}`,
which is populated by a BrandsIQ call and then read from its column like any other.

| Token | Source |
| --- | --- |
| `{{Business Name}}` | column `Business Name` |
| `{{Address}}` | column `Address` |
| `{{NRPM}}` | column `Num of reviews per month` |
| `{{Ratings}}` | column `Ratings` |
| `{{Review}}` | column `Review` |
| `{{Generated Response}}` | column `Generated Response` (populated by the BrandsIQ call) |

The email templates use a subset of these tokens (`{{NRPM}}`, `{{Business Name}}`,
`{{Ratings}}`). The mapping must cover every token used in **either** the slide or the email.

### 5.4 Token rules
- Tokens must match **exactly** between the template and the mapping (case-sensitive,
  including spaces, e.g. `{{Business Name}}`). A mismatch leaves the literal token visible.
- Replacement preserves surrounding text and punctuation. `"{{Review}}"` →
  `"Great food, nice place"` (quotes retained).
- Substituted text inherits the placeholder's formatting (font, size, weight, colour).
  Each token in the template must be styled uniformly, braces included.

### 5.5 File-naming convention
- Deck: `One Pager_{Business Name}`
- PDF: `One Pager_{Business Name}.pdf`

---

## 6. Profile selection (dynamic menu)

On open (`onOpen`), the script reads the `Profiles` tab and builds a custom menu listing,
for each profile, two actions:

- `Generate one-pagers — {ProfileName}`  → runs Phase 1 for that profile
- `Draft approved — {ProfileName}`        → runs Phase 2 for that profile

Adding a registry row makes new menu items appear on the next open. The selected
`ProfileName` is passed to the engine; the engine loads that profile's row and resolves
all IDs and templates from it.

(The Apps Script editor's "Run" dropdown lists functions, not data, so the dynamic menu —
not the editor dropdown — is the intended way to pick a profile.)

---

## 7. Phase 1 — Generate one-pagers

Run manually via the menu for a chosen profile. Iterate the profile's prospect rows.
**Skip** any row that already has a `One Pager Link`, **or** whose `Status` is non-blank and
not `Error` (re-run safety). Rows left blank or marked `Error` remain eligible, so genuine
retries still work.

For each eligible row:

1. **Ensure the BrandsIQ response.** If `Generated Response` is empty, call the BrandsIQ
   generate capability (Section 10) with the row's `Review` (plus any inputs BrandsIQ
   requires) and write the returned text into the `Generated Response` column. If it is
   already populated, reuse it (no re-call).
2. **Copy the template** (`SlideTemplateId`) into the profile's parent folder
   (`FolderId`, default `ColdEmails`), named `One Pager_{Business Name}`.
3. **Substitute tokens** in the copy via `replaceAllText` for every mapped token
   (now all column lookups, including `Generated Response`), then `saveAndClose()`.
4. **Record state:** write the deck URL to `One Pager Link`, set `Status = Generated`.

Wrap each row in try/catch; on failure set `Status = Error: <message>` and continue.

**Outcome:** generated decks sit loose in the parent `ColdEmails` folder for review.
The flyer shows both the prospect's own review (`{{Review}}`) and BrandsIQ's reply to that
exact review (`{{Generated Response}}`).

**Excluding already-actioned rows.** To keep historical rows out of processing (e.g.
prospects emailed before this tool existed), set their `Status` to a terminal value such as
`Sent`. The skip rule above then excludes them from Phase 1, and Phase 2 ignores them because
they are not `Approved`. There is no need to populate `One Pager Link`. Avoid the reserved
values `Generated` / `Approved` / `Draft`.

---

## 8. Review hand-off (manual)

The operator opens each deck from `One Pager Link`, adjusts if needed, and sets
`Status = Approved` on rows that are ready. Only approved rows are processed by Phase 2.

The Review text boxes use **"shrink text on overflow"** autofit, set in the template and
inherited by every copy. **Opening each deck is required in v1, not optional.** The
shrink-to-fit scale is only recomputed when a deck is rendered/opened in the editor, so the
manual open is what guarantees long reviews and long generated responses actually fit.
Approving a deck **without opening it** risks overflowing or clipped text in the exported PDF
for long content.

**Future automation (noted, not planned).** Automating the open is non-trivial: a
programmatic `openById` is a server-side object access, not an editor render, so it does
**not** reliably recompute autofit. True automation would require either computing and
setting the font scale manually via the advanced Slides API (approximate and fiddly) or
removing reliance on autofit (fixed box sizing or truncating long responses). Revisit only if
blind-approve becomes a real need.

---

## 9. Phase 2 — Draft approved

Run manually via the menu for a chosen profile. Process only rows where `Status = Approved`.

For each such row:

1. **Resolve the dated subfolder.** Inside the parent folder, **find-or-create** a subfolder
   named with today's date in `YYYY-MM-DD` format (the draft date). If one already exists
   for today, reuse it — do not create a duplicate. (Drive allows same-named folders, so
   this must be an explicit find-then-create, not a blind create.)
2. **Export PDF** of the deck into that subfolder, named `One Pager_{Business Name}.pdf`.
3. **Move the deck** into the same subfolder. Moving does not change the deck's ID/URL, so
   `One Pager Link` stays valid.
4. **Build the email:** subject and body from the profile's `EmailSubject` / `EmailBody`
   templates with tokens substituted; recipient = `Email`; attach the PDF.
5. **Create a Gmail draft.** v1 is **draft-only** — never send directly.
6. **Record state:** set `Status = Draft`; write `First Contact Date` = today (the draft
   date) and `Follow-up 1 Date` = today + 7 days. Write these only after the draft succeeds.

Wrap each row in try/catch; on failure set `Status = Error: <message>` and continue.

**Date handling.** `First Contact Date` and `Follow-up 1 Date` are written as **real date
values** (Sheets dates), not text strings, so they sort and filter correctly.
`Follow-up 1 Date` is `First Contact Date` + 7 **calendar** days. Both derive "today" from the
script's timezone, which must be set to `Europe/Berlin` (so the date matches the local day and
aligns with the dated subfolder). Recommended column display format is `YYYY-MM-DD`; display
format is a Sheets cell setting and does not affect the script.

**Folder semantics:** the dated subfolder reflects the **day each row is drafted**. A batch
generated on one day but approved across several days will file into multiple dated folders
accordingly.

---

## 10. BrandsIQ integration — RESOLVED

Phase 1's review-response call uses a dedicated, key-authenticated BrandsIQ endpoint built
for exactly this raw-text use case. The original gap (the in-app generate endpoints all
require a logged-in user session, operate on a review already stored under a user account,
and consume credits) is resolved by a new standalone endpoint that takes raw text, runs the
real Claude generation pipeline, and returns the response body — no user, no stored review,
no credit deduction.

### Endpoint

```
POST {BASE_URL}/api/integrations/generate-response
```

`BASE_URL` is the BrandsIQ deployment the operator points at (production for real runs).

### Auth

Bearer API key in the `Authorization` header:

```
Authorization: Bearer {INTEGRATIONS_API_KEY}
```

The key is a self-generated random secret (e.g. `openssl rand -base64 32`). It must be set
**identically** in two places:
- BrandsIQ server env var `INTEGRATIONS_API_KEY` (Vercel for prod; `.env.local` for dev).
- The Apps Script **Script Properties** under `INTEGRATIONS_API_KEY` (Section 11), read via
  `PropertiesService.getScriptProperties()`. Never in code or the registry.

It is a **separate** secret from any other BrandsIQ credential and is required in every
environment (no dev bypass). The BrandsIQ `ANTHROPIC_API_KEY` is **never** placed in the
Apps Script — generation happens server-side.

### Request

JSON body. Only `reviewText` is required.

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `reviewText` | yes | string | The prospect's `Review`. 1–4000 chars. |
| `rating` | no | number 1–5 | The prospect's `Ratings`, if available. Helps anchor the response. |
| `platform` | no | string | Defaults to `"Google"`. |

```json
{ "reviewText": "Tolles Essen, sehr freundlicher Service!", "rating": 5, "platform": "Google" }
```

> **Note — no language parameter.** The response is generated in the **review's own
> detected language** (BrandsIQ default). A German review yields a German response, which
> is what the DE-Berlin campaign needs. There is intentionally no language override: an
> occasional non-German source review will produce a non-German response. (If a per-campaign
> language lock is ever wanted, it is an additive change — out of scope now.)

### Response

```json
{
  "success": true,
  "data": {
    "responseText": "Vielen Dank für Ihre wunderbare Bewertung! ...",
    "model": "claude-sonnet-4-20250514",
    "language": "German"
  }
}
```

`data.responseText` is the **body only** — no salutation or sign-off (the deck supplies its
own framing). Write it into the `Generated Response` column. `data.language` is the detected
language the reply is in (informational). Generation uses BrandsIQ's **default brand voice**
(the prospect has none configured).

### Errors (standard envelope: `{ success: false, error: { code, message } }`)

| Status | `code` | When |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | Missing/invalid Bearer key |
| 400 | `VALIDATION_ERROR` | Missing/invalid `reviewText` or unparseable body |
| 429 | `RATE_LIMIT_EXCEEDED` | Per-IP AI rate limit (10/min); back off and retry |
| 503 | `API_NOT_CONFIGURED` | Server missing `INTEGRATIONS_API_KEY` or `ANTHROPIC_API_KEY` |
| 500 | `INTERNAL_ERROR` | Unexpected generation failure |

### Apps Script call (reference)

```js
const props = PropertiesService.getScriptProperties();
const resp = UrlFetchApp.fetch(props.getProperty("BRANDSIQ_BASE_URL") + "/api/integrations/generate-response", {
  method: "post",
  contentType: "application/json",
  headers: { Authorization: "Bearer " + props.getProperty("INTEGRATIONS_API_KEY") },
  payload: JSON.stringify({ reviewText: review, rating: rating, platform: "Google" }),
  muteHttpExceptions: true,
});
const code = resp.getResponseCode();
const json = JSON.parse(resp.getContentText());
if (code === 200 && json.success) {
  return json.data.responseText; // → Generated Response column
}
// 429 → back off and retry; 401/503 → alert the operator; others → mark Error.
```

**Implementation (BrandsIQ side):** `src/app/api/integrations/generate-response/route.ts`,
schema `integrationGenerateSchema` in `src/lib/validations.ts`. The path is intentionally
outside the session-protected route list so it self-authenticates via the Bearer key (same
convention as `/api/cron`).

---

## 11. Secrets

- The BrandsIQ API credential lives in **Script Properties**
  (`PropertiesService.getScriptProperties()`), set via the editor's Project Settings (gear) →
  Script Properties.
- The credential must be a **BrandsIQ API key / token, not login (email/password)
  credentials.** A script cannot replay BrandsIQ's interactive OAuth/session login, and
  passwords must not be stored. If BrandsIQ does not yet issue API keys for programmatic
  access, that is part of the contract gap in Section 10.
- No secret is stored in code or in the registry sheet.

---

## 12. Constraints & quotas

- **6 minutes per single execution** (hard limit, consumer and Workspace alike). One run is
  capped at 6 minutes.
- **No weekly or monthly cap.** Quotas are per-execution and per-day; per-day quotas reset
  24 hours after the first run.
- **Handling large batches without batching machinery:** because Phase 1 skips rows that
  already have a `One Pager Link` or a completed `Status` (and reuses an existing
  `Generated Response`), if a run
  hits the 6-minute limit partway through, the operator simply **re-runs and it continues
  from where it stopped.** Trigger-chaining is an optional future automation, not required.
- **URL fetch (BrandsIQ calls):** 20,000/day consumer (100,000 Workspace) — far above need.
- **Email:** sending is 100 recipients/day consumer (1,500 Workspace). v1 only creates
  drafts, which do not consume the send quota. Relevant only if direct-send is added later.

---

## 13. Status lifecycle

`(empty)` → `Generated` (Phase 1) → `Approved` (set manually by operator) → `Draft` (Phase 2).
`Error: <message>` on any per-row failure. `Status` plus `Generated Response` make both
phases idempotent and safe to re-run.

---

## 14. Error handling

- Per-row try/catch in both phases; a failing row is marked `Error: <message>` and does not
  stop the batch.
- Missing required column header → fail fast with a clear message before processing rows.
- Phase 2 row missing `Email` or `One Pager Link` → mark `Error`, skip.

---

## 15. Open items

- **BrandsIQ contract** (Section 10) — **RESOLVED.** Endpoint, auth, request/response, and the
  raw-text generation path are specified and implemented
  (`POST /api/integrations/generate-response`).
- **Profile selection** confirmed as the dynamic menu (script bound to `Marketing Profiles`).
- **German copy** should get a native-speaker review before sending at scale (operator note;
  does not affect implementation).
- **Email signature line** in the DE-Berlin body ends with a bare phone number — operator to
  confirm formatting. Static text, no implementation impact.

---

## 16. Implementation notes for Claude Code

- Reference columns by header name (build a header → index map); ignore unlisted columns.
- Token substitution: replace each mapped token globally; leave unmapped tokens untouched.
- `saveAndClose()` the deck after `replaceAllText` and before exporting to PDF.
- Find-or-create the dated subfolder by listing the parent's folders and matching the
  `YYYY-MM-DD` name; create only if absent.
- Keep the engine profile-agnostic; the menu/wrapper passes a `ProfileName` in.
- Language-agnostic: the script does not care about the language of templates or email copy.
- Set the Apps Script project timezone to `Europe/Berlin`; the date columns and the dated
  subfolder both derive "today" from it.
