/**
 * Drums.
 *
 * Yousician does not teach drums — its five instruments are guitar, piano,
 * ukulele, bass and singing — so this is an addition rather than a port. It
 * reuses the whole practice machine: patterns are written as a step grid, become
 * track events like any other note, and are graded by *time* (see
 * js/audio/onset.js) instead of pitch.
 *
 * Grid notation, one character per step, `X` = accented, `o` = ghost, `-` = rest:
 *
 *   kick:  'X---X---X---X---'
 *   snare: '----X-------X---'
 *   hat:   'X-o-X-o-X-o-X-o-'
 */

export const DRUM_LANES = ['kick', 'snare', 'hat', 'tom'];

/** General MIDI percussion numbers, so the backing band can play the same part. */
export const DRUM_MIDI = { kick: 36, snare: 38, hat: 42, tom: 45, crash: 49 };

/** Short glyphs drawn inside the note circles. */
export const DRUM_GLYPH = { kick: 'K', snare: 'S', hat: 'H', tom: 'T' };

export const DRUM_LABEL = { kick: 'Kick', snare: 'Snare', hat: 'Hat', tom: 'Tom' };

/**
 * Turn a lane grid into track events.
 *
 * @param {Record<string,string>} rows      lane -> step string
 * @param {object} [opts]
 * @param {number} [opts.stepsPerBeat=2]    grid resolution
 * @param {number} [opts.repeats=1]         repeat the whole grid
 * @param {number} [opts.startBeat=0]
 * @returns {Array<{beat:number, drum:string, lane:number, durBeats:number, accent:boolean}>}
 */
export function drumPattern(rows, { stepsPerBeat = 2, repeats = 1, startBeat = 0 } = {}) {
  const lanes = Object.keys(rows);
  const width = Math.max(...lanes.map((l) => rows[l].replace(/\s+/g, '').length));
  const events = [];

  for (let r = 0; r < repeats; r++) {
    const base = startBeat + (r * width) / stepsPerBeat;
    for (const lane of lanes) {
      const laneIndex = DRUM_LANES.indexOf(lane);
      if (laneIndex < 0) throw new Error(`drumPattern: unknown lane "${lane}"`);
      const grid = rows[lane].replace(/\s+/g, '');
      for (let i = 0; i < grid.length; i++) {
        const ch = grid[i];
        if (ch === '-' || ch === '.' || ch === ' ') continue;
        events.push({
          beat: base + i / stepsPerBeat,
          drum: lane,
          lane: laneIndex,
          durBeats: 1 / stepsPerBeat,
          accent: ch === 'X',
        });
      }
    }
  }

  events.sort((a, b) => a.beat - b.beat || a.lane - b.lane);
  return events;
}
