/**
 * Slides.gs — template copy, token substitution, and PDF export.
 *
 * Spec: docs/MVP_Phase-1/ONE_PAGER_MAILER_DESIGN.md (Sections 5, 7, 9, 16).
 */

/**
 * Build the token → string-value map for one prospect row. Covers every token
 * used in EITHER the slide deck or the email (Section 5.3). Values are
 * stringified because replaceAllText / string replace require strings, and
 * Sheets cells may hold numbers or dates.
 *
 * @param {Array} rowValues
 * @param {Object} headerMap
 * @param {string} generatedResponse  the just-ensured Generated Response text
 * @return {Object} { "{{Token}}": "value" }
 */
function buildTokenMap(rowValues, headerMap, generatedResponse) {
  var map = {};
  for (var token in TOKEN_TO_COLUMN) {
    if (!TOKEN_TO_COLUMN.hasOwnProperty(token)) continue;
    var column = TOKEN_TO_COLUMN[token];
    var value;
    if (column === "Generated Response") {
      // Prefer the freshly-ensured value over re-reading the cell.
      value = generatedResponse;
    } else {
      value = getCell(rowValues, headerMap, column);
    }
    map[token] = stringify_(value);
  }
  return map;
}

/**
 * Copy the slide template directly into the parent output folder, named
 * "One Pager_{Business Name}".
 *
 * @param {string} templateId
 * @param {string} folderId
 * @param {string} name
 * @return {File} the new deck file
 */
function copyTemplate(templateId, folderId, name) {
  var templateFile = DriveApp.getFileById(templateId);
  var folder = DriveApp.getFolderById(folderId);
  return templateFile.makeCopy(name, folder);
}

/**
 * Substitute every mapped token in the deck and save. Unmapped tokens (if any)
 * are left untouched; a token absent from the deck is a no-op.
 *
 * @param {string} deckId
 * @param {Object} tokenMap
 */
function substituteTokensInDeck(deckId, tokenMap) {
  var presentation = SlidesApp.openById(deckId);
  for (var token in tokenMap) {
    if (!tokenMap.hasOwnProperty(token)) continue;
    // Plain-text find form (not RegExp) so literal {{...}} needs no escaping.
    // matchCase=true so {{Ratings}} never matches {{ratings}} (Section 5.4).
    presentation.replaceAllText(token, tokenMap[token], true);
  }
  // Save AFTER all replaces and BEFORE exporting to PDF (Section 16).
  // NOTE: this is a server-side save, not an editor render, so "shrink text on
  // overflow" autofit is NOT recomputed here — that's the manual review step
  // (Section 8). Long content may overflow the PDF unless a human opens the
  // deck in the editor first.
  presentation.saveAndClose();
}

/**
 * Substitute every mapped token in a plain string (email subject/body).
 * Unmapped tokens are left as-is. Tokens are disjoint, so order is irrelevant.
 *
 * @param {string} template
 * @param {Object} tokenMap
 * @return {string}
 */
function substituteTokensInString(template, tokenMap) {
  var result = String(template);
  for (var token in tokenMap) {
    if (!tokenMap.hasOwnProperty(token)) continue;
    result = result.split(token).join(tokenMap[token]); // literal global replace
  }
  return result;
}

/**
 * Export a deck to a single multi-page PDF (all slides) and write it into the
 * destination folder. Returns both the created file and the blob, so the same
 * blob can be attached to the Gmail draft without re-exporting.
 *
 * @param {string} deckId
 * @param {Folder} destFolder
 * @param {string} pdfFileName
 * @return {{file: File, blob: Blob}}
 */
function exportDeckToPdf(deckId, destFolder, pdfFileName) {
  // getAs(PDF) exports ALL slides as one multi-page PDF — no per-slide loop.
  var blob = DriveApp.getFileById(deckId).getAs(MimeType.PDF).setName(pdfFileName);
  var file = destFolder.createFile(blob);
  return { file: file, blob: blob };
}

/**
 * Coerce a cell value to a string for token replacement. null/undefined → "".
 * @private
 */
function stringify_(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}
