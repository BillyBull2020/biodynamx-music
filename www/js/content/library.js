/**
 * Content library for Bio Dynamx Music.
 *
 * Everything here is original or public domain. Traditional melodies (Twinkle,
 * Ode to Joy, Greensleeves, Scarborough Fair, Für Elise, Minuet in G, Amazing
 * Grace, The House of the Rising Sun) are marked PD; the riffs and studies are
 * written for this app. No Yousician or third-party copyrighted material is
 * used or reproduced.
 *
 * Tab grid convention: stepsPerBeat = 2, so two characters make one beat and one
 * 4/4 bar is eight characters. Notes are placed at even columns for on-beat
 * starts. Every row in a block must be the same width.
 *
 * An "item" is a lazily-built track: make() returns a makeTrack() spec so the
 * cost of building a song is paid only when it is opened, and a broken item can
 * never break the library list.
 */

import { makeTrack } from '../music/track.js';
import { parseTab, sequence } from '../music/tab.js';
import { CHORDS, shapeMidis } from '../music/theory.js';

/* --------------------------------------------------------------- helpers */

/** Melody from [ ['C4', 1], ... ] beat pairs. */
function melody(pairs, opts = {}) {
  return () => ({ notes: sequence(pairs, opts).events, tuningId: opts.tuningId || 'standard' });
}

/** Tablature drill with an explicit grid. */
function tab(text, { stepsPerBeat = 2, tuningId = 'standard' } = {}) {
  return () => {
    const parsed = parseTab(text, { stepsPerBeat, tuningId });
    return { notes: parsed.events, tuningId };
  };
}

/** Strummed chord sequence: [ ['Em', 4], ... ] in beats. */
function chordSeq(list, { pattern = null } = {}) {
  return () => {
    const chords = [];
    let beat = 0;
    for (const [name, beats] of list) {
      const shape = CHORDS[name];
      if (!shape) throw new Error(`unknown chord ${name}`);
      if (!pattern) {
        chords.push({ beat, chord: name, durBeats: beats, frets: shape.frets });
        beat += beats;
        continue;
      }
      // One event per strum, so the player is judged on rhythm, not just shape.
      const step = beats / pattern.length;
      [...pattern].forEach((mark, i) => {
        if (mark === '-') return;
        chords.push({
          beat: beat + i * step,
          chord: name,
          durBeats: step * (mark === 'U' ? 0.8 : 1),
          frets: shape.frets,
          strum: mark,
        });
      });
      beat += beats;
    }
    return { chords, mode: 'chords' };
  };
}

/** Arpeggio drill straight from a chord shape. */
function arpeggio(name, { beatsPerNote = 0.5, order = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1], repeat = 2 } = {}) {
  return () => {
    const shape = CHORDS[name];
    if (!shape) throw new Error(`unknown chord ${name}`);
    const parts = shapeMidis(shape, 'standard').filter((p) => p.fret >= 0);
    const notes = [];
    let beat = 0;
    for (let r = 0; r < repeat; r++) {
      for (const idx of order) {
        const p = parts[Math.min(idx, parts.length - 1)];
        if (!p) continue;
        notes.push({ beat, string: p.string, fret: p.fret, durBeats: beatsPerNote });
        beat += beatsPerNote;
      }
    }
    return { notes };
  };
}

const SCALE_INTERVALS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonicMinor: [0, 3, 5, 7, 10],
  pentatonicMajor: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

const PITCH_CLASS = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/** Scale run laid out on the fretboard, ascending then descending. */
function scaleRun({ root = 'A', scale = 'pentatonicMinor', octaves = 1 } = {}) {
  return () => {
    const openLow = 40; // low E of standard tuning
    const rootPc = PITCH_CLASS[root];
    let base = openLow + ((((rootPc - openLow) % 12) + 12) % 12);
    if (base < 52) base += 12; // keep the run in a readable register
    const iv = SCALE_INTERVALS[scale] || SCALE_INTERVALS.pentatonicMinor;
    const up = [];
    for (let o = 0; o <= octaves; o++) {
      for (const i of iv) {
        if (o === octaves && i !== 0) continue;
        up.push(base + o * 12 + i);
      }
    }
    const notes = [];
    let beat = 0;
    for (const midi of up) {
      notes.push({ beat, midi, durBeats: 0.5 });
      beat += 0.5;
    }
    for (const midi of [...up].reverse().slice(1)) {
      notes.push({ beat, midi, durBeats: 0.5 });
      beat += 0.5;
    }
    return { notes };
  };
}

