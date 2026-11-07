/**
 * The progressions that most popular music is built from.
 *
 * This is the honest answer to "I want to play the popular songs": you cannot
 * redistribute the songs, but you *can* learn the twelve harmonic patterns they
 * are written with, in every key. That is the skill — see one of these and you
 * can play along to thousands of records without a chart.
 *
 * Chord progressions are not copyrightable, and every one here is a fact about
 * music theory, not a copy of a song.
 *
 * `bars` is one entry per bar: [semitones above the key's root, quality].
 */

import { lookupChord } from '../music/theory.js';

const NAME_BY_PC = {
  0: 'C', 1: 'Db', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F',
  6: 'F#', 7: 'G', 8: 'Ab', 9: 'A', 10: 'Bb', 11: 'B',
};

/** The twelve keys, ordered roughly by how friendly they are on guitar. */
export const KEYS = [
  { name: 'C', pc: 0, slug: 'c' },
  { name: 'G', pc: 7, slug: 'g' },
  { name: 'D', pc: 2, slug: 'd' },
  { name: 'A', pc: 9, slug: 'a' },
  { name: 'E', pc: 4, slug: 'e' },
  { name: 'F', pc: 5, slug: 'f' },
  { name: 'Bb', pc: 10, slug: 'bb' },
  { name: 'Eb', pc: 3, slug: 'eb' },
  { name: 'Ab', pc: 8, slug: 'ab' },
  { name: 'Db', pc: 1, slug: 'db' },
  { name: 'F#', pc: 6, slug: 'fs' },
  { name: 'B', pc: 11, slug: 'b' },
];

