/**
 * Numerical acceptance test for www/js/audio/pitch.js
 *
 * Synthesises plucked-string tones (harmonic stack with string inharmonicity,
 * per-harmonic decay, attack transient) at both 44.1 kHz and 48 kHz — the two
 * rates real phones and laptops use — and checks:
 *   - the octave is correct
 *   - cents error is inside the tolerance we grade and tune with
 *   - silence and noise alone are rejected
 *   - chord chroma ranks the chord tones first
 *
 * Run: node tools/pitch-test.mjs
 */
import {
  detectPitchYin,
  refinePitch,
  analyseNote,
  analyseSpectrum,
  midiToHz,
  centsBetween,
} from '../www/js/audio/pitch.js';

const MINOR = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Plucked string. B is the inharmonicity coefficient: real steel strings sit in
 * roughly 2e-5 (high strings) to 1.5e-4 (wound low strings).
 */
function guitarTone(
  midi,
  { seconds = 0.4, sr = 48000, gain = 0.35, noise = 0.0015, seed = 1, detuneCents = 0, B = 8e-5 } = {},
) {
  const rand = mulberry32(seed);
  const f0 = midiToHz(midi) * Math.pow(2, detuneCents / 1200);
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

let pass = 0;
let fail = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) pass++;
  else {
    fail++;
    failures.push(`${name}: ${detail}`);
  }
}

const N = 4096;

