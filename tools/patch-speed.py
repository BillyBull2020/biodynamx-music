"""Speed + learning: auto-start, listen-to-it playback, quick count-in, iOS install hint."""
import io

# ============================================================ engine.js
E = r"www/js/audio/engine.js"
e = io.open(E, encoding="utf-8").read()

if "permissionState" not in e:
    anchor = """  async listDevices() {"""
    assert e.count(anchor) == 1
    e = e.replace(
        anchor,
        """  /** Has the browser already granted microphone access for this origin? */
  async permissionState() {
    try {
      if (!navigator.permissions?.query) return 'unknown';
      const status = await navigator.permissions.query({ name: 'microphone' });
      return status.state;
    } catch {
      return 'unknown';
    }
  }

  async listDevices() {""",
    )
    io.open(E, "w", encoding="utf-8", newline="\n").write(e)
    print("engine.js: permissionState()")

# ============================================================ band.js
B = r"www/js/audio/band.js"
b = io.open(B, encoding="utf-8").read()

if "playSequence" not in b:
    anchor2 = "  /**\n   * Play a reference pitch for tuning by ear."
    assert b.count(anchor2) == 1, "band anchor"
    b = b.replace(
        anchor2,
        """  /**
   * Play a whole arrangement back so the player can hear what they are aiming
   * for. This is the single most useful learning aid in the app: you should
   * never have to guess what a phrase is supposed to sound like.
   *
   * @param {Array<{beat:number, midis:number[], durBeats:number}>} events
   * @param {number} bpm
   * @returns {{stop:() => void, duration: number}}
   */
  playSequence(events, bpm) {
    const t0 = this.ctx.currentTime + 0.12;
    const spb = 60 / bpm;
    const bus = this.ctx.createGain();
    bus.gain.value = 0.9;
    bus.connect(this.out);

    let end = 0;
    for (const ev of events) {
      const at = t0 + ev.beat * spb;
      const dur = Math.max(0.12, ev.durBeats * spb * 0.92);
      end = Math.max(end, ev.beat * spb + dur);
      for (const midi of ev.midis) {
        const f = midiToHz(midi);
        const gain = this.ctx.createGain();
        gain.connect(bus);
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.16, at + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        for (const [mult, level] of [
          [1, 1],
          [2, 0.32],
          [3, 0.12],
        ]) {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = f * mult;
          g.gain.value = level;
          osc.connect(g).connect(gain);
          osc.start(at);
          osc.stop(at + dur + 0.05);
        }
      }
    }

    return {
      duration: end + 0.2,
      stop: () => {
        try {
          bus.gain.cancelScheduledValues(this.ctx.currentTime);
          bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
          setTimeout(() => bus.disconnect(), 400);
        } catch {
          /* already gone */
        }
      },
    };
  }

  /**
   * Play a reference pitch for tuning by ear.""",
    )
    io.open(B, "w", encoding="utf-8", newline="\n").write(b)
    print("band.js: playSequence()")

io.open(r"www/js/version.js", "w", encoding="utf-8", newline="\n").write(
    """/**
 * App version.
 *
 * Shown in the You tab and used by the update banner. Bump it whenever the app
 * changes and the service worker VERSION changes with it.
 */

export const APP_VERSION = '8';
export const APP_BUILD = '2026-11-08';

export const VERSION_LABEL = `v${APP_VERSION} \\u00b7 ${APP_BUILD}`;
"""
)
print("version.js -> v8")

W = r"www/sw.js"
w = io.open(W, encoding="utf-8").read()
w = w.replace("const VERSION = 'bdm-v6';", "const VERSION = 'bdm-v7';")
io.open(W, "w", encoding="utf-8", newline="\n").write(w)
print("sw.js -> bdm-v7")
