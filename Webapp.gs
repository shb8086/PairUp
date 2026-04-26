// ============================================================
// Webapp.gs — Web App entry point and form submission handler
//
// Deploy as a Web App so colleagues can submit their own preferences:
//   Apps Script → Deploy → New deployment
//   Type: Web app | Execute as: Me | Access: Anyone in your org
//   → Share the URL with your team
// ============================================================

/**
 * Serves the participant preferences form.
 *
 * @returns {HtmlOutput}
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile("webapp")
    .setTitle("1:1 Rotation — Sign Up")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Handles form submission. Validates and upserts the participant.
 * Called client-side via google.script.run.submitParticipant(data).
 *
 * @param {{ name, email, preferredDays, preferredStartHour, preferredEndHour }} data
 * @returns {{ success: boolean, message: string }}
 */
function submitParticipant(data) {
  try {
    _validateParticipantData(data);
    upsertParticipant(data);
    return {
      success: true,
      message: "You're on the list! You'll receive a calendar invite when your 1:1 is scheduled.",
    };
  } catch (e) {
    Logger.log(`submitParticipant error: ${e.message}`);
    return { success: false, message: e.message };
  }
}

function _validateParticipantData(data) {
  if (!data.name || !String(data.name).trim()) {
    throw new Error("Name is required.");
  }
  if (!data.email || !String(data.email).includes("@")) {
    throw new Error("A valid email address is required.");
  }
  if (!data.preferredDays || String(data.preferredDays).trim() === "") {
    throw new Error("Please select at least one preferred day.");
  }
  if (Number(data.preferredStartHour) >= Number(data.preferredEndHour)) {
    throw new Error('"To" time must be after "From" time.');
  }
}
