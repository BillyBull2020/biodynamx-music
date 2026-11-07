/**
 * Your own songs.
 *
 * The shipped catalogue is public domain on purpose (see docs/REA-FINDINGS.md).
 * Anything you add here is different: it is typed by you, stored on your device
 * in localStorage, and never uploaded. Add a chord chart or paste a tab and it
 * becomes a normal playable piece — same highway, same grading, same stars.
 *
 * Two input formats, both deliberately forgiving:
 *
 *   Chords    G C D Em
 *             G:4 C:4 D:2 D:2 | Em:8          (":beats" optional, default one bar)
 *
 *   Tab       e|----0---|
 *             B|--1-----|                   (normal ASCII tab, `0` = open)
 */

import { parseTab } from '../music/tab.js';
import { CHORDS } from '../music/theory.js';

const DEFAULT_BEATS = 4;

/**
 * Parse a chord line into makeTrack chord events.
 * Unknown chords are reported rather than silently dropped.
 */
export function parseChordLine(text, { beatsPerBar = 4 } = {}) {
  const chords = [];
  const unknown = [];
  let beat = 0;

  for (const token of String(text).split(/\s+/)) {
    if (!token || token === '|') continue;
    const [rawName, rawBeats] = token.split(':');
    const name = rawName.trim();
    const beats = Number(rawBeats) > 0 ? Number(rawBeats) : DEFAULT_BEATS;
    const shape = CHORDS[name];
    if (!shape) {
      unknown.push(name);
      continue;
    }
    chords.push({ beat, chord: name, durBeats: beats, frets: shape.frets });
    beat += beats;
  }

  return { chords, unknown, totalBeats: beat };
}

/** Does this look like tablature rather than a chord line? */
export function looksLikeTab(text) {
  return /^[A-Ga-g][#b]?\d?\s*\|/m.test(String(text));
}

/**
 * Build a makeTrack() spec from a stored custom song.
 * @returns {{notes?:Array, chords?:Array, tuningId?:string}|null}
 */
export function buildCustom(custom) {
  if (!custom || !custom.body) return null;

  if (custom.format === 'tab' || looksLikeTab(custom.body)) {
    try {
      const parsed = parseTab(custom.body, { stepsPerBeat: custom.stepsPerBeat || 2 });
      if (!parsed.events.length) return null;
      return { notes: parsed.events };
    } catch {
      return null;
    }
  }

  const { chords } = parseChordLine(custom.body, { beatsPerBar: custom.beatsPerBar || 4 });
  if (!chords.length) return null;
  return { chords, mode: 'chords' };
}

/** A stable-ish id for a new custom song. */
export function newCustomId(title) {
  const slug = String(title || 'song')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  return `mine-${slug || 'song'}-${Math.random().toString(36).slice(2, 6)}`;
}
