/**
 * Gmail.gs — draft creation.
 *
 * v1 is DRAFT-ONLY. The script never sends. Drafts do not consume the daily
 * send quota (Section 9 / 12).
 *
 * Spec: docs/MVP_Phase-1/ONE_PAGER_MAILER_DESIGN.md Section 9.
 */

/**
 * Create a Gmail draft to `to` with the PDF attached.
 *
 * @param {string} to       recipient (the row's Email)
 * @param {string} subject  token-substituted subject
 * @param {string} body     token-substituted body (plain text; line breaks in
 *                          the EmailBody cell are preserved)
 * @param {Blob} pdfBlob    the exported one-pager PDF
 * @return {GmailDraft}
 */
function createGmailDraft(to, subject, body, pdfBlob) {
  // createDraft — NOT sendEmail. v1 never sends directly.
  return GmailApp.createDraft(to, subject, body, { attachments: [pdfBlob] });
}
