/**
 * The backing band.
 *
 * There are no audio files anywhere in this app: the drums, bass and click are
 * synthesised from oscillators and a noise buffer. That keeps the whole thing
 * offline-capable, licence-free, and small enough to install on a phone.
 */

import { midiToHz } from '../music/theory.js';

function noiseBuffer(ctx, seconds = 0.4) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  // Deterministic noise, so the kit sounds identical between sessions.
  let seed = 0x2f6e2b1;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = (seed / 4294967296) * 2 - 1;
  }
  return buf;
}

export class Band {
  /** @param {AudioContext} ctx */
  constructor(ctx) {
    this.ctx = ctx;
    this.bpm = 90;
    this.beatsPerBar = 4;
    this.running = false;
    this.lookaheadMs = 130;
    this.timer = null;
    this.nextNoteTime = 0;
    this.beat = 0;
    this.startTime = 0;
    this.metronome = false;
    this.backing = true;
    this.volume = 0.5;
    this.pattern = 'auto';
    this.bassRoot = 45;
    this.chordRoots = null;
    this.noise = noiseBuffer(ctx);

    this.out = ctx.createGain();
    this.out.gain.value = this.volume;
    this.out.connect(ctx.destination);

    this.drums = ctx.createGain();
    this.drums.gain.value = 0.9;
    this.drums.connect(this.out);

    this.clickBus = ctx.createGain();
    this.clickBus.gain.value = 1;
    this.clickBus.connect(this.out);
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    this.out.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.01);
  }

  setMetronome(on) {
    this.metronome = !!on;
  }

  setBacking(on) {
    this.backing = !!on;
  }

  /**
   * @param {object} opts
   * @param {number} opts.bpm
   * @param {number} [opts.beatsPerBar]
   * @param {number[]} [opts.chordRoots] per-bar MIDI roots for the bass
   * @param {number} [opts.bassRoot]
   */
  start({ bpm, beatsPerBar = 4, chordRoots = null, bassRoot = 45, startAt = null } = {}) {
    this.stop();
    this.bpm = bpm;
    this.beatsPerBar = beatsPerBar;
    this.chordRoots = chordRoots && chordRoots.length ? chordRoots : null;
    this.bassRoot = bassRoot;
    const now = this.ctx.currentTime + 0.06;
    this.startTime = startAt == null ? now : Math.max(now, startAt);
    this.nextNoteTime = this.startTime;
    this.beat = 0;
    this.running = true;
    this.timer = setInterval(() => this._pump(), 25);
    this._pump();
  }

  stop() {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Seconds per beat at the current tempo. */
  get spb() {
    return 60 / this.bpm;
  }

  /** Absolute audio-clock time of a given beat. */
  timeOfBeat(beat) {
    return this.startTime + beat * this.spb;
  }

  _pump() {
    if (!this.running) return;
    const horizon = this.ctx.currentTime + this.lookaheadMs / 1000;
    let guard = 0;
    while (this.nextNoteTime < horizon && guard++ < 64) {
      this._scheduleBeat(this.beat, this.nextNoteTime);
      this.beat++;
      this.nextNoteTime = this.startTime + this.beat * this.spb;
    }
  }

  _scheduleBeat(beat, time) {
    const inBar = beat % this.beatsPerBar;
    const bar = Math.floor(beat / this.beatsPerBar);

    if (this.metronome) this._click(time, inBar === 0);
    if (!this.backing) return;

    const beats = this.beatsPerBar;
    // Backbeat: kick 1 and 3, snare 2 and 4, hats on every eighth.
    const kick = beats === 3 ? inBar === 0 : inBar === 0 || inBar === 2;
    const snare = beats === 3 ? inBar === 1 || inBar === 2 : inBar === 1 || inBar === 3;
    if (kick) this._kick(time);
    if (snare) this._snare(time);
    this._hat(time, inBar % 2 === 1);
    this._hat(time + this.spb / 2, false, 0.5);

    // Bass: root of the bar's chord, an eighth note on the beat.
    const root = this._rootForBar(bar);
    this._bass(time, root, this.spb * 0.55);
    this._bass(time + this.spb / 2, root, this.spb * 0.3, 0.55);
  }

  _rootForBar(bar) {
    if (this.chordRoots && this.chordRoots.length) {
      return this.chordRoots[bar % this.chordRoots.length];
    }
    return this.bassRoot;
  }

  _click(time, accent) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = accent ? 1760 : 1170;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(accent ? 0.5 : 0.3, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    osc.connect(gain).connect(this.clickBus);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  _kick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(46, time + 0.09);
    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
    osc.connect(gain).connect(this.drums);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  _snare(time) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1900;
    bp.Q.value = 0.8;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
    src.connect(bp).connect(gain).connect(this.drums);
    src.start(time);
    src.stop(time + 0.2);
  }

  _hat(time, open = false, level = 1) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const gain = this.ctx.createGain();
    const dur = open ? 0.11 : 0.035;
    gain.gain.setValueAtTime(0.14 * level, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    src.connect(hp).connect(gain).connect(this.drums);
    src.start(time);
    src.stop(time + dur + 0.02);
  }

  _bass(time, midi, dur, level = 1) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    osc.type = 'triangle';
    osc.frequency.value = midiToHz(midi);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.22 * level, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, time + Math.max(0.08, dur));
    osc.connect(lp).connect(gain).connect(this.out);
    osc.start(time);
    osc.stop(time + Math.max(0.1, dur) + 0.02);
  }

  /** A short pitched blip used for metronome-free UI feedback. */
  blip(freq = 880, dur = 0.08, type = 'sine', level = 0.18) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(level, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /**
   * Play a whole arrangement back so the player can hear what they are aiming
   * for. This is the single most useful learning aid in the app: you should
   * never have to guess what a phrase is supposed to sound like.
   *
   * @param {Array<{beat:number, midis:number[], durBeats:number}>} events
   * @param {number} bpm
   * @returns {{stop:() => void, duration: number}}
   */
  playSequence(events, bpm) {
    const t0 = this.ctx.currentTime + 0.12;
    const spb = 60 / bpm;
    const bus = this.ctx.createGain();
    bus.gain.value = 0.9;
    bus.connect(this.out);

    let end = 0;
    for (const ev of events) {
      const at = t0 + ev.beat * spb;
      const dur = Math.max(0.12, ev.durBeats * spb * 0.92);
      end = Math.max(end, ev.beat * spb + dur);
      for (const midi of ev.midis) {
        const f = midiToHz(midi);
        const gain = this.ctx.createGain();
        gain.connect(bus);
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.16, at + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        for (const [mult, level] of [
          [1, 1],
          [2, 0.32],
          [3, 0.12],
        ]) {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = f * mult;
          g.gain.value = level;
          osc.connect(g).connect(gain);
          osc.start(at);
          osc.stop(at + dur + 0.05);
        }
      }
    }

    return {
      duration: end + 0.2,
      stop: () => {
        try {
          bus.gain.cancelScheduledValues(this.ctx.currentTime);
          bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
          setTimeout(() => bus.disconnect(), 400);
        } catch {
          /* already gone */
        }
      },
    };
  }

  /**
   * Play a reference pitch for tuning by ear. Plucked-ish envelope so it is easy
   * to compare against the guitar.
   */
  referenceTone(midi, seconds = 2.2) {
    const t = this.ctx.currentTime;
    const f = midiToHz(midi);
    const gain = this.ctx.createGain();
    gain.connect(this.out);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.28, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    for (const [mult, level] of [
      [1, 1],
      [2, 0.4],
      [3, 0.18],
      [4, 0.08],
    ]) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f * mult;
      g.gain.value = level;
      osc.connect(g).connect(gain);
      osc.start(t);
      osc.stop(t + seconds + 0.05);
    }
  }
}
