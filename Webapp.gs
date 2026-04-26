// ============================================================
// Webapp.gs — Web App entry point and form submission handler
//
// Two pages are served:
//   /              → sign-up form  (webapp.html)
//   /?page=dashboard → my dashboard (dashboard.html)
//
// Deploy as a Web App:
//   Apps Script → Deploy → New deployment
//   Type: Web app | Execute as: Me | Access: Anyone in your org
//   → Share the base URL (sign-up) and URL + ?page=dashboard (dashboard)
// ============================================================

/**
 * Routes GET requests to the correct HTML page.
 *
 * @param {Object} e - Apps Script event object with e.parameter
 * @returns {HtmlOutput}
 */
function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) || "signup";

  if (page === "dashboard") {
    return HtmlService.createHtmlOutputFromFile("dashboard")
      .setTitle("My 1:1 Dashboard")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService.createHtmlOutputFromFile("webapp")
    .setTitle("1:1 Rotation — Sign Up")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── Sign-up form ──────────────────────────────────────────────

/**
 * Handles sign-up form submission. Validates and upserts the participant.
 * Called client-side via google.script.run.submitParticipant(data).
 *
 * @param {{ name, email, preferredDays, preferredStartHour, preferredEndHour, team, crossTeamOpen }} data
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

/**
 * Returns the list of teams from the Teams sheet.
 * Called from webapp.html to populate the team dropdown.
 * Returns an empty array on error so the dropdown gracefully shows only "No team".
 *
 * @returns {string[]}
 */
function getTeams() {
  try {
    return getTeamsList();
  } catch (e) {
    Logger.log("getTeams error: " + e.message);
    return [];
  }
}

// ── Dashboard ─────────────────────────────────────────────────

/**
 * Returns the current user's profile, upcoming 1:1s, and team list.
 * Uses Session.getActiveUser() — no email input needed.
 *
 * @returns {{ found: boolean, email?: string, profile?: Object, upcoming?: Object[], teams?: string[], error?: string }}
 */
function getMyProfile() {
  try {
    const email = Session.getActiveUser().getEmail();
    if (!email) {
      return {
        found: false,
        error: "Could not detect your email. Make sure you are signed in with your Google account.",
      };
    }

    const teams   = getTeamsList();
    const profile = lookupParticipantByEmail(email);

    if (!profile) return { found: false, email: email, teams: teams };

    const upcoming = getUpcoming1on1sForEmail(email);
    return { found: true, profile: profile, upcoming: upcoming, teams: teams };

  } catch (e) {
    Logger.log("getMyProfile error: " + e.message);
    return { found: false, error: e.message };
  }
}

/**
 * Updates the current user's preferences from the dashboard.
 * Verifies the session email matches the submitted email.
 *
 * @param {{ name, email, preferredDays, preferredStartHour, preferredEndHour, team, crossTeamOpen }} data
 * @returns {{ success: boolean, message: string }}
 */
function updateMyProfile(data) {
  try {
    const email = Session.getActiveUser().getEmail();
    if (!email) throw new Error("Could not verify your identity. Please reload the page.");
    if (data.email.toLowerCase().trim() !== email.toLowerCase().trim()) {
      throw new Error("Email mismatch. Please reload the page.");
    }
    _validateParticipantData(data);
    updateParticipantFromDashboard(data);
    return { success: true, message: "Your preferences have been updated." };
  } catch (e) {
    Logger.log("updateMyProfile error: " + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * Deactivates the current user from the rotation.
 *
 * @returns {{ success: boolean, message?: string }}
 */
function deactivateMe() {
  try {
    const email = Session.getActiveUser().getEmail();
    if (!email) throw new Error("Could not verify your identity.");
    deactivateParticipant(email);
    return { success: true };
  } catch (e) {
    Logger.log("deactivateMe error: " + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * Re-activates the current user so they are included in future scheduling runs.
 *
 * @returns {{ success: boolean, message?: string }}
 */
function rejoinRotation() {
  try {
    const email = Session.getActiveUser().getEmail();
    if (!email) throw new Error("Could not verify your identity.");
    reactivateParticipant(email);
    return { success: true };
  } catch (e) {
    Logger.log("rejoinRotation error: " + e.message);
    return { success: false, message: e.message };
  }
}

// ── Shared validation ─────────────────────────────────────────

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
