/**
 * The note highway.
 *
 * Six lanes, one per string, drawn with a slight perspective so notes read as
 * coming toward the player. The low E is the lane nearest the player (bottom of
 * the screen), matching how a guitarist looks down at the instrument.
 *
 * Everything is drawn from the track's beat positions, so scroll speed follows
 * the tempo slider automatically.
 */

import { noteName } from '../music/theory.js';

const LOOK_AHEAD_BEATS = 5;
const LOOK_BEHIND_BEATS = 0.9;

const COLORS = {
  lane: 'rgba(120, 170, 220, 0.10)',
  laneAlt: 'rgba(120, 170, 220, 0.045)',
  laneLine: 'rgba(120, 170, 220, 0.16)',
  stringLine: 'rgba(150, 200, 240, 0.30)',
  grid: 'rgba(120, 170, 220, 0.13)',
  barGrid: 'rgba(0, 212, 255, 0.22)',
  text: '#8fa7c4',
  textBright: '#f4f9ff',
  cyan: '#00d4ff',
  lime: '#9dff5c',
  amber: '#ffc44d',
  rose: '#ff5c74',
  violet: '#9b7bff',
};

const JUDGE_COLOR = { perfect: COLORS.lime, great: COLORS.cyan, good: COLORS.amber, miss: COLORS.rose };

