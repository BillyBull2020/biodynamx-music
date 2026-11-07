/**
 * Onset detection bench.
 *
 * Synthesises a drum pattern (kick = low sine thump, snare = band-passed noise,
 * hat = short high noise), streams it through the OnsetDetector exactly the way
 * the live engine does (rolling 4096-sample window every 21 ms), and checks:
 *   - every hit is detected
 *   - no duplicate detections from one hit
 *   - no detections in silence or in steady noise
 *   - timing error stays inside the "perfect" window
 *
 * Run: node tools/onset-test.mjs
 */
import { OnsetDetector } from '../www/js/audio/onset.js';

const SR = 48000;

let seed = 12345;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

function kick(t) {
  const env = Math.exp(-t * 22);
  return Math.sin(2 * Math.PI * (110 - 60 * Math.min(1, t * 20)) * t) * env * 0.9;
}
function snare(t) {
  const env = Math.exp(-t * 26);
  return (rand() * 2 - 1) * env * 0.55 + Math.sin(2 * Math.PI * 190 * t) * env * 0.25;
}
function hat(t) {
  const env = Math.exp(-t * 70);
  return (rand() * 2 - 1) * env * 0.25;
}

/** Render a pattern of {time, kind} hits into a continuous buffer. */
function render(hits, seconds, { bed = 0 } = {}) {
  const n = Math.floor(seconds * SR);
  const buf = new Float32Array(n);
  for (const h of hits) {
    const start = Math.floor(h.time * SR);
    for (let i = 0; i < SR * 0.4; i++) {
      const idx = start + i;
      if (idx >= n) break;
      const t = i / SR;
      const s = h.kind === 'kick' ? kick(t) : h.kind === 'snare' ? snare(t) : hat(t);
      buf[idx] += s * (h.gain ?? 1);
    }
  }
  if (bed) {
    for (let i = 0; i < n; i++) buf[i] += (rand() * 2 - 1) * bed;
  }
  return buf;
}

/** Stream the buffer through the detector the way the engine does. */
function detect(buf, { hopMs = 21, window = 4096, detectorOpts = {} } = {}) {
  const det = new OnsetDetector(detectorOpts);
  const hop = Math.floor((hopMs / 1000) * SR);
  const onsets = [];
  const rolling = new Float32Array(window);
  for (let pos = hop; pos <= buf.length; pos += hop) {
    // Slide the window and copy in the newest hop.
    rolling.copyWithin(0, hop);
    for (let i = 0; i < hop; i++) rolling[window - hop + i] = buf[pos - hop + i] || 0;
    const t = pos / SR;
    const r = det.push(rolling, SR, t);
    if (r.onset) onsets.push({ t, band: r.band });
  }
  return onsets;
}

let pass = 0;
let fail = 0;
const problems = [];
const check = (name, ok, detail) => {
  if (ok) pass++;
  else {
    fail++;
    problems.push(`${name}: ${detail}`);
  }
};

/* ------------------------------------------------------------ a rock beat */
// 100 BPM, one bar: kick 1 & 3, snare 2 & 4, hats on every eighth.
const BPM = 100;
const beat = 60 / BPM;
const hits = [];
// Hats on every eighth, so they land on the beats AND between them.
for (let i = 0; i < 8; i++) hits.push({ time: 1 + i * (beat / 2), kind: 'hat', gain: 0.5 });
for (const b of [0, 2]) hits.push({ time: 1 + b * beat, kind: 'kick' });
for (const b of [1, 3]) hits.push({ time: 1 + b * beat, kind: 'snare' });
hits.sort((a, b) => a.time - b.time);

const buf = render(hits, 1 + 4 * beat + 1, { bed: 0.0008 });
const detected = detect(buf);

// Simultaneous hits (a kick with a hat, say) produce one onset, so group the
// expectations by time and require one detection per distinct moment.
const moments = new Map();
for (const h of hits) {
  const key = h.time.toFixed(3);
  if (!moments.has(key)) moments.set(key, { time: h.time, kinds: [] });
  moments.get(key).kinds.push(h.kind);
}

