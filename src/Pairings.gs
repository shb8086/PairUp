// ============================================================
// Pairings.gs — Round-robin pairing algorithm + round state
//
// Uses the standard "polygon" round-robin algorithm:
//   - Fix one person, rotate all others
//   - n people → n-1 rounds (if even) or n rounds (if odd, one sits out per round)
//   - Each person appears in exactly one pair per round
// ============================================================

/**
 * Generates all rounds of pairings for a list of participants.
 *
 * Example with 4 people [A, B, C, D]:
 *   Round 1: A-B, C-D
 *   Round 2: A-D, B-C
 *   Round 3: A-C, D-B
 *   → repeats
 *
 * @param {Object[]} participants
 * @returns {Object[][][]} Array of rounds; each round is an array of [p1, p2] pairs
 */
function generateAllRounds(participants) {
  let people = [...participants];

  // If odd number, add a null "bye" slot — that person sits out the round
  if (people.length % 2 !== 0) people.push(null);

  const n = people.length;
  const rounds = [];
  const fixed    = people[0];
  const rotating = people.slice(1);

  for (let r = 0; r < n - 1; r++) {
    const pairs = [];

    // First pair: fixed person vs rotating[0]
    if (fixed !== null && rotating[0] !== null) {
      pairs.push([fixed, rotating[0]]);
    }

    // Remaining pairs: rotating[i] vs rotating[n-1-i]
    for (let i = 1; i < n / 2; i++) {
      const p1 = rotating[i];
      const p2 = rotating[n - 1 - i];
      if (p1 !== null && p2 !== null) {
        pairs.push([p1, p2]);
      }
    }

    rounds.push(pairs);

    // Rotate: move last element to the front
    rotating.unshift(rotating.pop());
  }

  return rounds;
}

// ── Round state (persisted via Script Properties) ────────────

/**
 * Returns the current round index (0-based), stored in Script Properties.
 *
 * @returns {number}
 */
function getCurrentRoundIndex() {
  const val = PropertiesService.getScriptProperties().getProperty("roundIndex");
  return parseInt(val || "0", 10);
}

/**
 * Increments the round index by 1.
 */
function advanceRoundIndex() {
  const next = getCurrentRoundIndex() + 1;
  PropertiesService.getScriptProperties().setProperty("roundIndex", String(next));
}

/**
 * Resets the round index back to 0 (Round 1).
 */
function resetRoundIndex() {
  PropertiesService.getScriptProperties().setProperty("roundIndex", "0");
  SpreadsheetApp.getActiveSpreadsheet()
    .toast("Rotation has been reset to Round 1.", "Reset", 5);
}
