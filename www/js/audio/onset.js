/**
 * Onset (attack) detection for the drum trainer.
 *
 * Drums are not pitched in any useful way through a phone microphone, so the
 * drum mode grades *time*, not pitch: did you hit the pad when the pattern asked
 * for it? That needs a detector that fires on percussive attacks and stays quiet
 * on ringing strings, speech and room noise.
 *
 * Method: half-wave rectified spectral flux with an adaptive threshold.
 *   1. FFT the newest 1024 samples (21 ms at 48 kHz).
 *   2. flux = sum of positive increases in magnitude versus the previous frame,
 *      restricted to 40 Hz - 14 kHz so DC drift and hiss do not trigger.
 *   3. Smooth the flux with a 3-frame average, then compare against a running
 *      median of the last N frames scaled by a sensitivity factor.
 *   4. A refractory window stops one stick hit from firing twice.
 *
 * The detector also reports per-band energy, which lets the UI show whether it
 * heard the hit as a kick, a snare or a hat — useful feedback when playing a real
 * kit, but never used to grade (band attribution from one microphone is
 * unreliable and grading on it would feel arbitrary).
 *
 * No DOM, no Web Audio: this runs identically in Node for the test bench.
 */

const BANDS = [
  { id: 'kick', lo: 40, hi: 160 },
  { id: 'snare', lo: 160, hi: 2200 },
  { id: 'hat', lo: 4000, hi: 14000 },
];

export class OnsetDetector {
  /**
   * @param {object} [opts]
   * @param {number} [opts.fftSize=1024]     samples analysed per frame
   * @param {number} [opts.sensitivity=1.7]  higher = fewer false positives
   * @param {number} [opts.refractoryMs=90]  minimum gap between two onsets
   * @param {number} [opts.minFlux=0.0008]   absolute floor, rejects silence
   * @param {number} [opts.history=24]       frames used for the adaptive threshold
   * @param {number} [opts.energyRise=1.10]  the frame must also be this much louder
   *                                         than the last one — spectral flux alone
   *                                         fires on the slow leakage ripple of a
   *                                         ringing note, which is exactly what a
   *                                         player's guitar does between beats
   */
  constructor(opts = {}) {
    this.fftSize = opts.fftSize ?? 1024;
    this.sensitivity = opts.sensitivity ?? 1.7;
    this.refractoryMs = opts.refractoryMs ?? 90;
    this.minFlux = opts.minFlux ?? 0.0008;
    this.history = opts.history ?? 24;
    this.energyRise = opts.energyRise ?? 1.1;

    this.prevMag = null;
    this.prevRms = 0;
    this.fluxHistory = [];
    this.fluxSmooth = 0;
    this.lastOnsetTime = -1e9;
    this.frameIndex = 0;
    this.spectrum = null;
  }

  reset() {
    this.prevMag = null;
    this.prevRms = 0;
    this.fluxHistory = [];
    this.fluxSmooth = 0;
    this.lastOnsetTime = -1e9;
    this.frameIndex = 0;
  }

