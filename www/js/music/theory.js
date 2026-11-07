/**
 * Music theory for a 6-string guitar: names, tunings, fretboard, chord shapes,
 * scales. Everything is expressed in MIDI note numbers, matching the reference
 * app's convention (chromatic index = MIDI, octave = floor(midi/12) - 1).
 */

export { hzToMidi, midiToHz } from '../audio/pitch.js';

export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function pitchClass(midi) {
  return ((Math.round(midi) % 12) + 12) % 12;
}

export function noteName(midi, useFlats = false) {
  const names = useFlats ? FLAT_NAMES : SHARP_NAMES;
  return names[pitchClass(midi)];
}

export function noteWithOctave(midi, useFlats = false) {
  const m = Math.round(midi);
  return `${noteName(m, useFlats)}${Math.floor(m / 12) - 1}`;
}

/** Parse "E2" / "F#3" / "Bb4" into a MIDI number, or null. */
export function parseNote(text) {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(String(text).trim());
  if (!m) return null;
  const base = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1].toLowerCase()];
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + base + acc;
}

/* ------------------------------------------------------------------ tunings */

export const TUNINGS = {
  standard: { label: 'Standard', short: 'E A D G B E', midis: [40, 45, 50, 55, 59, 64] },
  dropD: { label: 'Drop D', short: 'D A D G B E', midis: [38, 45, 50, 55, 59, 64] },
  halfStepDown: { label: 'Half step down', short: 'Eb Ab Db Gb Bb Eb', midis: [39, 44, 49, 54, 58, 63] },
  fullStepDown: { label: 'Full step down', short: 'D G C F A D', midis: [38, 43, 48, 53, 57, 62] },
  openG: { label: 'Open G', short: 'D G D G B D', midis: [38, 43, 50, 55, 59, 62] },
  openD: { label: 'Open D', short: 'D A D F# A D', midis: [38, 45, 50, 54, 57, 62] },
  dadgad: { label: 'DADGAD', short: 'D A D G A D', midis: [38, 45, 50, 55, 57, 62] },
  sevenString: { label: '7-string', short: 'B E A D G B E', midis: [35, 40, 45, 50, 55, 59, 64] },
};

export function tuning(id) {
  return TUNINGS[id] || TUNINGS.standard;
}

export function stringCount(tuningId) {
  return tuning(tuningId).midis.length;
}

export function stringMidi(tuningId, stringIndex) {
  return tuning(tuningId).midis[stringIndex];
}

export function fretMidi(tuningId, stringIndex, fret) {
  return stringMidi(tuningId, stringIndex) + fret;
}

/** Lowest-fret position for a MIDI note on a given tuning, or null. */
export function findPosition(tuningId, midi) {
  const mids = tuning(tuningId).midis;
  let best = null;
  for (let s = 0; s < mids.length; s++) {
    const fret = midi - mids[s];
    if (fret < 0 || fret > 22) continue;
    if (!best || fret < best.fret) best = { string: s, fret };
  }
  return best;
}

/* ------------------------------------------------------------------ chords */

/**
 * Chord shapes. `frets` runs low E -> high e; -1 means "do not strum",
 * 0 means open. Pitch content is derived from the tuning, never hardcoded.
 */
