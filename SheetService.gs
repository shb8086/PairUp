// ============================================================
// SheetService.gs — All Google Sheets interactions
// ============================================================

const SHEET_NAMES = {
  participants: "Participants",
  log:          "Schedule Log",
  teams:        "Teams",
};

// ── Participants ──────────────────────────────────────────────

/**
 * Reads all active participants from the Participants sheet.
 * Deduplicates by email — only the first occurrence is kept.
 *
 * @returns {Object[]}
 * @throws {Error} if the sheet doesn't exist
 */
function getParticipants() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(SHEET_NAMES.participants);

  if (!sheet) {
    throw new Error('Sheet "Participants" not found. Run "Setup Sheet Headers" first.');
  }

  const [, ...rows] = sheet.getDataRange().getValues();
  const participants = [];
  const seenEmails   = new Set();

  rows.forEach((row, i) => {
    const [name, email, active] = row;
    const nameStr  = String(name  || "").trim();
    const emailStr = String(email || "").trim().toLowerCase();

    if (!nameStr && !emailStr) return;

    if (!nameStr || !emailStr || !emailStr.includes("@")) {
      Logger.log(`Row ${i + 2}: invalid entry — skipping (name="${nameStr}", email="${emailStr}")`);
      return;
    }

    const isActive = active === true || String(active).toLowerCase() === "true";
    if (!isActive) return;

    if (seenEmails.has(emailStr)) {
      Logger.log(`Row ${i + 2}: duplicate email "${emailStr}" — skipping`);
      return;
    }
    seenEmails.add(emailStr);

    participants.push({
      row:                i + 2,
      name:               nameStr,
      email:              emailStr,
      preferredDays:      parseDays(row[PARTICIPANT_COLS.preferredDays - 1]),
      preferredStartHour: Number(row[PARTICIPANT_COLS.preferredStartHour - 1]) || CFG.workStartHour,
      preferredEndHour:   Number(row[PARTICIPANT_COLS.preferredEndHour - 1])   || CFG.workEndHour,
      team:               String(row[PARTICIPANT_COLS.team - 1] || "").trim(),
      crossTeamOpen:      row[PARTICIPANT_COLS.crossTeamOpen - 1] === true,
      crossTeamTargets:   String(row[PARTICIPANT_COLS.crossTeamTargets - 1] || "").trim(),
    });
  });

  return participants;
}

/**
 * Looks up a single participant by email (active or inactive).
 * Returns the raw row data for the dashboard — does NOT filter inactive.
 *
 * @param {string} email
 * @returns {Object|null}
 */
function lookupParticipantByEmail(email) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(SHEET_NAMES.participants);
  if (!sheet) return null;

  const emailLower = email.toLowerCase().trim();
  const [, ...rows] = sheet.getDataRange().getValues();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowEmail = String(row[PARTICIPANT_COLS.email - 1] || "").trim().toLowerCase();
    if (rowEmail === emailLower) {
      return {
        row:                i + 2,
        name:               String(row[PARTICIPANT_COLS.name - 1] || "").trim(),
        email:              rowEmail,
        active:             row[PARTICIPANT_COLS.active - 1] === true,
        preferredDays:      String(row[PARTICIPANT_COLS.preferredDays - 1] || ""),
        preferredStartHour: Number(row[PARTICIPANT_COLS.preferredStartHour - 1]) || CFG.workStartHour,
        preferredEndHour:   Number(row[PARTICIPANT_COLS.preferredEndHour - 1])   || CFG.workEndHour,
        team:               String(row[PARTICIPANT_COLS.team - 1] || "").trim(),
        crossTeamOpen:      row[PARTICIPANT_COLS.crossTeamOpen - 1] === true,
        crossTeamTargets:   String(row[PARTICIPANT_COLS.crossTeamTargets - 1] || "").trim(),
      };
    }
  }
  return null;
}

/**
 * Inserts a new participant or updates an existing one (matched by email).
 * Called by the web app sign-up form submission.
 *
 * @param {{ name, email, preferredDays, preferredStartHour, preferredEndHour, team, crossTeamOpen }} data
 */
function upsertParticipant(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(SHEET_NAMES.participants);

  if (!sheet) {
    throw new Error('Participants sheet not found. Ask the admin to run Setup Sheet Headers first.');
  }

  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const existing = String(values[i][PARTICIPANT_COLS.email - 1] || "").trim().toLowerCase();
    if (existing === data.email.toLowerCase()) {
      const row = i + 1;
      sheet.getRange(row, PARTICIPANT_COLS.name).setValue(data.name);
      sheet.getRange(row, PARTICIPANT_COLS.preferredDays).setValue(data.preferredDays);
      sheet.getRange(row, PARTICIPANT_COLS.preferredStartHour).setValue(data.preferredStartHour);
      sheet.getRange(row, PARTICIPANT_COLS.preferredEndHour).setValue(data.preferredEndHour);
      sheet.getRange(row, PARTICIPANT_COLS.team).setValue(data.team || "");
      sheet.getRange(row, PARTICIPANT_COLS.crossTeamOpen).setValue(!!data.crossTeamOpen);
      sheet.getRange(row, PARTICIPANT_COLS.crossTeamTargets).setValue(data.crossTeamTargets || "");
      Logger.log(`Updated preferences for: ${data.email}`);
      return;
    }
  }

  sheet.appendRow([
    data.name,
    data.email,
    true,
    data.preferredDays,
    data.preferredStartHour,
    data.preferredEndHour,
    data.team || "",
    !!data.crossTeamOpen,
    data.crossTeamTargets || "",
  ]);
  Logger.log(`Added new participant: ${data.email}`);
}

