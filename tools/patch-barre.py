"""Generate barre shapes for any chord, so the library is effectively complete.

Hand-adding every chord in every key does not scale, and the song importer
rejects anything it cannot spell. Two movable shapes (E-shape on the 6th string,
A-shape on the 5th) cover every major, minor, 7th, m7 and maj7 chord in all
twelve keys.
"""
import io

P = r"www/js/music/theory.js"
s = io.open(P, encoding="utf-8").read()

if "BARRE_SHAPES" in s:
    print("already patched")
    raise SystemExit(0)

block = '''
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
'''

anchor = "/** Try an enharmonic respelling so \"A#\" finds \"Bb\" and vice versa. */"
assert s.count(anchor) == 1, "alias anchor"
s = s.replace(anchor, block.strip() + "\n\n" + anchor)

# lookupChord: fall back to a generated barre shape
old = """  const alt = ENHARMONIC[root];
  if (alt && CHORDS[alt + rest]) return CHORDS[alt + rest];
  return null;
}"""
new = """  const alt = ENHARMONIC[root];
  if (alt && CHORDS[alt + rest]) return CHORDS[alt + rest];

  // Last resort: build the barre shape. This is what makes the song importer
  // accept charts written in keys we never hand-tabbed.
  return generatedChord(raw);
}"""
assert s.count(old) == 1, "lookupChord tail"
s = s.replace(old, new)

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("theory.js: generated barre chords + lookup fallback")
