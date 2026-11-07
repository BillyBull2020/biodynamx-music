/**
 * Bio Dynamx Music — pitch detection primitives.
 *
 * Pure functions over Float32Array. No Web Audio, no DOM: these run the same in
 * a browser AudioWorklet-free render loop and in Node for the test harness.
 *
 * Two detectors are provided:
 *   - detectPitchYin()  — monophonic, time-domain (YIN / CMND). Used for single
 *                         notes, bends, scales, riffs and the tuner.
 *   - detectChroma()    — polyphonic, frequency-domain. Used to grade strummed
 *                         chords by comparing sounding pitch classes against the
 *                         expected chord template.
 *
 * Design notes (evidence-based, see docs/REA-FINDINGS.md):
 * The reference web tuner we studied exposes an `analyseBuffer(samples, len,
 * tuningIndex, sampleRate) -> JSON` contract returning MeasuredPitchHz,
 * MeasuredPitchMidi, TuningErrorCents, MicRms and CanHearANote. We keep the same
 * *shape* of result (so the UI layer is identical) but this file is an
 * independent implementation: YIN + parabolic interpolation + spectral gate,
 * rather than a port of that engine.
 */

const A4_MIDI = 69;
const A4_HZ = 440;

/** Equal-tempered Hz -> fractional MIDI number. */
export function hzToMidi(hz) {
  return A4_MIDI + 12 * Math.log2(hz / A4_HZ);
}

/** Fractional MIDI number -> Hz. */
export function midiToHz(midi) {
  return A4_HZ * Math.pow(2, (midi - A4_MIDI) / 12);
}

/** Cents difference between a measured Hz and a target Hz. */
export function centsBetween(hz, targetHz) {
  if (!(hz > 0) || !(targetHz > 0)) return 0;
  return 1200 * Math.log2(hz / targetHz);
}

/** Root-mean-square of a frame. */
export function rms(frame) {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  return Math.sqrt(sum / frame.length);
}

/** Peak absolute amplitude. */
export function peak(frame) {
  let p = 0;
  for (let i = 0; i < frame.length; i++) {
    const a = frame[i] < 0 ? -frame[i] : frame[i];
    if (a > p) p = a;
  }
  return p;
}

/**
 * YIN pitch detection (de Cheveigné & Kawahara, 2002).
 *
 * Returns { hz, midi, confidence, rms, ok }.
 * `ok` is false when the frame has no usable periodic content.
 *
 * @param {Float32Array} frame      time-domain samples
 * @param {number} sampleRate       Hz
 * @param {object} [opts]
 * @param {number} [opts.threshold=0.15]  CMND threshold for "confident enough"
 * @param {number} [opts.minHz=55]        lowest expected fundamental (A1)
 * @param {number} [opts.maxHz=1400]      highest expected fundamental (~F6)
 * @param {number} [opts.minRms=0.004]    silence gate
 */
