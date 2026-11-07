/** Why do high notes report an octave low? Inspect YIN's CMND curve. */
import { detectPitchYin, midiToHz, hzToMidi } from '../www/js/audio/pitch.js';

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function guitarTone(midi, { seconds = 0.4, sr = 48000, gain = 0.35, noise = 0.0015, seed = 1, B = 8e-5 } = {}) {
  const rand = mulberry32(seed);
  const f0 = midiToHz(midi);
  const n = Math.floor(seconds * sr);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let s = 0;
    for (let h = 1; h <= 14; h++) {
      const fh = f0 * h * Math.sqrt(1 + B * h * h);
      if (fh > sr / 2 - 800) break;
      const amp = Math.pow(h, -1.15) * Math.exp(-t * (1.1 + h * 0.8)) * (h === 2 ? 1.06 : 1);
      s += amp * Math.sin(2 * Math.PI * fh * t + h * 0.7);
    }
    s *= Math.min(1, t / 0.004) * (1 - Math.exp(-t * 240));
    out[i] = (s + (rand() * 2 - 1) * noise) * gain;
  }
  return out;
}

function cmndCurve(frame, tauMax) {
  const n = frame.length;
  const d = new Float64Array(tauMax + 1);
  let run = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < n - tau; i++) {
      const diff = frame[i] - frame[i + tau];
      sum += diff * diff;
    }
    run += sum;
    d[tau] = run > 0 ? (sum * tau) / run : 1;
  }
  return d;
}

const SR = 48000;
for (const midi of [64, 68, 72, 77]) {
  const tone = guitarTone(midi, { sr: SR, seed: midi * 7 + 1 });
  const frame = tone.subarray(Math.floor(0.06 * SR), Math.floor(0.06 * SR) + 4096);
  const T = SR / midiToHz(midi);
  const d = cmndCurve(frame, 900);
  // local minima under 0.3
  const mins = [];
  for (let tau = 3; tau <= 880; tau++) {
    if (d[tau] < d[tau - 1] && d[tau] <= d[tau + 1] && d[tau] < 0.35) mins.push({ tau, v: d[tau] });
  }
  mins.sort((a, b) => a.tau - b.tau);
  const res = detectPitchYin(frame, SR);
  console.log(
    `\nMIDI ${midi} (${midiToHz(midi).toFixed(1)} Hz) true T=${T.toFixed(1)}  -> YIN hz=${res.hz.toFixed(2)} ` +
      `midi=${hzToMidi(res.hz).toFixed(2)}`,
  );
  console.log('  first local minima under 0.35:', mins.slice(0, 8).map((m) => `tau=${m.tau}(d=${m.v.toFixed(3)})`).join(' '));
  const near = [];
  for (let tau = Math.floor(T) - 3; tau <= Math.ceil(T) + 3; tau++) near.push(`tau=${tau}:${d[tau].toFixed(3)}`);
  console.log('  around true T:', near.join(' '));
  const near2 = [];
  for (let tau = Math.floor(2 * T) - 3; tau <= Math.ceil(2 * T) + 3; tau++) near2.push(`tau=${tau}:${d[tau].toFixed(3)}`);
  console.log('  around 2T:   ', near2.join(' '));
}
