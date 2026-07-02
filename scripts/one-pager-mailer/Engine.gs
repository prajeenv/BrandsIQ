/**
 * Engine.gs — the profile-agnostic two-phase engine.
 *
 * Phase 1: generate a one-pager deck per eligible prospect row.
 * Phase 2: for approved rows, export the PDF and draft the cold email.
 *
 * The engine receives a ProfileName (chosen via the menu picker) and resolves
 * everything else from that profile. Per-row work is wrapped so one bad row
 * never aborts the batch. Per-row writes are immediate, so a 6-minute timeout
 * mid-batch leaves completed rows recorded and the run is simply re-run to
 * continue (Sections 7, 9, 12, 13, 14).
 *
 * Spec: docs/MVP_Phase-1/ONE_PAGER_MAILER_DESIGN.md.
 */

/**
 * Phase 1 — generate one-pagers for a profile.
 * @param {string} profileName
 */
function runPhase1(profileName) {
  var profile = loadProfile(profileName);
  var sheet = openProspectSheet(profile);
  var headerMap = buildHeaderMap(sheet); // fails fast on bad headers

  var range = sheet.getDataRange();
  var values = range.getValues();
  var processed = 0;
  var skipped = 0;
  var errored = 0;

  for (var r = 1; r < values.length; r++) {
    var rowValues = values[r];
    var rowNumber = r + 1; // 1-based sheet row

    // Not a real prospect row (no Business Name) → skip SILENTLY. Business Name
    // is the identifying column, so its absence is the true end-of-data signal.
    // getDataRange() can extend past the last prospect when unrelated columns
    // hold stray content (notes, leftover sample text, formatting), and we must
    // never write an Error into such a row: doing so makes it non-blank and it
    // would then be reprocessed on every subsequent run.
    if (!hasBusinessName_(rowValues, headerMap)) {
      continue;
    }
    if (shouldSkipPhase1_(rowValues, headerMap)) {
      skipped++;
      continue;
    }

    var ok = withRowGuard(sheet, rowNumber, headerMap, function () {
      processPhase1Row(profile, sheet, rowNumber, rowValues, headerMap);
    });
    if (ok) {
      processed++;
    } else {
      errored++;
    }
  }

  toast_(
    "Phase 1 (" + profileName + "): " + processed + " generated, " +
      skipped + " skipped, " + errored + " errored."
  );
}

/**
 * Process one Phase-1 row: ensure the BrandsIQ response, copy + tokenize the
 * deck, record the link and status.
 * @private
 */
function processPhase1Row(profile, sheet, rowNumber, rowValues, headerMap) {
  var businessName = trim_(getCell(rowValues, headerMap, "Business Name"));
  if (businessName === "") {
    throw new Error("Business Name is empty.");
  }

  // 1. Ensure the response (writes the cell before we copy the deck, so a
  //    crash after the paid call still preserves the result).
  var generatedResponse = ensureGeneratedResponse(sheet, rowNumber, rowValues, headerMap);

  // 2. Copy the template into the parent folder.
  var deck = copyTemplate(profile.SlideTemplateId, profile.FolderId, deckName(businessName));
  var deckId = deck.getId();

  // 3. Substitute tokens, then save.
  var tokenMap = buildTokenMap(rowValues, headerMap, generatedResponse);
  substituteTokensInDeck(deckId, tokenMap);

  // 4. Record state.
  setCell(sheet, rowNumber, headerMap, "One Pager Link", deck.getUrl());
  setCell(sheet, rowNumber, headerMap, "Status", STATUS_GENERATED);
}

/**
 * Phase 2 — draft cold emails for approved rows of a profile.
 * @param {string} profileName
 */
function runPhase2(profileName) {
  var profile = loadProfile(profileName);
  var sheet = openProspectSheet(profile);
  var headerMap = buildHeaderMap(sheet);

  var parentFolder = DriveApp.getFolderById(profile.FolderId);

  var values = sheet.getDataRange().getValues();
  var drafted = 0;
  var skipped = 0;
  var errored = 0;

  for (var r = 1; r < values.length; r++) {
    var rowValues = values[r];
    var rowNumber = r + 1;

    // Not a real prospect row (no Business Name) → skip silently, same as
    // Phase 1. Prevents stray content in unrelated columns from being treated
    // as a data row.
    if (!hasBusinessName_(rowValues, headerMap)) {
      continue;
    }
    var status = trim_(getCell(rowValues, headerMap, "Status"));
    if (status !== STATUS_APPROVED) {
      skipped++;
      continue;
    }

    var ok = withRowGuard(sheet, rowNumber, headerMap, function () {
      processPhase2Row(profile, parentFolder, sheet, rowNumber, rowValues, headerMap);
    });
    if (ok) {
      drafted++;
    } else {
      errored++;
    }
  }

  toast_(
    "Phase 2 (" + profileName + "): " + drafted + " drafted, " +
      skipped + " skipped, " + errored + " errored."
  );
}

/**
 * Process one approved Phase-2 row: dated subfolder, PDF, move deck, draft.
 * @private
 */