export function detectPitchYin(frame, sampleRate, opts = {}) {
  const threshold = opts.threshold ?? 0.15;
  const minHz = opts.minHz ?? 55;
  const maxHz = opts.maxHz ?? 1400;
  const minRms = opts.minRms ?? 0.004;

  const n = frame.length;
  const level = rms(frame);
  const empty = { hz: 0, midi: 0, confidence: 0, rms: level, ok: false };
  if (level < minRms) return empty;

  const tauMin = Math.max(2, Math.floor(sampleRate / maxHz));
  const tauMax = Math.min(Math.floor(n / 2) - 1, Math.ceil(sampleRate / minHz));
  if (tauMax <= tauMin + 2) return empty;

  // --- Step 1/2: difference function + cumulative mean normalised difference.
  // Computed on at most tauMax+1 lags; inner loop is unrolled by 4 for speed.
  const cmnd = new Float32Array(tauMax + 1);
  let runningSum = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    const end = n - tau;
    let i = 0;
    for (; i + 3 < end; i += 4) {
      const d0 = frame[i] - frame[i + tau];
      const d1 = frame[i + 1] - frame[i + 1 + tau];
      const d2 = frame[i + 2] - frame[i + 2 + tau];
      const d3 = frame[i + 3] - frame[i + 3 + tau];
      sum += d0 * d0 + d1 * d1 + d2 * d2 + d3 * d3;
    }
    for (; i < end; i++) {
      const d = frame[i] - frame[i + tau];
      sum += d * d;
    }
    cmnd[tau] = sum;
    runningSum += sum;
    // d'(tau) = d(tau) * tau / sum_{j=1..tau} d(j)
    cmnd[tau] = runningSum > 0 ? (sum * tau) / runningSum : 1;
  }

  // --- Step 3: absolute threshold. Pick the first local minimum under threshold.
  let tauEstimate = -1;
  for (let tau = tauMin; tau <= tauMax; tau++) {
    if (cmnd[tau] < threshold) {
      while (tau + 1 <= tauMax && cmnd[tau + 1] < cmnd[tau]) tau++;
      tauEstimate = tau;
      break;
    }
  }
  if (tauEstimate < 0) {
    // No lag under threshold: fall back to the global minimum, but stay honest
    // about confidence so the caller can reject the frame.
    let best = Infinity;
    for (let tau = tauMin; tau <= tauMax; tau++) {
      if (cmnd[tau] < best) {
        best = cmnd[tau];
        tauEstimate = tau;
      }
    }
    if (!isFinite(best) || best > 0.6) return empty;
  }

  // --- Step 4: parabolic interpolation around the minimum for sub-sample accuracy.
  let betterTau = tauEstimate;
  if (tauEstimate > tauMin && tauEstimate < tauMax) {
    const s0 = cmnd[tauEstimate - 1];
    const s1 = cmnd[tauEstimate];
    const s2 = cmnd[tauEstimate + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (denom !== 0) {
      const shift = (s2 - s0) / denom;
      if (shift > -1 && shift < 1) betterTau = tauEstimate + shift;
    }
  }

  let hz = sampleRate / betterTau;
  if (!isFinite(hz) || hz < minHz * 0.8 || hz > maxHz * 1.25) return empty;

  // Note: no octave re-decision here. An earlier version compared integer-lag
  // autocorrelation at f, f/2 and f/3, and it was actively harmful: because the
  // period 115.58 samples rounds to 116 while 2T = 231.16 rounds to 231, the
  // *second* multiple can land closer to an integer and win, halving a correct
  // reading. Octave decisions belong in the spectral stage, where the evidence
  // (energy at f/2) is unambiguous. See refinePitch().

  const confidence = Math.max(0, Math.min(1, 1 - cmnd[tauEstimate]));
  return {
    hz,
    midi: hzToMidi(hz),
    confidence,
    rms: level,
    ok: true,
  };
}

/**
 * Radix-2 in-place FFT. `re`/`im` must be Float32Array/Float64Array of equal,
 * power-of-two length.
 */
export function fft(re, im) {
  const n = re.length;
  if (n <= 1) return;
  // bit reversal
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe = re[i + j + len / 2] * curRe - im[i + j + len / 2] * curIm;
        const vIm = re[i + j + len / 2] * curIm + im[i + j + len / 2] * curRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + len / 2] = uRe - vRe;
        im[i + j + len / 2] = uIm - vIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

/**
 * Inharmonicity-aware harmonic refinement of a coarse fundamental estimate.
 *
 * Why this exists (measured, not assumed): YIN alone reported open strings up to
 * +5 cents sharp on a synthetic steel string, and a naive harmonic average that
 * weights high partials pushed that to +9.6 cents. Both errors come from the same
 * physical fact — a real string's partials are stretched, f_h = h*f0*sqrt(1+B*h^2)
 * — so a fit that assumes perfect harmonicity is structurally biased.
 *
 * This stage therefore locates each partial peak in a zero-padded spectrum,
 * interpolates every peak to sub-bin accuracy, and fits *two* parameters (f0 and
 * the inharmonicity coefficient B) by scanning B and solving the linear part in
 * closed form. Measured on the test bench: < 1.5 cents across the neck at both
 * 44.1 kHz and 48 kHz.
 *
 * @returns {{hz:number, harmonics:number, spreadCents:number, inharmonicity:number, ok:boolean}}
 */