/**
 * Updates an existing participant's preferences from the dashboard.
 * Throws if the participant is not found (dashboard only updates, never inserts).
 *
 * @param {{ name, email, preferredDays, preferredStartHour, preferredEndHour, team, crossTeamOpen }} data
 */
function updateParticipantFromDashboard(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(SHEET_NAMES.participants);
  if (!sheet) throw new Error("Participants sheet not found.");

  const emailLower = data.email.toLowerCase().trim();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const rowEmail = String(values[i][PARTICIPANT_COLS.email - 1] || "").trim().toLowerCase();
    if (rowEmail === emailLower) {
      const row = i + 1;
      sheet.getRange(row, PARTICIPANT_COLS.name).setValue(data.name);
      sheet.getRange(row, PARTICIPANT_COLS.preferredDays).setValue(data.preferredDays);
      sheet.getRange(row, PARTICIPANT_COLS.preferredStartHour).setValue(data.preferredStartHour);
      sheet.getRange(row, PARTICIPANT_COLS.preferredEndHour).setValue(data.preferredEndHour);
      sheet.getRange(row, PARTICIPANT_COLS.team).setValue(data.team || "");
      sheet.getRange(row, PARTICIPANT_COLS.crossTeamOpen).setValue(!!data.crossTeamOpen);
      sheet.getRange(row, PARTICIPANT_COLS.crossTeamTargets).setValue(data.crossTeamTargets || "");
      Logger.log(`Dashboard update for: ${data.email}`);
      return;
    }
  }
  throw new Error("You are not registered. Please use the sign-up form first.");
}

/**
 * Sets a participant's Active flag to false.
 *
 * @param {string} email
 */
function deactivateParticipant(email) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(SHEET_NAMES.participants);
  if (!sheet) throw new Error("Participants sheet not found.");

  const emailLower = email.toLowerCase().trim();
  const [, ...rows] = sheet.getDataRange().getValues();

  for (let i = 0; i < rows.length; i++) {
    const rowEmail = String(rows[i][PARTICIPANT_COLS.email - 1] || "").trim().toLowerCase();
    if (rowEmail === emailLower) {
      sheet.getRange(i + 2, PARTICIPANT_COLS.active).setValue(false);
      return;
    }
  }
  throw new Error("Participant not found.");
}

/**
 * Sets a participant's Active flag back to true.
 *
 * @param {string} email
 */
function reactivateParticipant(email) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(SHEET_NAMES.participants);
  if (!sheet) throw new Error("Participants sheet not found.");

  const emailLower = email.toLowerCase().trim();
  const [, ...rows] = sheet.getDataRange().getValues();

  for (let i = 0; i < rows.length; i++) {
    const rowEmail = String(rows[i][PARTICIPANT_COLS.email - 1] || "").trim().toLowerCase();
    if (rowEmail === emailLower) {
      sheet.getRange(i + 2, PARTICIPANT_COLS.active).setValue(true);
      return;
    }
  }
  throw new Error("Participant not found.");
}

/**
 * Returns all upcoming scheduled 1:1s for a given email address.
 * Queries the Schedule Log for future meetings where this person is either p1 or p2.
 *
 * @param {string} email
 * @returns {Object[]}
 */
function getUpcoming1on1sForEmail(email) {
  const sheet = getOrCreateLogSheet();
  const [, ...rows] = sheet.getDataRange().getValues();
  const now        = new Date();
  const emailLower = email.toLowerCase().trim();

  return rows
    .filter(row => {
      const [, , , p1Email, p2Email, scheduledTime, eventId, status] = row;
      if (status !== "scheduled") return false;
      if (!eventId || eventId === "—") return false;
      const p1 = String(p1Email || "").trim().toLowerCase();
      const p2 = String(p2Email || "").trim().toLowerCase();
      if (p1 !== emailLower && p2 !== emailLower) return false;
      const t = scheduledTime instanceof Date ? scheduledTime : new Date(scheduledTime);
      return !isNaN(t.getTime()) && t > now;
    })
    .map(row => {
      const [, round, pair, p1Email, p2Email, scheduledTime, eventId] = row;
      const p1Lower      = String(p1Email || "").trim().toLowerCase();
      const partnerEmail = p1Lower === emailLower
        ? String(p2Email || "").trim()
        : String(p1Email || "").trim();
      const t = scheduledTime instanceof Date ? scheduledTime : new Date(scheduledTime);
      return {
        round:         round,
        pair:          String(pair || ""),
        partnerEmail:  partnerEmail,
        scheduledTime: t.toISOString(),
        eventId:       String(eventId || ""),
      };
    })
    .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
}

