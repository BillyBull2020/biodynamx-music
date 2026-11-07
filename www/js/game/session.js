/**
 * One run through a track: the playhead, the judge, and the practice-mode
 * "wait for me" behaviour.
 *
 * Timing model
 *   - Beat 0 happens at `startedAt` on the audio clock (after a count-in).
 *   - The playhead is derived from the audio clock, so it does not drift when the
 *     UI thread stalls.
 *   - In wait mode the playhead is *clamped*: every frame that would overshoot the
 *     next unjudged note is added to `holdSeconds`, which pushes beat 0 further
 *     back. That is how the song pauses without losing sync.
 */

import { analyseNote, analyseSpectrum, midiToHz } from '../audio/pitch.js';
import {
  RunScorer,
  TOLERANCES,
  chordMatch,
  multiplierFor,
  pitchMatch,
  timingJudgement,
} from '../music/scoring.js';

const HOLD_TIMEOUT_MS = 10000;

export class Session {
  /**
   * @param {object} opts
   * @param {import('../music/track.js').Track} opts.track
   * @param {import('../audio/engine.js').InputEngine} opts.input
   * @param {import('../audio/band.js').Band} opts.band
   * @param {object} opts.settings
   * @param {object} opts.hooks
   */
  constructor({ track, input, band, settings, hooks = {} }) {
    this.track = track;
    this.input = input;
    this.band = band;
    this.hooks = hooks;
    this.settings = settings;

    this.mode = settings.mode === 'play' ? 'play' : 'practice';
    this.tempo = Math.max(0.25, Math.min(1.25, settings.tempo || 1));
    this.bpm = track.bpm * this.tempo;
    this.spb = 60 / this.bpm;

    this.toleranceName = settings.tolerance || 'normal';
    this.tolerance = TOLERANCES[this.toleranceName] || TOLERANCES.normal;
    this.latencyMs = Number(settings.latencyMs) || 0;
    // Waiting only makes sense while practising; Play mode always runs.
    this.waitToPlay = this.mode === 'practice' && settings.waitToPlay !== false;

    this.scorer = new RunScorer(track, this.toleranceName);
    this.states = track.events.map(() => 'pending');
    this.judgements = new Array(track.events.length).fill(null);
    this.combo = 0;
    this.maxCombo = 0;
    this.holdSeconds = 0;
    this.holdStartedAt = 0;
    this.paused = false;
    this.pausedAt = 0;
    this.finished = false;
    this.countInUntil = 0;
    this.startedAt = 0;
    this.playhead = 0; // seconds
    this.lastPitch = null;
    this.lastChroma = null;
    this.lastLevel = 0;
    this.startedWall = 0;
    this._raf = 0;
    this._unlisten = null;
    this._lastHoldKey = -1;
    this.autoSpeed = this.mode === 'practice' && settings.autoSpeed !== false;
    this.speedGraceUntil = 0;

    const mids = track.events.flatMap((e) => e.midis);
    const lo = Math.min(...mids);
    const hi = Math.max(...mids);
    // Narrow the detector to what this chart asks for (an octave of slack each
    // way keeps wrong notes visible instead of silently rejected).
    this.input.setRange(Math.max(45, midiToHz(lo - 12)), Math.min(2200, midiToHz(hi + 12)));
    this.range = { lo: lo - 12, hi: hi + 12 };
  }

  get countInSeconds() {
    const beats = this.settings.countIn ? this.track.countInBeats : 0;
    return beats * this.spb;
  }