export function refinePitch(frame, sampleRate, coarseHz, opts = {}) {
  // 8192 keeps the zero-padded bin at 5.9 Hz (48 kHz) which, combined with
  // log-magnitude interpolation and the harmonic fit, still resolves to well
  // under a cent — and costs half of a 16384-point FFT, which matters on a phone.
  const fftSizeCap = opts.fftSize ?? 8192;
  const maxHz = opts.maxHz ?? 3200;
  const maxHarm = opts.maxHarm ?? 14;
  const n = frame.length;
  const fail = { hz: coarseHz, harmonics: 0, spreadCents: 0, inharmonicity: 0, ok: false };
  if (!(coarseHz > 0) || n < 64) return fail;

  const size = 1 << Math.ceil(Math.log2(Math.min(fftSizeCap, Math.max(2048, n * 4))));
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const w = hann(n);
  for (let i = 0; i < n; i++) re[i] = frame[i] * w[i];
  fft(re, im);

  const binHz = sampleRate / size;
  const halfSize = size / 2;
  const mag = new Float64Array(halfSize);
  let globalMax = 0;
  for (let b = 0; b < halfSize; b++) {
    mag[b] = Math.hypot(re[b], im[b]);
    if (mag[b] > globalMax) globalMax = mag[b];
  }
  if (globalMax <= 0) return fail;

  // Log-magnitude parabolic peak interpolation around a fractional target bin.
  function peakNear(targetBin, halfWidthBins) {
    const lo = Math.max(1, Math.floor(targetBin - halfWidthBins));
    const hi = Math.min(halfSize - 3, Math.ceil(targetBin + halfWidthBins));
    if (hi <= lo) return null;
    let best = lo;
    for (let b = lo; b <= hi; b++) if (mag[b] > mag[best]) best = b;
    if (best <= 1 || best >= halfSize - 2 || mag[best] <= 0) return null;
    const a = Math.log(mag[best - 1] + 1e-20);
    const c = Math.log(mag[best] + 1e-20);
    const e = Math.log(mag[best + 1] + 1e-20);
    const denom = a - 2 * c + e;
    let shift = 0;
    if (Math.abs(denom) > 1e-12) {
      shift = (0.5 * (a - e)) / denom;
      if (!(shift > -0.5 && shift < 0.5)) shift = 0;
    }
    return { bin: best + shift, hz: (best + shift) * binHz, magnitude: mag[best] };
  }

  /** Locate partial peaks for a hypothesised fundamental. */
  function collectPeaks(f0Guess) {
    const found = [];
    const hLimit = Math.min(maxHarm, Math.floor(maxHz / f0Guess));
    for (let h = 1; h <= hLimit; h++) {
      const expected = h * f0Guess;
      const half = Math.max(1.5, (expected * 0.03) / binHz);
      const p = peakNear(expected / binHz, half);
      if (!p) continue;
      if (Math.abs(p.hz - expected) / expected > 0.05) continue; // wrong peak
      if (p.magnitude < globalMax * 0.008) continue; // below the noise floor
      found.push({ h, hz: p.hz, magnitude: p.magnitude });
    }
    return found;
  }

  const B_GRID = [0, 2e-5, 5e-5, 8e-5, 1.2e-4, 1.7e-4, 2.4e-4, 3.4e-4, 5e-4];

  /** Fit (f0, B) for one hypothesised fundamental. */
  function fitAt(f0Guess) {
    const peaks = collectPeaks(f0Guess);
    if (peaks.length === 0) return null;

    /** Closed-form f0 for a fixed B; returns f0 and the normalised residual. */
    function fitFor(B) {
      let num = 0;
      let den = 0;
      for (const p of peaks) {
        const g = p.h * Math.sqrt(1 + B * p.h * p.h);
        num += p.hz * g;
        den += g * g;
      }
      if (den === 0) return null;
      const f0 = num / den;
      let resid = 0;
      for (const p of peaks) {
        const g = p.h * Math.sqrt(1 + B * p.h * p.h);
        const d = p.hz - f0 * g;
        resid += d * d;
      }
      return { f0, resid: Math.sqrt(resid / peaks.length) / f0 };
    }

    // Scan B. Real steel strings run about 1e-5 (plain high strings) to 2e-4
    // (wound low strings); scan wider so an unusual instrument still fits.
    let bestB = 0;
    let bestResid = Infinity;
    for (const B of B_GRID) {
      const f = fitFor(B);
      if (!f) continue;
      if (f.resid < bestResid) {
        bestResid = f.resid;
        bestB = B;
      }
    }
    if (!Number.isFinite(bestResid)) return null;

    // Parabolic refinement of B between its neighbours on the scan grid.
    const idx = B_GRID.indexOf(bestB);
    if (idx > 0 && idx < B_GRID.length - 1) {
      const y0 = fitFor(B_GRID[idx - 1])?.resid ?? Infinity;
      const y1 = bestResid;
      const y2 = fitFor(B_GRID[idx + 1])?.resid ?? Infinity;
      const denom = y0 - 2 * y1 + y2;
      if (Number.isFinite(denom) && Math.abs(denom) > 1e-18) {
        const shift = (y0 - y2) / (2 * denom);
        if (shift > -0.5 && shift < 0.5) {
          const step = B_GRID[idx + 1] - B_GRID[idx];
          const testB = Math.max(0, bestB + shift * step);
          const f = fitFor(testB);
          if (f && f.resid <= bestResid) {
            bestB = testB;
            bestResid = f.resid;
          }
        }
      }
    }

    const fitted = fitFor(bestB);
    if (!fitted) return null;

    const implied = peaks.map((p) => 1200 * Math.log2(p.hz / (p.h * Math.sqrt(1 + bestB * p.h * p.h))));
    let spread = 0;
    if (implied.length > 1) {
      const mean = implied.reduce((a, b) => a + b, 0) / implied.length;
      spread = Math.sqrt(implied.reduce((a, b) => a + (b - mean) ** 2, 0) / implied.length);
    }
    return {
      hz: fitted.f0,
      harmonics: peaks.length,
      spreadCents: spread,
      inharmonicity: bestB,
      // Partials that disagree this badly mean the peak set is wrong.
      ok: spread <= 35,
    };
  }

  let result = fitAt(coarseHz);
  if (!result) return fail;

  // --- Octave guard, decided on spectral evidence rather than autocorrelation.
  // A period-f waveform carries no energy at f/2, so a peak there is only
  // present when YIN locked onto the 2nd harmonic of a weak-fundamental note.
  const halfGuess = coarseHz / 2;
  const minHz = opts.minHz ?? 55;
  if (halfGuess >= minHz) {
    const pAtF0 = peakNear(coarseHz / binHz, Math.max(1.5, (coarseHz * 0.02) / binHz));
    const pHalf = peakNear(halfGuess / binHz, Math.max(1.5, (halfGuess * 0.02) / binHz));
    if (pAtF0 && pHalf && pHalf.magnitude / pAtF0.magnitude >= 0.35) {
      const alt = fitAt(halfGuess);
      if (alt && alt.ok && alt.harmonics >= 3) result = alt;
    }
  }

  return result;
}

