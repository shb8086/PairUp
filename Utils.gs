// ============================================================
// Utils.gs — Pure date/time utility functions
// No side effects. No dependencies on other project files.
// ============================================================

/**
 * Rounds a date up to the nearest slot interval.
 * e.g. 9:07 AM with interval=30 → 9:30 AM
 *
 * @param {Date} date
 * @param {number} intervalMins
 * @returns {Date}
 */
function roundUpToSlot(date, intervalMins) {
  const ms = intervalMins * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

/**
 * Returns a new Date with the time set to hour:minute:00.000.
 *
 * @param {Date} date
 * @param {number} hour
 * @param {number} minute
 * @returns {Date}
 */
function setTimeOnDate(date, hour, minute) {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * Advances to the start of the next working day (Mon–Fri),
 * skipping weekends. Uses the provided startHour or falls back to CFG.
 *
 * @param {Date} date
 * @param {number} [startHour] - Optional override for work day start hour
 * @returns {Date}
 */
function jumpToNextWorkday(date, startHour) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  d.setHours(startHour !== undefined ? startHour : CFG.workStartHour, 0, 0, 0);

  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }

  return d;
}

/**
 * Formats a Date as a human-readable string in the script's timezone.
 * e.g. "Mon, Apr 28 at 10:00 AM"
 *
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    "EEE, MMM d 'at' h:mm a"
  );
}

/**
 * Parses a comma-separated day string (e.g. "Mon,Wed,Fri") into
 * an array of JS day indices (e.g. [1, 3, 5]).
 * Defaults to Mon–Fri if the value is empty or invalid.
 *
 * @param {string|undefined} value
 * @returns {number[]}
 */
function parseDays(value) {
  if (!value) return [1, 2, 3, 4, 5];
  const days = String(value).split(',')
    .map(d => DAY_NAME_TO_INDEX[d.trim()])
    .filter(n => n !== undefined);
  return days.length > 0 ? days : [1, 2, 3, 4, 5];
}