  start() {
    const ctx = this.input.ctx;
    if (!ctx) throw new Error('Session.start called before the audio context existed');
    const now = ctx.currentTime;
    this.countInUntil = now + this.countInSeconds;
    this.startedAt = this.countInUntil;
    this.startedWall = performance.now();
    this.holdSeconds = 0;

    if (!this.waitToPlay && this.settings.backing !== false) {
      this.band.start({
        bpm: this.bpm,
        beatsPerBar: this.track.beatsPerBar,
        chordRoots: this._chordRoots(),
        bassRoot: this._bassRoot(),
        startAt: this.startedAt,
      });
    }
    if (this.waitToPlay && this.settings.countIn) {
      // In wait mode the band is silent; a click during the count-in keeps the
      // player's internal clock running.
      this.band.setMetronome(true);
      this.band.start({
        bpm: this.bpm,
        beatsPerBar: this.track.beatsPerBar,
        startAt: this.startedAt - this.countInSeconds + this.countInSeconds,
      });
      // Stop the click as soon as the run begins.
      setTimeout(
        () => this.band.stop(),
        Math.max(0, this.countInSeconds * 1000),
      );
    }

    this._unlisten = this.input.listen((buf, sr, t) => this._onWindow(buf, sr, t));
    const tick = () => {
      if (this.finished) return;
      this._frame();
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
    this._emitProgress(true);
  }

  _bassRoot() {
    const notes = this.track.events.flatMap((e) => e.midis);
    if (!notes.length) return 40;
    notes.sort((a, b) => a - b);
    return Math.max(28, notes[0] - 12);
  }

  _chordRoots() {
    if (this.track.mode !== 'chords') return null;
    const out = [];
    for (let bar = 0; bar < Math.ceil(this.track.totalBeats / this.track.beatsPerBar); bar++) {
      const startBeat = bar * this.track.beatsPerBar;
      const ev = this.track.events.find((e) => e.beat >= startBeat - 0.001 && e.beat < startBeat + this.track.beatsPerBar);
      out.push(ev ? Math.max(28, ev.midi - 12) : this._bassRoot());
    }
    return out;
  }

  pause() {
    if (this.paused || this.finished) return;
    this.paused = true;
    this.pausedAt = this.input.ctx.currentTime;
    this.band.stop();
  }

  resume() {
    if (!this.paused || this.finished) return;
    const now = this.input.ctx.currentTime;
    // Shift the whole timeline by however long we were paused.
    this.startedAt += now - this.pausedAt;
    this.paused = false;
    if (!this.waitToPlay && this.settings.backing !== false) {
      this.band.start({
        bpm: this.bpm,
        beatsPerBar: this.track.beatsPerBar,
        chordRoots: this._chordRoots(),
        bassRoot: this._bassRoot(),
        startAt: Math.max(now + 0.08, this.startedAt + this.nextPendingBeat() * this.spb),
      });
      this.band.startTime = Math.max(now + 0.08, this.startedAt + this.nextPendingBeat() * this.spb);
      this.band.nextNoteTime = this.band.startTime;
      this.band.beat = Math.round((this.band.startTime - this.startedAt) / this.spb);
    }
  }

  setTempo(tempo) {
    const clamped = Math.max(0.25, Math.min(1.25, tempo));
    // Preserve the current musical position when the tempo changes.
    const beat = this.currentBeat();
    this.tempo = clamped;
    this.bpm = this.track.bpm * this.tempo;
    this.spb = 60 / this.bpm;
    this.startedAt = this.input.ctx.currentTime - this.holdSeconds - beat * this.spb;
  }

  destroy() {
    this.finished = true;
    cancelAnimationFrame(this._raf);
    this.band.stop();
    if (this._unlisten) this._unlisten();
    this._unlisten = null;
  }

  nextPendingIndex() {
    for (let i = 0; i < this.states.length; i++) if (this.states[i] === 'pending') return i;
    return -1;
  }

  nextPendingBeat() {
    const i = this.nextPendingIndex();
    return i < 0 ? this.track.totalBeats + 1 : this.track.events[i].beat;
  }

  currentBeat() {
    return this.playhead / this.spb;
  }

  /** Audio-clock time of a beat, accounting for holds. */
  timeOfBeat(beat) {
    return this.startedAt + this.holdSeconds + beat * this.spb;
  }

  _frame() {
    if (this.paused) return;
    const ctx = this.input.ctx;
    const now = ctx.currentTime;

    if (now < this.countInUntil) {
      const remaining = this.countInUntil - now;
      const beat = Math.ceil(remaining / this.spb);
      if (beat !== this._lastCountBeat) {
        this._lastCountBeat = beat;
        this.hooks.onCountIn?.(beat);
      }
      this.playhead = (now - this.countInUntil);
      this._emitProgress();
      return;
    }

    let elapsed = now - this.startedAt - this.holdSeconds;
    if (elapsed < 0) elapsed = 0;

    // Wait mode: stop at the next unjudged note until it is played.
    if (this.waitToPlay) {
      const pendingBeat = this.nextPendingBeat();
      const limit = pendingBeat * this.spb;
      if (elapsed > limit) {
        const nowMs = performance.now();
        if (this._lastHoldKey !== pendingBeat) {
          this._lastHoldKey = pendingBeat;
          this.holdStartedAt = nowMs;
        }
        if (nowMs - this.holdStartedAt > HOLD_TIMEOUT_MS) {
          // Never trap the player: give up on this note and move on.
          this._judge(this.nextPendingIndex(), 'miss', { reason: 'timeout' });
          this._lastHoldKey = -1;
        } else {
          this.holdSeconds += elapsed - limit;
          elapsed = limit;
        }
      }
    }

    this.playhead = elapsed;
    this._expireMisses();

    const beat = this.currentBeat();
    if (beat > this.track.totalBeats + 0.001 && this.nextPendingIndex() < 0) {
      this._finish();
      return;
    }
    if (beat > this.track.totalBeats + 2) {
      // Everything left is stale; close the run.
      this._finish();
      return;
    }
    this._emitProgress();
  }

  /** Any pending event whose window has closed becomes a miss. */
  _expireMisses() {
    const windowBeats = this.tolerance.good / 1000 / this.spb;
    for (let i = 0; i < this.states.length; i++) {
      if (this.states[i] !== 'pending') continue;
      const e = this.track.events[i];
      if (this.currentBeat() > e.beat + windowBeats) this._judge(i, 'miss', { reason: 'passed' });
    }
  }

  _onWindow(buf, sampleRate, ctxTime) {
    if (this.finished || this.paused) return;
    if (ctxTime < this.countInUntil) {
      this.lastLevel = this.input.level;
      return;
    }
    const opts = { minHz: Math.max(50, midiToHz(this.range.lo)), maxHz: Math.min(2400, midiToHz(this.range.hi)) };
    const note = analyseNote(buf, sampleRate, opts);
    this.lastPitch = note;
    this.lastLevel = this.input.level;

    if (this.track.mode === 'chords') {
      this.lastChroma = analyseSpectrum(buf, sampleRate, { fftSize: 4096 }).chroma;
    }

    if (this.waitToPlay) this._tryWaitMode(note);
    else this._tryFlowMode(note, ctxTime);
  }

  /** Practice + wait: the next note must be played before time moves on. */
  _tryWaitMode(note) {
    const i = this.nextPendingIndex();
    if (i < 0) return;
    const e = this.track.events[i];
    if (!this._matches(e, note)) return;
    this._judge(i, 'perfect', { timingMs: 0, held: true });
    this._lastHoldKey = -1;
    if (this.autoSpeed) this._bumpSpeed(true);
  }

  /** Play mode / practice without waiting: judge against the moving playhead. */
  _tryFlowMode(note, ctxTime) {
    const nowBeat = this.currentBeat();
    const windowBeats = this.tolerance.good / 1000 / this.spb;
    // The detector reports on a window that ended now, but the note itself was
    // heard `latencyMs` earlier; shift the comparison point to match.
    const judgedBeat = nowBeat - this.latencyMs / 1000 / this.spb;

    for (let i = 0; i < this.states.length; i++) {
      if (this.states[i] !== 'pending') continue;
      const e = this.track.events[i];
      const delta = judgedBeat - e.beat;
      if (delta < -windowBeats) break; // not in range yet
      if (delta > windowBeats) continue; // handled by _expireMisses
      if (!this._matches(e, note)) continue;
      const timingMs = (delta * this.spb) * 1000;
      const j = timingJudgement(Math.abs(timingMs), this.tolerance);
      if (j === 'miss') continue;
      this._judge(i, j, { timingMs });
      if (this.autoSpeed) this._bumpSpeed(true);
      return;
    }
  }

  _bumpSpeed() {
    /* Auto-adjust speed is applied between runs by the practice screen, not
       mid-chart: changing the playhead rate mid-song would be disorienting. */
  }

  /** Does this detection satisfy this event? */
  _matches(e, note) {
    if (this.track.mode === 'chords') {
      if (!this.lastChroma) return false;
      const m = chordMatch(e.midis, this.lastChroma, { threshold: 0.32, required: 0.6 });
      return m.ok;
    }
    if (!note || !note.ok) return false;
    if (e.midis.length === 1) {
      const m = pitchMatch(e.midi, note, this.tolerance);
      return m.ok;
    }
    // Double stop: any sounding note that belongs to the event counts.
    for (const midi of e.midis) {
      if (pitchMatch(midi, note, this.tolerance).ok) return true;
    }
    // Or the whole set is audible.
    if (this.lastChroma) return chordMatch(e.midis, this.lastChroma, { threshold: 0.3, required: 0.5 }).ok;
    return false;
  }

  _judge(index, judgement, info = {}) {
    if (index < 0 || this.states[index] !== 'pending') return;
    this.states[index] = judgement === 'miss' ? 'miss' : 'hit';
    this.judgements[index] = judgement;
    this.combo = judgement === 'miss' ? 0 : this.combo + 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const res = this.scorer.judge(index, judgement);
    this.hooks.onJudge?.({
      index,
      event: this.track.events[index],
      judgement,
      combo: this.combo,
      multiplier: res.multiplier || multiplierFor(this.combo),
      ...info,
    });
    this._emitProgress(true);
    if (this.nextPendingIndex() < 0 && !this.waitToPlay) {
      // Let the tail of the last bar play out before showing results.
      this._finishAt = this.timeOfBeat(this.track.totalBeats + 1);
    }
  }

  forceSkip() {
    const i = this.nextPendingIndex();
    if (i >= 0) {
      this._judge(i, 'miss', { reason: 'skipped' });
      this._lastHoldKey = -1;
    }
  }

  /** "Play for me": sound the current note so the player knows what to aim for. */
  previewNote() {
    const i = this.nextPendingIndex();
    if (i < 0) return;
    const e = this.track.events[i];
    if (this.track.mode === 'chords') {
      for (const m of e.midis) this.band.referenceTone(m, 1.4);
    } else {
      this.band.referenceTone(e.midi, 1.4);
    }
  }

  _emitProgress(force = false) {
    const now = performance.now();
    if (!force && this._lastProgressAt && now - this._lastProgressAt < 40) return;
    this._lastProgressAt = now;
    this.hooks.onProgress?.({
      playhead: this.playhead,
      beat: this.currentBeat(),
      totalBeats: this.track.totalBeats,
      nextIndex: this.nextPendingIndex(),
      combo: this.combo,
      multiplier: multiplierFor(this.combo),
      accuracy: this.scorer.accuracy,
      score: this.scorer.score,
      pitch: this.lastPitch,
      chroma: this.lastChroma,
      level: this.lastLevel,
      holding: this.waitToPlay,
    });
  }

  _finish() {
    if (this.finished) return;
    this.finished = true;
    cancelAnimationFrame(this._raf);
    this.band.stop();
    if (this._unlisten) this._unlisten();
    this._unlisten = null;
    // Anything left unplayed counts as a miss so accuracy is honest.
    for (let i = 0; i < this.states.length; i++) {
      if (this.states[i] === 'pending') {
        this.states[i] = 'miss';
        this.judgements[i] = 'miss';
        this.scorer.judge(i, 'miss');
      }
    }
    this.hooks.onFinish?.(this.summary());
  }

  summary() {
    const s = this.scorer.summary();
    const elapsed = (performance.now() - this.startedWall) / 1000;
    return {
      ...s,
      maxCombo: this.maxCombo,
      trackId: this.track.id,
      title: this.track.title,
      mode: this.mode,
      tempo: this.tempo,
      seconds: Math.max(0, elapsed - this.countInSeconds),
      notesPlayed: this.scorer.judged,
    };
  }
}