/* ------------------------------------------------------------------ items */

const SPECS = {
  /* ---------------------------------------------------------- level 1 */
  'drill-open-e': {
    title: 'Open low E',
    subtitle: 'Quarter notes on the thickest string',
    kind: 'drill',
    level: 1,
    bpm: 70,
    difficulty: 1,
    tags: ['basics', 'picking'],
    about:
      'Put your thumb on the back of the neck and let the pick fall through the string. Count 1 - 2 - 3 - 4 out loud.',
    make: tab(`
      e|----------------|
      B|----------------|
      G|----------------|
      D|----------------|
      A|----------------|
      E|0-0-0-0-0-0-0-0-|
    `),
  },
  'drill-open-strings': {
    title: 'All six open strings',
    subtitle: 'One beat each, top to bottom',
    kind: 'drill',
    level: 1,
    bpm: 70,
    difficulty: 1,
    tags: ['basics', 'fretboard'],
    about: 'The open strings from the thinnest down to the thickest: e B G D A E.',
    make: tab(`
      e|0---------------|
      B|--0-------------|
      G|----0-----------|
      D|------0---------|
      A|--------0-------|
      E|----------0-----|
    `),
  },
  'drill-eighths': {
    title: 'Eighth-note pulse',
    subtitle: 'Doubling the count on low E',
    kind: 'drill',
    level: 1,
    bpm: 80,
    difficulty: 1,
    tags: ['basics', 'rhythm'],
    about:
      'Say "1 and 2 and 3 and 4 and". Keep the pick moving even when you are not hitting a string.',
    make: tab(`
      e|----------------|
      B|----------------|
      G|----------------|
      D|----------------|
      A|----------------|
      E|0-0-0-0-0-0-0-0-|
    `),
  },
  'riff-first-pulse': {
    title: 'First riff: E pulse',
    subtitle: 'A two-note riff you can play today',
    kind: 'riff',
    level: 1,
    bpm: 76,
    difficulty: 1,
    tags: ['riff', 'basics'],
    about: 'A riff only needs two notes. Alternate the open low E with the second fret of the A string.',
    make: tab(`
      e|----------------|
      B|----------------|
      G|----------------|
      D|----------------|
      A|--2---2---2---2-|
      E|0---0---0---0---|
    `),
  },

  /* ---------------------------------------------------------- level 2 */
  'drill-a-string': {
    title: 'Notes on the A string',
    subtitle: 'A, B, C, D',
    kind: 'drill',
    level: 2,
    bpm: 72,
    difficulty: 1,
    tags: ['basics', 'fretboard'],
    about: 'Frets 0, 2, 3 and 5 on the A string spell A, B, C and D.',
    make: tab(`
      e|----------------|
      B|----------------|
      G|----------------|
      D|----------------|
      A|0-2-3-5-5-3-2-0-|
      E|----------------|
    `),
  },
  'song-twinkle': {
    title: 'Twinkle, Twinkle, Little Star',
    subtitle: 'Traditional (public domain)',
    kind: 'song',
    level: 2,
    bpm: 92,
    difficulty: 1,
    tags: ['melody', 'traditional'],
    about: 'The first melody most guitarists learn. Quarter notes, with the held notes marked longer.',
    make: melody([
      ['C4', 1], ['C4', 1], ['G4', 1], ['G4', 1], ['A4', 1], ['A4', 1], ['G4', 2],
      ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1], ['D4', 1], ['D4', 1], ['C4', 2],
      ['G4', 1], ['G4', 1], ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1], ['D4', 2],
      ['G4', 1], ['G4', 1], ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1], ['D4', 2],
      ['C4', 1], ['C4', 1], ['G4', 1], ['G4', 1], ['A4', 1], ['A4', 1], ['G4', 2],
      ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1], ['D4', 1], ['D4', 1], ['C4', 2],
    ]),
  },
  'song-ode': {
    title: 'Ode to Joy',
    subtitle: 'Beethoven, public domain',
    kind: 'song',
    level: 2,
    bpm: 100,
    difficulty: 2,
    tags: ['melody', 'classical'],
    about: 'Sits almost entirely on the top two strings. Watch the held note in the fourth bar.',
    make: melody([
      ['E4', 1], ['E4', 1], ['F4', 1], ['G4', 1],
      ['G4', 1], ['F4', 1], ['E4', 1], ['D4', 1],
      ['C4', 1], ['C4', 1], ['D4', 1], ['E4', 1],
      ['E4', 1.5], ['D4', 0.5], ['D4', 2],
      ['E4', 1], ['E4', 1], ['F4', 1], ['G4', 1],
      ['G4', 1], ['F4', 1], ['E4', 1], ['D4', 1],
      ['C4', 1], ['C4', 1], ['D4', 1], ['E4', 1],
      ['D4', 1.5], ['C4', 0.5], ['C4', 2],
    ]),
  },
  'drill-power-chords': {
    title: 'Power chords E5 - A5 - D5',
    subtitle: 'Two fingers, three chords',
    kind: 'chord',
    level: 2,
    bpm: 80,
    difficulty: 2,
    tags: ['chords', 'power'],
    about:
      'A power chord is root plus fifth. Mute any string you are not strumming with the side of your hand.',
    make: chordSeq([['E5', 4], ['A5', 4], ['D5', 4], ['A5', 4], ['E5', 8]]),
  },

  /* ---------------------------------------------------------- level 3 */
  'drill-em-am': {
    title: 'Em to Am',
    subtitle: 'The two-chord change',
    kind: 'chord',
    level: 3,
    bpm: 74,
    difficulty: 2,
    tags: ['chords', 'cowboy'],
    about: 'Keep the C and A fingers planted and only move the one finger that changes.',
    make: chordSeq([['Em', 4], ['Am', 4], ['Em', 4], ['Am', 4], ['Em', 8]]),
  },
  'drill-em-g': {
    title: 'Em to G',
    subtitle: 'Move the whole shape',
    kind: 'chord',
    level: 3,
    bpm: 74,
    difficulty: 2,
    tags: ['chords', 'cowboy'],
    about: 'Strum slowly. Every string should ring clearly, not buzz.',
    make: chordSeq([['Em', 4], ['G', 4], ['Em', 4], ['G', 4], ['Em', 4], ['G', 4]]),
  },
  'drill-c-g': {
    title: 'C to G',
    subtitle: 'Two of the most useful chords there are',
    kind: 'chord',
    level: 3,
    bpm: 76,
    difficulty: 2,
    tags: ['chords', 'cowboy'],
    about: 'For C the low E string is skipped. For G, all six strings ring.',
    make: chordSeq([['C', 4], ['G', 4], ['C', 4], ['G', 4], ['C', 4], ['G', 4]]),
  },
  'song-rising-sun': {
    title: 'The House of the Rising Sun',
    subtitle: 'Traditional (public domain)',
    kind: 'song',
    level: 3,
    bpm: 72,
    beatsPerBar: 3,
    difficulty: 2,
    tags: ['chords', 'traditional'],
    about: 'A six-chord loop in A minor. Slow and even beats fast and ambitious here.',
    make: chordSeq(
      [
        ['Am', 3], ['C', 3], ['D', 3], ['F', 3],
        ['Am', 3], ['E7', 3], ['Am', 3], ['E7', 3],
      ],
      { pattern: 'D-D-UD' },
    ),
  },

  /* ---------------------------------------------------------- level 4 */
  'drill-four-chords': {
    title: 'C - G - Am - F',
    subtitle: 'The four-chord loop',
    kind: 'chord',
    level: 4,
    bpm: 78,
    difficulty: 3,
    tags: ['chords', 'cowboy'],
    about: 'Once this loop is automatic it unlocks hundreds of songs.',
    make: chordSeq([['C', 4], ['G', 4], ['Am', 4], ['F', 4], ['C', 4], ['G', 4], ['Am', 4], ['F', 4]]),
  },
  'drill-strum-eighths': {
    title: 'Down-up eighths',
    subtitle: 'C to G with a moving pick',
    kind: 'pattern',
    level: 4,
    bpm: 84,
    difficulty: 3,
    tags: ['strumming', 'rhythm'],
    about:
      'Down on the beat, up on the "and". Your wrist should travel the same distance on every stroke.',
    make: chordSeq([['C', 4], ['G', 4], ['C', 4], ['G', 4]], { pattern: 'DUDUDUDU' }),
  },
  'song-amazing-grace': {
    title: 'Amazing Grace',
    subtitle: 'Traditional (public domain)',
    kind: 'song',
    level: 4,
    bpm: 78,
    beatsPerBar: 3,
    difficulty: 3,
    tags: ['melody', 'traditional'],
    about: 'In G major. The long notes are the ones worth holding cleanly.',
    make: melody([
      ['D4', 1], ['G4', 2], ['B4', 1], ['G4', 2], ['B4', 1],
      ['A4', 2], ['G4', 2], ['E4', 2],
      ['D4', 2], ['D4', 1], ['D4', 2], ['E4', 1],
      ['G4', 2], ['G4', 2], ['E4', 2],
      ['D4', 2], ['B3', 1], ['B3', 2], ['D4', 1],
      ['G4', 2], ['A4', 2], ['G4', 2],
      ['D4', 2], ['D4', 1], ['G4', 2], ['B4', 1],
      ['A4', 2], ['G4', 2], ['E4', 2],
      ['D4', 2], ['B3', 1], ['B3', 2], ['D4', 1],
      ['G4', 2], ['A4', 2], ['G4', 3],
    ]),
  },
  'song-greensleeves': {
    title: 'Greensleeves',
    subtitle: 'Traditional (public domain)',
    kind: 'song',
    level: 4,
    bpm: 88,
    beatsPerBar: 3,
    difficulty: 3,
    tags: ['melody', 'traditional'],
    about:
      'An A minor melody that walks up the scale and back. Great for learning the top three strings.',
    make: melody([
      ['A4', 2], ['C5', 1], ['D5', 1], ['E5', 2], ['F5', 1], ['E5', 1],
      ['D5', 2], ['B4', 1], ['G4', 1], ['A4', 2], ['B4', 1], ['C5', 1],
      ['A4', 2], ['B4', 1], ['G4', 1], ['E4', 3],
      ['A4', 2], ['C5', 1], ['D5', 1], ['E5', 2], ['F5', 1], ['E5', 1],
      ['D5', 2], ['B4', 1], ['G4', 1], ['A4', 2], ['B4', 1], ['C5', 1],
      ['B4', 2], ['G4', 1], ['A4', 1], ['G4', 3],
    ]),
  },

  /* ---------------------------------------------------------- level 5 */
  'drill-a-pentatonic': {
    title: 'A minor pentatonic',
    subtitle: 'Five notes, endless solos',
    kind: 'scale',
    level: 5,
    bpm: 90,
    difficulty: 3,
    tags: ['scale', 'lead'],
    about:
      'A C D E G. Play it up and back without looking at your fretting hand. This is the scale behind most rock solos.',
    make: scaleRun({ root: 'A', scale: 'pentatonicMinor', octaves: 1 }),
  },
  'riff-blues-a': {
    title: 'Blues shuffle in A',
    subtitle: 'Original riff',
    kind: 'riff',
    level: 5,
    bpm: 96,
    difficulty: 3,
    tags: ['riff', 'blues'],
    about: 'The classic shuffle: root, fifth, sixth, fifth. Let the low A ring under the top notes.',
    make: tab(`
      e|----------------|
      B|----------------|
      G|----------------|
      D|----------------|
      A|0-4-5-4-0-4-5-4-|
      E|----------------|
    `),
  },
  'riff-rock-em': {
    title: 'Neon drive',
    subtitle: 'Original rock riff in E minor',
    kind: 'riff',
    level: 5,
    bpm: 108,
    difficulty: 3,
    tags: ['riff', 'rock'],
    about: 'Palm-mute the low E and let each power chord ring just long enough to hear it.',
    make: tab(`
      e|----------------|
      B|----------------|
      G|----------------|
      D|----------------|
      A|----------------|
      E|0-0-3-3-5-5-3-0-|
    `),
  },
  'song-scarborough': {
    title: 'Scarborough Fair',
    subtitle: 'Traditional (public domain)',
    kind: 'song',
    level: 5,
    bpm: 84,
    beatsPerBar: 3,
    difficulty: 3,
    tags: ['melody', 'traditional'],
    about:
      'A modal melody in A. It never quite resolves the way your ear expects, and that is the point.',
    make: melody([
      ['A4', 2], ['A4', 1], ['E5', 2], ['E5', 1],
      ['B4', 2], ['B4', 1], ['C5', 2], ['B4', 1],
      ['A4', 2], ['A4', 1], ['E5', 2], ['E5', 1],
      ['D5', 2], ['C5', 1], ['B4', 3],
      ['A4', 2], ['A4', 1], ['E5', 2], ['E5', 1],
      ['B4', 2], ['B4', 1], ['C5', 2], ['B4', 1],
      ['A4', 2], ['G4', 1], ['E4', 2], ['D4', 1],
      ['E4', 3],
    ]),
  },

  /* ---------------------------------------------------------- level 6 */
  'drill-alt-picking': {
    title: 'Alternate picking',
    subtitle: 'Down-up on every note',
    kind: 'drill',
    level: 6,
    bpm: 96,
    difficulty: 3,
    tags: ['technique', 'picking'],
    about:
      'Start with a downstroke and never make two downs in a row. Remove speed before you remove accuracy.',
    make: tab(`
      e|----------------|
      B|----------------|
      G|----------------|
      D|----------------|
      A|0-2-3-2-0-2-3-2-|
      E|----------------|
    `),
  },
  'drill-octave-leap': {
    title: 'Octave leaps',
    subtitle: 'Same note, twice the frequency',
    kind: 'drill',
    level: 6,
    bpm: 88,
    difficulty: 3,
    tags: ['technique', 'fretboard'],
    about:
      'Open E and the twelfth fret of the same string are the same note an octave apart. Your ear is the check here, not the chart.',
    make: tab(`
      e|----------------|
      B|----------------|
      G|----------------|
      D|----------------|
      A|----------------|
      E|0---12--0---12--|
    `),
  },
  'song-morning-line': {
    title: 'Morning Line',
    subtitle: 'Original study',
    kind: 'song',
    level: 6,
    bpm: 96,
    difficulty: 3,
    tags: ['melody', 'original'],
    about: 'A single-line study that moves through three positions on the neck.',
    make: melody([
      ['E4', 1], ['G4', 1], ['A4', 1], ['B4', 1],
      ['D5', 1], ['B4', 1], ['A4', 1], ['G4', 1],
      ['E4', 1], ['F#4', 1], ['G4', 1], ['A4', 1],
      ['B4', 2], ['E4', 2],
      ['G4', 1], ['A4', 1], ['B4', 1], ['D5', 1],
      ['E5', 1], ['D5', 1], ['B4', 1], ['A4', 1],
      ['G4', 1], ['F#4', 1], ['E4', 1], ['D4', 1],
      ['E4', 4],
    ]),
  },

  /* ---------------------------------------------------------- level 7 */
  'drill-barre': {
    title: 'Barre chord change: F to Bm',
    subtitle: 'The shape that opens everything',
    kind: 'chord',
    level: 7,
    bpm: 70,
    difficulty: 4,
    tags: ['chords', 'barre'],
    about:
      'Roll your index finger onto its bony edge, not the soft pad. Squeeze from the arm, not the hand.',
    make: chordSeq([['F', 4], ['Bm', 4], ['F', 4], ['Bm', 4], ['F', 4], ['Bm', 4]], { pattern: 'D-DU' }),
  },
  'drill-sus': {
    title: 'Dsus4 and Dsus2',
    subtitle: 'Colour chords inside a D loop',
    kind: 'chord',
    level: 7,
    bpm: 76,
    difficulty: 3,
    tags: ['chords', 'fancy'],
    about:
      'Keep the D shape and move one finger. Suspended chords are the cheapest emotion in music.',
    make: chordSeq(
      [['D', 4], ['Dsus4', 2], ['D', 2], ['Dsus2', 2], ['D', 2], ['Dsus4', 4], ['D', 4]],
      { pattern: 'DUDU' },
    ),
  },
  'song-spanish-study': {
    title: 'Spanish Study',
    subtitle: 'Original, in the Romance tradition',
    kind: 'song',
    level: 7,
    bpm: 88,
    beatsPerBar: 3,
    difficulty: 4,
    tags: ['fingerstyle', 'original'],
    about:
      'Alternate the bass with your thumb and let the melody notes ring over each other.',
    make: arpeggio('Em', { beatsPerNote: 0.5, order: [0, 3, 2, 1, 2, 3, 0, 3, 2, 1, 2, 3], repeat: 3 }),
  },

  /* ---------------------------------------------------------- level 8 */
  'drill-travis': {
    title: 'Thumb and fingers',
    subtitle: 'Alternating bass in C',
    kind: 'pattern',
    level: 8,
    bpm: 84,
    difficulty: 4,
    tags: ['fingerstyle', 'technique'],
    about:
      'The thumb takes every bass note on the beat. The fingers only ever play between them. No pick.',
    make: tab(`
      e|--0-------0-----|
      B|------1-------1-|
      G|----------------|
      D|----------------|
      A|3-------3-------|
      E|----3-------3---|
    `),
  },
  'drill-em-arpeggio': {
    title: 'E minor arpeggio',
    subtitle: 'Six strings, one shape',
    kind: 'pattern',
    level: 8,
    bpm: 80,
    difficulty: 4,
    tags: ['fingerstyle', 'technique'],
    about:
      'Play the Em shape one string at a time, up and back. Even spacing matters more than speed.',
    make: arpeggio('Em', { beatsPerNote: 0.5, order: [0, 1, 2, 3, 4, 5, 4, 3, 2, 1], repeat: 3 }),
  },
  'song-fur-elise': {
    title: 'Für Elise (theme)',
    subtitle: 'Beethoven, public domain',
    kind: 'song',
    level: 8,
    bpm: 92,
    beatsPerBar: 3,
    difficulty: 4,
    tags: ['melody', 'classical'],
    about:
      'The opening theme arranged for one guitar line. The alternating E and D# is a half-step turn — keep it light.',
    make: melody([
      ['E5', 0.5], ['D#5', 0.5], ['E5', 0.5], ['D#5', 0.5], ['E5', 0.5], ['B4', 0.5], ['D5', 0.5], ['C5', 0.5],
      ['A4', 1.5],
      ['C4', 0.5], ['E4', 0.5], ['A4', 0.5],
      ['B4', 1.5],
      ['E4', 0.5], ['G#4', 0.5], ['B4', 0.5],
      ['C5', 1.5],
      ['E4', 0.5], ['E5', 0.5], ['D#5', 0.5],
      ['E5', 0.5], ['D#5', 0.5], ['E5', 0.5], ['B4', 0.5], ['D5', 0.5], ['C5', 0.5],
      ['A4', 1.5],
      ['C4', 0.5], ['E4', 0.5], ['A4', 0.5],
      ['B4', 1.5],
      ['E4', 0.5], ['C5', 0.5], ['B4', 0.5],
      ['A4', 3],
    ]),
  },

  /* ---------------------------------------------------------- level 9 */
  'drill-syncopation': {
    title: 'Off-beat strums',
    subtitle: 'E7 to A7 with a push',
    kind: 'pattern',
    level: 9,
    bpm: 92,
    difficulty: 4,
    tags: ['rhythm', 'strumming'],
    about:
      'The strum lands where your foot is coming up. Count the "and" out loud until it stops feeling wrong.',
    make: chordSeq([['E7', 4], ['A7', 4], ['E7', 4], ['A7', 4]], { pattern: 'D-DUD-DU' }),
  },
  'riff-funk-e': {
    title: 'Funk skeleton',
    subtitle: 'Original riff in E',
    kind: 'riff',
    level: 9,
    bpm: 104,
    difficulty: 4,
    tags: ['riff', 'funk'],
    about:
      'Most of this riff is muting. The notes are short; the rhythm is the whole point.',
    make: tab(`
      e|----------------|
      B|----------------|
      G|----------------|
      D|----------------|
      A|7---7---7---7-5-|
      E|0-0-0-0-0-0-0-0-|
    `),
  },
  'song-minuet-g': {
    title: 'Minuet in G (theme)',
    subtitle: 'Christian Petzold, public domain',
    kind: 'song',
    level: 9,
    bpm: 96,
    beatsPerBar: 3,
    difficulty: 4,
    tags: ['melody', 'classical'],
    about: 'A baroque dance with a clear pulse. Each bar is one step of the dance.',
    make: melody([
      ['D5', 1], ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['C5', 1],
      ['D5', 1], ['G4', 1], ['G4', 1],
      ['E5', 1], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['F#5', 1],
      ['G5', 1], ['G4', 1], ['G4', 1],
      ['C5', 1], ['D5', 0.5], ['C5', 0.5], ['B4', 1], ['A4', 1],
      ['B4', 1], ['C5', 0.5], ['B4', 0.5], ['A4', 1], ['G4', 1],
      ['F#4', 1], ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['G4', 1],
      ['B4', 1], ['A4', 1], ['G4', 1],
    ]),
  },

  /* --------------------------------------------------------- level 10 */
  'song-neon-corridor': {
    title: 'Neon Corridor',
    subtitle: 'Original piece',
    kind: 'song',
    level: 10,
    bpm: 100,
    difficulty: 5,
    tags: ['song', 'original'],
    about:
      'A full-length original that combines the minor pentatonic with the four-chord loop.',
    make: melody([
      ['E4', 0.5], ['G4', 0.5], ['A4', 1], ['B4', 0.5], ['D5', 0.5], ['B4', 1],
      ['A4', 0.5], ['G4', 0.5], ['E4', 1], ['D4', 0.5], ['E4', 0.5], ['G4', 1],
      ['A4', 0.5], ['B4', 0.5], ['D5', 1], ['E5', 0.5], ['D5', 0.5], ['B4', 1],
      ['A4', 0.5], ['G4', 0.5], ['E4', 1], ['E4', 1], ['G4', 1],
      ['B4', 0.5], ['D5', 0.5], ['E5', 1], ['D5', 0.5], ['B4', 0.5], ['A4', 1],
      ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['A4', 0.5], ['G4', 0.5], ['E4', 1],
      ['D4', 0.5], ['E4', 0.5], ['G4', 1], ['A4', 1], ['B4', 1],
      ['E5', 0.5], ['D5', 0.5], ['B4', 1], ['E4', 2],
    ]),
  },
  'song-midnight-blues': {
    title: 'Midnight Room',
    subtitle: 'Original 12-bar blues',
    kind: 'song',
    level: 10,
    bpm: 88,
    difficulty: 4,
    tags: ['chords', 'blues'],
    about:
      'A twelve-bar in A. Count the bars: four of A, two of D, two of A, then E, D, A, E.',
    make: chordSeq(
      [
        ['A', 4], ['A', 4], ['A', 4], ['A', 4],
        ['D', 4], ['D', 4], ['A', 4], ['A', 4],
        ['E', 4], ['D', 4], ['A', 4], ['E', 4],
      ],
      { pattern: 'D-DU' },
    ),
  },
  'drill-speed-burst': {
    title: 'Sixteenth-note burst',
    subtitle: 'Controlled speed on the A string',
    kind: 'drill',
    level: 10,
    bpm: 70,
    difficulty: 5,
    tags: ['technique', 'speed'],
    about:
      'Set the tempo low enough to play it perfectly, then raise it five percent at a time. Sixteen notes per bar: one character is a sixteenth.',
    make: tab(
      `
      e|--------------------------------|
      B|--------------------------------|
      G|--------------------------------|
      D|--------------------------------|
      A|0-2-3-5-3-2-0-2-0-2-3-5-7-5-3-2-|
      E|--------------------------------|
    `,
      { stepsPerBeat: 4 },
    ),
  },
};