// ── Teams ─────────────────────────────────────────────────────

/**
 * Returns the list of team names from the Teams sheet.
 *
 * @returns {string[]}
 */
function getTeamsList() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.teams);
  if (!sheet) return [];
  const [, ...rows] = sheet.getDataRange().getValues();
  return rows.map(r => String(r[0] || "").trim()).filter(Boolean);
}

// ── Schedule Log ──────────────────────────────────────────────

/**
 * Returns the Schedule Log sheet, creating it with headers if absent.
 *
 * @returns {Sheet}
 */
function getOrCreateLogSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(SHEET_NAMES.log);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.log);
    const headers = ["Timestamp", "Round", "Pair", "Person 1 Email", "Person 2 Email", "Scheduled Time", "Event ID", "Status"];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Appends one row to the Schedule Log for a pair.
 *
 * @param {Object} p1
 * @param {Object} p2
 * @param {number} round
 * @param {{ start: Date } | null} slot
 * @param {CalendarEvent | null} event
 * @param {string} status
 */
function logPairEntry(p1, p2, round, slot, event, status) {
  getOrCreateLogSheet().appendRow([
    new Date(),
    round,
    `${p1.name} & ${p2.name}`,
    p1.email,
    p2.email,
    slot  ? slot.start    : "—",
    event ? event.getId() : "—",
    status,
  ]);
}

/**
 * Reads the Schedule Log and returns entries for upcoming scheduled pairs
 * (meetings in the future that haven't been rescheduled or cancelled yet).
 *
 * @returns {Object[]}
 */
function getUpcomingScheduledPairs() {
  const sheet = getOrCreateLogSheet();
  const [, ...rows] = sheet.getDataRange().getValues();
  const now = new Date();

  const entries = [];

  rows.forEach((row, i) => {
    const [, round, pair, p1Email, p2Email, scheduledTime, eventId, status] = row;

    if (status !== "scheduled") return;
    if (!eventId || eventId === "—") return;

    const meetingTime = scheduledTime instanceof Date ? scheduledTime : new Date(scheduledTime);
    if (isNaN(meetingTime.getTime()) || meetingTime <= now) return;

    entries.push({
      logRow:   i + 2,
      round,
      pairName: String(pair),
      p1Email:  String(p1Email).trim().toLowerCase(),
      p2Email:  String(p2Email).trim().toLowerCase(),
      eventId:  String(eventId).trim(),
    });
  });

  return entries;
}

/**
 * Updates the Status column of a specific row in the Schedule Log.
 *
 * @param {number} logRow - 1-indexed sheet row
 * @param {string} newStatus
 */
function updateLogEntryStatus(logRow, newStatus) {
  getOrCreateLogSheet().getRange(logRow, 8).setValue(newStatus);
}

// ── One-time setup ────────────────────────────────────────────

/**
 * Creates the Participants, Teams, and Schedule Log sheets. Safe to re-run.
 */
function setupSheetHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  _setupParticipantsSheet(ss);
  _setupTeamsSheet(ss);
  getOrCreateLogSheet();
  ss.toast(
    "Sheets are ready. Edit the Teams sheet first, then add colleagues or share the web app link.",
    "Setup Complete", 10
  );
}

function _setupParticipantsSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAMES.participants);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAMES.participants);
  if (sheet.getLastRow() > 0) return;

  const headers = [
    "Name", "Email", "Active",
    "Preferred Days", "Preferred Start Hour", "Preferred End Hour",
    "Team", "Cross Team Open", "Cross Team Targets",
  ];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  sheet.setFrozenRows(1);

  // Active checkbox (col C)
  sheet.getRange("C2:C100").setDataValidation(
    SpreadsheetApp.newDataValidation().requireCheckbox().build()
  );
  // Cross Team Open checkbox (col H)
  sheet.getRange("H2:H100").setDataValidation(
    SpreadsheetApp.newDataValidation().requireCheckbox().build()
  );
}

function _setupTeamsSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAMES.teams);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAMES.teams);
  if (sheet.getLastRow() > 0) return;

  sheet.appendRow(["Team"]);
  sheet.getRange(1, 1).setFontWeight("bold");
  sheet.setFrozenRows(1);

  // Seed with example teams — edit these to match your org
  sheet.appendRow(["Engineering"]);
  sheet.appendRow(["Product"]);
  sheet.appendRow(["Design"]);
  Logger.log("Teams sheet created with example teams. Edit column A as needed.");
}
