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
import { drumPattern } from '../music/drums.js';
import { TUNES } from './tunes/index.js';
import { PROGRESSIONS, KEYS, progressionChords, progressionLabel } from './progressions.js';
import { parseMelody, simplify } from './tunes/notation.js';
import { customSongs, customSong } from '../util/storage.js';
import { buildCustom } from './custom.js';

/* --------------------------------------------------------------- helpers */

/** Melody from [ ['C4', 1], ... ] beat pairs. */
function melody(pairs, opts = {}) {
  return () => ({ notes: sequence(pairs, opts).events, tuningId: opts.tuningId || 'standard' });
}

/** Drum chart from lane grids: one grid character per step. */
function drums(rows, opts = {}) {
  return () => ({ drums: drumPattern(rows, opts) });
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

/* ================================================================ DRUMS ===
 * Yousician has no drum instrument (its five are guitar, piano, ukulele, bass
 * and singing), so this whole section is new. Charts are step grids; see
 * js/music/drums.js. Grading is by attack timing, not pitch.
 */

const DRUM_SPECS = {
  'drums-basic': {
    title: 'First beat',
    subtitle: 'Kick, snare and hi-hat',
    kind: 'drums',
    level: 1,
    bpm: 90,
    difficulty: 1,
    tags: ['drums', 'rock'],
    about:
      'The beat behind most rock and pop: kick on 1 and 3, snare on 2 and 4, hat on every eighth. Tap the pads, or play it on a real kit.',
    make: drums({ kick: 'X---X---', snare: '--X---X-', hat: 'XXXXXXXX' }, { repeats: 2 }),
  },
  'drums-four-floor': {
    title: 'Four on the floor',
    subtitle: 'A dance beat',
    kind: 'drums',
    level: 6,
    bpm: 112,
    difficulty: 2,
    tags: ['drums', 'pop'],
    about: 'Kick on every beat, snare on 2 and 4. Steady is the whole trick — the hats hold it together.',
    make: drums({ kick: 'X-X-X-X-', snare: '--X---X-', hat: 'X-X-X-X-' }, { repeats: 2 }),
  },
  'drums-punk': {
    title: 'Fast and loud',
    subtitle: 'Punk beat at speed',
    kind: 'drums',
    level: 6,
    bpm: 150,
    difficulty: 3,
    tags: ['drums', 'rock'],
    about: 'Same rock beat, twice the tempo. If it falls apart, drop the tempo to 100 and build back up.',
    make: drums({ kick: 'X---X---', snare: '--X---X-', hat: 'XXXXXXXX' }, { repeats: 2 }),
  },
  'drums-half-time': {
    title: 'Half-time feel',
    subtitle: 'Big and slow',
    kind: 'drums',
    level: 9,
    bpm: 76,
    difficulty: 2,
    tags: ['drums', 'rock', 'ballad'],
    about:
      'The snare moves to beat 3, which makes the groove feel half as fast. This is the beat under most rock ballads.',
    make: drums({ kick: 'X-------', snare: '----X---', hat: 'X-X-X-X-' }, { repeats: 2 }),
  },
  'drums-fill': {
    title: 'Beat into a fill',
    subtitle: 'Two bars, ending in toms',
    kind: 'drums',
    level: 9,
    bpm: 100,
    difficulty: 3,
    tags: ['drums', 'rock'],
    about:
      'One bar of the basic beat, then the same bar with the last two beats moved to the toms. Fills are how you get from one section to the next.',
    make: drums(
      {
        kick: 'X---X---X---X---',
        snare: '--X---X---------',
        hat: 'XXXXXXXXXXXX----',
        tom: '------------X-X-',
      },
      { stepsPerBeat: 2 },
    ),
  },
};

/* -------------------------------------------------------------- new songs */

const SONG_SPECS = {
  /* ---------------------------------------------------------------- rock */
  'riff-redline': {
    title: 'Redline',
    subtitle: 'Original punk riff',
    kind: 'riff',
    level: 5,
    bpm: 152,
    difficulty: 3,
    tags: ['rock', 'riff', 'power'],
    about:
      'Three power chords, all on the low E string. Keep the fretting hand relaxed — speed comes from the picking wrist, not from squeezing.',
    make: tab(`
      e|----------------|
      B|----------------|
      G|----------------|
      D|----------------|
      A|----------------|
      E|0-0-0-0-3-3-5-5-|
    `),
  },
  'riff-highway-fire': {
    title: 'Highway Fire',
    subtitle: 'Original classic rock riff',
    kind: 'riff',
    level: 5,
    bpm: 120,
    difficulty: 3,
    tags: ['rock', 'riff', 'power'],
    about: 'A driving A5 to G5 to E5 riff. Let the open low E ring between the chord stabs.',
    make: tab(`
      e|----------------|
      B|----------------|
      G|----------------|
      D|----------------|
      A|----------------|
      E|5-5-5-5-3-3-3-3-|
    `),
  },
  'riff-deep-water': {
    title: 'Deep Water',
    subtitle: 'Original blues-rock riff',
    kind: 'riff',
    level: 10,
    bpm: 104,
    difficulty: 4,
    tags: ['rock', 'blues', 'riff'],
    about:
      'A minor-third stab over an open E drone. The silence between the notes matters as much as the notes — do not rush it.',
    make: tab(`
      e|----------------|
      B|----------------|
      G|----------------|
      D|----------------|
      A|----------------|
      E|0-0-3-0-3-0-5-3-|
    `),
  },
  'song-static-bloom': {
    title: 'Static Bloom',
    subtitle: 'Original rock ballad',
    kind: 'song',
    level: 10,
    bpm: 76,
    difficulty: 3,
    tags: ['rock', 'chords', 'ballad'],
    about:
      'Am, F, C, G with a wide, ringing strum. Ballads reward letting chords ring rather than chopping at them.',
    make: chordSeq(
      [['Am', 4], ['F', 4], ['C', 4], ['G', 4], ['Am', 4], ['F', 4], ['G', 4], ['G', 4]],
      { pattern: 'D---D-DU' },
    ),
  },

  /* ---------------------------------------------------------------- love */
  'song-slow-burn': {
    title: 'Slow Burn',
    subtitle: 'Original ballad',
    kind: 'song',
    level: 7,
    bpm: 68,
    difficulty: 3,
    tags: ['love', 'chords', 'ballad'],
    about:
      'Am, F, C, G played slowly with one soft strum per bar and a lift at the end. Leave space and let the guitar breathe.',
    make: chordSeq(
      [['Am', 4], ['F', 4], ['C', 4], ['G', 4], ['Am', 4], ['F', 4], ['G', 4], ['Am', 4]],
      { pattern: 'D---D-U-' },
    ),
  },
  'song-only-you': {
    title: 'Only You',
    subtitle: 'Original love song',
    kind: 'song',
    level: 7,
    bpm: 84,
    difficulty: 2,
    tags: ['love', 'chords', 'campfire'],
    about: 'G, Em, C, D — the warmest four chords there are. Simple on purpose: sing over it.',
    make: chordSeq(
      [['G', 4], ['Em', 4], ['C', 4], ['D', 4], ['G', 4], ['Em', 4], ['C', 4], ['D', 4]],
      { pattern: 'D-DU' },
    ),
  },
  'song-lamplight': {
    title: 'Lamplight',
    subtitle: 'Original fingerstyle ballad',
    kind: 'song',
    level: 8,
    bpm: 72,
    difficulty: 4,
    tags: ['love', 'fingerstyle', 'ballad'],
    about:
      'Fingerpicked Em, C, G, D. Thumb on the beat, fingers filling in between — the quiet version of a love song.',
    make: chordSeq(
      [['Em', 4], ['C', 4], ['G', 4], ['D', 4], ['Em', 4], ['C', 4], ['D', 4], ['Em', 4]],
      { pattern: 'D-U-D-U-' },
    ),
  },
  'song-water-is-wide': {
    title: 'The Water Is Wide',
    subtitle: 'Traditional (public domain)',
    kind: 'song',
    level: 8,
    bpm: 76,
    difficulty: 3,
    tags: ['love', 'chords', 'traditional'],
    about: 'An old Scottish love song still sung everywhere. D, A, Bm, G with a gentle rolling strum.',
    make: chordSeq(
      [['D', 4], ['A', 4], ['Bm', 4], ['G', 4], ['D', 4], ['A', 4], ['G', 4], ['D', 4]],
      { pattern: 'D-DU-UDU' },
    ),
  },

  /* ------------------------------------------------------------ campfire */
  'camp-kumbaya': {
    title: 'Kumbaya',
    subtitle: 'Traditional (public domain)',
    kind: 'song',
    level: 3,
    bpm: 92,
    difficulty: 1,
    tags: ['campfire', 'chords', 'traditional'],
    about: 'Three chords, one campfire, everyone sings. G, C and D, one bar each.',
    make: chordSeq(
      [['G', 4], ['C', 4], ['G', 4], ['D', 4], ['G', 4], ['C', 4], ['G', 4], ['D', 4]],
      { pattern: 'DDUD' },
    ),
  },
  'camp-she-ll-be-comin': {
    title: "She'll Be Coming Round the Mountain",
    subtitle: 'Traditional (public domain)',
    kind: 'song',
    level: 3,
    bpm: 108,
    difficulty: 1,
    tags: ['campfire', 'chords', 'traditional'],
    about: 'A call-and-response singalong. G and C, with D7 for the turnaround.',
    make: chordSeq(
      [['G', 4], ['G', 4], ['C', 4], ['G', 4], ['D7', 4], ['D7', 4], ['G', 4], ['G', 4]],
      { pattern: 'DDUD' },
    ),
  },
  'camp-oh-susanna': {
    title: 'Oh! Susanna',
    subtitle: 'Stephen Foster, 1848 (public domain)',
    kind: 'song',
    level: 4,
    bpm: 116,
    difficulty: 2,
    tags: ['campfire', 'chords', 'traditional'],
    about: 'Two chords the whole way through. The strum is the whole song — keep the wrist loose.',
    make: chordSeq(
      [['C', 4], ['C', 4], ['G7', 4], ['G7', 4], ['C', 4], ['C', 4], ['G7', 4], ['C', 4]],
      { pattern: 'DDUD' },
    ),
  },
  'camp-home-range': {
    title: 'Home on the Range',
    subtitle: 'Traditional (public domain)',
    kind: 'song',
    level: 4,
    bpm: 96,
    difficulty: 2,
    tags: ['campfire', 'chords', 'traditional'],
    about: 'A slow singalong. G, C and D7 — the same three chords as most campfire songs.',
    make: chordSeq(
      [['G', 4], ['C', 4], ['G', 4], ['D7', 4], ['G', 4], ['C', 4], ['D7', 4], ['G', 4]],
      { pattern: 'DDUD' },
    ),
  },
  'camp-railroad': {
    title: "I've Been Working on the Railroad",
    subtitle: 'Traditional (public domain)',
    kind: 'song',
    level: 4,
    bpm: 112,
    difficulty: 2,
    tags: ['campfire', 'chords', 'traditional'],
    about: 'The one everybody knows the words to. C and G7, straight down-up strums.',
    make: chordSeq(
      [['C', 4], ['C', 4], ['C', 4], ['G7', 4], ['C', 4], ['C', 4], ['G7', 4], ['C', 4]],
      { pattern: 'DDUD' },
    ),
  },
};

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

Object.assign(SPECS, SONG_SPECS, DRUM_SPECS);

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

  // Custom songs live in storage, not in the SPECS registry.
  const custom = String(id).startsWith('mine-') ? customSong(id) : null;
  if (custom) {
    const built = buildCustom(custom);
    if (built) {
      const track = makeTrack({
        id: custom.id,
        title: custom.title || 'My song',
        subtitle: 'Added by you',
        kind: 'song',
        level: custom.level || 3,
        bpm: custom.bpm || 90,
        beatsPerBar: custom.beatsPerBar || 4,
        difficulty: 2,
        tags: ['mine'],
        about: custom.body ? `Your own chart. ${custom.format === 'tab' || /^[A-Ga-g]/.test(custom.body) ? 'Tab' : 'Chords'}: ${String(custom.body).split('\n')[0].slice(0, 80)}` : '',
        notes: built.notes || [],
        chords: built.chords || [],
        tuningId: built.tuningId || 'standard',
        mode: built.mode,
      });
      cache.set(id, track);
      return track;
    }
  }

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
      drums: built.drums || [],
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
  const builtIn = itemIds()
    .map((id) => ({ id, ...SPECS[id] }))
    .filter((s) => s && s.title);
  // Custom songs come last so the public-domain catalogue stays first in the list.
  const mine = customSongs().map((c) => ({
    id: c.id,
    title: c.title || 'My song',
    subtitle: 'Added by you',
    kind: 'song',
    level: c.level || 3,
    bpm: c.bpm || 90,
    difficulty: 2,
    tags: ['mine'],
  }));
  return [...builtIn, ...mine];
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
      { title: 'First beat', theme: 'rhythm', items: ['drums-basic'] },
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
      { title: 'Around the campfire', theme: 'rhythm', items: ['camp-kumbaya', 'camp-she-ll-be-comin'] },
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
      {
        title: 'Singalong strums',
        theme: 'rhythm',
        items: ['camp-oh-susanna', 'camp-home-range', 'camp-railroad'],
      },
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
      { title: 'Turn it up', theme: 'lead', items: ['riff-redline', 'riff-highway-fire'] },
    ],
  },
  {
    n: 6,
    name: 'Lead',
    theme: 'Riffs & lead',
    blurb: 'Picking discipline, position shifts, and time on the kit.',
    missions: [
      { title: 'Picking', theme: 'lead', items: ['drill-alt-picking', 'drill-octave-leap'] },
      { title: 'Moving around the neck', theme: 'lead', items: ['song-morning-line'] },
      { title: 'On the kit', theme: 'rhythm', items: ['drums-four-floor', 'drums-punk'] },
    ],
  },
  {
    n: 7,
    name: 'Barre chords',
    theme: 'Chords',
    blurb: 'The shape that turns one chord into twelve, and the quiet stuff.',
    missions: [
      { title: 'Barre', theme: 'rhythm', items: ['drill-barre', 'drill-sus'] },
      { title: 'Fingerstyle first', theme: 'lead', items: ['song-spanish-study'] },
      { title: 'Love songs', theme: 'rhythm', items: ['song-slow-burn', 'song-only-you'] },
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
      { title: 'Picked ballads', theme: 'lead', items: ['song-lamplight', 'song-water-is-wide'] },
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
      { title: 'Fills and feel', theme: 'rhythm', items: ['drums-fill', 'drums-half-time'] },
    ],
  },
  {
    n: 10,
    name: 'Full pieces',
    theme: 'Everything',
    blurb: 'Longer pieces that use the whole toolkit.',
    missions: [
      { title: 'Two full songs', theme: 'lead', items: ['song-neon-corridor', 'song-midnight-blues'] },
      { title: 'Rock and blues', theme: 'lead', items: ['song-static-bloom', 'riff-deep-water'] },
      { title: 'Speed', theme: 'lead', items: ['drill-speed-burst'] },
    ],
  },
];

export const LEVEL_BY_N = new Map(LEVELS.map((l) => [l.n, l]));

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
