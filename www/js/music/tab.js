/**
 * A tiny ASCII tablature parser, so song content can be authored the same way
 * a guitarist reads it:
 *
 *   const tune = parseTab(`
 *     e|----------------|
 *     B|----------------|
 *     G|----------------|
 *     D|----------------|
 *     A|--------2---3---|
 *     E|0---0-----------|
 *   `, { stepsPerBeat: 2 });
 *
 * Rules
 *  - The first tab line is the highest-pitched string; the last is the lowest.
 *    That is conventional tablature and matches how the note highway is drawn
 *    (low E nearest the player, at the bottom).
 *  - `|` is a bar separator and occupies no time.
 *  - `-` holds the grid. Every other character is one grid step.
 *  - Digits form a fret number (10, 12, ...). `0` is an open string.
 *  - Technique marks h p b r / \ ~ x s are read but produce no note.
 */

const TECHNIQUE = /[hpbxr~/\\()s*^]/;

export function parseTab(text, { stepsPerBeat = 2, tuningId = 'standard', startBeat = 0 } = {}) {
  const rawLines = String(text)
    .replace(/\r/g, '')
    .split('\n')
    // Tabs are written inside indented template literals, so both ends are trimmed.
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rows = rawLines.map((line) => {
    const m = /^([A-Ga-g][#b]?\d?\s*)?\|(.*?)\|?$/.exec(line);
    if (!m) return { body: null };
    return { label: (m[1] || '').trim(), body: m[2] };
  });

  const tabRows = rows.filter((r) => r.body !== null);
  if (tabRows.length === 0) throw new Error('parseTab: no tablature rows found');

  // Pad every row to the longest body so columns line up even when a row is
  // written with fewer trailing dashes.
  const width = tabRows.reduce((w, r) => Math.max(w, r.body.length), 0);
  for (const r of tabRows) r.body = r.body.padEnd(width, '-');

  const stringCount = tabRows.length;
  const events = [];

  // Column is measured across the *body* of the row, so a leading "e|" does not
  // shift the grid.
  for (let rowIndex = 0; rowIndex < stringCount; rowIndex++) {
    // Tab is written high string first; internal string 0 is the low E.
    const string = stringCount - 1 - rowIndex;
    const body = tabRows[rowIndex].body;
    let col = 0;
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if (ch === '|') continue; // bar line, no time
      if (ch === ' ') continue; // padding
      if (/[0-9]/.test(ch)) {
        let num = ch;
        // A second adjacent digit continues the fret number.
        while (i + 1 < body.length && /[0-9]/.test(body[i + 1])) {
          num += body[++i];
        }
        const fret = Number(num);
        events.push({
          beat: startBeat + col / stepsPerBeat,
          step: col,
          string,
          fret,
          durBeats: 1 / stepsPerBeat,
        });
        col++;
        continue;
      }
      if (TECHNIQUE.test(ch)) {
        col++;
        continue;
      }
      // '-' or anything else: advance the grid
      col++;
    }
  }

  events.sort((a, b) => a.beat - b.beat || a.string - b.string);
  return { events, stringCount, stepsPerBeat, tuningId };
}

/**
 * Build a melodic track from a list of [noteName, durationInBeats] pairs.
 * Handy for scales, ear-training patterns and simple melodies.
 */
export function sequence(notes, { stepsPerBeat = 1, tuningId = 'standard', startBeat = 0 } = {}) {
  const events = [];
  let beat = startBeat;
  for (const entry of notes) {
    const [name, beats] = Array.isArray(entry) ? entry : [entry, 1];
    events.push({ beat, name, durBeats: beats });
    beat += beats;
  }
  return { events, stringCount: 6, stepsPerBeat, tuningId };
}

export default { parseTab, sequence };
