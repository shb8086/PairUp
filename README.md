# 1:1 Rotation Scheduler

Automates weekly 1:1 meeting pairings for teams — built entirely on Google Apps Script, no external services required.

→ **[Setup guide](SETUP.md)** — get running in ~15 minutes

---

## How it works

1. Colleagues sign up via a web form, setting their preferred days and hours
2. Each week the scheduler generates pairs using a fair round-robin rotation
3. It checks real calendar free/busy, finds a mutual open slot, and creates a Calendar event with a Meet link
4. Cancelled or declined meetings are automatically rescheduled

---

## Features

- **Round-robin rotation** — everyone meets everyone exactly once before the cycle repeats
- **Real availability checks** — reads Google Calendar free/busy for both people
- **Per-person preferences** — each person sets their own days, time window, and timezone
- **Cross-team meetings** — opt-in pairing with colleagues from other teams
- **Self-service dashboard** — participants update preferences, pause, or rejoin without admin help
- **Cancellation handling** — automatically detects and reschedules declined meetings
- **Public holiday awareness** — skips national holidays based on each person's timezone
- **Zero infrastructure** — runs on Google's free Apps Script quota; all data stays in a Google Sheet you own

---

## File structure

```
src/
├── Code.gs             — project index
├── Config.gs           — all configuration (edit this one)
├── Menu.gs             — spreadsheet menu
├── Pairings.gs         — round-robin algorithm
├── Scheduler.gs        — main orchestration
├── CalendarService.gs  — free/busy checks and event creation
├── SheetService.gs     — sheet reads, writes, and setup
├── Triggers.gs         — time-based trigger management
├── Utils.gs            — date/time helpers
├── Webapp.gs           — web app routing
├── Holidays.gs         — public holiday lookup
├── webapp.html         — sign-up form
└── dashboard.html      — personal dashboard
```

---

## Security

Everything stays inside your Google Workspace org — no external accounts, no API keys, no third-party data access.

- Authentication is handled by Google; no passwords are stored
- The web app restricts access to your org (optionally to a single email domain)
- All data lives in a Google Sheet you own
- The only outbound request is to [Nager.Date](https://date.nager.at) for public holiday dates (no personal data sent)

---

## Known limitations

- Free/busy checks only work within the same Google Workspace org
- Cancellation detection only triggers when the script owner deletes the event (not when a participant declines or removes it from their own calendar)
