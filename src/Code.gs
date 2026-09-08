// ============================================================
// 1:1 Rotation Scheduler — Google Apps Script
// ============================================================
// Schedules weekly 1:1 meetings between colleagues using a
// round-robin rotation. Each person is paired with a different
// colleague each week. Everyone gets exactly one 1:1 per round.
//
// Files:
//   Config.gs          — CFG constants and column indices
//   Menu.gs            — onOpen() and custom menu
//   Pairings.gs        — Round-robin algorithm + round state
//   Scheduler.gs       — Main orchestration (scheduleMeetings)
//   CalendarService.gs — Free/busy checks and event creation
//   SheetService.gs    — Sheet reads, writes, upserts, setup
//   Triggers.gs        — Time-based trigger management
//   Utils.gs           — Pure date/time helpers
//   Webapp.gs          — Web app entry point + form handler
//   Holidays.gs        — Public holiday lookup (Nager.Date API)
//   webapp.html        — Self-service sign-up form
// ============================================================
