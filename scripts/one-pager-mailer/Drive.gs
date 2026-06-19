/**
 * Drive.gs — output-folder operations.
 *
 * Spec: docs/MVP_Phase-1/ONE_PAGER_MAILER_DESIGN.md (Sections 9, 16).
 */

/**
 * Find-or-create a subfolder of `parent` named `dateStr` (YYYY-MM-DD). Drive
 * allows same-named folders, so this is an explicit find-then-create — a blind
 * create would spawn a duplicate dated folder for the second row of the day.
 *
 * @param {Folder} parent
 * @param {string} dateStr  e.g. "2026-06-19"
 * @return {Folder}
 */
function findOrCreateDatedSubfolder(parent, dateStr) {
  var existing = parent.getFoldersByName(dateStr); // scoped to direct children
  if (existing.hasNext()) {
    return existing.next();
  }
  return parent.createFolder(dateStr);
}

/**
 * Move a deck into a destination folder. Uses File.moveTo (current Drive API) —
 * the old addFile/removeFile pattern is deprecated and leaves multi-parented
 * files. Moving does NOT change the file's ID/URL, so "One Pager Link" stays
 * valid (Section 9).
 *
 * @param {string} deckId
 * @param {Folder} destFolder
 */
function moveDeckToFolder(deckId, destFolder) {
  DriveApp.getFileById(deckId).moveTo(destFolder);
}

/**
 * The fallback parent folder used when a profile's FolderId is blank.
 * @return {string}
 */
function defaultFolderId() {
  return DEFAULT_FOLDER_ID;
}
