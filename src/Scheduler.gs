// ============================================================
// Scheduler.gs — Main orchestration logic
// ============================================================

/**
 * Entry point — generates this week's pairs and schedules a 1:1 for each.
 * Called manually from the menu or automatically by a trigger.
 */
function scheduleMeetings() {
  const participants = getParticipants();

  if (participants.length < 2) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "Need at least 2 active participants to schedule 1:1s.",
      "Warning", 8
    );
    return;
  }

  const allRounds  = generateAllRounds(participants);
  const roundIndex = getCurrentRoundIndex() % allRounds.length;
  const pairs      = allRounds[roundIndex];
  const roundLabel = `Round ${roundIndex + 1} of ${allRounds.length}`;

  // Only schedule cross-team pairs when both participants are cross-team open
  const eligiblePairs = pairs.filter(([p1, p2]) => _isCrossTeamPairAllowed(p1, p2));
  const skipped = pairs.length - eligiblePairs.length;
  Logger.log(`${roundLabel} — ${eligiblePairs.length} pair(s)${skipped > 0 ? ` (${skipped} cross-team pair(s) skipped)` : ""}`);

  const results = eligiblePairs.map(([p1, p2]) => {
    const status = schedulePair(p1, p2, roundIndex + 1);
    return `${p1.name} & ${p2.name}: ${status}`;
  });

  advanceRoundIndex();

  const summary = `${roundLabel}\n\n${results.join("\n")}`;
  Logger.log("=== Summary ===\n" + summary);
  SpreadsheetApp.getActiveSpreadsheet().toast(summary, "Scheduling Complete", 20);
}

/**
 * Schedules a single pair:
 *   1. Skip if they already have a 1:1 soon
 *   2. Find a mutual free slot using the intersection of their preferences
 *   3. Create the calendar event (both receive invites)
 *
 * @param {Object} p1
 * @param {Object} p2
 * @param {number} roundNumber - 1-indexed, for logging
 * @returns {string} Human-readable status
 */
function schedulePair(p1, p2, roundNumber) {
  if (pairHasRecentMeeting(p1.email, p2.email, CFG.skipIfMeetingWithinDays)) {
    return `skipped — 1:1 already exists within ${CFG.skipIfMeetingWithinDays} days`;
  }

  const prefs = _intersectPrefs(p1, p2);
  const slot  = findFreeSlot([p1.email, p2.email], prefs);

  if (!slot) {
    logPairEntry(p1, p2, roundNumber, null, null, "no free slot found");
    return "no free slot found";
  }

  try {
    const event = createMeetingEvent(p1, p2, slot);
    logPairEntry(p1, p2, roundNumber, slot, event, "scheduled");
    return `scheduled → ${formatDate(slot.start)}`;
  } catch (e) {
    logPairEntry(p1, p2, roundNumber, slot, null, `error: ${e.message}`);
    Logger.log(`Error scheduling ${p1.name} & ${p2.name}: ${e.message}`);
    return `error: ${e.message}`;
  }
}

/**
 * Checks all upcoming scheduled pairs for cancellations or declines,
 * and automatically reschedules any that are found.
 * Called manually from the menu or can be added to a trigger.
 */
function checkCancellationsAndReschedule() {
  const upcoming = getUpcomingScheduledPairs();

  if (upcoming.length === 0) {
    SpreadsheetApp.getActiveSpreadsheet()
      .toast("No upcoming scheduled pairs found in the log.", "Done", 5);
    return;
  }

  const allParticipants = getParticipants();
  const results = [];

  for (const entry of upcoming) {
    const status = getEventStatus(entry.eventId, entry.p1Email, entry.p2Email);

    if (status === "ok") {
      results.push(`${entry.pairName}: ok`);
      continue;
    }

    const reason = status === "cancelled" ? "cancelled" : "declined";

    // Find both people in the active participants list
    const p1 = allParticipants.find(p => p.email === entry.p1Email);
    const p2 = allParticipants.find(p => p.email === entry.p2Email);

    if (!p1 || !p2) {
      const msg = `${reason} — participant no longer active`;
      updateLogEntryStatus(entry.logRow, msg);
      results.push(`${entry.pairName}: ${msg}`);
      continue;
    }

    const prefs = _intersectPrefs(p1, p2);
    const slot  = findFreeSlot([p1.email, p2.email], prefs);

    if (!slot) {
      const msg = `${reason} — no free slot found`;
      updateLogEntryStatus(entry.logRow, msg);
      results.push(`${entry.pairName}: ${msg}`);
      continue;
    }

    try {
      const event = createMeetingEvent(p1, p2, slot);
      updateLogEntryStatus(entry.logRow, `${reason} — rescheduled`);
      logPairEntry(p1, p2, entry.round, slot, event, `rescheduled (was ${reason})`);
      results.push(`${entry.pairName}: rescheduled → ${formatDate(slot.start)}`);
    } catch (e) {
      const msg = `${reason} — reschedule error: ${e.message}`;
      updateLogEntryStatus(entry.logRow, msg);
      Logger.log(`Reschedule error for ${entry.pairName}: ${e.message}`);
      results.push(`${entry.pairName}: ${msg}`);
    }
  }

  const summary = results.join("\n");
  Logger.log("=== Cancellation Check ===\n" + summary);
  SpreadsheetApp.getActiveSpreadsheet().toast(summary, "Check Complete", 20);
}

/**
 * Returns true if the pair is allowed to be scheduled.
 * Same-team pairs (including both having no team) are always allowed.
 * Cross-team pairs require BOTH participants to have crossTeamOpen = true.
 *
 * @param {Object} p1
 * @param {Object} p2
 * @returns {boolean}
 */
function _isCrossTeamPairAllowed(p1, p2) {
  const t1 = (p1.team || "").trim().toLowerCase();
  const t2 = (p2.team || "").trim().toLowerCase();
  if (t1 === t2) return true;   // same team (or both unassigned): always allowed

  // Cross-team: both must have the master toggle on
  if (!p1.crossTeamOpen || !p2.crossTeamOpen) return false;

  // Parse each person's target list (empty = open to all teams)
  const targets1 = _parseTargets(p1.crossTeamTargets);
  const targets2 = _parseTargets(p2.crossTeamTargets);

  const p1acceptsP2 = targets1.length === 0 || targets1.includes(t2);
  const p2acceptsP1 = targets2.length === 0 || targets2.includes(t1);
  return p1acceptsP2 && p2acceptsP1;
}

function _parseTargets(raw) {
  if (!raw) return [];
  return String(raw).split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
}

/**
 * Returns the intersection of two participants' time preferences.
 * Falls back to CFG defaults if there is no overlap.
 *
 * @param {Object} p1
 * @param {Object} p2
 * @returns {{ preferredDays: number[], preferredStartHour: number, preferredEndHour: number }}
 */
function _intersectPrefs(p1, p2) {
  const sharedDays = p1.preferredDays.filter(d => p2.preferredDays.includes(d));
  const startHour  = Math.max(p1.preferredStartHour, p2.preferredStartHour);
  const endHour    = Math.min(p1.preferredEndHour,   p2.preferredEndHour);
  const hasTimeOverlap = startHour < endHour;

  return {
    preferredDays:      sharedDays.length > 0 ? sharedDays : [1, 2, 3, 4, 5],
    preferredStartHour: hasTimeOverlap ? startHour : CFG.workStartHour,
    preferredEndHour:   hasTimeOverlap ? endHour   : CFG.workEndHour,
    timezones:          [p1.timezone, p2.timezone].filter(Boolean),
  };
}