/* -------------------------------------------------------- public API */

const cache = new Map();

export function itemIds() {
  return Object.keys(SPECS);
}

export function getItemSpec(id) {
  return SPECS[id] || null;
}

/**
 * Build (and cache) a track. Returns null for an unknown id rather than throwing,
 * so one bad entry cannot take down a list screen.
 */
export function getTrack(id) {
  if (cache.has(id)) return cache.get(id);
  const spec = SPECS[id];
  if (!spec) return null;
  let track = null;
  try {
    const built = spec.make() || {};
    track = makeTrack({
      id,
      title: spec.title,
      subtitle: spec.subtitle || '',
      kind: spec.kind,
      level: spec.level,
      bpm: spec.bpm,
      beatsPerBar: spec.beatsPerBar || 4,
      difficulty: spec.difficulty,
      tags: spec.tags || [],
      about: spec.about || '',
      notes: built.notes || [],
      chords: built.chords || [],
      tuningId: built.tuningId || 'standard',
      mode: built.mode,
    });
  } catch (err) {
    console.error(`Could not build track "${id}"`, err);
    return null;
  }
  cache.set(id, track);
  return track;
}

export function allItems() {
  return itemIds()
    .map((id) => ({ id, ...SPECS[id] }))
    .filter((s) => s && s.title);
}