for (const SR of [48000, 44100]) {
  const winMs = ((N / SR) * 1000).toFixed(1);
  console.log(`\n${'='.repeat(76)}\nSample rate ${SR} Hz — ${N}-sample window = ${winMs} ms`);
  console.log('Open strings, window starting 70 ms into the note:');
  console.log('  note  midi        hz  coarseC    fineC   harm  spread   conf');

  const OPEN = [40, 45, 50, 55, 59, 64];
  const NAMES = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
  let worstFine = 0;
  let worstNote = '';

  for (let k = 0; k < OPEN.length; k++) {
    const m = OPEN[k];
    const tone = guitarTone(m, { sr: SR, seed: m });
    const start = Math.floor(0.07 * SR);
    const frame = tone.subarray(start, start + N);
    const coarse = detectPitchYin(frame, SR);
    const note = analyseNote(frame, SR);
    const coarseC = centsBetween(coarse.hz, midiToHz(m));
    const fineC = centsBetween(note.hz, midiToHz(m));
    console.log(
      `  ${NAMES[k].padEnd(4)} ${String(m).padStart(4)} ${note.hz.toFixed(2).padStart(9)} ` +
        `${coarseC.toFixed(2).padStart(8)} ${fineC.toFixed(2).padStart(8)} ${String(note.harmonics).padStart(5)} ` +
        `${note.spreadCents.toFixed(1).padStart(6)}  ${note.confidence.toFixed(2)}`,
    );
    check(`sr${SR} open ${m} octave`, Math.abs(note.midi - m) < 0.6, `midi=${note.midi.toFixed(2)}`);
    check(`sr${SR} open ${m} fine cents`, Math.abs(fineC) < 2.0, `cents=${fineC.toFixed(2)}`);
    if (Math.abs(fineC) > Math.abs(worstFine)) {
      worstFine = fineC;
      worstNote = NAMES[k];
    }
  }
  console.log(`  worst refined error: ${worstFine.toFixed(2)} cents (${worstNote})`);
  check(`sr${SR} worst open string`, Math.abs(worstFine) < 2.0, `${worstFine.toFixed(2)}c`);

  // ---------------------------------------------------------- fretted notes
  let worstFret = 0;
  let worstFretNote = 0;
  for (let m = 40; m <= 79; m++) {
    const tone = guitarTone(m, { sr: SR, seed: m * 7 + 1 });
    const start = Math.floor(0.06 * SR);
    const frame = tone.subarray(start, start + N);
    const note = analyseNote(frame, SR);
    const c = note.ok ? centsBetween(note.hz, midiToHz(m)) : NaN;
    const midiErr = note.ok ? note.midi - m : NaN;
    if (!note.ok || Math.abs(midiErr) >= 0.6) {
      check(`sr${SR} fret ${m} octave`, false, `ok=${note.ok} midiErr=${midiErr?.toFixed(2)}`);
      continue;
    }
    check(`sr${SR} fret ${m} cents`, Math.abs(c) < 4.0, `cents=${c.toFixed(1)}`);
    if (Math.abs(c) > Math.abs(worstFret)) {
      worstFret = c;
      worstFretNote = m;
    }
  }
  console.log(`  fretted 40..79 (40 notes): worst refined error ${worstFret.toFixed(2)} cents at MIDI ${worstFretNote}`);
  check(`sr${SR} worst fretted`, Math.abs(worstFret) < 4.0, `${worstFret.toFixed(2)}c`);

  // ------------------------------------------------------------- detuning
  const detuneRows = [];
  for (const cents of [-40, -20, -8, 0, 8, 20, 40]) {
    const tone = guitarTone(57, { sr: SR, detuneCents: cents, seed: 21, B: 5e-5 });
    const frame = tone.subarray(Math.floor(0.06 * SR), Math.floor(0.06 * SR) + N);
    const note = analyseNote(frame, SR);
    const measured = centsBetween(note.hz, midiToHz(57));
    detuneRows.push(`${cents}c->${measured.toFixed(1)}c`);
    check(`sr${SR} detune ${cents}`, Math.abs(measured - cents) < 3.0, `measured=${measured.toFixed(1)}`);
  }
  console.log(`  detune accuracy: ${detuneRows.join('  ')}`);

  // -------------------------------------------------------------- rejection
  check(`sr${SR} silence`, !analyseNote(new Float32Array(N), SR).ok, 'accepted silence');
  const rand = mulberry32(SR);
  const white = new Float32Array(N);
  for (let i = 0; i < N; i++) white[i] = (rand() * 2 - 1) * 0.08;
  const wn = analyseNote(white, SR);
  console.log(`  white noise -> ok=${wn.ok} conf=${wn.confidence.toFixed(2)}`);
  check(`sr${SR} noise`, !wn.ok, 'accepted noise');

  // --------------------------------------------------------------- chroma
  const CHORDS = [
    { name: 'Em', midis: [40, 47, 52, 55, 59, 64], pcs: [4, 7, 11] },
    { name: 'G', midis: [43, 47, 50, 55, 59, 67], pcs: [7, 11, 2] },
    { name: 'C', midis: [48, 52, 55, 60, 64], pcs: [0, 4, 7] },
    { name: 'D', midis: [50, 57, 62, 66], pcs: [2, 6, 9] },
    { name: 'Am', midis: [45, 52, 57, 60, 64], pcs: [9, 0, 4] },
    { name: 'F', midis: [41, 48, 53, 57, 60, 65], pcs: [5, 9, 0] },
  ];
  console.log('  chord chroma (chord tones should rank first):');
  for (const c of CHORDS) {
    const n = 8192;
    const mix = new Float32Array(n);
    c.midis.forEach((m, idx) => {
      const t = guitarTone(m, { seconds: n / SR + 0.05, sr: SR, gain: 0.16, seed: 31 + idx });
      for (let i = 0; i < n; i++) mix[i] += t[i];
    });
    const spec = analyseSpectrum(mix, SR);
    const ranked = [...spec.chroma.keys()].sort((a, b) => spec.chroma[b] - spec.chroma[a]);
    const top4 = ranked.slice(0, 4);
    const hits = c.pcs.filter((pc) => top4.includes(pc)).length;
    console.log(
      `    ${c.name.padEnd(3)} ${top4.map((pc) => `${MINOR[pc]}:${(spec.chroma[pc] * 100).toFixed(0)}`).join(' ')}  ` +
        `-> ${hits}/${c.pcs.length} chord tones in top 4`,
    );
    check(`sr${SR} chroma ${c.name}`, hits >= 2, `only ${hits}`);
  }
}

// --------------------------------------------------------------- performance
const SR = 48000;
const perfFrame = guitarTone(52).subarray(0, N);
const ITER = 150;
const t0 = performance.now();
for (let i = 0; i < ITER; i++) analyseNote(perfFrame, SR);
const fullMs = (performance.now() - t0) / ITER;
const t1 = performance.now();
for (let i = 0; i < ITER; i++) analyseSpectrum(perfFrame, SR);
const specMs = (performance.now() - t1) / ITER;
console.log(`\nPerformance per full detection: ${fullMs.toFixed(3)} ms (16.6 ms budget at 60 fps)`);
console.log(`Performance per chroma frame:   ${specMs.toFixed(3)} ms`);
check('fast enough for 60 fps', fullMs < 8, `${fullMs.toFixed(2)} ms`);

console.log(`\n${'='.repeat(76)}\nPASS ${pass}   FAIL ${fail}`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures.slice(0, 40)) console.log('  -', f);
  process.exitCode = 1;
}
