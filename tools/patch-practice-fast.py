"""Practice screen: skip the gate when the mic is already granted, and add Listen."""
import io

P = r"www/js/ui/screens/practice.js"
s = io.open(P, encoding="utf-8").read()

if "autoStartIfAllowed" in s:
    print("already patched")
    raise SystemExit(0)

# 1) auto-start: if the engine is already running, or the browser has already
#    granted the microphone, go straight into the run.
anchor = "  renderGate();"
assert s.count(anchor) == 1, "gate render anchor"
s = s.replace(
    anchor,
    """  /**
   * Skip the tap when we can. On desktop and Android the permission persists, so
   * opening a piece goes straight into the count-in; on iOS the first tap of a
   * session is unavoidable, so the gate is the fallback rather than the default.
   */
  async function autoStartIfAllowed() {
    if (input.running) {
      gate.remove();
      const ok = await startRun();
      if (!ok) renderGate(input.error);
      return;
    }
    const state = await input.permissionState();
    if (state !== 'granted') {
      renderGate();
      return;
    }
    gate.remove();
    const ok = await startRun();
    if (!ok) renderGate(input.error);
  }
  autoStartIfAllowed();""",
)

# 2) Listen: play the whole arrangement back before you try it
anchor2 = """    el('button.btn.btn--sm', { type: 'button', onclick: () => previewCurrent(), text: 'Hear it' }),"""
assert s.count(anchor2) == 1, "hear-it anchor"
s = s.replace(
    anchor2,
    """    el('button.btn.btn--sm', { type: 'button', onclick: () => toggleListen() }, [icon('speaker', 14), 'Listen']),""",
)

# 3) the listen implementation, placed before the pause overlay definition
anchor3 = "  const pauseOverlay = el('div', {"
assert s.count(anchor3) == 1, "pause overlay anchor"
s = s.replace(
    anchor3,
    """  let listenHandle = null;

  /**
   * Hear the piece before playing it. This is the difference between guessing
   * and knowing what you are aiming for, so it is one tap away at all times.
   */
  function toggleListen() {
    if (listenHandle) {
      listenHandle.stop();
      listenHandle = null;
      toast('Stopped.', '', 900);
      return;
    }
    if (!band || !input.ctx) {
      toast('Tap Start practising first, then Listen.', 'warn');
      return;
    }
    if (session && !session.paused && !session.finished) session.pause();
    const events = track.events.map((e) => ({ beat: e.beat, midis: e.midis, durBeats: e.durBeats }));
    const tempoNow = tempo;
    listenHandle = band.playSequence(events, track.bpm * tempoNow);
    toast(`Playing ${track.title} at ${Math.round(tempoNow * 100)}%…`, '', 1800);
    setTimeout(() => {
      if (listenHandle) {
        listenHandle.stop();
        listenHandle = null;
      }
    }, listenHandle.duration * 1000 + 200);
  }

  const pauseOverlay = el('div', {""",
)

# stop playback on teardown
anchor4 = "  return () => {\n    destroyed = true;"
assert s.count(anchor4) == 1, "teardown anchor"
s = s.replace(
    anchor4,
    "  return () => {\n    destroyed = true;\n    if (listenHandle) listenHandle.stop();",
)

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("practice.js: auto-start + Listen")
