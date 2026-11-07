/** Probe the systematic +5c bias seen in pitch-test.mjs and find its cause. */
import { detectPitchYin, midiToHz, centsBetween } from '../www/js/audio/pitch.js';

const SR = 48000;
const MIDI = 45; // A2 110Hz
const f0 = midiToHz(MIDI);

function tone({ decay = 0, phasePerHarm = 0.7, harm2Boost = 1.06, seconds = 0.5, seed = 1 } = {}) {
  const n = Math.floor(seconds * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    for (let h = 1; h <= 12; h++) {
      const fh = f0 * h * (1 + 0.00012 * h * h);
      const amp = Math.pow(h, -1.15) * (decay ? Math.exp(-t * (1.1 + h * 0.85)) : 1) * (h === 2 ? harm2Boost : 1);
      s += amp * Math.sin(2 * Math.PI * fh * t + h * phasePerHarm);
    }
    out[i] = s * 0.3;
  }
  return out;
}

function envelopeNormalise(frame, sr, ms = 6) {
  const n = frame.length;
  const win = Math.max(3, Math.round((ms / 1000) * sr));
  const env = new Float32Array(n);
  // moving RMS via prefix sums of squares
  const p = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) p[i + 1] = p[i] + frame[i] * frame[i];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - win);
    const b = Math.min(n, i + win);
    env[i] = Math.sqrt((p[b] - p[a]) / (b - a)) || 1e-9;
  }
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = frame[i] / env[i];
  return out;
}

function measure(frame, label, sr = SR) {
  const r = detectPitchYin(frame, sr);
  const c = r.ok ? centsBetween(r.hz, midiToHz(MIDI)) : NaN;
  console.log(`  ${label.padEnd(42)} hz=${r.hz.toFixed(3).padStart(8)}  cents=${c.toFixed(2).padStart(6)}  conf=${r.confidence.toFixed(2)}`);
  return c;
}

const start = Math.floor(0.06 * SR);
const N = 4096;
const win = (buf, off = start) => buf.subarray(off, off + N);

console.log('A2 (110 Hz) — 4096-sample window, 60 ms into the note\n');
measure(win(tone({ decay: 0 })), 'no decay');
measure(win(tone({ decay: 1 })), 'decaying (guitar-like)');
measure(win(tone({ decay: 1, harm2Boost: 1.0 })), 'decaying, no 2nd-harmonic boost');
measure(win(tone({ decay: 1, phasePerHarm: 0 })), 'decaying, all phases aligned');
measure(envelopeNormalise(win(tone({ decay: 1 })), SR), 'decaying + envelope normalisation');
measure(win(tone({ decay: 1 }), Math.floor(0.005 * SR)), 'decaying, window at 5 ms (attack)');

console.log('\nWindow length sweep (decaying tone), to see whether decay across the');
console.log('window is what pulls the minimum:');
for (const size of [1024, 2048, 3072, 4096, 6144, 8192]) {
  const frame = tone({ decay: 1 }).subarray(start, start + size);
  const r = detectPitchYin(frame, SR);
  const c = r.ok ? centsBetween(r.hz, midiToHz(MIDI)) : NaN;
  console.log(`  ${String(size).padStart(5)} samples (${((size / SR) * 1000).toFixed(0).padStart(3)} ms) -> cents=${c.toFixed(2).padStart(6)} hz=${r.hz.toFixed(3)}`);
}

console.log('\nSample-rate sweep (decaying tone):');
for (const sr of [44100, 48000]) {
  const buf = tone({ decay: 1, seconds: 0.5 });
  const st = Math.floor(0.06 * sr);
  const r = detectPitchYin(buf.subarray(st, st + 4096), sr);
  console.log(`  ${sr} Hz -> cents=${r.ok ? centsBetween(r.hz, midiToHz(MIDI)).toFixed(2) : 'n/a'} hz=${r.hz.toFixed(3)}`);
}

console.log('\nTrue frequency of the synthesiser grid (no decay) for reference:');
for (const sr of [44100, 48000]) {
  const n = 100000;
  // count zero crossings of pure sine to confirm the ideal
  console.log(`  ${sr} Hz, ideal A2 = ${midiToHz(MIDI).toFixed(4)} Hz`);
}