/**
 * The learning path: 10 levels, each with missions, each mission with tasks.
 * Mirrors the documented structure of the reference app (missions of songs and
 * drills grouped into 10 levels, split into melody/lead and chord/rhythm themes)
 * without copying its content.
 */
export const LEVELS = [
  {
    n: 1,
    name: 'First contact',
    theme: 'Basics',
    blurb: 'Hold the guitar, find the strings, make a clean sound.',
    missions: [
      { title: 'Open strings', theme: 'rhythm', items: ['drill-open-e', 'drill-open-strings'] },
      { title: 'Keep time', theme: 'rhythm', items: ['drill-eighths', 'riff-first-pulse'] },
    ],
  },
  {
    n: 2,
    name: 'Two strings',
    theme: 'Melody',
    blurb: 'Single notes on the low strings, then your first real tune.',
    missions: [
      { title: 'The A string', theme: 'lead', items: ['drill-a-string', 'drill-power-chords'] },
      { title: 'First melodies', theme: 'lead', items: ['song-twinkle', 'song-ode'] },
    ],
  },
  {
    n: 3,
    name: 'First chords',
    theme: 'Chords',
    blurb: 'Two chords are enough to play a song.',
    missions: [
      { title: 'Cowboy chords', theme: 'rhythm', items: ['drill-em-am', 'drill-em-g'] },
      { title: 'Play a song', theme: 'rhythm', items: ['drill-c-g', 'song-rising-sun'] },
    ],
  },
  {
    n: 4,
    name: 'The four-chord loop',
    theme: 'Chords',
    blurb: 'The progression behind an enormous number of songs.',
    missions: [
      { title: 'Changes', theme: 'rhythm', items: ['drill-four-chords', 'drill-strum-eighths'] },
      { title: 'Melodies in G and A', theme: 'lead', items: ['song-amazing-grace', 'song-greensleeves'] },
    ],
  },
  {
    n: 5,
    name: 'Riffs',
    theme: 'Riffs & lead',
    blurb: 'The pentatonic scale, a blues shuffle and a rock riff.',
    missions: [
      { title: 'The five-note scale', theme: 'lead', items: ['drill-a-pentatonic', 'riff-blues-a'] },
      { title: 'Riff and melody', theme: 'lead', items: ['riff-rock-em', 'song-scarborough'] },
    ],
  },
  {
    n: 6,
    name: 'Lead',
    theme: 'Riffs & lead',
    blurb: 'Picking discipline, position shifts, and playing in tune by ear.',
    missions: [
      { title: 'Picking', theme: 'lead', items: ['drill-alt-picking', 'drill-octave-leap'] },
      { title: 'Moving around the neck', theme: 'lead', items: ['song-morning-line'] },
    ],
  },
  {
    n: 7,
    name: 'Barre chords',
    theme: 'Chords',
    blurb: 'The shape that turns one chord into twelve.',
    missions: [
      { title: 'Barre', theme: 'rhythm', items: ['drill-barre', 'drill-sus'] },
      { title: 'Fingerstyle first', theme: 'lead', items: ['song-spanish-study'] },
    ],
  },
  {
    n: 8,
    name: 'Fingerstyle',
    theme: 'Melody',
    blurb: 'Thumb on the beat, fingers between. No pick.',
    missions: [
      { title: 'Independence', theme: 'lead', items: ['drill-travis', 'drill-em-arpeggio'] },
      { title: 'Classical theme', theme: 'lead', items: ['song-fur-elise'] },
    ],
  },
  {
    n: 9,
    name: 'Groove',
    theme: 'Chords',
    blurb: 'Syncopation, muting, and the small stuff that makes rhythm feel good.',
    missions: [
      { title: 'Off the beat', theme: 'rhythm', items: ['drill-syncopation', 'riff-funk-e'] },
      { title: 'Dance forms', theme: 'lead', items: ['song-minuet-g'] },
    ],
  },
  {
    n: 10,
    name: 'Full pieces',
    theme: 'Everything',
    blurb: 'Longer pieces that use the whole toolkit.',
    missions: [
      { title: 'Two full songs', theme: 'lead', items: ['song-neon-corridor', 'song-midnight-blues'] },
      { title: 'Speed', theme: 'lead', items: ['drill-speed-burst'] },
    ],
  },
];

