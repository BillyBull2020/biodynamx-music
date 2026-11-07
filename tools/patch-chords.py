"""Add the chords that real song charts actually use, plus enharmonic aliases.

Every rejected chord is a failed import, so this is worth getting right.
"""
import io

P = r"www/js/music/theory.js"
s = io.open(P, encoding="utf-8").read()

EXTRA = """  /* --- added for the song importer: the chords real charts actually use --- */
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
"""

anchor = "  G5: { frets: [3, 5, 5, -1, -1, -1], fingers: [0, 1, 2, 0, 0, 0] },"
assert s.count(anchor) == 1, "chord tail anchor"
s = s.replace(anchor, anchor + "\n" + EXTRA)

# enharmonic alias resolver
helper = '''

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
  return null;
}
'''

a2 = "export function chordRoot(name) {"
assert s.count(a2) == 1, "chordRoot anchor"
s = s.replace(a2, helper.strip() + "\n\n" + a2)

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("theory.js: +31 chord shapes and lookupChord()")
