// ============================================================
// SheetService.gs — All Google Sheets interactions
// ============================================================

const SHEET_NAMES = {
  participants: "Participants",
  log:          "Schedule Log",
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
    });
  });

  return participants;
}

/**
 * Inserts a new participant or updates an existing one (matched by email).
 * Called by the web app form submission.
 *
 * @param {{ name, email, preferredDays, preferredStartHour, preferredEndHour }} data
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
      Logger.log(`Updated preferences for: ${data.email}`);
      return;
    }
  }

  sheet.appendRow([
    data.name,
    data.email,
    true,                    // Active
    data.preferredDays,
    data.preferredStartHour,
    data.preferredEndHour,
  ]);
  Logger.log(`Added new participant: ${data.email}`);
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
    if (isNaN(meetingTime.getTime()) || meetingTime <= now) return; // only future meetings

    entries.push({
      logRow:   i + 2, // 1-indexed; header = row 1, data starts at row 2
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
 * Creates the Participants and Schedule Log sheets. Safe to re-run.
 */
function setupSheetHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  _setupParticipantsSheet(ss);
  getOrCreateLogSheet();
  ss.toast("Sheets are ready. Add colleagues or share the web app link.", "Setup Complete", 8);
}

function _setupParticipantsSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAMES.participants);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAMES.participants);
  if (sheet.getLastRow() > 0) return;

  const headers = ["Name", "Email", "Active", "Preferred Days", "Preferred Start Hour", "Preferred End Hour"];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  sheet.setFrozenRows(1);

  // Active checkbox (column C)
  sheet.getRange("C2:C100").setDataValidation(
    SpreadsheetApp.newDataValidation().requireCheckbox().build()
  );
}