  /**
   * Feed the rolling input window.
   *
   * @param {Float32Array} frame     the engine's rolling window (>= fftSize)
   * @param {number} sampleRate
   * @param {number} now             current time in seconds (any monotonic clock)
   * @returns {{onset:boolean, strength:number, flux:number, band:string|null, bands:Record<string,number>}}
   */
  push(frame, sampleRate, now) {
    const n = this.fftSize;
    if (!frame || frame.length < n) {
      return { onset: false, strength: 0, flux: 0, band: null, bands: { kick: 0, snare: 0, hat: 0 } };
    }

    // Analyse the newest block, windowed.
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    const offset = frame.length - n;
    for (let i = 0; i < n; i++) {
      // Hann window, computed inline so a single FFT does not allocate a table.
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
      re[i] = frame[offset + i] * w;
    }
    fft(re, im);

    const half = n / 2;
    const binHz = sampleRate / n;
    const mag = new Float64Array(half);
    for (let b = 0; b < half; b++) mag[b] = Math.hypot(re[b], im[b]);

    // Band magnitude and band *flux*. The flux is what identifies which drum was
    // hit: a hat barely changes the kick band, a kick barely changes the hat band.
    // Absolute band energy does not work, because the room's noise floor sits
    // mostly in the low band and would label every hit a kick.
    const bands = { kick: 0, snare: 0, hat: 0 };
    const bandFlux = { kick: 0, snare: 0, hat: 0 };
    const bandBins = {};
    for (const band of BANDS) {
      const lo = Math.max(1, Math.floor(band.lo / binHz));
      const hi = Math.min(half - 1, Math.ceil(band.hi / binHz));
      bandBins[band.id] = { lo, hi };
      let sum = 0;
      for (let b = lo; b <= hi; b++) sum += mag[b];
      bands[band.id] = hi >= lo ? sum / (hi - lo + 1) : 0;
    }

    let flux = 0;
    if (this.prevMag) {
      const loBin = Math.max(1, Math.floor(40 / binHz));
      const hiBin = Math.min(half - 1, Math.ceil(14000 / binHz));
      for (let b = loBin; b <= hiBin; b++) {
        const d = mag[b] - this.prevMag[b];
        if (d > 0) flux += d;
      }
      // Normalise by spectrum size so the thresholds are sample-rate independent.
      flux /= hiBin - loBin + 1;

      for (const band of BANDS) {
        const { lo, hi } = bandBins[band.id];
        let acc = 0;
        for (let b = lo; b <= hi; b++) {
          const d = mag[b] - this.prevMag[b];
          if (d > 0) acc += d;
        }
        bandFlux[band.id] = acc;
      }
    }
    this.prevMag = mag;
    this.frameIndex++;

    // Frame energy, used as a second, independent gate.
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const s = frame[offset + i];
      sumSq += s * s;
    }
    const rms = Math.sqrt(sumSq / n);
    const prevRms = this.prevRms;
    this.prevRms = rms;

    this.fluxSmooth = this.fluxSmooth * 0.5 + flux * 0.5;
    this.fluxHistory.push(flux);
    if (this.fluxHistory.length > this.history) this.fluxHistory.shift();

    const sorted = [...this.fluxHistory].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] || 0;
    const threshold = Math.max(this.minFlux, median * this.sensitivity);

    const sinceLast = (now - this.lastOnsetTime) * 1000;
    // Both gates must agree: a rise in spectral content *and* a rise in loudness.
    // Requiring the energy rise is what keeps a ringing note (which leaks
    // unevenly from frame to frame as the window slides) from reading as a hit.
    const loudEnough = rms > prevRms * this.energyRise;
    const onset = this.fluxSmooth > threshold && loudEnough && sinceLast > this.refractoryMs;

    if (onset) this.lastOnsetTime = now;

    // Which drum it sounded like, from the band that gained the most energy.
    // Informational only: one microphone cannot reliably separate a kit, so the
    // judge never grades on this.
    let band = null;
    if (onset) {
      const best = BANDS.reduce((a, b) => (bandFlux[a.id] >= bandFlux[b.id] ? a : b), BANDS[0]);
      band = best.id;
    }

    return {
      onset,
      strength: Math.min(1, this.fluxSmooth / Math.max(threshold, 1e-9) / 3),
      flux,
      rms,
      band,
      bands,
      bandFlux,
    };
  }
}

/* --------------------------------------------------------------- FFT (local) */

/**
 * Radix-2 in-place FFT. Duplicated from pitch.js on purpose: this module is
 * imported by the game loop, and keeping it self-contained means the drum path
 * has no dependency on the pitch path (and can be tested alone).
 */
function fft(re, im) {
  const n = re.length;
  if (n <= 1) return;
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
