# 1:1 Rotation Scheduler

**Stop manually organizing 1:1s. Let the robot handle it.**

A zero-infrastructure scheduling tool built on Google Apps Script. Drop it into any Google Sheet, share one link with your team, and every colleague gets a different 1:1 partner each week — automatically, with Calendar invites and Meet links.

<img src="img/webapp_ui.png" alt="Web app sign-up form" width="420"/>

→ **[Setup guide](SETUP.md)** — get running in ~15 minutes.

---

## Why teams use it

**It removes the awkward math.** Who hasn't met whom? Who's already had their turn this cycle? The scheduler handles all of it — round-robin, fair, automatic.

**No new tools to adopt.** It lives inside Google Workspace — the tools your team already uses. No Slack bots, no SaaS subscriptions, no data leaving your org.

**People control their own schedule.** Each person sets their preferred days, time window, and timezone. The scheduler only proposes slots when *both* people are free.

---

## What you get

### Self-service sign-up & dashboard

Colleagues sign up via a clean web form — no admin needed. Each person gets:

- **Preferred days & time window** — the scheduler respects individual availability
- **Timezone support** — each person sets their own; intersections are computed correctly
- **Team assignment** — stay within your team or opt in to cross-team meetings
- **Pause / rejoin** — mark yourself inactive when on leave; rejoin with one click
- **Personal dashboard** — view upcoming 1:1s, update preferences, leave or rejoin the rotation

### Smart scheduling

- Checks **real free/busy** from Google Calendar for both participants
- Finds the **intersection** of preferences — only proposes times that work for both
- Respects a **buffer window** — never schedules sooner than *N* days from now
- **Skips pairs** already booked within the look-ahead window (no duplicates)
- **Auto-reschedules** cancelled or declined meetings — finds a new slot and sends fresh invites

### Fair round-robin rotation

Every person meets every other person exactly once before the cycle repeats. With 4 people A, B, C, D:

```
Round 1: A & B  ·  C & D
Round 2: A & D  ·  B & C
Round 3: A & C  ·  D & B
→ repeats
```

- One meeting per person per round — no one gets double-booked
- Odd number of people? One person sits out per round, rotating fairly
- Round state is remembered; runs can be spaced however you like

### Cross-team meetings

Teams stay together by default. People who want more visibility across the org can opt in — they'll be paired with colleagues from other teams who are also open to it. Granular enough to choose *which* teams you're open to.

### Runs itself

Set a one-time weekly trigger (Monday 8 AM, one click) and the scheduler runs every week without any manual intervention. Full execution logs available in Apps Script.

### Zero infrastructure cost

Runs entirely within Google's free Apps Script quota. No servers, no databases, no monthly bill. The only requirement is a Google Workspace account.

---

## Security

Everything stays inside your Google Workspace org. There are no external accounts to create, no API keys to manage, and no third-party services that can access your data.

| What | How |
| --- | --- |
| **Authentication** | The dashboard uses Google's own session — identity is enforced by Google. No passwords are stored or managed by this tool. |
| **Identity verification** | Preference updates and deactivation verify server-side that the session email matches the submitted email. You cannot modify someone else's record. |
| **Access control** | Deploy the web app with **Access: Anyone in your organization** — only colleagues with a valid Workspace account can reach the sign-up form or dashboard. |
| **Email domain restriction** | Optionally restrict sign-ups to a single domain (e.g. `@yourcompany.com`) so the form rejects addresses outside your org even if the URL leaks. |
| **Data storage** | All data lives in a Google Sheet you own. Nothing is written to external databases or third-party services. |
| **Calendar data** | Free/busy checks run through the Google Calendar API within your org. Calendar contents never leave Google's infrastructure. |
| **Holiday data** | The only outbound request is to a public API (Nager.Date) to fetch national holiday dates by country — no personal data is included. |
| **Script permissions** | The script runs as the owner (organizer of all events). Participants are never granted edit access to the Sheet or Script. |

---

## Participant responsibilities

The scheduler automates the hard parts, but a few things are still on each person:

**Keep your calendar up to date.** The scheduler reads your real free/busy from Google Calendar when finding open slots. If your calendar doesn't reflect your actual availability — blocked focus time, OOO, travel — you may get scheduled at a bad time.

**Keep your preferences current.** If your working hours or preferred days change, update them via the dashboard. Stale preferences lead to slots that no longer work for you.

**Own your meetings.** If a scheduled 1:1 no longer works for you, reach out to your partner directly, cancel the invite for both parties, or reschedule.

---

## Known limitations

| Limitation | Detail |
| --- | --- |
| Free/busy accuracy | Calendar API only works within the same Google Workspace org. External participants fall back to checking the script owner's calendar only. |
| Cancellation/Declined detection | Only detects events deleted by the script owner. If a participant removes it from their own calendar only or answer as No, Maybe, it is not detected. |