export class Highway {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this.w = 0;
    this.h = 0;
    this.track = null;
    this.pops = [];
    this._lastPlayhead = 0;
    this._raf = 0;
    this._resize();
    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', this._onResize);
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', this._onResize);
    cancelAnimationFrame(this._raf);
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2.5, window.devicePixelRatio || 1);
    this.w = Math.max(1, Math.round(rect.width));
    this.h = Math.max(1, Math.round(rect.height));
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setTrack(track) {
    this.track = track;
    this.pops = [];
  }

  /** Register a hit so the note can flash where it was played. */
  pop(index, judgement) {
    const e = this.track?.events[index];
    if (!e) return;
    this.pops.push({ beat: e.beat, string: e.string, isChord: e.isChord, judgement, t: performance.now() });
    if (this.pops.length > 24) this.pops.shift();
  }

  /* ------------------------------------------------------------- geometry */

  get hitY() {
    return this.h - Math.max(74, this.h * 0.16);
  }

  get topY() {
    return Math.max(8, this.h * 0.02);
  }

  laneX(stringIndex, y) {
    const strings = this.track?.stringCount || 6;
    // The outer lanes need enough margin that a note circle at the hit line is
    // never clipped by the screen edge.
    const pad = Math.max(30, Math.min(this.w * 0.09, this.w * 0.16));
    const usable = this.w - pad * 2;
    const t = (y - this.topY) / Math.max(1, this.hitY - this.topY); // 0 at top, 1 at hit line
    const squeeze = 0.82 + 0.18 * Math.max(0, Math.min(1, t));
    const cx = this.w / 2;
    const step = (usable / Math.max(1, strings - 1)) * squeeze;
    return cx + (stringIndex - (strings - 1) / 2) * step;
  }

  /** Screen y for a beat position. */
  yFor(beat, playheadBeat) {
    const span = LOOK_AHEAD_BEATS;
    const frac = (beat - playheadBeat) / span;
    return this.hitY - frac * (this.hitY - this.topY);
  }

  /* --------------------------------------------------------------- render */

  render(state) {
    const ctx = this.ctx;
    const { playheadBeat = 0, states = [], judgements = [], holding = false, level = 0, pitch = null } = state;
    if (!this.track) return;
    this._lastPlayhead = playheadBeat;

    ctx.clearRect(0, 0, this.w, this.h);
    this._drawBackdrop(ctx);
    this._drawLanes(ctx);
    this._drawGrid(ctx, playheadBeat, state.countIn);
    this._drawNotes(ctx, playheadBeat, states, judgements);
    this._drawPops(ctx, playheadBeat);
    this._drawHitLine(ctx, holding, level);
    this._drawLabels(ctx);
    if (pitch) this._drawPitchReadout(ctx, pitch, playheadBeat, state);
  }

  _drawBackdrop(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, 'rgba(3, 10, 20, 0.0)');
    g.addColorStop(0.55, 'rgba(6, 21, 39, 0.35)');
    g.addColorStop(1, 'rgba(2, 8, 16, 0.85)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  _drawLanes(ctx) {
    const strings = this.track.stringCount || 6;
    const top = this.topY;
    const bottom = this.hitY + 26;
    const pad = Math.max(30, Math.min(this.w * 0.09, this.w * 0.16));
    // Lane fill is narrower than the lane spacing so the string lines stay visible.
    const laneWidth = Math.max(16, ((this.w - pad * 2) / Math.max(1, strings - 1)) * 0.80);
    for (let s = 0; s < strings; s++) {
      const xTop = this.laneX(s, top);
      const xBottom = this.laneX(s, bottom);
      ctx.beginPath();
      ctx.moveTo(xTop, top);
      ctx.lineTo(xBottom, bottom);
      ctx.lineWidth = laneWidth;
      ctx.strokeStyle = s % 2 === 0 ? COLORS.lane : COLORS.laneAlt;
      ctx.lineCap = 'butt';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(xTop, top);
      ctx.lineTo(xBottom, bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = COLORS.laneLine;
      ctx.stroke();
    }
  }

  _drawGrid(ctx, playheadBeat, countIn) {
    const bar = this.track.beatsPerBar;
    const first = Math.floor((playheadBeat - LOOK_BEHIND_BEATS) / bar) * bar;
    const last = playheadBeat + LOOK_AHEAD_BEATS;
    ctx.save();
    for (let b = first; b <= last; b += bar) {
      const y = this.yFor(b, playheadBeat);
      if (y < this.topY - 4 || y > this.hitY + 30) continue;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.w, y);
      ctx.lineWidth = 1;
      ctx.strokeStyle = COLORS.barGrid;
      ctx.stroke();
      const barNo = Math.floor(b / bar) + 1;
      if (barNo > 0) {
        ctx.font = `600 ${Math.max(9, Math.round(this.w * 0.026))}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = 'left';
        ctx.fillText(String(barNo), 6, y - 4);
      }
    }
    // Beat ticks
    for (let b = Math.ceil(playheadBeat - LOOK_BEHIND_BEATS); b <= last; b++) {
      if (b % bar === 0) continue;
      const y = this.yFor(b, playheadBeat);
      if (y < this.topY || y > this.hitY + 30) continue;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.w, y);
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawNotes(ctx, playheadBeat, states, judgements) {
    const events = this.track.events;
    const windowStart = playheadBeat - LOOK_BEHIND_BEATS;
    const windowEnd = playheadBeat + LOOK_AHEAD_BEATS;

    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.beat < windowStart || e.beat > windowEnd) continue;
      const y = this.yFor(e.beat, playheadBeat);
      if (y < this.topY - 20 || y > this.hitY + 40) continue;
      const t = Math.max(0, Math.min(1, (y - this.topY) / Math.max(1, this.hitY - this.topY)));
      const scale = 0.62 + 0.38 * t;
      const state = states[i];
      const judged = judgements[i];

      if (e.isChord) this._drawChordBlock(ctx, e, y, t, scale, state, judged, playheadBeat);
      else this._drawNote(ctx, e, y, t, scale, state, judged);
    }
  }

  _drawNote(ctx, e, y, t, scale, state, judged) {
    const x = this.laneX(e.string ?? 0, y);
    const r = Math.max(11, this.w * 0.052) * scale;

    if (state === 'hit' || state === 'miss') {
      // Keep hit notes visible briefly as a fading ghost.
      const alpha = 0.16;
      ctx.globalAlpha = alpha;
    } else {
      ctx.globalAlpha = 0.35 + 0.65 * t;
    }

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(x, y - r * 0.3, r * 0.2, x, y, r);
    if (state === 'miss') {
      grad.addColorStop(0, 'rgba(255,92,116,0.5)');
      grad.addColorStop(1, 'rgba(255,92,116,0.16)');
    } else if (state === 'hit') {
      grad.addColorStop(0, 'rgba(157,255,92,0.5)');
      grad.addColorStop(1, 'rgba(157,255,92,0.14)');
    } else {
      grad.addColorStop(0, 'rgba(0,212,255,0.95)');
      grad.addColorStop(1, 'rgba(0,140,200,0.55)');
    }
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = state === 'miss' ? 'rgba(255,92,116,0.7)' : state === 'hit' ? 'rgba(157,255,92,0.7)' : 'rgba(180,240,255,0.85)';
    ctx.stroke();

    if (state === 'pending' || state === 'hit') {
      ctx.globalAlpha = Math.min(1, 0.5 + t);
      ctx.fillStyle = '#04121f';
      ctx.font = `800 ${Math.max(9, Math.round(r * 0.95))}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Drum notes carry a K/S/H/T glyph; guitar notes carry the fret number.
      ctx.fillText(e.drum ? e.label : String(e.fret ?? 0), x, y + 0.5);
    }
    ctx.globalAlpha = 1;
  }

  _drawChordBlock(ctx, e, y, t, scale, state, judged, playheadBeat) {
    const strings = this.track.stringCount || 6;
    const left = this.laneX(0, y) - Math.max(12, this.w * 0.05);
    const right = this.laneX(strings - 1, y) + Math.max(12, this.w * 0.05);
    const height = Math.max(20, this.w * 0.085) * scale;
    const alpha = state === 'pending' ? 0.35 + 0.65 * t : 0.18;

    ctx.globalAlpha = alpha;
    const r = 8;
    ctx.beginPath();
    ctx.moveTo(left + r, y - height / 2);
    ctx.lineTo(right - r, y - height / 2);
    ctx.quadraticCurveTo(right, y - height / 2, right, y - height / 2 + r);
    ctx.lineTo(right, y + height / 2 - r);
    ctx.quadraticCurveTo(right, y + height / 2, right - r, y + height / 2);
    ctx.lineTo(left + r, y + height / 2);
    ctx.quadraticCurveTo(left, y + height / 2, left, y + height / 2 - r);
    ctx.lineTo(left, y - height / 2 + r);
    ctx.quadraticCurveTo(left, y - height / 2, left + r, y - height / 2);
    ctx.closePath();

    if (state === 'hit') ctx.fillStyle = 'rgba(157,255,92,0.85)';
    else if (state === 'miss') ctx.fillStyle = 'rgba(255,92,116,0.75)';
    else ctx.fillStyle = 'rgba(0,212,255,0.85)';
    ctx.fill();

    if (state === 'pending' || state === 'hit') {
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#04121f';
      ctx.font = `800 ${Math.max(11, Math.round(height * 0.62))}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const arrow = e.strum === 'U' ? ' ▲' : e.strum === 'D' ? ' ▼' : '';
      ctx.fillText(`${e.label}${arrow}`, (left + right) / 2, y + 0.5);
    }
    ctx.globalAlpha = 1;
  }

  _drawPops(ctx, playheadBeat) {
    const now = performance.now();
    this.pops = this.pops.filter((p) => now - p.t < 420);
    for (const p of this.pops) {
      const age = (now - p.t) / 420;
      const y = this.yFor(p.beat, playheadBeat);
      const x = p.isChord ? this.w / 2 : this.laneX(p.string ?? 0, y);
      const r = Math.max(14, this.w * 0.06) * (1 + age * 1.6);
      ctx.globalAlpha = (1 - age) * 0.75;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = JUDGE_COLOR[p.judgement] || COLORS.cyan;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  _drawHitLine(ctx, holding, level) {
    const y = this.hitY;
    const glow = ctx.createLinearGradient(0, y - 26, 0, y + 26);
    glow.addColorStop(0, 'rgba(0,212,255,0)');
    glow.addColorStop(0.5, holding ? 'rgba(0,212,255,0.20)' : 'rgba(0,212,255,0.08)');
    glow.addColorStop(1, 'rgba(0,212,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, y - 26, this.w, 52);

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(this.w, y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = holding ? 'rgba(0,212,255,0.9)' : 'rgba(0,212,255,0.55)';
    ctx.stroke();

    // Input level meter, so the player can see the app hearing them.
    const meterW = this.w * 0.5;
    const x0 = (this.w - meterW) / 2;
    ctx.fillStyle = 'rgba(120,170,220,0.16)';
    ctx.fillRect(x0, y + 8, meterW, 3);
    ctx.fillStyle = level > 0.06 ? COLORS.lime : COLORS.cyan;
    ctx.fillRect(x0, y + 8, meterW * Math.min(1, level), 3);
  }

  _drawLabels(ctx) {
    const strings = this.track.stringCount || 6;
    const labels = this.track.laneLabels;
    ctx.font = `700 ${Math.max(10, Math.round(this.w * 0.028))}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const y = this.h - Math.max(34, this.h * 0.07);
    for (let s = 0; s < strings; s++) {
      const x = this.laneX(s, this.hitY);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(11, this.w * 0.032), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 42, 77, 0.85)';
      ctx.fill();
      ctx.fillStyle = COLORS.text;
      // Drum lanes are captioned K/S/H/T; guitar lanes are the open-string note.
      ctx.fillText(labels ? labels[s] : noteName(this._stringOpenMidi(s)), x, y + 0.5);
    }
  }

  _stringOpenMidi(s) {
    // Imported lazily to keep the module free of a hard dependency cycle.
    const table = { standard: [40, 45, 50, 55, 59, 64], dropD: [38, 45, 50, 55, 59, 64] };
    const defaultTable = table[this.track.tuningId] || table.standard;
    return defaultTable[s] ?? 40;
  }

  _drawPitchReadout(ctx, pitch, playheadBeat, state) {
    const now = this.track.events[state.nextIndex ?? -1];
    ctx.font = `700 ${Math.max(10, Math.round(this.w * 0.03))}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Sits between the input meter and the string labels so it covers neither.
    const y = this.hitY + Math.max(26, (this.h - this.hitY) * 0.24);
    if (pitch && pitch.ok) {
      const cents = now && !now.isChord ? Math.round((pitch.midi - now.midi) * 100) : null;
      const label = `hearing ${noteName(Math.round(pitch.midi))}${cents === null ? '' : `  ${cents > 0 ? '+' : ''}${cents}¢`}`;
      const good = cents !== null && Math.abs(cents) <= 50;
      ctx.fillStyle = good ? COLORS.lime : COLORS.text;
      ctx.fillText(label, this.w / 2, y);
    } else {
      ctx.fillStyle = 'rgba(143,167,196,0.5)';
      ctx.fillText('listening…', this.w / 2, y);
    }
  }
}
