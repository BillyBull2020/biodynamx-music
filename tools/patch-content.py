"""Content expansion: +30 pieces, merged at runtime instead of by text surgery.

Appends two blocks to www/js/content/library.js:
  1. WAVE_SPECS      - the new pieces, registered with Object.assign
  2. EXTRA_MISSIONS  - new missions pushed into the existing levels

Merging missions at runtime avoids rewriting the LEVELS literal, which is
exactly the kind of fragile string patch that broke the first attempt.
"""
import io

P = r"www/js/content/library.js"
s = io.open(P, encoding="utf-8").read()

if "WAVE_SPECS" in s:
    print("already expanded")
    raise SystemExit(0)

SPECS_BLOCK = r'''
/* ============================================================ WAVE TWO ===
 * Second content batch. Traditional songs are chord charts on purpose: that is
 * how they are played and sung, and it keeps the arrangement honest. Originals
 * are written for this app.
 */

const WAVE_SPECS = {
  /* ------------------------------------------------------- campfire + soul */
  'camp-down-by-the-riverside': {
    title: 'Down by the Riverside',
    subtitle: 'Traditional spiritual (public domain)',
    kind: 'song',
    level: 4,
    bpm: 108,
    difficulty: 2,
    tags: ['campfire', 'chords', 'traditional'],
    about: 'A jubilee spiritual with three chords and a lot of swing. G, C and D.',
    make: chordSeq(
      [['G', 4], ['G', 4], ['C', 4], ['G', 4], ['D', 4], ['D', 4], ['G', 4], ['G', 4]],
      { pattern: 'DDUD' },
    ),
  },
  'camp-this-little-light': {
    title: 'This Little Light of Mine',
    subtitle: 'Traditional spiritual (public domain)',
    kind: 'song',
    level: 3,
    bpm: 116,
    difficulty: 1,
    tags: ['campfire', 'chords', 'traditional'],
    about: 'Three chords, four bars, sung by every kid at every camp. G, C and D.',
    make: chordSeq(
      [['G', 4], ['C', 4], ['G', 4], ['D', 4], ['G', 4], ['C', 4], ['D', 4], ['G', 4]],
      { pattern: 'DDUD' },
    ),
  },
  'camp-michael-row': {
    title: 'Michael Row the Boat Ashore',
    subtitle: 'Traditional spiritual (public domain)',
    kind: 'song',
    level: 3,
    bpm: 100,
    difficulty: 1,
    tags: ['campfire', 'chords', 'traditional'],
    about: 'Call and response \u2014 you play the answer. C, G and Am.',
    make: chordSeq(
      [['C', 4], ['G', 4], ['Am', 4], ['G', 4], ['C', 4], ['G', 4], ['C', 4], ['C', 4]],
      { pattern: 'D-DU' },
    ),
  },
  'camp-swing-low': {
    title: 'Swing Low, Sweet Chariot',
    subtitle: 'Traditional spiritual (public domain)',
    kind: 'song',
    level: 4,
    bpm: 84,
    difficulty: 2,
    tags: ['campfire', 'chords', 'traditional'],
    about: 'Slow and wide. Let each chord ring instead of chopping at it \u2014 the space is the song.',
    make: chordSeq(
      [['G', 4], ['G', 4], ['C', 4], ['G', 4], ['D7', 4], ['D7', 4], ['G', 4], ['G', 4]],
      { pattern: 'D---D-DU' },
    ),
  },
  'camp-wade-water': {
    title: 'Wade in the Water',
    subtitle: 'Traditional spiritual (public domain)',
    kind: 'song',
    level: 5,
    bpm: 104,
    difficulty: 2,
    tags: ['campfire', 'chords', 'traditional'],
    about: 'Em, G and D with a rolling strum. The minor chord gives it the weight.',
    make: chordSeq(
      [['Em', 4], ['G', 4], ['D', 4], ['Em', 4], ['Em', 4], ['G', 4], ['D', 4], ['Em', 4]],
      { pattern: 'DDUD' },
    ),
  },
  'camp-will-the-circle': {
    title: 'Will the Circle Be Unbroken',
    subtitle: 'Traditional (public domain)',
    kind: 'song',
    level: 5,
    bpm: 100,
    difficulty: 2,
    tags: ['campfire', 'chords', 'traditional'],
    about: 'A hymn that became a country standard. G, C and D, straight through.',
    make: chordSeq(
      [['G', 4], ['C', 4], ['G', 4], ['D', 4], ['G', 4], ['C', 4], ['G', 4], ['D', 4]],
      { pattern: 'DDUD' },
    ),
  },
  'camp-not-be-moved': {
    title: 'I Shall Not Be Moved',
    subtitle: 'Traditional spiritual (public domain)',
    kind: 'song',
    level: 4,
    bpm: 112,
    difficulty: 2,
    tags: ['campfire', 'chords', 'traditional'],
    about: 'One groove, one line everybody shouts back. The easiest song here.',
    make: chordSeq(
      [['G', 4], ['G', 4], ['C', 4], ['G', 4], ['D', 4], ['C', 4], ['G', 4], ['G', 4]],
      { pattern: 'DDUD' },
    ),
  },

  /* -------------------------------------------------------- folk + country */
  'folk-red-river-valley': {
    title: 'Red River Valley',
    subtitle: 'Traditional (public domain)',
    kind: 'song',
    level: 4,
    bpm: 88,
    difficulty: 2,
    tags: ['campfire', 'folk', 'chords', 'traditional'],
    about: 'A slow waltz of a song. G, C and D7 with one strum per beat.',
    make: chordSeq(
      [['G', 4], ['C', 4], ['G', 4], ['D7', 4], ['G', 4], ['C', 4], ['D7', 4], ['G', 4]],
      { pattern: 'D-DU' },
    ),
  },
  'folk-banks-ohio': {
    title: 'Banks of the Ohio',
    subtitle: 'Traditional (public domain)',
    kind: 'song',
    level: 5,
    bpm: 92,
    difficulty: 2,
    tags: ['folk', 'chords', 'traditional'],
    about: 'A murder ballad in three chords. G, C and D.',
    make: chordSeq(
      [['G', 4], ['G', 4], ['C', 4], ['G', 4], ['D', 4], ['D', 4], ['G', 4], ['G', 4]],
      { pattern: 'DDUD' },
    ),
  },
  'folk-cripple-creek': {
    title: 'Cripple Creek',
    subtitle: 'Traditional fiddle tune (public domain)',
    kind: 'song',
    level: 5,
    bpm: 126,
    difficulty: 3,
    tags: ['folk', 'chords', 'traditional'],
    about: 'An old-time fiddle tune. Fast, bouncy, and it never stops moving.',
    make: chordSeq(
      [['G', 4], ['G', 4], ['C', 4], ['G', 4], ['G', 4], ['C', 4], ['D', 4], ['G', 4]],
      { pattern: 'DDUD' },
    ),
  },
  'folk-wildwood': {
    title: 'Wildwood Flower',
    subtitle: 'Traditional (public domain)',
    kind: 'song',
    level: 5,
    bpm: 108,
    difficulty: 3,
    tags: ['folk', 'chords', 'traditional'],
    about: 'Two chords, endless verses. C and G7.',
    make: chordSeq(
      [['C', 4], ['G7', 4], ['C', 4], ['C', 4], ['G7', 4], ['G7', 4], ['C', 4], ['C', 4]],
      { pattern: 'DDUD' },
    ),
  },
  'folk-shady-grove': {
    title: 'The Shady Grove',
    subtitle: 'Traditional (public domain)',
    kind: 'song',
    level: 5,
    bpm: 104,
    difficulty: 2,
    tags: ['folk', 'chords', 'traditional'],
    about: 'A modal Appalachian tune. G, C and D with a lazy swing.',
    make: chordSeq(
      [['G', 4], ['C', 4], ['G', 4], ['D', 4], ['G', 4], ['C', 4], ['D', 4], ['G', 4]],
      { pattern: 'DDUD' },
    ),
  },
  'folk-shenandoah': {
    title: 'Shenandoah',
    subtitle: 'Traditional (public domain)',
    kind: 'song',
    level: 6,
    bpm: 76,
    difficulty: 2,
    tags: ['folk', 'chords', 'traditional'],
    about: 'A river song from the American fur trade. Slow, wide and lovely.',
    make: chordSeq(
      [['G', 4], ['C', 4], ['G', 4], ['D', 4], ['G', 4], ['C', 4], ['D', 4], ['G', 4]],
      { pattern: 'D---D-DU' },
    ),
  },

  /* -------------------------------------------------------------- classical */
  'cl-blue-danube': {
    title: 'The Blue Danube (theme)',
    subtitle: 'Johann Strauss II, public domain',
    kind: 'song',
    level: 10,
    bpm: 96,
    beatsPerBar: 3,
    difficulty: 4,
    tags: ['classical', 'melody', 'traditional'],
    about: 'A waltz in three. The whole tune sits between D4 and D5, so it makes a nice position study.',
    make: melody([
      ['D4', 1], ['D4', 1], ['D4', 1], ['F#4', 2], ['A4', 1],
      ['A4', 2], ['G4', 1], ['F#4', 2], ['F#4', 1],
      ['E4', 2], ['G4', 1], ['B4', 2], ['A4', 1],
      ['G4', 2], ['F#4', 1], ['E4', 1], ['D4', 1], ['F#4', 1], ['A4', 1],
      ['D5', 3],
    ]),
  },
  'cl-morning-mood': {
    title: 'Morning Mood',
    subtitle: 'Edvard Grieg, public domain',
    kind: 'song',
    level: 9,
    bpm: 84,
    beatsPerBar: 3,
    difficulty: 3,
    tags: ['classical', 'melody', 'traditional'],
    about: 'From the Peer Gynt suite. It floats between E4 and E5 \u2014 a good exercise in staying relaxed.',
    make: melody([
      ['E4', 1], ['F#4', 1], ['G#4', 1], ['B4', 2],
      ['B4', 1], ['A4', 1], ['G#4', 1], ['F#4', 2],
      ['G#4', 1], ['A4', 1], ['B4', 1], ['E5', 3],
      ['E5', 1], ['D#5', 1], ['C#5', 1], ['B4', 2],
      ['A4', 1], ['B4', 1], ['C#5', 1], ['A4', 3],
      ['E4', 1], ['F#4', 1], ['G#4', 1], ['B4', 3],
    ]),
  },
  'cl-broken-chord': {
    title: 'Broken-chord study',
    subtitle: 'Original, in the style of the Prelude in C',
    kind: 'drill',
    level: 8,
    bpm: 72,
    difficulty: 3,
    tags: ['classical', 'technique'],
    about:
      'A continuous broken chord over the same progression as Bach\u2019s Prelude in C. Let the notes ring into each other.',
    make: tab(
      `
      e|----------------|----------------|
      B|--------0-------|--------0-------|
      G|----0-------0---|----0-------0---|
      D|0-------0-------|2-------2-------|
      A|----------------|----------------|
      E|----------------|----------------|
    `,
      { stepsPerBeat: 4 },
    ),
  },
  'cl-canon': {
    title: 'Canon in D (chords)',
    subtitle: 'Johann Pachelbel, public domain',
    kind: 'song',
    level: 7,
    bpm: 72,
    difficulty: 3,
    tags: ['classical', 'chords', 'traditional'],
    about: 'The most famous four-bar loop in classical music: D, A, Bm, G. Slowly, it is a beginner song.',
    make: chordSeq(
      [['D', 4], ['A', 4], ['Bm', 4], ['G', 4], ['D', 4], ['A', 4], ['G', 4], ['A', 4]],
      { pattern: 'D-DU' },
    ),
  },

  /* ------------------------------------------------------------------ rock */
  'rock-tin-roof': {
    title: 'Tin Roof',
    subtitle: 'Original',
    kind: 'song',
    level: 5,
    bpm: 110,
    difficulty: 3,
    tags: ['rock', 'chords'],
    about: 'E, A and D \u2014 the three chords every rock band started with.',
    make: chordSeq(
      [['E', 4], ['A', 4], ['D', 4], ['A', 4], ['E', 4], ['A', 4], ['D', 4], ['E', 4]],
      { pattern: 'DDUD' },
    ),
  },
  'rock-blacktop': {
    title: 'Blacktop',
    subtitle: 'Original driving rock riff',
    kind: 'riff',
    level: 7,
    bpm: 132,
    difficulty: 3,
    tags: ['rock', 'riff', 'power'],
    about: 'A palm-muted A5 riff that walks down to G5 and E5. Mute with the edge of your hand.',
    make: tab(`
      e|----------------|
      B|----------------|
      G|----------------|
      D|----------------|
      A|----------------|
      E|5-5-5-5---3-3-3-|0-0-0-0---3-3-3-|
    `),
  },
  'rock-northbound': {
    title: 'Northbound',
    subtitle: 'Original riff in E minor',
    kind: 'riff',
    level: 8,
    bpm: 124,
    difficulty: 4,
    tags: ['rock', 'riff'],
    about: 'A minor-key riff that leans on the open strings between the notes.',
    make: tab(`
      e|----------------|
      B|----------------|
      G|----------------|
      D|----------------|
      A|----------------|
      E|0---0-3-5-3-0---|0---0-3-5-7-5-3-|
    `),
  },
  'rock-garage': {
    title: 'Garage Band',
    subtitle: 'Original',
    kind: 'song',
    level: 6,
    bpm: 118,
    difficulty: 3,
    tags: ['rock', 'chords', 'power'],
    about: 'Power chords the whole way: E5, A5 and D5. Nothing fancy, everything loud.',
    make: chordSeq(
      [['E5', 4], ['E5', 4], ['A5', 4], ['A5', 4], ['D5', 4], ['A5', 4], ['E5', 4], ['E5', 4]],
      { pattern: 'DUDU' },
    ),
  },
  'rock-open-road': {
    title: 'Open Road',
    subtitle: 'Original',
    kind: 'song',
    level: 7,
    bpm: 104,
    difficulty: 3,
    tags: ['rock', 'chords'],
    about: 'A straight-ahead G, D, Em, C strummer. Sounds like driving at night.',
    make: chordSeq(
      [['G', 4], ['D', 4], ['Em', 4], ['C', 4], ['G', 4], ['D', 4], ['C', 4], ['C', 4]],
      { pattern: 'DDUD' },
    ),
  },

  /* ------------------------------------------------------------------ love */
  'love-loch-lomond': {
    title: 'Loch Lomond',
    subtitle: 'Traditional Scottish (public domain)',
    kind: 'song',
    level: 7,
    bpm: 80,
    difficulty: 3,
    tags: ['love', 'chords', 'traditional'],
    about: 'You take the high road. G, C, Em and D, with the long notes held.',
    make: chordSeq(
      [['G', 4], ['Em', 4], ['C', 4], ['D', 4], ['G', 4], ['Em', 4], ['D', 4], ['G', 4]],
      { pattern: 'D---D-DU' },
    ),
  },
  'love-drink-to-me': {
    title: 'Drink to Me Only with Thine Eyes',
    subtitle: 'Traditional, words by Ben Jonson 1616 (public domain)',
    kind: 'song',
    level: 8,
    bpm: 72,
    difficulty: 3,
    tags: ['love', 'chords', 'traditional'],
    about: 'One of the oldest songs in this book. The F is a barre \u2014 take it slowly.',
    make: chordSeq(
      [['C', 4], ['F', 4], ['C', 4], ['G', 4], ['C', 4], ['F', 4], ['C', 4], ['G', 4]],
      { pattern: 'D---D-U-' },
    ),
  },
  'love-plaisir': {
    title: "Plaisir d'amour",
    subtitle: 'Jean-Paul-\u00c9gide Martini, 1784 (public domain)',
    kind: 'song',
    level: 8,
    bpm: 76,
    difficulty: 3,
    tags: ['love', 'chords', 'traditional'],
    about: 'An eighteenth-century French love song. C, G7 and Am, soft and even.',
    make: chordSeq(
      [['C', 4], ['Am', 4], ['C', 4], ['G7', 4], ['C', 4], ['Am', 4], ['G7', 4], ['C', 4]],
      { pattern: 'D-DU' },
    ),
  },

  /* ----------------------------------------------------------------- blues */
  'blues-boogie': {
    title: 'Boogie bass line',
    subtitle: 'Original boogie-woogie figure',
    kind: 'drill',
    level: 9,
    bpm: 108,
    difficulty: 3,
    tags: ['blues', 'riff', 'technique'],
    about:
      'The left hand of every boogie-woogie: root, root, third, fifth, sixth, fifth, third, root. One string, one shape.',
    make: tab(`
      e|----------------|
      B|----------------|
      G|----------------|
      D|----------------|
      A|0-0-4-7-9-7-4-0-|
      E|----------------|
    `),
  },
  'blues-12bar-e': {
    title: 'Twelve-bar in E',
    subtitle: 'Original',
    kind: 'song',
    level: 7,
    bpm: 92,
    difficulty: 3,
    tags: ['blues', 'chords'],
    about:
      'The standard twelve bars: four E, two A, two E, then B, A, E, B. Every blues you have heard lives here.',
    make: chordSeq(
      [
        ['E', 4], ['E', 4], ['E', 4], ['E', 4],
        ['A', 4], ['A', 4], ['E', 4], ['E', 4],
        ['B7', 4], ['A', 4], ['E', 4], ['B7', 4],
      ],
      { pattern: 'D-DU' },
    ),
  },
  'blues-shuffle-g': {
    title: 'Shuffle in G',
    subtitle: 'Original',
    kind: 'riff',
    level: 8,
    bpm: 100,
    difficulty: 3,
    tags: ['blues', 'riff'],
    about: 'The same shuffle as the A one, moved five frets down the low E string.',
    make: tab(`
      e|----------------|
      B|----------------|
      G|----------------|
      D|----------------|
      A|----------------|
      E|3-7-9-7-3-7-9-7-|
    `),
  },

  /* ----------------------------------------------------------------- drums */
  'drums-rock-16': {
    title: 'Sixteenth hats',
    subtitle: 'Rock beat, finer hi-hat',
    kind: 'drums',
    level: 6,
    bpm: 100,
    difficulty: 3,
    tags: ['drums', 'rock'],
    about: 'The same rock beat with sixteenth-note hats. The hands do twice the work; the feet stay put.',
    make: drums(
      {
        kick: 'X-------X-------',
        snare: '----X-------X---',
        hat: 'XXXXXXXXXXXXXXXX',
      },
      { stepsPerBeat: 4, repeats: 2 },
    ),
  },
  'drums-groove-2': {
    title: 'Off-beat kick',
    subtitle: 'A little push',
    kind: 'drums',
    level: 6,
    bpm: 104,
    difficulty: 3,
    tags: ['drums', 'rock'],
    about: 'The kick moves to the "and" of two, which is what makes a plain beat feel like a groove.',
    make: drums({ kick: 'X--X----', snare: '--X---X-', hat: 'X-X-X-X-' }, { repeats: 2 }),
  },
  'drums-bossa': {
    title: 'Soft shuffle',
    subtitle: 'A quiet latin feel',
    kind: 'drums',
    level: 9,
    bpm: 96,
    difficulty: 3,
    tags: ['drums', 'ballad'],
    about: 'Everything is softer and slightly behind the beat. Play it on the pads with almost no force.',
    make: drums({ kick: 'X-----X-', snare: '-X--X---', hat: 'X-X-X-X-' }, { repeats: 2 }),
  },
};

Object.assign(SPECS, WAVE_SPECS);

'''

