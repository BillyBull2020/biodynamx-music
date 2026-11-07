"""Wire the tune catalogue into library.js.

Each tune becomes two pieces: a Full arrangement and an Easy arrangement (same
tune, fast passing notes removed, a little slower). That is the same basic/main
split the reference app documents for its own songs, and it is how the library
reaches a few hundred playable pieces without inventing filler.
"""
import io

P = r"www/js/content/library.js"
s = io.open(P, encoding="utf-8").read()

if "from './tunes/index.js'" in s:
    print("already wired")
    raise SystemExit(0)

imp_anchor = "import { drumPattern } from '../music/drums.js';"
assert s.count(imp_anchor) == 1, "import anchor"
s = s.replace(
    imp_anchor,
    imp_anchor + "\nimport { TUNES } from './tunes/index.js';\nimport { parseMelody, simplify } from './tunes/notation.js';",
)

BUILD = r'''
/* ======================================================== SONG CATALOGUE ===
 * Every tune in tunes/ becomes two pieces: the tune itself, and an "Easy"
 * arrangement with the fast passing notes removed. That is the basic/main split
 * the reference app documents, and it is how this library reaches a few hundred
 * playable pieces without padding the list with filler.
 */

/** Turn a [midi, durBeats] pair list into makeTrack notes. */
function pairsToNotes(pairs) {
  const notes = [];
  let beat = 0;
  for (const [midi, dur] of pairs) {
    if (midi !== null) notes.push({ beat, midi, durBeats: dur });
    beat += dur;
  }
  return notes;
}

const tuneTracks = {};

for (const tune of TUNES) {
  const pairs = parseMelody(tune.m);
  if (pairs.length < 3) continue;
  const beatsPerBar = tune.bb || 4;
  const base = {
    title: tune.t,
    subtitle: tune.c,
    kind: 'song',
    level: tune.level || 6,
    beatsPerBar,
    difficulty: 3,
    tags: ['traditional', tune.k],
    about: `${tune.t} — ${tune.c}. Public domain, arranged for one guitar line.`,
  };

  tuneTracks[tune.id] = {
    ...base,
    bpm: tune.bpm,
    make: () => ({ notes: pairsToNotes(pairs) }),
  };

  const easy = simplify(pairs);
  tuneTracks[`${tune.id}-easy`] = {
    ...base,
    title: `${tune.t} (easy)`,
    level: Math.max(1, (tune.level || 6) - 3),
    bpm: Math.max(50, Math.round(tune.bpm * 0.8)),
    difficulty: 2,
    tags: ['traditional', tune.k, 'easy'],
    about: `${tune.t} — ${tune.c}. The simplified line: passing notes removed, slower tempo.`,
    make: () => ({ notes: pairsToNotes(easy) }),
  };
}

Object.assign(SPECS, tuneTracks);

'''

anchor = "Object.assign(SPECS, SONG_SPECS, DRUM_SPECS);"
assert s.count(anchor) == 1, "assign anchor"
s = s.replace(anchor, BUILD.strip() + "\n\n" + anchor)

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("library.js wired to the tune catalogue")
