/**
 * Track model. Every playable thing — a drill, a riff, a song, a scale — is
 * normalised into the same event shape so the note highway, the judge and the
 * scoring code only ever see one representation.
 *
 * Times are stored in *beats*, never seconds, so the tempo slider, auto-speed
 * and the metronome can all change playback speed without rebuilding content.
 */

import { findPosition, fretMidi, noteName, noteWithOctave, parseNote, shapeMidis, tuning } from './theory.js';

/**
 * @typedef {Object} TrackEvent
 * @property {number} index        stable order index
 * @property {number} beat         start position, in beats from the top
 * @property {number} durBeats     length in beats
 * @property {number} midi         primary (lowest) note — used for melody judging
 * @property {number[]} midis      all notes to sound; length > 1 means a chord
 * @property {number} string       string index of the primary note (0 = low E)
 * @property {number} fret         fret of the primary note
 * @property {string} label        display label, e.g. "E2" or "Em"
 * @property {boolean} isChord
 * @property {string} [chord]
 * @property {number[]} [frets]    chord fingering, -1 = muted
 */

/**
 * @typedef {Object} Track
 * @property {string} id
 * @property {string} title
 * @property {string} [subtitle]
 * @property {'drill'|'riff'|'song'|'chord'|'scale'|'ear'|'pattern'} kind
 * @property {number} level        1..10, for the learning path
 * @property {number} bpm
 * @property {number} beatsPerBar
 * @property {string} tuningId
 * @property {'melody'|'chords'} mode
 * @property {TrackEvent[]} events
 * @property {number} totalBeats
 * @property {string[]} tags
 * @property {number} difficulty   1..5
 * @property {string} [about]
 * @property {number} [countInBeats]
 */

const DEFAULT_BEATS_PER_BAR = 4;

function beatToSeconds(beat, bpm) {
  return (beat * 60) / bpm;
}

/**
 * Build a track. Pass either `notes` (single-line) or `chords`.
 *
 * Note input accepts:
 *   { beat, name: 'E2', durBeats }            — absolute note name
 *   { beat, string, fret, durBeats }          — fretboard position
 *   { beat, midi, durBeats }
 */
export function makeTrack(spec) {
  const {
    id,
    title,
    subtitle = '',
    kind = 'song',
    level = 1,
    bpm = 80,
    beatsPerBar = DEFAULT_BEATS_PER_BAR,
    tuningId = 'standard',
    tags = [],
    difficulty = 1,
    about = '',
    notes = [],
    chords = [],
    mode,
    countInBeats = 4,
    pitchTrack = null,
  } = spec;

  const events = [];
  const strings = tuning(tuningId).midis.length;

  for (const n of notes) {
    const durBeats = n.durBeats ?? 1;
    let midi = null;
    let string = null;
    let fret = null;
    if (typeof n.name === 'string') {
      midi = parseNote(n.name);
      if (midi === null) throw new Error(`makeTrack(${id}): bad note name "${n.name}"`);
      const pos = findPosition(tuningId, midi);
      if (pos) {
        string = pos.string;
        fret = pos.fret;
      }
    } else if (typeof n.midi === 'number') {
      midi = n.midi;
      const pos = findPosition(tuningId, midi);
      if (pos) {
        string = pos.string;
        fret = pos.fret;
      }
    } else if (typeof n.fret === 'number') {
      string = n.string ?? 0;
      fret = n.fret;
      midi = fretMidi(tuningId, string, fret);
    }
    if (midi === null) continue;
    events.push({
      beat: n.beat,
      durBeats,
      midi,
      midis: [midi],
      string: string ?? 0,
      fret: fret ?? 0,
      label: noteWithOctave(midi),
      shortLabel: noteName(midi),
      isChord: false,
    });
  }

  for (const c of chords) {
    const durBeats = c.durBeats ?? 1;
    const parts = Array.isArray(c.midis)
      ? c.midis.map((midi) => ({ midi }))
      : shapeMidis({ frets: c.frets }, tuningId).map((p) => ({ midi: p.midi }));
    const midis = parts.map((p) => p.midi).sort((a, b) => a - b);
    if (midis.length === 0) continue;
    events.push({
      beat: c.beat,
      durBeats,
      midi: midis[0],
      midis,
      string: 0,
      fret: 0,
      label: c.chord || c.label || '',
      shortLabel: c.chord || '',
      isChord: true,
      chord: c.chord,
      frets: c.frets,
      strum: c.strum || 'D',
    });
  }

  events.sort((a, b) => a.beat - b.beat || a.string - b.string);

  // Merge simultaneous single notes into one event. Riffs use double stops
  // (open E plus a fretted octave, for example), and the judge has to grade them
  // as one hit — otherwise the highway shows two notes the player cannot separate.
  const merged = [];
  for (const e of events) {
    const prev = merged[merged.length - 1];
    if (prev && !prev.isChord && !e.isChord && Math.abs(prev.beat - e.beat) < 1e-6) {
      prev.midis = [...new Set([...prev.midis, ...e.midis])].sort((a, b) => a - b);
      prev.midi = prev.midis[0];
      prev.isChord = prev.midis.length > 1;
      prev.label = prev.isChord ? prev.midis.map((m) => noteName(m)).join('+') : noteWithOctave(prev.midi);
      prev.shortLabel = prev.midis.map((m) => noteName(m)).join('+');
      continue;
    }
    merged.push(e);
  }
  merged.forEach((e, i) => {
    e.index = i;
  });

  const lastBeat = merged.reduce((m, e) => Math.max(m, e.beat + e.durBeats), 0);
  const track = {
    id,
    title,
    subtitle,
    kind,
    level,
    bpm,
    beatsPerBar,
    tuningId,
    mode: mode || (chords.length ? 'chords' : 'melody'),
    events: merged,
    totalBeats: Math.max(lastBeat, beatsPerBar),
    tags,
    difficulty,
    about,
    countInBeats,
    stringCount: strings,
    pitchTrack,
  };

  track.seconds = beatToSeconds(track.totalBeats, bpm);
  // Lowest and highest expected pitch: lets the audio engine narrow its search
  // window during gameplay, which is the single biggest CPU saving we have.
  const mids = merged.flatMap((e) => e.midis);
  track.minMidi = mids.length ? Math.min(...mids) : 40;
  track.maxMidi = mids.length ? Math.max(...mids) : 76;
  return track;
}

/** Chord progression helper: [['Em', 4], ['G', 4], ...] in beats. */
export function progression(list, { fretsFor = null } = {}) {
  const out = [];
  let beat = 0;
  for (const [name, beats] of list) {
    out.push({ beat, chord: name, durBeats: beats, frets: fretsFor ? fretsFor(name) : undefined });
    beat += beats;
  }
  return out;
}

/** Strum pattern helper: 'D' down, 'U' up, '-' rest, one char per step. */
export function strumPattern({ chordBeats, pattern, bpm, repeats = 1 }) {
  const notes = [];
  const stepBeats = chordBeats / pattern.length;
  for (let r = 0; r < repeats; r++) {
    [...pattern].forEach((ch, i) => {
      if (ch === '-') return;
      notes.push({ beat: r * chordBeats + i * stepBeats, strum: ch });
    });
  }
  return notes;
}

export { beatToSeconds };
