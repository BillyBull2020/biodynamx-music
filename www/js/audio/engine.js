/**
 * Microphone input.
 *
 * One AudioContext for the whole app (iOS only allows a few, and they must be
 * created or resumed from a user gesture). The engine exposes a rolling window
 * of the most recent samples as a Float32Array, which is exactly what
 * pitch.js expects — no copies in the analysis path.
 *
 * Capture uses a ScriptProcessorNode sized at 1024 frames. AudioWorklet would be
 * cleaner, but ScriptProcessor is supported on every iOS Safari that supports
 * getUserMedia at all, and the analysis happens on the main thread regardless.
 */

const WINDOW = 4096;

export class InputEngine {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    /** @type {MediaStream|null} */
    this.stream = null;
    this.node = null;
    this.source = null;
    this.buf = new Float32Array(WINDOW);
    this.ready = false;
    this.error = null;
    this.deviceId = '';
    this.permState = 'unknown';
    this._listeners = new Set();
    this._callbacksThisWindow = 0;
    /** Emit an analysis window every N process callbacks. */
    this.decimate = 2;
    this.range = null;
  }

  get sampleRate() {
    return this.ctx ? this.ctx.sampleRate : 48000;
  }

  get running() {
    return this.ready && !!this.stream;
  }

  /** Current input level 0..1, smoothed, for meters and "can you hear me" checks. */
  get level() {
    let sum = 0;
    for (let i = 0; i < this.buf.length; i += 4) sum += this.buf[i] * this.buf[i];
    return Math.min(1, Math.sqrt(sum / (this.buf.length / 4)) * 6);
  }

  static supported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /** Create or resume the shared AudioContext. Must follow a user gesture. */
  async context() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) throw new Error('This browser has no Web Audio support.');
      this.ctx = new Ctx({ latencyHint: 'interactive' });
    }
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        /* resume can reject if there was no gesture; the caller reports it */
      }
    }
    return this.ctx;
  }

  async listDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      return all.filter((d) => d.kind === 'audioinput');
    } catch {
      return [];
    }
  }

  /**
   * Ask for the microphone and start the analysis window.
   * @returns {Promise<boolean>} true when capture is running
   */
  async enable({ deviceId = '' } = {}) {
    if (!InputEngine.supported()) {
      this.error = 'This browser cannot access the microphone. Try Chrome or Safari, or serve the app over HTTPS.';
      return false;
    }
    const ctx = await this.context();
    this.stopStream();

    const constraints = {
      audio: {
        // Every processing stage that ships on by default destroys pitch accuracy.
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      },
      video: false,
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.permState = 'granted';
      this.error = null;
    } catch (err) {
      this.permState = err && err.name === 'NotAllowedError' ? 'denied' : 'error';
      this.error =
        err && err.name === 'NotAllowedError'
          ? 'Microphone permission was blocked. Allow it in your browser settings, then try again.'
          : err && err.name === 'NotFoundError'
            ? 'No microphone was found on this device.'
            : `Could not open the microphone (${(err && err.name) || 'unknown error'}).`;
      this.ready = false;
      return false;
    }

    this.deviceId = deviceId || this.stream.getAudioTracks()[0]?.getSettings?.().deviceId || '';
    this.source = ctx.createMediaStreamSource(this.stream);

    // Buffer 1024 -> the process callback runs about every 21 ms at 48 kHz.
    const node = ctx.createScriptProcessor ? ctx.createScriptProcessor(1024, 1, 1) : null;
    if (!node) {
      this.error = 'This browser cannot process audio input.';
      this.ready = false;
      return false;
    }
    this.node = node;
    this.buf.fill(0);
    this._callbacksThisWindow = 0;

    node.onaudioprocess = (ev) => {
      const input = ev.inputBuffer.getChannelData(0);
      // Slide the rolling window left by the callback size, then append.
      const n = input.length;
      if (n >= this.buf.length) {
        this.buf.set(input.subarray(input.length - this.buf.length));
      } else {
        this.buf.copyWithin(0, n);
        this.buf.set(input, this.buf.length - n);
      }
      this._callbacksThisWindow++;
      if (this._callbacksThisWindow < this.decimate) return;
      this._callbacksThisWindow = 0;
      for (const fn of this._listeners) {
        try {
          fn(this.buf, this.sampleRate, ctx.currentTime);
        } catch (err) {
          console.error('analysis listener failed', err);
        }
      }
    };

    // ScriptProcessor needs to be connected to a destination to be processed,
    // but we do not want to hear the microphone. A zero-gain node does that.
    const sink = ctx.createGain();
    sink.gain.value = 0;
    this.source.connect(node);
    node.connect(sink);
    sink.connect(ctx.destination);
    this._sink = sink;

    this.ready = true;
    return true;
  }

  /** Narrow the pitch search to the pitches a chart actually uses. */
  setRange(minHz, maxHz) {
    this.range = minHz && maxHz ? { minHz, maxHz } : null;
  }

  /** Subscribe to analysis windows. Returns an unsubscribe function. */
  listen(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  stopStream() {
    if (this.node) {
      try {
        this.node.disconnect();
      } catch {
        /* already disconnected */
      }
      this.node.onaudioprocess = null;
      this.node = null;
    }
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {
        /* already disconnected */
      }
      this.source = null;
    }
    if (this._sink) {
      try {
        this._sink.disconnect();
      } catch {
        /* already disconnected */
      }
      this._sink = null;
    }
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
    }
    this.ready = false;
    this.buf.fill(0);
  }

  async disable() {
    this.stopStream();
    this.permState = 'unknown';
  }
}

/**
 * Shared application audio context accessor. Anything that needs to make sound
 * (backing band, metronome, tuning reference tones) goes through here so the app
 * never ends up with two contexts fighting over the output device.
 */
let shared = null;

export function sharedInput() {
  if (!shared) shared = new InputEngine();
  return shared;
}

export async function appContext() {
  return sharedInput().context();
}

/** iOS: tell the OS this is a music session so the mute switch does not silence us. */
export function configureAudioSession() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch {
    /* not supported; harmless */
  }
}
