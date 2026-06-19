/**
 * Menu.gs — custom menu + profile picker.
 *
 * Apps Script menu callbacks are fresh, ZERO-ARGUMENT executions — a clicked
 * item can't be handed the profile name, and dynamically-generated per-profile
 * handlers don't survive between the menu build (onOpen) and the click. So the
 * menu has two FIXED items; each pops a picker that lists profiles read LIVE
 * from the registry and dispatches the chosen one into the engine. This honors
 * the doc's data-driven intent (adding a registry row needs no code change) and
 * is more robust — the picker reads the registry at click time, not just on
 * reopen.
 *
 * Spec: docs/MVP_Phase-1/ONE_PAGER_MAILER_DESIGN.md Section 6.
 */

/**
 * Build the custom menu on spreadsheet open. Wrapped so a registry error here
 * can't suppress the entire menu.
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu(MENU_TITLE)
      .addItem("Generate one-pagers…", "menuGenerateOnePagers")
      .addItem("Draft approved…", "menuDraftApproved")
      .addToUi();
  } catch (e) {
    Logger.log("onOpen failed to build the menu: " + e);
  }
}

/** Menu item → Phase 1. Picks a profile, then runs. */
function menuGenerateOnePagers() {
  var profileName = promptForProfile_("Generate one-pagers");
  if (profileName === null) {
    return; // cancelled or invalid
  }
  runPhase1(profileName);
}

/** Menu item → Phase 2. Picks a profile, then runs. */
function menuDraftApproved() {
  var profileName = promptForProfile_("Draft approved");
  if (profileName === null) {
    return;
  }
  runPhase2(profileName);
}

/**
 * Show a numbered picker of the live profiles and return the chosen
 * ProfileName, or null on cancel / invalid input.
 *
 * @param {string} action  label shown in the prompt title
 * @return {string|null}
 * @private
 */
function promptForProfile_(action) {
  var ui = SpreadsheetApp.getUi();

  var profiles;
  try {
    profiles = getProfiles();
  } catch (e) {
    ui.alert(MENU_TITLE, "Could not read the registry: " + e.message, ui.ButtonSet.OK);
    return null;
  }

  if (profiles.length === 0) {
    ui.alert(MENU_TITLE, "No profiles found in the registry.", ui.ButtonSet.OK);
    return null;
  }

  var lines = [];
  for (var i = 0; i < profiles.length; i++) {
    lines.push((i + 1) + ") " + profiles[i].ProfileName);
  }

  var response = ui.prompt(
    MENU_TITLE + " — " + action,
    "Enter the number of the profile to run:\n\n" + lines.join("\n"),
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return null; // cancelled
  }

  var raw = response.getResponseText().trim();
  var choice = parseInt(raw, 10);
  if (isNaN(choice) || choice < 1 || choice > profiles.length) {
    ui.alert(MENU_TITLE, "Invalid selection: " + raw, ui.ButtonSet.OK);
    return null;
  }
  return profiles[choice - 1].ProfileName;
}
