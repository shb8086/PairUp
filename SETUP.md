# Setup Guide

Get the 1:1 Rotation Scheduler running in ~15 minutes.

---

## Step 1 — Create a Google Sheet

Go to [sheets.google.com](https://sheets.google.com), create a blank spreadsheet, name it e.g. **"1:1 Scheduler"**.

---

## Step 2 — Open Apps Script

In your Sheet: **Extensions → Apps Script**

---

## Step 3 — Add the script files

All files are in the `src/` folder of this repo.

For each `.gs` file:

1. Click **"+"** next to Files → **Script**
2. Name it exactly as listed (e.g. `Config`, `Pairings`, `Scheduler`, etc.)
3. Paste the file contents from `src/<name>.gs`

For `webapp.html` and `dashboard.html`:

1. Click **"+"** → **HTML**
2. Name it `webapp` (or `dashboard`)
3. Paste the contents from `src/<name>.html`

Replace the default content in `Code.gs` with the index comment from `src/Code.gs`.

The Files panel should show all 12 files when done.

---

## Step 4 — Enable the Calendar Advanced Service

Required for free/busy checks across both participants in each pair.

1. In the Apps Script editor, click **Services** (the `+` icon in the left sidebar)
2. Find **Google Calendar API** → **Add**

---

## Step 5 — Create a dedicated scheduler calendar (recommended)

By default, every 1:1 event is created on the **script owner's personal calendar**, meaning they see every meeting between every pair — not just their own. Creating a dedicated calendar keeps those events out of your personal inbox.

1. Open [Google Calendar](https://calendar.google.com)
2. In the left sidebar, click the **`+`** icon next to **"Other calendars"** → **Create new calendar**
3. Name it e.g. `1:1 Scheduler` → click **Create calendar**
4. In the left sidebar, hover over the new calendar → click the **⋮ menu** → **Settings and sharing**
5. Scroll down to **"Integrate calendar"** → copy the **Calendar ID** (looks like `abc123xyz@group.calendar.google.com`)
6. Open `Config.gs` and paste it: `calendarId: "abc123xyz@group.calendar.google.com"`
7. Back in Google Calendar, click the **⋮ menu** next to the calendar → **Hide from view** — your own 1:1 invites still appear via the invite; only the organizer copies of other pairs are hidden

> If you skip this step, leave `calendarId` as `""` — everything still works, but all scheduled meetings appear on your default calendar.

---

## Step 6 — Run first-time setup

In the Apps Script editor, select `setupSheetHeaders` → **Run**. Approve the authorization prompt.

This creates the **Participants**, **Teams**, and **Schedule Log** sheets.

---

## Step 7 — Fill in the Teams sheet

Open the **Teams** tab and add your team names (one per row, column A). These populate the team dropdown in the sign-up form and dashboard.

---

## Step 8 — Deploy the web app

1. **Deploy → New deployment**
2. Type: **Web app** | Execute as: **Me** | Access: **Anyone in your org**
3. Copy the deployment URL

Share two links with your team:

| Link | Purpose |
| --- | --- |
| `<deployment-url>` | Sign-up — enter email, set preferences, join the rotation |
| `<deployment-url>?page=dashboard` | Dashboard — view upcoming 1:1s, edit preferences, pause or rejoin |

> After any code change: **Deploy → Manage deployments → Edit → New version → Deploy**

---

## Step 9 — Schedule

Reload your Sheet. The **"1:1 Scheduler"** menu appears in the toolbar:

| Menu item | What it does |
| --- | --- |
| ▶ Schedule This Week's Pairs | Runs the current round, creates Calendar events, advances to next round |
| 🔍 Check & Reschedule Cancelled | Detects cancelled or declined meetings and reschedules them |
| ⏰ Set Weekly Trigger (Mon 8 AM) | Automates scheduling — fires every Monday at 8 AM |
| 🗑 Remove All Triggers | Turns off automation |
| 🔄 Reset Rotation to Round 1 | Restarts the cycle from the beginning |
| 📋 Setup Sheet Headers | Creates sheets (safe to re-run) |

---

## Configuration

Open `Config.gs` to customize behavior:

```javascript
const CFG = {
  durationMins:            25,   // meeting length in minutes
  allowedEmailDomain:      "",   // restrict sign-ups, e.g. "@yourcompany.com" (empty = allow all)
  scheduleMinDaysAhead:    7,    // never schedule sooner than this many days from now
  searchDaysAhead:         14,   // scan up to this many days ahead
  workStartHour:           10,   // default start hour (overridden by each person's preferences)
  workEndHour:             16,   // default end hour   (overridden by each person's preferences)
  slotIntervalMin:         30,   // scan every N minutes when looking for a free slot
  skipIfMeetingWithinDays: 14,   // skip a pair if they already have a 1:1 booked in this window
  meetingTitle:            "1:1 — {person1} & {person2}",
};
```

**`allowedEmailDomain`** is particularly useful in orgs where the sign-up URL is accessible externally — set it to `"@yourcompany.com"` to ensure only colleagues can sign up.

---

## Adding participants manually

Prefer to pre-populate the sheet directly? Open the **Participants** tab and fill in rows:

| Name | Email | Active | Preferred Days | Preferred Start Hour | Preferred End Hour | Team | Cross Team Open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Alice | alice@example.com | ✅ | Mon,Tue,Wed,Thu,Fri | 10 | 16 | Engineering | ☐ |
| Bob | bob@example.com | ✅ | Mon,Wed,Fri | 9 | 15 | Product | ✅ |
| Carol | carol@example.com | ✅ | Tue,Thu | 10 | 17 | Engineering | ✅ |

- **Active**: uncheck to pause someone without removing their data
- **Preferred Days**: comma-separated — `Mon`, `Tue`, `Wed`, `Thu`, `Fri`
- **Preferred Start/End Hour**: 24-hour numbers (`10` = 10 AM, `16` = 4 PM)
- **Cross Team Open**: both people must have this set for a cross-team pairing to happen

---

## Schedule Log

Every run appends rows to the **Schedule Log** tab for full auditability:

| Timestamp | Round | Pair | Person 1 Email | Person 2 Email | Scheduled Time | Event ID | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-04-28 08:01 | 1 | Alice & Bob | alice@example.com | bob@example.com | Mon, Apr 28 at 10:00 AM | abc123 | scheduled |
| 2026-04-28 08:01 | 1 | Carol & Dave | carol@example.com | dave@example.com | — | — | no free slot found |

---

## File structure

All source files live in `src/`:

```text
src/
├── Code.gs             — Project index
├── Config.gs           — All configuration constants (edit this one)
├── Menu.gs             — Custom spreadsheet menu
├── Pairings.gs         — Round-robin algorithm + round state
├── Scheduler.gs        — Main orchestration + cross-team pairing filter
├── CalendarService.gs  — Free/busy checks and Calendar event creation
├── SheetService.gs     — Sheet reads, writes, and setup
├── Triggers.gs         — Time-based trigger management
├── Utils.gs            — Date/time helpers
├── Webapp.gs           — Web app routing + server functions
├── Holidays.gs         — Public holiday lookup
├── webapp.html         — Self-service sign-up form (2-step: email → preferences)
└── dashboard.html      — Personal dashboard
```

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Menu not showing | Reload the Sheet; or run `onOpen` from the editor |
| "No free slot found" | Increase `searchDaysAhead` in `Config.gs`, or widen preferred hours |
| Free/busy not respected | Enable Google Calendar API (Step 4) |
| Auth error on first run | Re-run any function in the editor and approve permissions |
| Sheet not found | Run `setupSheetHeaders` from the editor |
| Web app not saving | Confirm `setupSheetHeaders` was run and the Participants sheet exists |
| Web app changes not live | Create a new deployment version (Deploy → Manage deployments) |
| Wrong timezone | Sheet → **File → Settings → Time zone** |
| Want to restart the pairing cycle | Use **"Reset Rotation to Round 1"** from the menu |
