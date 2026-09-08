// ============================================================
// Triggers.gs — Time-based trigger management
// ============================================================

/**
 * Creates a weekly time-based trigger that runs scheduleMeetings
 * every Monday at 8 AM. Removes any existing duplicate triggers first.
 */
function setupWeeklyTrigger() {
  _removeSchedulingTriggers();

  ScriptApp.newTrigger("scheduleMeetings")
    .timeBased()
    .everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .create();

  SpreadsheetApp.getActiveSpreadsheet()
    .toast("Trigger set: runs every Monday at 8 AM.", "Trigger Created", 8);
}

/**
 * Creates a daily trigger that runs checkCancellationsAndReschedule at 9 AM.
 * Removes any existing duplicate triggers first.
 */
function setupDailyCancellationCheckTrigger() {
  _removeCancellationTriggers();

  ScriptApp.newTrigger("checkCancellationsAndReschedule")
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  SpreadsheetApp.getActiveSpreadsheet()
    .toast("Trigger set: cancellation check runs daily at 9 AM.", "Trigger Created", 8);
}

/**
 * Removes all triggers for both scheduleMeetings and checkCancellationsAndReschedule.
 */
function removeTriggers() {
  _removeSchedulingTriggers();
  _removeCancellationTriggers();
  SpreadsheetApp.getActiveSpreadsheet()
    .toast("All triggers removed.", "Done", 5);
}

function _removeSchedulingTriggers() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === "scheduleMeetings")
    .forEach(t => ScriptApp.deleteTrigger(t));
}

function _removeCancellationTriggers() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === "checkCancellationsAndReschedule")
    .forEach(t => ScriptApp.deleteTrigger(t));
}
