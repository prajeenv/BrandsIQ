/**
 * Config.gs — constants shared by every other file.
 *
 * Apps Script merges all .gs files in a project into one global scope, so the
 * names declared here are visible everywhere. Keep this file free of logic.
 *
 * Spec: docs/MVP_Phase-1/ONE_PAGER_MAILER_DESIGN.md (Sections 4, 5, 10).
 */

// Tab in the bound "Marketing Profiles" registry spreadsheet that holds one row
// per campaign. The registry spreadsheet ID is NOT hardcoded — the script is
// bound to it and reads its own active spreadsheet (Section 3).
var PROFILES_TAB = "Profiles";

// Menu shown in the spreadsheet UI.
var MENU_TITLE = "BrandsIQ Mailer";

// ── Registry columns (Marketing Profiles → Profiles tab) ──────────────────
// Only the fields the engine actually uses are validated as required. The
// "label only" columns (SpreadsheetName, SlideTemplateName, FolderName) are
// ignored. FolderId is intentionally NOT in this list — it may be blank and
// falls back to DEFAULT_FOLDER_ID (Section 4 note + Section 7).
var PROFILE_REQUIRED_FIELDS = [
  "ProfileName",
  "SpreadsheetId",
  "TabName",
  "SlideTemplateId",
  "EmailSubject",
  "EmailBody",
];

// All registry columns the script reads into a profile object (required +
// optional). FolderId is read but allowed blank.
var PROFILE_FIELDS = PROFILE_REQUIRED_FIELDS.concat(["FolderId"]);

// ── Prospect-sheet columns ────────────────────────────────────────────────
// Columns the tool READS, by exact header name (Section 5.1).
var PROSPECT_READ_HEADERS = [
  "Business Name",
  "Num of reviews per month",
  "Ratings",
  "Address",
  "Review",
  "Email",
];

// Working columns the tool WRITES (Section 5.2). These must exist in the
// prospect sheet so the script has somewhere to record state.
var PROSPECT_WRITE_HEADERS = [
  "Generated Response",
  "One Pager Link",
  "Status",
  "First Contact Date",
  "Follow-up 1 Date",
];

// Every header that must be present, exact, and unique before processing.
var REQUIRED_PROSPECT_HEADERS = PROSPECT_READ_HEADERS.concat(PROSPECT_WRITE_HEADERS);

// ── Token → source-column mapping (Section 5.3) ───────────────────────────
// Each token maps to a prospect-sheet column header. {{Generated Response}}
// is populated by the BrandsIQ call first, then read from its column like any
// other. Tokens are matched case-sensitively, braces included (Section 5.4),
// in BOTH the slide deck and the email subject/body.
var TOKEN_TO_COLUMN = {
  "{{Business Name}}": "Business Name",
  "{{Address}}": "Address",
  "{{NRPM}}": "Num of reviews per month",
  "{{Ratings}}": "Ratings",
  "{{Review}}": "Review",
  "{{Generated Response}}": "Generated Response",
};

// ── File naming (Section 5.5) ─────────────────────────────────────────────
// {name} is the Business Name.
function deckName(businessName) {
  return "One Pager_" + businessName;
}
function pdfName(businessName) {
  return "One Pager_" + businessName + ".pdf";
}

// ── Status lifecycle (Section 13) ─────────────────────────────────────────
var STATUS_GENERATED = "Generated";
var STATUS_APPROVED = "Approved";
var STATUS_DRAFT = "Draft";
var STATUS_ERROR_PREFIX = "Error";

// ── Output folder fallback (Section 3 / Section 4) ────────────────────────
// Used when a profile's FolderId is blank. This is the "ColdEmails" parent
// folder from the design doc's Resources table.
var DEFAULT_FOLDER_ID = "1ZDtlh49nW7HMX9TC1Bi80ni_eN2j8ofL";

// ── Script Properties keys (Section 10 / 11) ──────────────────────────────
// Set via the Apps Script editor: Project Settings (gear) → Script Properties.
// Never hardcode the values here.
var PROP_BASE_URL = "BRANDSIQ_BASE_URL";
var PROP_API_KEY = "INTEGRATIONS_API_KEY";

// BrandsIQ endpoint path appended to BRANDSIQ_BASE_URL.
var BRANDSIQ_GENERATE_PATH = "/api/integrations/generate-response";

// ── BrandsIQ request limits (mirrors integrationGenerateSchema) ───────────
// reviewText must be 1–4000 chars or the endpoint returns 400. The script
// errors such rows rather than calling (operator decision).
var REVIEW_MAX = 4000;
var PLATFORM = "Google";

// ── 429 backoff tuning (Section 12: 6-min execution ceiling) ──────────────
// Up to MAX_RETRIES retries on a 429, sleeping BASE_BACKOFF_MS * 2^attempt
// (plus jitter). Worst case ~14s of sleep per call — well under 6 minutes.
var MAX_RETRIES = 3;
var BASE_BACKOFF_MS = 2000;
var MAX_JITTER_MS = 500;

// ── Timezone (Section 9 / 16) ─────────────────────────────────────────────
// Authoritative copy is in appsscript.json ("timeZone"). Used for the dated
// subfolder name and the date columns so "today" matches the local day.
var TIMEZONE = "Europe/Berlin";

// Max length of an error message written into the Status cell (keeps the cell
// readable; full errors still go to the execution log).
var STATUS_ERROR_MAX_LEN = 250;
