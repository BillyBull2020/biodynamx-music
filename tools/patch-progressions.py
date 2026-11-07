"""Register the progression catalogue: 12 progressions x 12 keys."""
import io

P = r"www/js/content/library.js"
s = io.open(P, encoding="utf-8").read()

if "PROGRESSIONS" in s:
    print("already wired")
    raise SystemExit(0)

imp = "import { TUNES } from './tunes/index.js';"
assert s.count(imp) == 1
s = s.replace(
    imp,
    imp + "\nimport { PROGRESSIONS, KEYS, progressionChords, progressionLabel } from './progressions.js';",
)

BLOCK = r'''
/* ===================================================== PROGRESSION DRILLS ===
 * Twelve harmonic patterns in twelve keys: 144 pieces, and between them they
 * account for the harmony of a very large share of popular music. This is the
 * part that actually unlocks playing songs you recognise — see progressions.js.
 */

const progTracks = {};
for (const prog of PROGRESSIONS) {
  for (const key of KEYS) {
    const chords = progressionChords(prog, key);
    if (!chords) continue; // a chord in this key has no shape; skip it
    const id = `prg-${prog.id}-${key.slug}`;
    progTracks[id] = {
      title: `${prog.name} in ${key.name}`,
      subtitle: progressionLabel(prog, key),
      kind: 'chord',
      level: prog.feel === 'jazz' || prog.feel === 'blues' ? 7 : 4,
      bpm: prog.bpm,
      difficulty: 3,
      tags: ['progression', prog.feel, 'chords'],
      about: `${prog.roman} in ${key.name} \u2014 ${chords.map((c) => c.chord).join(' ')}. ${prog.about}`,
      make: () => ({ chords, mode: 'chords' }),
    };
  }
}
Object.assign(SPECS, progTracks);

'''

anchor = "Object.assign(SPECS, SONG_SPECS, DRUM_SPECS);"
assert s.count(anchor) == 1, "assign anchor"
s = s.replace(anchor, BLOCK.strip() + "\n\n" + anchor)

# extra drum beats
DRUMS = """
  'drums-shuffle': {
    title: 'Shuffle',
    subtitle: 'The blues feel',
    kind: 'drums',
    level: 7,
    bpm: 104,
    difficulty: 3,
    tags: ['drums', 'blues', 'rock'],
    about: 'Triplet feel: the second note of each pair lands late. It is the difference between a march and a groove.',
    make: drums({ kick: 'X---X---', snare: '--X---X-', hat: 'XooXooXo' }, { repeats: 2 }),
  },
  'drums-rock-waltz': {
    title: 'Waltz',
    subtitle: 'Three-four time',
    kind: 'drums',
    level: 6,
    bpm: 96,
    beatsPerBar: 6,
    difficulty: 2,
    tags: ['drums', 'ballad'],
    about: 'One-two-three, one-two-three. Loads of ballads and folk songs sit in three.',
    make: drums({ kick: 'X-----', snare: '----X-', hat: 'X-X-X-' }, { repeats: 2 }),
  },
  'drums-half-time-rock': {
    title: 'Half-time rock',
    subtitle: 'Wide and heavy',
    kind: 'drums',
    level: 7,
    bpm: 88,
    difficulty: 3,
    tags: ['drums', 'rock'],
    about: 'Snare on three makes it feel half speed. This is the beat under most modern rock and metal verses.',
    make: drums({ kick: 'X---X---', snare: '----X---', hat: 'X-X-X-X-' }, { repeats: 2 }),
  },
  'drums-groove-pop': {
    title: 'Pop groove',
    subtitle: 'The radio beat',
    kind: 'drums',
    level: 6,
    bpm: 108,
    difficulty: 2,
    tags: ['drums', 'pop'],
    about: 'Kick on one and three, extra kick before four, snare on two and four. The default drum sound of the last forty years.',
    make: drums({ kick: 'X---X-X-', snare: '--X---X-', hat: 'XXXXXXXX' }, { repeats: 2 }),
  },
"""

a2 = "  'drums-bossa': {"
assert s.count(a2) == 1, "drum insertion anchor"
s = s.replace(a2, DRUMS.strip("\n") + "\n" + a2)

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("library.js: progressions + 4 more drum beats")
