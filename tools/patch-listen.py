"""Item screen: Listen before you play. Home: one-tap access on iOS."""
import io

# ---------------------------------------------------------------- item screen
P = r"www/js/ui/screens/library.js"
s = io.open(P, encoding="utf-8").read()

if "toggleListen" not in s:
    old_imp = "import { itemProgress, customSong, removeCustomSong } from '../../util/storage.js';"
    assert s.count(old_imp) == 1
    s = s.replace(
        old_imp,
        old_imp
        + "\nimport { appContext, configureAudioSession } from '../../audio/engine.js';"
        + "\nimport { Band } from '../../audio/band.js';",
    )

    anchor = "  const facts = el('div.result__grid', { style: { maxWidth: 'none', marginBottom: '4px' } }, ["
    assert s.count(anchor) == 1, "facts anchor"
    s = s.replace(
        anchor,
        """  // Hear it before you try it: one tap, whole arrangement, no chart reading.
  let band = null;
  let playing = null;
  const listenBtn = el('button.btn.btn--block', { type: 'button' }, [icon('speaker', 16), el('span', { text: 'Listen' })]);
  listenBtn.addEventListener('click', async () => {
    if (playing) {
      playing.stop();
      playing = null;
      listenBtn.lastChild.textContent = 'Listen';
      return;
    }
    try {
      configureAudioSession();
      const ctx = await appContext();
      if (!band) band = new Band(ctx);
      band.setVolume(0.5);
      const handle = band.playSequence(
        t.events.map((e) => ({ beat: e.beat, midis: e.midis, durBeats: e.durBeats })),
        t.bpm,
      );
      playing = handle;
      listenBtn.lastChild.textContent = 'Stop';
      setTimeout(() => {
        if (playing === handle) {
          handle.stop();
          playing = null;
          listenBtn.lastChild.textContent = 'Listen';
        }
      }, handle.duration * 1000 + 200);
    } catch {
      listenBtn.lastChild.textContent = 'Listen';
    }
  });

  const facts = el('div.result__grid', { style: { maxWidth: 'none', marginBottom: '4px' } }, [""",
    )

    anchor2 = """      el(
        'button.btn.btn--block',
        { type: 'button', onclick: () => navigate(`/play/${t.id}?mode=play`) },
        [icon('songs', 18), 'Play at full tempo for stars'],
      ),"""
    assert s.count(anchor2) == 1, "play button anchor"
    s = s.replace(anchor2, anchor2 + "\n      listenBtn,")

    io.open(P, "w", encoding="utf-8", newline="\n").write(s)
    print("library.js: Listen button on the item screen")

# ------------------------------------------------------------------- home hint
H = r"www/js/ui/screens/home.js"
h = io.open(H, encoding="utf-8").read()
if "iosHint" not in h:
    anchor3 = "  const node = el('div.fade-in', {}, ["
    assert h.count(anchor3) == 1, "home node anchor"
    h = h.replace(
        anchor3,
        """  // iOS gives no beforeinstallprompt, so tell the player once how to get the
  // app onto the home screen — that is the difference between "a website" and
  // "the app I open every day".
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const iosHint =
    isIOS && !standalone && !localStorage.getItem('bdm.iosHintDismissed')
      ? el('div.card', { style: { marginTop: '12px', borderColor: 'rgba(0,212,255,0.35)' } }, [
          el('div.hstack', {}, [
            el('b', { text: 'Put this on your home screen' }),
            el('span.spacer'),
            el('button', {
              type: 'button',
              text: '×',
              style: { color: 'var(--muted)', fontSize: '18px', lineHeight: '1' },
              onclick: (ev) => {
                localStorage.setItem('bdm.iosHintDismissed', '1');
                ev.currentTarget.closest('.card').remove();
              },
            }),
          ]),
          el('p.sub', {
            style: { marginTop: '6px', marginBottom: 0 },
            text: 'Tap Share, then "Add to Home Screen". It opens full screen like a real app and works with no signal.',
          }),
        ])
      : null;

  const node = el('div.fade-in', {}, [""",
    )

    anchor4 = "    el('div.card', { style: { marginTop: '12px' } }, [\n      el('div.hstack', {}, ["
    if anchor4 in h:
        h = h.replace(anchor4, "    iosHint,\n" + anchor4, 1)
    else:
        # fall back: insert right after the hero block
        anchor5 = "    el('div.section-head', {}, [el('h2', { text: 'Riff of the day' })"
        assert h.count(anchor5) == 1, "hero follow anchor"
        h = h.replace(anchor5, "    iosHint,\n\n" + anchor5)

    io.open(H, "w", encoding="utf-8", newline="\n").write(h)
    print("home.js: iOS install hint")

# ------------------------------------------------------------------ sw cache
W = r"www/sw.js"
w = io.open(W, encoding="utf-8").read()
io.open(W, "w", encoding="utf-8", newline="\n").write(w)