export const LEVEL_BY_N = new Map(LEVELS.map((l) => [l.n, l]));

/** All item ids that appear in the path, in order. */
export function pathItemIds() {
  const out = [];
  for (const level of LEVELS) for (const m of level.missions) for (const id of m.items) out.push(id);
  return out;
}

/** The next item a player should try, based on stored stars. */
export function nextRecommendation(progressFn) {
  for (const id of pathItemIds()) {
    const p = progressFn(id);
    if (!p || (p.stars || 0) < 2) return id;
  }
  return 'drill-open-e';
}

/** Riff of the day: deterministic per calendar day. */
export function riffOfTheDay(dayKey = new Date().toISOString().slice(0, 10)) {
  const riffs = allItems().filter((i) => i.kind === 'riff' || i.kind === 'drill');
  if (riffs.length === 0) return 'riff-first-pulse';
  let hash = 0;
  for (let i = 0; i < dayKey.length; i++) hash = (hash * 31 + dayKey.charCodeAt(i)) >>> 0;
  return riffs[hash % riffs.length].id;
}

export function songs() {
  return allItems().filter((i) => i.kind === 'song');
}

export function levelProgress(level, progressFn) {
  const ids = level.missions.flatMap((m) => m.items);
  let earned = 0;
  let max = 0;
  for (const id of ids) {
    const p = progressFn(id);
    earned += (p && p.stars) || 0;
    max += 3;
  }
  return { earned, max, ratio: max ? earned / max : 0, items: ids.length };
}
