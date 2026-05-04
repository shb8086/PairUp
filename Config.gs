// ============================================================
// Config.gs — All configuration constants
// Edit this file to customize the scheduler behavior.
// ============================================================

const CFG = {
  durationMins:             25,  // meeting length in minutes
  calendarId:               "",  // ID of a dedicated calendar for scheduler events (empty = default calendar of script runner).
  allowedEmailDomain:       "",  // restrict sign-ups to this domain, e.g. "@ninelives.com" (empty = allow all)
  scheduleMinDaysAhead:     7,   // don't schedule sooner than this many days from now
  searchDaysAhead:          14,  // how far ahead to scan for free slots
  workStartHour:            10,  // default earliest start (overridden by participant preferences)
  workEndHour:              16,  // default latest end     (overridden by participant preferences)
  slotIntervalMin:          30,  // scanning granularity in minutes
  meetingTitle:             "1:1 — {person1} & {person2}",  // both replaced at runtime
  meetingDesc:              "Regular 1-on-1 check-in. Auto Scheduled",
  skipIfMeetingWithinDays:  21,  // don't reschedule a pair if they already have a 1:1 within this window
  oneOnOneKeywords: ["1:1", "1on1", "one on one", "one-on-one"],  // Title keywords used to detect existing 1:1 events
};

// Column indices in the Participants sheet (1-indexed)
const PARTICIPANT_COLS = {
  name:               1,
  email:              2,
  active:             3,
  preferredDays:      4,
  preferredStartHour: 5,
  preferredEndHour:   6,
  team:               7,
  crossTeamOpen:      8,
  crossTeamTargets:   9,  // comma-separated team names; empty string = open to all teams
  timezone:           10, // IANA timezone string (e.g. "Europe/Berlin")
};

// Maps day abbreviations (used in the form and sheet) to JS getDay() values
const DAY_NAME_TO_INDEX = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};
