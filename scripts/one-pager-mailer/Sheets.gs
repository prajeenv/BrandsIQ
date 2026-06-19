/**
 * Sheets.gs — registry/profile loading + header-mapped cell access.
 *
 * All spreadsheet reads/writes go through here so the rest of the engine can
 * address columns by header NAME, never by position (Section 5.1 / 16).
 *
 * Spec: docs/MVP_Phase-1/ONE_PAGER_MAILER_DESIGN.md (Sections 3, 4, 5).
 */

/**
 * Read the registry (bound spreadsheet → Profiles tab) into an array of
 * profile objects. The registry spreadsheet ID is never hardcoded — being a
 * bound script, we read our own active spreadsheet (Section 3).
 *
 * @return {Array<Object>} one object per non-blank registry row, keyed by the
 *   registry column headers. Blank rows (no ProfileName) are skipped.
 */
function getProfiles() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(PROFILES_TAB);
  if (!sheet) {
    throw new Error(
      'Registry tab "' + PROFILES_TAB + '" not found in the active spreadsheet.'
    );
  }

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return []; // header row only, or empty
  }

  var headerMap = buildHeaderMapFromRow_(values[0]);

  // Validate the registry has the columns we need at all.
  var missing = [];
  for (var f = 0; f < PROFILE_FIELDS.length; f++) {
    if (!(PROFILE_FIELDS[f] in headerMap)) {
      missing.push(PROFILE_FIELDS[f]);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      'Registry "' + PROFILES_TAB + '" is missing column(s): ' + missing.join(", ")
    );
  }

  var profiles = [];
  var seenNames = {};
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var name = trim_(row[headerMap.ProfileName]);
    if (name === "") {
      continue; // skip blank rows
    }
    if (seenNames[name]) {
      throw new Error('Duplicate ProfileName in registry: "' + name + '".');
    }
    seenNames[name] = true;

    var profile = {};
    for (var i = 0; i < PROFILE_FIELDS.length; i++) {
      var field = PROFILE_FIELDS[i];
      profile[field] = trim_(row[headerMap[field]]);
    }
    profiles.push(profile);
  }
  return profiles;
}

/**
 * Load one profile by ProfileName, validate its required fields, and apply the
 * FolderId default. IDs are trimmed (stray spaces/newlines break openById).
 *
 * @param {string} name
 * @return {Object} the validated profile (FolderId guaranteed non-empty).
 */
function loadProfile(name) {
  var profiles = getProfiles();
  var found = null;
  for (var i = 0; i < profiles.length; i++) {
    if (profiles[i].ProfileName === name) {
      found = profiles[i];
      break;
    }
  }
  if (!found) {
    throw new Error('Profile "' + name + '" not found in the registry.');
  }

  // Fail fast on any blank required field, naming it.
  for (var f = 0; f < PROFILE_REQUIRED_FIELDS.length; f++) {
    var field = PROFILE_REQUIRED_FIELDS[f];
    if (!found[field] || found[field] === "") {
      throw new Error(
        'Profile "' + name + '" is missing required field "' + field + '".'
      );
    }
  }

  // FolderId may be blank → fall back to the default ColdEmails folder.
  if (!found.FolderId || found.FolderId === "") {
    found.FolderId = defaultFolderId();
  }
  return found;
}

/**
 * Open a prospect sheet (by SpreadsheetId + TabName from a profile) and return
 * its Sheet object.
 *
 * @param {Object} profile
 * @return {Sheet}
 */
function openProspectSheet(profile) {
  var ss = SpreadsheetApp.openById(profile.SpreadsheetId);
  var sheet = ss.getSheetByName(profile.TabName);
  if (!sheet) {
    throw new Error(
      'Tab "' + profile.TabName + '" not found in spreadsheet ' + profile.SpreadsheetId + "."
    );
  }
  return sheet;
}

/**
 * Build a header → 0-based column index map for a prospect sheet, validating
 * that every REQUIRED header is present, exact, and unique. Fails fast BEFORE
 * any row is processed (Section 14).
 *
 * @param {Sheet} sheet
 * @return {Object} { headerName: zeroBasedColumnIndex }
 */
function buildHeaderMap(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) {
    throw new Error("Prospect sheet has no columns.");
  }
  var headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = buildHeaderMapFromRow_(headerRow);

  // Detect duplicate required headers (ambiguous → fail). buildHeaderMapFromRow_
  // keeps the FIRST occurrence; we re-scan to catch duplicates explicitly.
  var counts = {};
  for (var c = 0; c < headerRow.length; c++) {
    var h = trim_(headerRow[c]);
    if (h === "") continue;
    counts[h] = (counts[h] || 0) + 1;
  }

  var missing = [];
  var duplicated = [];
  for (var i = 0; i < REQUIRED_PROSPECT_HEADERS.length; i++) {
    var req = REQUIRED_PROSPECT_HEADERS[i];
    if (!(req in map)) {
      missing.push(req);
    } else if (counts[req] > 1) {
      duplicated.push(req);
    }
  }
  if (missing.length > 0) {
    throw new Error("Prospect sheet is missing required column(s): " + missing.join(", "));
  }
  if (duplicated.length > 0) {
    throw new Error(
      "Prospect sheet has duplicate column header(s): " + duplicated.join(", ")
    );
  }
  return map;
}

/**
 * Internal: header row → { trimmedHeader: firstColumnIndex }.
 * Trims trailing/leading whitespace on header cells; case and internal spaces
 * stay significant (exact-match token rules, Section 5.4).
 * @private
 */
function buildHeaderMapFromRow_(headerRow) {
  var map = {};
  for (var c = 0; c < headerRow.length; c++) {
    var h = trim_(headerRow[c]);
    if (h === "") continue;
    if (!(h in map)) {
      map[h] = c; // keep first occurrence
    }
  }
  return map;
}

// ── By-header cell access ─────────────────────────────────────────────────
// rowValues is a 0-based array for a single row (as returned by getValues()).
// rowNumber is the 1-based sheet row for writes.

/**
 * Read a cell value from a row-values array by header name.
 * @return {*} raw cell value (may be number/Date/string/"").
 */
function getCell(rowValues, headerMap, header) {
  var idx = headerMap[header];
  if (idx === undefined) {
    throw new Error('Unknown column "' + header + '".');
  }
  return rowValues[idx];
}

/**
 * Write a string value into a cell immediately (not batched), so a 6-minute
 * timeout mid-batch still records completed rows (Section 12).
 */
function setCell(sheet, rowNumber, headerMap, header, value) {
  var idx = headerMap[header];
  if (idx === undefined) {
    throw new Error('Unknown column "' + header + '".');
  }
  sheet.getRange(rowNumber, idx + 1).setValue(value);
}

/**
 * Write a real Date value into a cell (Sheets date serial, not text), so it
 * sorts/filters correctly (Section 9).
 */
function setDateCell(sheet, rowNumber, headerMap, header, dateValue) {
  var idx = headerMap[header];
  if (idx === undefined) {
    throw new Error('Unknown column "' + header + '".');
  }
  sheet.getRange(rowNumber, idx + 1).setValue(dateValue);
}

/**
 * Trim a cell value to a string. Numbers/Dates/blank cells are coerced to a
 * string first so callers always get a string back.
 * @private
 */
function trim_(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}