MISSIONS_BLOCK = r'''
/* ---------------------------------------------------------------------------
 * Extra missions, merged into the levels above rather than rewriting the LEVELS
 * literal. Keeps each content batch self-contained and reviewable.
 */
const EXTRA_MISSIONS = {
  3: [{ title: 'More voices', theme: 'rhythm', items: ['camp-this-little-light', 'camp-michael-row'] }],
  4: [
    { title: 'Spirituals', theme: 'rhythm', items: ['camp-down-by-the-riverside', 'camp-not-be-moved'] },
    { title: 'Folk songs', theme: 'rhythm', items: ['folk-red-river-valley', 'folk-shady-grove'] },
  ],
  5: [{ title: 'Garage rock', theme: 'rhythm', items: ['rock-tin-roof', 'camp-will-the-circle'] }],
  6: [
    { title: 'Finer hi-hat', theme: 'rhythm', items: ['drums-rock-16', 'drums-groove-2'] },
    { title: 'Drive', theme: 'lead', items: ['rock-blacktop', 'rock-garage'] },
  ],
  7: [
    { title: 'Blues', theme: 'rhythm', items: ['blues-12bar-e', 'love-plaisir'] },
    { title: 'Riffs and rock', theme: 'lead', items: ['rock-open-road', 'love-loch-lomond'] },
  ],
  8: [{ title: 'Classical', theme: 'lead', items: ['cl-broken-chord', 'cl-canon'] }],
  9: [
    { title: 'Soft and slow', theme: 'rhythm', items: ['drums-bossa', 'blues-boogie'] },
    { title: 'Waltz and swing', theme: 'lead', items: ['cl-morning-mood', 'blues-shuffle-g'] },
  ],
  10: [
    { title: 'Wider songs', theme: 'rhythm', items: ['rock-northbound', 'camp-wade-water'] },
    { title: 'Finale', theme: 'lead', items: ['cl-blue-danube', 'love-drink-to-me'] },
  ],
};

for (const [levelNumber, extra] of Object.entries(EXTRA_MISSIONS)) {
  const level = LEVELS.find((l) => l.n === Number(levelNumber));
  if (level) level.missions.push(...extra);
}

'''

anchor = "Object.assign(SPECS, SONG_SPECS, DRUM_SPECS);"
assert s.count(anchor) == 1, f"assign anchor count {s.count(anchor)}"
s = s.replace(anchor, SPECS_BLOCK.strip() + "\n\n" + anchor)

levels_anchor = "export const LEVEL_BY_N = new Map(LEVELS.map((l) => [l.n, l]));"
assert s.count(levels_anchor) == 1, "levels anchor"
s = s.replace(levels_anchor, levels_anchor + "\n" + MISSIONS_BLOCK)

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("library.js expanded with WAVE_SPECS + EXTRA_MISSIONS")
