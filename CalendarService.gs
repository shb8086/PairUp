// ============================================================
// CalendarService.gs — All Google Calendar interactions
// ============================================================

/**
 * Returns true if p1 and p2 already have a 1:1 together
 * on the script owner's calendar within the buffer window.
 *
 * @param {string} p1Email
 * @param {string} p2Email
 * @param {number} bufferDays
 * @returns {boolean}
 */
function pairHasRecentMeeting(p1Email, p2Email, bufferDays) {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + bufferDays * 24 * 60 * 60 * 1000);
  const events = CalendarApp.getDefaultCalendar().getEvents(now, windowEnd);

  return events.some(event => {
    const guests = event.getGuestList().map(g => g.getEmail().toLowerCase());
    const hasP1  = guests.includes(p1Email.toLowerCase());
    const hasP2  = guests.includes(p2Email.toLowerCase());
    const is101  = CFG.oneOnOneKeywords.some(kw => event.getTitle().toLowerCase().includes(kw));
    return hasP1 && hasP2 && is101;
  });
}

/**
 * Scans for the first slot where both people are free,
 * within the intersection of their preferred days and hours.
 *
 * @param {string[]} emails - [p1Email, p2Email]
 * @param {{ preferredDays: number[], preferredStartHour: number, preferredEndHour: number }} prefs
 * @returns {{ start: Date, end: Date } | null}
 */
function findFreeSlot(emails, prefs) {
  const startHour   = prefs.preferredStartHour || CFG.workStartHour;
  const endHour     = prefs.preferredEndHour   || CFG.workEndHour;
  const allowedDays = prefs.preferredDays      || [1, 2, 3, 4, 5];
  const timezones   = prefs.timezones          || [];

  const now       = new Date();
  const scanStart = new Date(now.getTime() + CFG.scheduleMinDaysAhead * 24 * 60 * 60 * 1000);
  const scanEnd   = new Date(now.getTime() + CFG.searchDaysAhead       * 24 * 60 * 60 * 1000);
  let cursor      = roundUpToSlot(scanStart, CFG.slotIntervalMin);

  while (cursor < scanEnd) {
    cursor = _skipToValidTime(cursor, startHour, endHour, allowedDays);
    if (cursor >= scanEnd) break;

    // Skip the entire day if it is a public holiday for either participant.
    if (timezones.length > 0 && isHolidayForAny(cursor, timezones)) {
      cursor = jumpToNextWorkday(cursor, startHour);
      continue;
    }

    const slotEnd = new Date(cursor.getTime() + CFG.durationMins * 60 * 1000);
    const endsAfterWork = slotEnd.getHours() > endHour ||
      (slotEnd.getHours() === endHour && slotEnd.getMinutes() > 0);

    if (endsAfterWork) {
      cursor = jumpToNextWorkday(cursor, startHour);
      continue;
    }

    if (isSlotFree(emails, cursor, slotEnd)) {
      return { start: new Date(cursor), end: new Date(slotEnd) };
    }

    cursor = new Date(cursor.getTime() + CFG.slotIntervalMin * 60 * 1000);
  }

  return null;
}

/**
 * Returns true if all emails are free during [start, end).
 * Uses Calendar Advanced Service; falls back to script owner's calendar on error.
 *
 * @param {string[]} emails
 * @param {Date} start
 * @param {Date} end
 * @returns {boolean}
 */
function isSlotFree(emails, start, end) {
  try {
    const response = Calendar.Freebusy.query({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      items:   emails.map(id => ({ id })),
    });

    return emails.every(email => {
      const busy = (response.calendars[email] || {}).busy || [];
      return busy.length === 0;
    });

  } catch (e) {
    Logger.log(`Calendar API free/busy error — falling back to CalendarApp: ${e.message}`);
    return CalendarApp.getDefaultCalendar().getEvents(start, end).length === 0;
  }
}

/**
 * Creates a Google Calendar event and sends invites to both participants.
 * The script owner is the organizer (not a required attendee).
 *
 * @param {Object} p1
 * @param {Object} p2
 * @param {{ start: Date, end: Date }} slot
 * @returns {CalendarEvent}
 */
function createMeetingEvent(p1, p2, slot) {
  const title = CFG.meetingTitle
    .replace("{person1}", p1.name)
    .replace("{person2}", p2.name);

  return CalendarApp.getDefaultCalendar().createEvent(title, slot.start, slot.end, {
    description: CFG.meetingDesc,
    guests:      `${p1.email},${p2.email}`,
    sendInvites: true,
  });
}

/**
 * Checks the status of a scheduled event.
 * Returns "cancelled" if the event no longer exists,
 * "declined" if either pair member RSVP'd No,
 * or "ok" otherwise.
 *
 * Note: only works for events created by the script owner (organizer).
 *
 * @param {string} eventId
 * @param {string} p1Email
 * @param {string} p2Email
 * @returns {"ok"|"cancelled"|"declined"}
 */
function getEventStatus(eventId, p1Email, p2Email) {
  try {
    const event = CalendarApp.getDefaultCalendar().getEventById(eventId);
    if (!event) return "cancelled";

    const declined = event.getGuestList().some(guest => {
      const email = guest.getEmail().toLowerCase();
      const isPairMember = email === p1Email || email === p2Email;
      return isPairMember && guest.getGuestStatus() === CalendarApp.GuestStatus.NO;
    });

    return declined ? "declined" : "ok";
  } catch (e) {
    Logger.log(`getEventStatus error for ${eventId}: ${e.message}`);
    return "ok"; // assume ok on error to avoid false reschedules
  }
}

/**
 * Advances the cursor past non-preferred days and out-of-hours times.
 *
 * @param {Date} cursor
 * @param {number} startHour
 * @param {number} endHour
 * @param {number[]} allowedDays
 * @returns {Date}
 */
function _skipToValidTime(cursor, startHour, endHour, allowedDays) {
  const d = new Date(cursor);
  if (!allowedDays.includes(d.getDay()) || d.getHours() >= endHour) {
    return jumpToNextWorkday(d, startHour);
  }
  if (d.getHours() < startHour) {
    return setTimeOnDate(d, startHour, 0);
  }
  return d;
}
