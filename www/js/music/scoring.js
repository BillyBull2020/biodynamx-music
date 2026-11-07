/**
 * Judging and scoring.
 *
 * The reference app documents stars as "one silver to three gold per song part",
 * with gold requiring "everything right with good timing", and a multiplier that
 * starts at 3x and can reach 5x. It does not publish millisecond windows, so the
 * windows below are this project's own tuning values — chosen to be forgiving on
 * a phone microphone, and exposed to the player as Easy / Normal / Strict.
 */

import { pitchClass } from './theory.js';

export const TOLERANCES = {
  easy: { perfect: 95, great: 160, good: 230, cents: 70, label: 'Easy' },
  normal: { perfect: 65, great: 120, good: 180, cents: 50, label: 'Normal' },
  strict: { perfect: 40, great: 85, good: 130, cents: 32, label: 'Strict' },
};

export const JUDGEMENT_POINTS = { perfect: 100, great: 78, good: 52, miss: 0 };
export const JUDGEMENT_WEIGHT = { perfect: 1, great: 0.9, good: 0.62, miss: 0 };
export const JUDGEMENT_LABEL = { perfect: 'Perfect', great: 'Great', good: 'Good', miss: 'Miss' };
export const JUDGEMENT_RANK = { miss: 0, good: 1, great: 2, perfect: 3 };

export const MIN_MULTIPLIER = 3;
export const MAX_MULTIPLIER = 5;

/** Which judgement a timing error earns, ignoring pitch. */
export function timingJudgement(absMs, tolerance = TOLERANCES.normal) {
  if (absMs <= tolerance.perfect) return 'perfect';
  if (absMs <= tolerance.great) return 'great';
  if (absMs <= tolerance.good) return 'good';
  return 'miss';
}

/**
 * Combine a detected pitch with the expected one.
 * @returns {{ok:boolean, cents:number, kind:'exact'|'near'|'none'}}
 */
export function pitchMatch(expectedMidi, detected, tolerance = TOLERANCES.normal) {
  if (!detected || !detected.ok) return { ok: false, cents: Infinity, kind: 'none' };
  const cents = (detected.midi - expectedMidi) * 100;
  const abs = Math.abs(cents);
  if (abs <= tolerance.cents) return { ok: true, cents, kind: 'exact' };
  // An octave out is a common beginner mistake and a common detector error;
  // accept it for melody lines but score it lower.
  if (Math.abs(Math.abs(cents) - 1200) <= tolerance.cents) return { ok: true, cents, kind: 'octave' };
  return { ok: false, cents, kind: 'none' };
}

/**
 * Chord match from a chroma vector: how much of the expected pitch-class set is
 * actually sounding, plus whether the bass note is in the chord.
 */
export function chordMatch(expectedMidis, chroma, opts = {}) {
  const threshold = opts.threshold ?? 0.34;
  const required = opts.required ?? 0.66;
  const expected = new Set(expectedMidis.map((m) => pitchClass(m)));
  let present = 0;
  const missing = [];
  for (const pc of expected) {
    if (chroma[pc] >= threshold) present++;
    else missing.push(pc);
  }
  const coverage = expected.size ? present / expected.size : 0;
  return {
    ok: coverage >= required && present >= Math.min(2, expected.size),
    coverage,
    missing,
    present,
  };
}

/** Multiplier from the current combo, mirroring the documented 3x -> 5x ramp. */
export function multiplierFor(combo) {
  if (combo >= 20) return 5;
  if (combo >= 12) return 4;
  return MIN_MULTIPLIER;
}

/** Star rating from accuracy and the share of perfect hits. */
export function starsFor({ accuracy, perfectRatio, completeness }) {
  const acc = completeness < 0.999 ? accuracy * completeness : accuracy;
  if (acc >= 0.92 && perfectRatio >= 0.6) return 3;
  if (acc >= 0.78) return 2;
  if (acc >= 0.55) return 1;
  return 0;
}

export const STAR_LABEL = ['No star', 'One star', 'Two stars', 'Three stars'];

/**
 * Running score for one run. The score is normalised to 0..100000 over the item
 * so a 12-note drill and a 90-note song are comparable, which is what makes the
 * song-end score in the reference app read like a five-digit number.
 */
export class RunScorer {
  constructor(track, toleranceName = 'normal') {
    this.tolerance = TOLERANCES[toleranceName] || TOLERANCES.normal;
    this.total = track.events.length;
    this.judged = 0;
    this.counts = { perfect: 0, great: 0, good: 0, miss: 0 };
    this.combo = 0;
    this.maxCombo = 0;
    this.points = 0;
    this.bestMultiplierSeen = MIN_MULTIPLIER;
    // The ceiling is the score an unbroken perfect run would earn *at this
    // length*, using the real 3x -> 5x ramp. That makes a flawless run exactly
    // 100,000 on every item, whether it is an eight-note drill or a full song.
    let ceiling = 0;
    for (let i = 0; i < this.total; i++) ceiling += JUDGEMENT_POINTS.perfect * multiplierFor(i);
    this.maxPoints = Math.max(1, ceiling);
  }

  get multiplier() {
    return multiplierFor(this.combo);
  }

  judge(eventIndex, judgement) {
    this.judged++;
    this.counts[judgement] = (this.counts[judgement] || 0) + 1;
    if (judgement === 'miss') {
      this.combo = 0;
    } else {
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.bestMultiplierSeen = Math.max(this.bestMultiplierSeen, this.multiplier);
      // Score the hit with the multiplier the combo earned *before* the hit.
      const mult = multiplierFor(Math.max(0, this.combo - 1));
      this.points += JUDGEMENT_POINTS[judgement] * mult;
    }
    return { multiplier: this.multiplier, points: this.points };
  }

  get accuracy() {
    if (this.judged === 0) return 0;
    let sum = 0;
    for (const k of Object.keys(JUDGEMENT_WEIGHT)) sum += (this.counts[k] || 0) * JUDGEMENT_WEIGHT[k];
    return sum / this.judged;
  }

  get perfectRatio() {
    return this.judged ? this.counts.perfect / this.judged : 0;
  }

  get completeness() {
    return this.total ? this.judged / this.total : 1;
  }

  get score() {
    return Math.min(100000, Math.round((this.points / this.maxPoints) * 100000));
  }

  summary() {
    const accuracy = this.accuracy;
    const perfectRatio = this.perfectRatio;
    const completeness = this.completeness;
    return {
      score: this.score,
      accuracy,
      perfectRatio,
      completeness,
      stars: starsFor({ accuracy, perfectRatio, completeness }),
      counts: { ...this.counts },
      maxCombo: this.maxCombo,
      judged: this.judged,
      total: this.total,
      multiplier: this.bestMultiplierSeen,
    };
  }
}