export const CHORDS = {
  E: { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  E7: { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
  Em7: { frets: [0, 2, 2, 0, 3, 0], fingers: [0, 2, 3, 0, 4, 0] },
  A: { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  Am: { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  A7: { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
  Am7: { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
  Asus4: { frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0] },
  Asus2: { frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0] },
  D: { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  Dm: { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  D7: { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
  Dm7: { frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1] },
  Dsus4: { frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4] },
  Dsus2: { frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 2, 0] },
  C: { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  C7: { frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
  Cadd9: { frets: [-1, 3, 2, 0, 3, 0], fingers: [0, 3, 2, 0, 4, 0] },
  Csus2: { frets: [-1, 3, 0, 0, 1, 3], fingers: [0, 3, 0, 0, 1, 4] },
  G: { frets: [3, 2, 0, 0, 0, 3], fingers: [3, 2, 0, 0, 0, 4] },
  G7: { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
  F: { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], barre: true },
  Fmaj7: { frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] },
  Bm: { frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], barre: true },
  B7: { frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
  Bb: { frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1], barre: true },
  E5: { frets: [0, 2, 2, -1, -1, -1], fingers: [0, 1, 2, 0, 0, 0] },
  A5: { frets: [-1, 0, 2, 2, -1, -1], fingers: [0, 0, 1, 2, 0, 0] },
  D5: { frets: [-1, -1, 0, 2, 3, -1], fingers: [0, 0, 0, 1, 2, 0] },
  G5: { frets: [3, 5, 5, -1, -1, -1], fingers: [0, 1, 2, 0, 0, 0] },
  /* --- added for the song importer: the chords real charts actually use --- */
  A7sus4: { frets: [-1, 0, 2, 0, 3, 0], fingers: [0, 0, 2, 0, 4, 0] },
  Esus4: { frets: [0, 2, 2, 2, 0, 0], fingers: [0, 1, 2, 3, 0, 0] },
  Csus4: { frets: [-1, 3, 3, 0, 1, 1], fingers: [0, 2, 3, 0, 1, 1] },
  Gsus4: { frets: [3, 3, 0, 0, 1, 3], fingers: [2, 3, 0, 0, 1, 4] },
  Bm7: { frets: [-1, 2, 4, 2, 3, 2], fingers: [0, 1, 3, 1, 2, 1] },
  Fsharp_m: { frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1], barre: true, alias: 'F#m' },
  'F#m': { frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1], barre: true },
  'F#m7': { frets: [2, 4, 2, 2, 2, 2], fingers: [1, 3, 1, 1, 1, 1], barre: true },
  'C#m': { frets: [-1, 4, 6, 6, 5, 4], fingers: [0, 1, 3, 4, 2, 1], barre: true },
  Gm: { frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1], barre: true },
  Gm7: { frets: [3, 5, 3, 3, 3, 3], fingers: [1, 3, 1, 1, 1, 1], barre: true },
  Cm: { frets: [-1, 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1], barre: true },
  Fm: { frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1], barre: true },
  Cmaj7: { frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] },
  Dmaj7: { frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 1, 1] },
  Emaj7: { frets: [0, 2, 1, 1, 0, 0], fingers: [0, 3, 1, 2, 0, 0] },
  Amaj7: { frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 3, 1, 4, 0] },
  Bbmaj7: { frets: [-1, 1, 3, 2, 3, 1], fingers: [0, 1, 3, 2, 4, 1], barre: true },
  A6: { frets: [-1, 0, 2, 2, 2, 2], fingers: [0, 0, 1, 1, 1, 1] },
  E6: { frets: [0, 2, 2, 1, 2, 0], fingers: [0, 2, 3, 1, 4, 0] },
  G6: { frets: [3, 2, 0, 0, 0, 0], fingers: [3, 2, 0, 0, 0, 0] },
  C6: { frets: [-1, 3, 2, 2, 1, 0], fingers: [0, 4, 2, 3, 1, 0] },
  D6: { frets: [-1, -1, 0, 2, 0, 2], fingers: [0, 0, 0, 2, 0, 3] },
  /* slash chords */
  'G/B': { frets: [-1, 2, 0, 0, 0, 3], fingers: [0, 1, 0, 0, 0, 3] },
  'D/F#': { frets: [2, 0, 0, 2, 3, 2], fingers: [1, 0, 0, 2, 4, 3] },
  'C/E': { frets: [0, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  'Am/G': { frets: [3, 0, 2, 2, 1, 0], fingers: [3, 0, 2, 1, 1, 0] },
  /* flat-key barre shapes */
  Eb: { frets: [-1, 6, 5, 3, 4, 3], fingers: [0, 4, 3, 1, 2, 1], barre: true },
  Ab: { frets: [4, 6, 6, 5, 4, 4], fingers: [1, 3, 4, 2, 1, 1], barre: true },
  Db: { frets: [-1, 4, 6, 6, 6, 4], fingers: [0, 1, 3, 4, 4, 1], barre: true },
  Gb: { frets: [2, 4, 4, 3, 2, 2], fingers: [1, 3, 4, 2, 1, 1], barre: true },
  C5: { frets: [-1, 3, 5, 5, -1, -1], fingers: [0, 1, 3, 4, 0, 0] },
  D5add: { frets: [-1, -1, 0, 2, 3, 5], fingers: [0, 0, 0, 1, 2, 4] },

};

/** The MIDI notes actually sounded by a shape in a given tuning. */
export function shapeMidis(shape, tuningId = 'standard') {
  const mids = tuning(tuningId).midis;
  const out = [];
  shape.frets.forEach((fret, s) => {
    if (fret < 0 || s >= mids.length) return;
    out.push({ string: s, fret, midi: mids[s] + fret });
  });
  return out;
}

export function shapePitchClasses(name, tuningId = 'standard') {
  const shape = CHORDS[name];
  if (!shape) return [];
  const set = new Set();
  for (const n of shapeMidis(shape, tuningId)) set.add(pitchClass(n.midi));
  return [...set].sort((a, b) => a - b);
}

/** Chord shapes transposed to a named tuning are not supported; shapes are standard-tuning. */
/* ---------------------------------------------------------- generated chords */

/**
 * Movable barre shapes. `E` templates put the root on the 6th string,
 * `A` templates on the 5th. Add the root's fret to every fretted position and
 * you have that chord in any key.
 */
const BARRE_SHAPES = {
  '': { E: [0, 2, 2, 1, 0, 0], A: [-1, 0, 2, 2, 2, 0] },
  m: { E: [0, 2, 2, 0, 0, 0], A: [-1, 0, 2, 2, 1, 0] },
  '7': { E: [0, 2, 0, 1, 0, 0], A: [-1, 0, 2, 0, 2, 0] },
  m7: { E: [0, 2, 0, 0, 0, 0], A: [-1, 0, 2, 0, 1, 0] },
  maj7: { E: [0, 2, 1, 1, 0, 0], A: [-1, 0, 2, 1, 2, 0] },
  '6': { E: [0, 2, 2, 1, 2, 0], A: [-1, 0, 2, 2, 2, 2] },
  m6: { E: [0, 2, 2, 0, 2, 0], A: [-1, 0, 2, 2, 1, 2] },
  '9': { E: [0, 2, 0, 1, 0, 2], A: [-1, 0, 2, 0, 2, 3] },
  sus4: { E: [0, 2, 2, 2, 0, 0], A: [-1, 0, 2, 2, 3, 0] },
  sus2: { E: [0, 2, 4, 4, 0, 0], A: [-1, 0, 2, 2, 0, 0] },
};

const ROOT_PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

/**
 * Build a barre shape for "F#m", "Bb7", "Ebmaj7" and friends.
 * Prefers whichever template sits lower on the neck.
 */
export function generatedChord(name) {
  const m = /^([A-G][#b]?)(.*)$/.exec(String(name || '').trim());
  if (!m) return null;
  const [, root, quality] = m;
  const pc = ROOT_PC[root];
  if (pc === undefined) return null;
  const shapes = BARRE_SHAPES[quality];
  if (!shapes) return null;

  const eFret = (pc - 4 + 12) % 12; // E-shape: root on the 6th string
  const aFret = (pc - 9 + 12) % 12; // A-shape: root on the 5th string
  const useA = aFret <= eFret;
  const base = useA ? shapes.A : shapes.E;
  const fret = useA ? aFret : eFret;

  const frets = base.map((f) => (f < 0 ? -1 : f + fret));
  const open = frets.every((f) => f <= 0) && fret === 0;
  return {
    frets,
    fingers: frets.map((f) => (f > 0 ? (f === fret ? 1 : 0) : 0)),
    barre: !open && frets.some((f) => f === fret),
    generated: true,
  };
}

/** Try an enharmonic respelling so "A#" finds "Bb" and vice versa. */
const ENHARMONIC = {
  'C#': 'Db', Db: 'C#',
  'D#': 'Eb', Eb: 'D#',
  'F#': 'Gb', Gb: 'F#',
  'G#': 'Ab', Ab: 'G#',
  'A#': 'Bb', Bb: 'A#',
};

/**
 * Look up a chord shape, tolerating enharmonic spellings and a few common
 * suffixes. Returns the shape or null.
 */
export function lookupChord(name) {
  if (!name) return null;
  const raw = String(name).trim();
  if (CHORDS[raw]) return CHORDS[raw];

  // A#m  ->  Bbm, and so on: swap the root only.
  const m = /^([A-G][#b]?)(.*)$/.exec(raw);
  if (!m) return null;
  const [, root, rest] = m;
  const alt = ENHARMONIC[root];
  if (alt && CHORDS[alt + rest]) return CHORDS[alt + rest];

  // Last resort: build the barre shape. This is what makes the song importer
  // accept charts written in keys we never hand-tabbed.
  return generatedChord(raw);
}

export function chordRoot(name) {
  const m = /^([A-G][#b]?)/.exec(name);
  if (!m) return 0;
  const parsed = parseNote(`${m[1]}0`);
  return parsed === null ? 0 : pitchClass(parsed);
}

/* ------------------------------------------------------------------ scales */

export const SCALES = {
  major: { label: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11] },
  minor: { label: 'Natural minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  pentatonicMinor: { label: 'Minor pentatonic', intervals: [0, 3, 5, 7, 10] },
  pentatonicMajor: { label: 'Major pentatonic', intervals: [0, 2, 4, 7, 9] },
  blues: { label: 'Blues', intervals: [0, 3, 5, 6, 7, 10] },
  dorian: { label: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  mixolydian: { label: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
};

/**
 * Scale degrees as MIDI numbers starting from the lowest position playable
 * above `startFret`.
 */
export function scaleMidis({ rootPc = 9, scale = 'pentatonicMinor', octaves = 1, tuningId = 'standard', startFret = 0 }) {
  const { intervals } = SCALES[scale] || SCALES.pentatonicMinor;
  const openLow = tuning(tuningId).midis[0];
  // lowest root at or above the open low string
  let base = openLow + ((((rootPc - openLow) % 12) + 12) % 12);
  base += Math.max(0, startFret);
  const out = [];
  for (let o = 0; o < octaves; o++) {
    for (const i of intervals) out.push(base + o * 12 + i);
  }
  out.push(base + octaves * 12);
  return out;
}

/* ------------------------------------------------------------- tablature */

export const STRING_LABELS_UP = ['e', 'B', 'G', 'D', 'A', 'E'];

/** Human label for a string index (0 = low E). */
export function stringLabel(tuningId, index) {
  const mids = tuning(tuningId).midis;
  const n = mids[index];
  return noteName(n);
}
