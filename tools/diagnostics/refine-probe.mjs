/** Isolate refinePitch on a note where YIN is correct. */
import { detectPitchYin, refinePitch, analyseNote, midiToHz, centsBetween, hzToMidi } from '../www/js/audio/pitch.js';

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

const SR = 48000;
const N = 4096;
for (const m of [59, 64, 68, 72, 77]) {
  const tone = guitarTone(m, { sr: SR, seed: m });
  const frame = tone.subarray(Math.floor(0.07 * SR), Math.floor(0.07 * SR) + N);
  const yin = detectPitchYin(frame, SR);
  const fine = refinePitch(frame, SR, midiToHz(m)); // feed the TRUE f0 to isolate the fitter
  const note = analyseNote(frame, SR);
  console.log(
    `MIDI ${m}: yin=${yin.hz.toFixed(2)} (${hzToMidi(yin.hz).toFixed(2)})  ` +
      `refine(true f0)=${fine.hz.toFixed(2)} harm=${fine.harmonics} B=${fine.inharmonicity.toExponential(1)} ` +
      `ok=${fine.ok}  analyseNote=${note.hz.toFixed(2)} (${hzToMidi(note.hz).toFixed(2)})`,
  );
}
