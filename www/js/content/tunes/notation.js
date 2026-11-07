/**
 * Song notation for the bulk public-domain catalogue.
 *
 * A song is one line of melody, which keeps a hundred songs reviewable:
 *
 *   { id: 'ode', t: 'Ode to Joy', c: 'Beethoven', k: 'classical', bpm: 100,
 *     m: 'E4:1 E4:1 F4:1 G4:1 | G4:1 F4:1 E4:1 D4:1' }
 *
 * `NAME:BEATS`, whitespace separated, `|` ignored (bar guide only), `r` is a
 * rest. Names accept sharps and flats: F#4, Bb3.
 *
 * Everything in this folder is public domain. Works published before 1930 are
 * public domain in the United States, and every entry here is either older than
 * that or a traditional/anonymous tune.
 */

const NOTE = /^([A-Ga-g])([#b]?)(-?\d)$/;
const PITCH = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

/** 'F#4' -> MIDI number. Returns null for a rest. */
export function noteToMidi(name) {
  if (name === 'r' || name === 'R') return null;
  const m = NOTE.exec(name);
  if (!m) return null;
  const base = PITCH[m[1].toLowerCase()];
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + base + acc;
}

/**
 * Parse a melody string into note pairs.
 * @returns {Array<[number, number]>} [midi, durBeats] with null midi for rests
 */
export function parseMelody(text) {
  const out = [];
  for (const token of String(text).split(/\s+/)) {
    if (!token || token === '|') continue;
    const [name, beats = '1'] = token.split(':');
    const dur = Number(beats);
    if (!Number.isFinite(dur) || dur <= 0) continue;
    out.push([noteToMidi(name), dur]);
  }
  return out;
}

/**
 * A simplified arrangement for beginners: drop fast passing notes, merge
 * repeated notes, and play it a shade slower.
 *
 * This is the same idea as the "basic / main / full" versions the reference app
 * documents for its songs — same tune, fewer things to do at once.
 */
export function simplify(pairs) {
  const kept = [];
  for (const [midi, dur] of pairs) {
    if (midi === null) {
      // Keep rests, but shorten very short ones so the line does not stall.
      if (dur >= 0.5) kept.push([null, Math.min(dur, 1)]);
      continue;
    }
    // Anything shorter than an eighth note is a grace/passing note at this level.
    if (dur < 0.5) continue;
    const prev = kept[kept.length - 1];
    if (prev && prev[0] === midi) {
      prev[1] += dur; // same pitch twice: hold it instead
      continue;
    }
    kept.push([midi, dur]);
  }
  return kept.length >= 4 ? kept : pairs;
}