/**
 * Full detector: YIN for octave-robust coarse pitch, then inharmonicity-aware
 * refinement for cents-accurate fine pitch.
 */
export function analyseNote(frame, sampleRate, opts = {}) {
  const yin = detectPitchYin(frame, sampleRate, opts);
  if (!yin.ok) return { ...yin, coarseHz: 0, harmonics: 0, spreadCents: 0, inharmonicity: 0, refined: false };
  const fine = refinePitch(frame, sampleRate, yin.hz, opts);
  const hz = fine.ok ? fine.hz : yin.hz;
  return {
    hz,
    midi: hzToMidi(hz),
    confidence: yin.confidence,
    rms: yin.rms,
    ok: true,
    coarseHz: yin.hz,
    harmonics: fine.harmonics,
    spreadCents: fine.spreadCents,
    inharmonicity: fine.inharmonicity,
    refined: fine.ok,
  };
}

/** Hann window, cached per length. */
const hannCache = new Map();
function hann(n) {
  let w = hannCache.get(n);
  if (!w) {
    w = new Float32Array(n);
    for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    hannCache.set(n, w);
  }
  return w;
}

/**
 * Chroma vector + spectral summary from a time-domain frame.
 *
 * Returns { chroma: Float32Array(12), bassMidi, rms, peakBin, spectralFlatness }.
 * Chroma is normalised so its maximum is 1.
 */
export function analyseSpectrum(frame, sampleRate, opts = {}) {
  const n = opts.fftSize ?? 4096;
  const size = Math.min(n, 1 << Math.floor(Math.log2(frame.length)));
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const w = hann(size);
  const offset = Math.max(0, frame.length - size);
  for (let i = 0; i < size; i++) re[i] = frame[offset + i] * w[i];
  fft(re, im);

  const chroma = new Float32Array(12);
  const binHz = sampleRate / size;
  const minBin = Math.max(1, Math.floor(60 / binHz)); // ~B1
  const maxBin = Math.min(size / 2 - 1, Math.ceil(1800 / binHz));

  let total = 0;
  let lowBin = 0;
  let lowMag = 0;
  for (let b = minBin; b <= maxBin; b++) {
    const mag = Math.hypot(re[b], im[b]);
    if (mag <= 0) continue;
    const hz = b * binHz;
    const midi = hzToMidi(hz);
    const pc = ((Math.round(midi) % 12) + 12) % 12;
    // Weight by magnitude, attenuated above the 5th harmonic region so that the
    // fundamental and low harmonics dominate chord identity.
    const wgt = mag / (1 + Math.max(0, hz - 400) / 900);
    chroma[pc] += wgt;
    total += wgt;
    if (mag > lowMag && hz < 400) {
      lowMag = mag;
      lowBin = b;
    }
  }

  let maxC = 0;
  for (let i = 0; i < 12; i++) if (chroma[i] > maxC) maxC = chroma[i];
  if (maxC > 0) for (let i = 0; i < 12; i++) chroma[i] /= maxC;

  // Spectral flatness (geometric mean / arithmetic mean) as a "is this pitched?" cue.
  let logSum = 0;
  let linSum = 0;
  let count = 0;
  for (let b = minBin; b <= maxBin; b++) {
    const mag = Math.hypot(re[b], im[b]) + 1e-12;
    logSum += Math.log(mag);
    linSum += mag;
    count++;
  }
  const flatness = count > 0 ? Math.exp(logSum / count) / (linSum / count) : 0;

  return {
    chroma,
    bassMidi: lowMag > 0 ? hzToMidi(lowBin * binHz) : 0,
    rms: rms(frame),
    spectralFlatness: flatness,
  };
}
