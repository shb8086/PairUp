// ============================================================
// Menu.gs — Custom spreadsheet menu
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("1:1 Scheduler")
    .addItem("▶  Schedule This Week's Pairs",          "scheduleMeetings")
    .addItem("🔍  Check & Reschedule Cancelled",        "checkCancellationsAndReschedule")
    .addSeparator()
    .addItem("⏰  Set Weekly Trigger (Mon 8 AM)",       "setupWeeklyTrigger")
    .addItem("🔔  Set Daily Cancellation Check (9 AM)", "setupDailyCancellationCheckTrigger")
    .addItem("🗑  Remove All Triggers",                 "removeTriggers")
    .addSeparator()
    .addItem("🔄  Reset Rotation to Round 1",          "resetRoundIndex")
    .addItem("📋  Setup Sheet Headers",                "setupSheetHeaders")
    .addToUi();
}