console.log(`Pattern: ${hits.length} hits at ${moments.size} distinct moments over ${(4 * beat).toFixed(2)} s at ${BPM} BPM`);
console.log('expected -> detected');
let worst = 0;
for (const m of moments.values()) {
  let bestErr = Infinity;
  let bestT = null;
  let bestBand = null;
  for (const d of detected) {
    const err = Math.abs(d.t - m.time);
    if (err < bestErr) {
      bestErr = err;
      bestT = d.t;
      bestBand = d.band;
    }
  }
  const match = bestErr < 0.06;
  const label = m.kinds.join('+');
  console.log(
    `  ${m.time.toFixed(3)}s ${label.padEnd(10)} -> ${match ? `${bestT.toFixed(3)}s (${(bestErr * 1000).toFixed(0)} ms, ${bestBand})` : 'MISSED'}`,
  );
  check(`moment ${label} @${m.time.toFixed(2)}`, match, `err=${(bestErr * 1000).toFixed(0)} ms`);
  if (match) worst = Math.max(worst, bestErr);
}

console.log(`\nDetected ${detected.length} onsets for ${moments.size} distinct moments`);
check('no duplicate onsets', detected.length <= moments.size + 1, `${detected.length} vs ${moments.size}`);
check('worst timing error < 45 ms', worst < 0.045, `${(worst * 1000).toFixed(0)} ms`);
console.log(`Worst timing error: ${(worst * 1000).toFixed(0)} ms\n`);

/* --------------------------------------------------------- silence / noise */
const silence = new Float32Array(Math.floor(SR * 3));
const silentOnsets = detect(silence);
check('silence produces no onsets', silentOnsets.length === 0, `${silentOnsets.length} false positives`);

const noiseOnly = render([], 3, { bed: 0.01 });
const noiseOnsets = detect(noiseOnly);
console.log(`Steady noise floor: ${noiseOnsets.length} false onsets`);
check('steady noise produces no onsets', noiseOnsets.length === 0, `${noiseOnsets.length} false positives`);

/* -------------------------------------------------- ringing guitar (no hit) */
// A sustained, decaying chord must not read as a drum pattern.
const guitar = new Float32Array(Math.floor(SR * 3));
for (let i = 0; i < guitar.length; i++) {
  const t = i / SR;
  const env = Math.exp(-t * 0.8) * Math.min(1, t / 0.01);
  guitar[i] =
    env *
    0.3 *
    (Math.sin(2 * Math.PI * 196 * t) + 0.6 * Math.sin(2 * Math.PI * 247 * t) + 0.5 * Math.sin(2 * Math.PI * 294 * t));
}
const guitarOnsets = detect(guitar);
console.log(`Sustained guitar chord: ${guitarOnsets.length} onsets (only the initial pick is correct)`);
check('sustained chord does not buzz the detector', guitarOnsets.length <= 2, `${guitarOnsets.length} onsets`);

/* --------------------------------------------------------------- loudness */
for (const gain of [0.15, 0.35, 1.0]) {
  const quietHits = [
    { time: 1.0, kind: 'kick', gain },
    { time: 1.5, kind: 'snare', gain },
    { time: 2.0, kind: 'kick', gain },
    { time: 2.5, kind: 'snare', gain },
  ];
  const b = render(quietHits, 3.2, { bed: 0.0005 });
  const d = detect(b);
  const found = quietHits.filter((h) => d.some((x) => Math.abs(x.t - h.time) < 0.07)).length;
  console.log(`gain ${gain}: ${found}/${quietHits.length} hits detected`);
  check(`gain ${gain}`, found === quietHits.length, `${found}/${quietHits.length}`);
}

/* ------------------------------------------------------------ performance */
const perfBuf = render(hits, 4, { bed: 0.001 });
const t0 = performance.now();
detect(perfBuf);
const elapsed = performance.now() - t0;
const frames = Math.floor(perfBuf.length / Math.floor(0.021 * SR));
console.log(`\nPerformance: ${(elapsed / frames).toFixed(3)} ms per 21 ms frame (budget 16.6 ms)`);
check('fast enough', elapsed / frames < 4, `${(elapsed / frames).toFixed(2)} ms`);

console.log(`\n${'='.repeat(56)}\nPASS ${pass}   FAIL ${fail}`);
if (fail) {
  for (const p of problems.slice(0, 30)) console.log('  -', p);
  process.exitCode = 1;
}