export const PROGRESSIONS = [
  {
    id: 'four',
    name: 'The four-chord song',
    roman: 'I \u2013 V \u2013 vi \u2013 IV',
    feel: 'pop',
    bpm: 96,
    about:
      'The most-used progression in modern pop, and the fastest win for a beginner. Four chords, one bar each, and it never gets old. Learn this in G and you can busk.',
    bars: [[0, ''], [7, ''], [9, 'm'], [5, '']],
  },
  {
    id: 'pop-alt',
    name: 'The other four-chord song',
    roman: 'vi \u2013 IV \u2013 I \u2013 V',
    feel: 'pop',
    bpm: 96,
    about: 'The same four chords starting from the minor. Sounds melancholy then hopeful — the engine behind a huge share of pop ballads.',
    bars: [[9, 'm'], [5, ''], [0, ''], [7, '']],
  },
  {
    id: 'doowop',
    name: 'Doo-wop changes',
    roman: 'I \u2013 vi \u2013 IV \u2013 V',
    feel: 'pop',
    bpm: 88,
    about: 'Fifties ballads, soul, and every song that ends with a big chorus. Play it slow and let the chords ring.',
    bars: [[0, ''], [9, 'm'], [5, ''], [7, '']],
  },
  {
    id: 'rock',
    name: 'Three-chord rock',
    roman: 'I \u2013 IV \u2013 V \u2013 I',
    feel: 'rock',
    bpm: 120,
    about: 'The entire blues and rock vocabulary in three chords. Loud, simple, and it works at any tempo.',
    bars: [[0, ''], [5, ''], [7, ''], [0, '']],
  },
  {
    id: 'rock-b7',
    name: 'Rock with a flat seven',
    roman: 'I \u2013 \u266dVII \u2013 IV \u2013 \u266dVII',
    feel: 'rock',
    bpm: 112,
    about: 'The flattened seventh gives it swagger. This is the riff-shaped progression in a lot of classic and indie rock.',
    bars: [[0, ''], [10, ''], [5, ''], [10, '']],
  },
  {
    id: 'minor-pop',
    name: 'Minor pop',
    roman: 'i \u2013 \u266dVI \u2013 \u266dIII \u2013 \u266dVII',
    feel: 'pop',
    bpm: 100,
    about: 'Dark verse, huge chorus. The backbone of minor-key pop and film music.',
    bars: [[0, 'm'], [8, ''], [3, ''], [10, '']],
  },
  {
    id: 'andalusian',
    name: 'Andalusian cadence',
    roman: 'i \u2013 \u266dVII \u2013 \u266dVI \u2013 V',
    feel: 'flamenco',
    bpm: 104,
    about: 'A descending minor line with a hair-raising major chord at the end. Flamenco, Spanish guitar, and a thousand rock songs.',
    bars: [[0, 'm'], [10, ''], [8, ''], [7, '']],
  },
  {
    id: 'jazz-251',
    name: 'Two five one',
    roman: 'ii\u2077 \u2013 V\u2077 \u2013 I\u1d50\u1d43\u02b2\u2077 \u2013 (ii\u2077)',
    feel: 'jazz',
    bpm: 92,
    about: 'The cadence every jazz standard resolves with. If you learn one jazz move, learn this one.',
    bars: [[2, 'm7'], [7, '7'], [0, 'maj7'], [2, 'm7']],
  },
  {
    id: 'blues12',
    name: 'Twelve-bar blues',
    roman: 'I\u2077 \u2152 \u2152 \u2152 \u2152 IV\u2077 \u2152 I\u2077 \u2152 V\u2077 IV\u2077 I\u2077 V\u2077',
    feel: 'blues',
    bpm: 96,
    about: 'The form that invented rock and roll. Twelve bars, three chords, endless songs. Learn the shape and you can jam with anyone.',
    bars: [
      [0, '7'], [0, '7'], [0, '7'], [0, '7'],
      [5, '7'], [5, '7'], [0, '7'], [0, '7'],
      [7, '7'], [5, '7'], [0, '7'], [7, '7'],
    ],
  },
  {
    id: 'canon',
    name: 'The canon changes',
    roman: 'I \u2013 V \u2013 vi \u2013 iii \u2013 IV \u2013 I \u2013 IV \u2013 V',
    feel: 'classical',
    bpm: 76,
    about: 'Pachelbel\u2019s sequence. It sounds baroque and it is also all over modern pop — eight bars, one chord each.',
    bars: [[0, ''], [7, ''], [9, 'm'], [4, 'm'], [5, ''], [0, ''], [5, ''], [7, '']],
  },
  {
    id: 'folk',
    name: 'Folk and country',
    roman: 'I \u2013 IV \u2013 I \u2013 V',
    feel: 'folk',
    bpm: 104,
    about: 'The campfire progression. Simple, singable, and it works with a strum or a fingerpick.',
    bars: [[0, ''], [5, ''], [0, ''], [7, '']],
  },
  {
    id: 'modal',
    name: 'Modal rock',
    roman: 'I \u2013 \u266dIII \u2013 IV \u2013 I',
    feel: 'rock',
    bpm: 108,
    about: 'Major chord, then a major chord a minor third up. It sounds like a wide-open road and it needs no theory to play.',
    bars: [[0, ''], [3, ''], [5, ''], [0, '']],
  },
];

/**
 * Resolve one progression in one key into chord events.
 * @returns {Array<{beat:number,chord:string,durBeats:number,frets:number[]}>|null}
 *          null when a chord in that key has no playable shape
 */
export function progressionChords(prog, key, beatsPerBar = 4) {
  const chords = [];
  let beat = 0;
  for (const [offset, quality] of prog.bars) {
    const pc = ((key.pc + offset) % 12 + 12) % 12;
    const name = `${NAME_BY_PC[pc]}${quality}`;
    const shape = lookupChord(name);
    if (!shape) return null;
    chords.push({ beat, chord: name, durBeats: beatsPerBar, frets: shape.frets });
    beat += beatsPerBar;
  }
  return chords;
}

/** "G D Em C" — a readable chord string for a progression in a key. */
export function progressionLabel(prog, key) {
  return prog.bars
    .map(([offset, quality]) => `${NAME_BY_PC[(((key.pc + offset) % 12) + 12) % 12]}${quality}`)
    .join(' ');
}