function processPhase2Row(profile, parentFolder, sheet, rowNumber, rowValues, headerMap) {
  var email = trim_(getCell(rowValues, headerMap, "Email"));
  var onePagerLink = trim_(getCell(rowValues, headerMap, "One Pager Link"));
  if (email === "") {
    throw new Error("Email is missing.");
  }
  if (onePagerLink === "") {
    throw new Error("One Pager Link is missing.");
  }

  var businessName = trim_(getCell(rowValues, headerMap, "Business Name"));
  var deckId = deckIdFromUrl_(onePagerLink);

  // Compute "today" ONCE so the subfolder name and First Contact Date stay
  // identical even across a midnight boundary.
  var now = new Date();
  var dateStr = Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd");

  // 1. Find-or-create the dated subfolder.
  var subFolder = findOrCreateDatedSubfolder(parentFolder, dateStr);

  // 2. Export the PDF into the subfolder (reuse the blob for the attachment).
  var exported = exportDeckToPdf(deckId, subFolder, pdfName(businessName));

  // 3. Move the deck into the same subfolder (preserves ID/URL).
  moveDeckToFolder(deckId, subFolder);

  // 4. Build the email from the profile templates.
  var generatedResponse = trim_(getCell(rowValues, headerMap, "Generated Response"));
  var tokenMap = buildTokenMap(rowValues, headerMap, generatedResponse);
  var subject = substituteTokensInString(profile.EmailSubject, tokenMap);
  var emailBody = substituteTokensInString(profile.EmailBody, tokenMap);

  // 5. Create the Gmail draft (never sends).
  createGmailDraft(email, subject, emailBody, exported.blob);

  // 6. Record state — only after the draft succeeds.
  var followUp = new Date(now);
  followUp.setDate(followUp.getDate() + 7); // +7 calendar days (DST-safe)

  setDateCell(sheet, rowNumber, headerMap, "First Contact Date", now);
  setDateCell(sheet, rowNumber, headerMap, "Follow-up 1 Date", followUp);
  setCell(sheet, rowNumber, headerMap, "Status", STATUS_DRAFT);
}

// ── Skip logic ────────────────────────────────────────────────────────────

/**
 * Phase 1 skip rule (Section 7): skip a row that already has a One Pager Link,
 * OR whose Status is non-blank and not an Error. Blank or "Error[: ...]" rows
 * remain eligible so genuine retries work.
 * @private
 */
function shouldSkipPhase1_(rowValues, headerMap) {
  var link = trim_(getCell(rowValues, headerMap, "One Pager Link"));
  if (link !== "") {
    return true;
  }
  var status = trim_(getCell(rowValues, headerMap, "Status"));
  if (status === "") {
    return false; // eligible
  }
  return !isErrorStatus_(status); // non-blank, non-Error → skip
}

/**
 * True for "Error" and "Error: <message>" (case-sensitive prefix per Section 13).
 * @private
 */
function isErrorStatus_(status) {
  return status === STATUS_ERROR_PREFIX || status.indexOf(STATUS_ERROR_PREFIX + ":") === 0;
}

// ── Per-row error guard ─────────────────────────────────────────────────────

/**
 * Run `fn` for one row; on throw, set Status = "Error: <message>" and continue.
 * Never lets the guard itself throw (a failed Status write is logged, swallowed).
 *
 * @return {boolean} true on success, false if the row errored.
 * @private
 */
function withRowGuard(sheet, rowNumber, headerMap, fn) {
  try {
    fn();
    return true;
  } catch (e) {
    var message = e && e.message ? e.message : String(e);
    if (message.length > STATUS_ERROR_MAX_LEN) {
      message = message.substring(0, STATUS_ERROR_MAX_LEN);
    }
    try {
      setCell(sheet, rowNumber, headerMap, "Status", STATUS_ERROR_PREFIX + ": " + message);
    } catch (writeErr) {
      // Swallow a secondary failure so the batch keeps going.
      Logger.log("Failed to write Error status on row " + rowNumber + ": " + writeErr);
    }
    Logger.log("Row " + rowNumber + " error: " + (e && e.stack ? e.stack : message));
    return false;
  }
}

// ── Small helpers ───────────────────────────────────────────────────────────

/**
 * True if the row has a non-empty Business Name. This is the "is this a real
 * prospect row?" test used to bound both phase loops: getDataRange() can extend
 * past the last prospect (stray content in unrelated columns, trailing
 * formatting), so we key on the identifying column rather than on "every cell
 * is empty". A row without a Business Name is skipped silently — never
 * processed, never stamped with an Error.
 * @private
 */
function hasBusinessName_(rowValues, headerMap) {
  return trim_(getCell(rowValues, headerMap, "Business Name")) !== "";
}

/**
 * Extract a Slides/Drive file ID from a deck URL like
 * https://docs.google.com/presentation/d/<ID>/edit
 * @private
 */
function deckIdFromUrl_(url) {
  var match = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  throw new Error("Could not parse a deck ID from One Pager Link: " + url);
}

/**
 * Show a transient toast in the active spreadsheet. Best-effort (no-op if the
 * UI isn't available, e.g. an unattended run).
 * @private
 */
function toast_(message) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(message, MENU_TITLE, 8);
  } catch (e) {
    Logger.log(message);
  }
}
