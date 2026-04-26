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
 * Removes all time-based triggers for scheduleMeetings.
 */
function removeTriggers() {
  _removeSchedulingTriggers();
  SpreadsheetApp.getActiveSpreadsheet()
    .toast("All scheduleMeetings triggers removed.", "Done", 5);
}

function _removeSchedulingTriggers() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === "scheduleMeetings")
    .forEach(t => ScriptApp.deleteTrigger(t));
}
