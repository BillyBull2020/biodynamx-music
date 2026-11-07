/** Inspect the CMND curve around the true period to locate the interpolation bias. */
import { midiToHz, centsBetween } from '../www/js/audio/pitch.js';

const SR = 48000;
const MIDI = 45;
const f0 = midiToHz(MIDI);
const T = SR / f0; // 436.36 samples

function sine(seconds = 0.4) {
  const n = Math.floor(seconds * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = 0.4 * Math.sin((2 * Math.PI * f0 * i) / SR);
  return out;
}

function harms(seconds = 0.4) {
  const n = Math.floor(seconds * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    for (let h = 1; h <= 12; h++) {
      s += Math.pow(h, -1.15) * 0.3 * Math.sin(2 * Math.PI * f0 * h * t + h * 0.7);
    }
    out[i] = s;
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

function interp(d, tau) {
  const s0 = d[tau - 1];
  const s1 = d[tau];
  const s2 = d[tau + 1];
  const denom = 2 * (2 * s1 - s2 - s0);
  const shift = denom !== 0 ? (s2 - s0) / denom : 0;
  return tau + shift;
}

for (const [label, buf] of [
  ['pure sine', sine()],
  ['harmonic stack', harms()],
]) {
  const frame = buf.subarray(4096, 8192);
  const d = cmndCurve(frame, 1200);
  // find first local min under 0.15
  let est = -1;
  for (let tau = 34; tau <= 800; tau++) {
    if (d[tau] < 0.15) {
      while (tau + 1 <= 1200 && d[tau + 1] < d[tau]) tau++;
      est = tau;
      break;
    }
  }
  const sub = interp(d, est);
  console.log(`\n${label}: true T=${T.toFixed(3)}  integer local min at ${est}`);
  console.log('  raw minimum of d over [380,480]:', (() => {
    let b = Infinity;
    let bi = 0;
    for (let t = 380; t <= 480; t++) if (d[t] < b) { b = d[t]; bi = t; }
    return `${bi} (d=${b.toExponential(3)})`;
  })());
  console.log('  d(tau) near minimum:');
  for (let t = 432; t <= 442; t++) {
    console.log(`    tau=${t}  d=${d[t].toFixed(6)}  d(v-tau)=${(d[t] - d[est]).toFixed(7)}`);
  }
  console.log(`  parabolic -> tau=${sub.toFixed(3)}  hz=${(SR / sub).toFixed(3)}  cents=${centsBetween(SR / sub, f0).toFixed(2)}`);
  // alternative: minimise d over a wider integer search then use centroid around min
  let bi = 0;
  let b = Infinity;
  for (let t = 380; t <= 480; t++) if (d[t] < b) { b = d[t]; bi = t; }
  console.log(`  integer argmin -> tau=${bi} hz=${(SR / bi).toFixed(3)} cents=${centsBetween(SR / bi, f0).toFixed(2)}`);
}
