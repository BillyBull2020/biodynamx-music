/**
 * The gameplay screen: microphone gate, count-in, note highway, pause menu and
 * the results panel.
 *
 * This screen owns the Session lifecycle, so leaving the route always tears the
 * microphone and the backing band down.
 */

import { el, icon, toast, modal } from '../../util/dom.js';
import { get, itemProgress, recordRun, setSetting } from '../../util/storage.js';
import { getTrack, nextRecommendation } from '../../content/library.js';
import { Highway } from '../highway.js';
import { Session } from '../../game/session.js';
import { sharedInput, configureAudioSession } from '../../audio/engine.js';
import { Band } from '../../audio/band.js';
import { JUDGEMENT_LABEL } from '../../music/scoring.js';
import { backButton, pill, starsEl, topbar } from '../components.js';

export function practiceScreen({ params, query, navigate, present, shell }) {
  const track = getTrack(params.id);
  if (!track) {
    navigate('/songs', { replace: true });
    return;
  }
  const stored = get();
  const mode = query.mode === 'play' ? 'play' : 'practice';
  const startTempo = Math.max(0.25, Math.min(1.25, Number(query.tempo) || stored.settings.tempo || 1));
  const startWait = query.wait ? query.wait === '1' : stored.settings.waitToPlay !== false;

  const input = sharedInput();
  let session = null;
  let band = null;
  let highway = null;
  let raf = 0;
  let lastState = null;
  let destroyed = false;
  let tempo = startTempo;
  let waitToPlay = mode === 'practice' ? startWait : false;

  /* --------------------------------------------------------------- layout */

  const canvas = el('canvas.game__canvas');
  const callout = el('div.callout');
  const stage = el('div.game__stage', {}, [canvas, callout]);
  const comboEl = el('span.chip', { text: '3x' });
  const scoreEl = el('span.chip.chip--ghost', { text: '0' });
  const titleEl = el('div.game__title', {}, [
    el('b', { text: track.title }),
    el('span', { text: mode === 'play' ? 'Play mode' : 'Practice mode' }),
  ]);
  const hud = el('div.game__hud', {}, [
    el('button.icon-btn', { type: 'button', 'aria-label': 'Back', onclick: () => quit() }, [icon('back', 18)]),
    titleEl,
    comboEl,
    scoreEl,
    el('button.icon-btn', { type: 'button', 'aria-label': 'Pause', onclick: () => togglePause() }, [icon('pause', 18)]),
  ]);

  const footInfo = el('div', { style: { flex: '1', minWidth: '0' } }, [
    el('div.tiny', { text: `${Math.round(tempo * 100)}% speed · ${waitToPlay ? 'waits for you' : 'runs in time'}` }),
  ]);
  const foot = el('div.game__foot', {}, [
    el('button.btn.btn--sm', { type: 'button', onclick: () => changeTempo(-0.05), text: '–' }),
    footInfo,
    el('button.btn.btn--sm', { type: 'button', onclick: () => changeTempo(0.05), text: '+' }),
    el('button.btn.btn--sm', { type: 'button', onclick: () => toggleWait() }, [icon('loop', 14), 'Wait']),
    el('button.btn.btn--sm', { type: 'button', onclick: () => previewCurrent(), text: 'Hear it' }),
  ]);

  const game = el('div.game', {}, [hud, stage, foot]);

  /* ------------------------------------------------------------- mic gate */

  const gate = el('div', {
    style: {
      position: 'absolute',
      inset: '0',
      display: 'grid',
      placeContent: 'center',
      gap: '14px',
      padding: '24px',
      textAlign: 'center',
      background: 'rgba(4, 16, 32, 0.92)',
      zIndex: '5',
    },
  });
  function renderGate(message) {
    gate.innerHTML = '';
    gate.appendChild(el('div', {}, [
      el('div', { style: { display: 'grid', placeItems: 'center', marginBottom: '10px' } }, [icon('mic', 34)]),
      el('h2', { text: mode === 'play' ? 'Ready to play?' : 'Ready to practise?' }),
      el('p.sub', {
        text: message || 'Bio Dynamx listens through your microphone to hear which notes you play. Nothing is recorded or uploaded.',
        style: { maxWidth: '34ch', margin: '0 auto 14px' },
      }),
      el(
        'button.btn.btn--primary.btn--lg',
        {
          type: 'button',
          onclick: async (ev) => {
            ev.currentTarget.disabled = true;
            ev.currentTarget.textContent = 'Opening microphone…';
            const ok = await startRun();
            if (!ok) renderGate(input.error);
          },
        },
        [icon('mic', 18), 'Turn on microphone'],
      ),
      el('p.tiny', { style: { marginTop: '12px' }, text: 'Tip: sit close to the guitar and turn the app volume down.' }),
    ]));
    stage.appendChild(gate);
  }

  // The game owns the whole viewport: its own HUD replaces the app top bar and
  // the tab bar is hidden so nothing competes with the highway.
  present({ node: game, topbar: hud, fullScreen: true });
  renderGate();

  /* ------------------------------------------------------------- lifecycle */

  async function startRun() {
    try {
      configureAudioSession();
      const ok = await input.enable({ deviceId: stored.settings.inputDeviceId || '' });
      if (!ok) return false;
      if (!band) band = new Band(input.ctx);
      band.setVolume(stored.settings.musicVolume ?? 0.5);
      band.setBacking(stored.settings.backing !== false);
      band.setMetronome(!!stored.settings.metronome);

      gate.remove();
      session = new Session({
        track,
        input,
        band,
        settings: {
          ...stored.settings,
          mode,
          tempo,
          waitToPlay,
          autoSpeed: false,
        },
        hooks: {
          onJudge: (info) => {
            showCallout(info.judgement);
            highway?.pop(info.index, info.judgement);
          },
          onProgress: (st) => {
            lastState = st;
            comboEl.textContent = `${st.multiplier}x`;
            comboEl.style.color = st.combo >= 12 ? 'var(--lime)' : st.combo >= 4 ? 'var(--cyan)' : '';
            scoreEl.textContent = st.score.toLocaleString();
            if (st.combo > 1) showCombo(st.combo);
          },
          onCountIn: (n) => showCountIn(n),
          onFinish: (summary) => finish(summary),
        },
      });
      if (!highway) highway = new Highway(canvas);
      highway.setTrack(track);
      session.start();
      loop();
      return true;
    } catch (err) {
      console.error(err);
      toast(err.message || 'Could not start the run.', 'error', 4000);
      return false;
    }
  }

  function loop() {
    if (destroyed) return;
    if (session && highway) {
      const st = lastState;
      highway.render({
        playheadBeat: session.currentBeat(),
        states: session.states,
        judgements: session.judgements,
        holding: session.waitToPlay,
        level: session.lastLevel,
        pitch: session.lastPitch,
        nextIndex: st ? st.nextIndex : session.nextPendingIndex(),
      });
    }
    raf = requestAnimationFrame(loop);
  }

  function quit() {
    if (session && !session.finished) {
      session.destroy();
      session = null;
    }
    navigate(`/item/${track.id}`, { replace: true });
  }

  function changeTempo(delta) {
    tempo = Math.max(0.25, Math.min(1.25, Math.round((tempo + delta) * 100) / 100));
    setSetting('tempo', tempo);
    if (session && !session.finished) session.setTempo(tempo);
    footInfo.firstChild.textContent = `${Math.round(tempo * 100)}% speed · ${waitToPlay ? 'waits for you' : 'runs in time'}`;
  }

  function toggleWait() {
    if (mode === 'play') {
      toast('Wait mode is only available in Practice.', 'warn');
      return;
    }
    waitToPlay = !waitToPlay;
    setSetting('waitToPlay', waitToPlay);
    toast(waitToPlay ? 'The song will wait for you.' : 'Running in time.', '', 1500);
    footInfo.firstChild.textContent = `${Math.round(tempo * 100)}% speed · ${waitToPlay ? 'waits for you' : 'runs in time'}`;
    restart();
  }

  function previewCurrent() {
    if (!session || !band) return;
    session.previewNote();
  }

  function restart() {
    if (session) {
      session.destroy();
      session = null;
    }
    gate.remove();
    startRun();
  }

  async function togglePause() {
    if (!session || session.finished) return;
    if (session.paused) {
      session.resume();
      pauseOverlay.remove();
      return;
    }
    session.pause();
    const actions = [
      el('button.btn.btn--primary.btn--block', { type: 'button', onclick: () => togglePause(), text: 'Resume' }),
      el('button.btn.btn--block', { type: 'button', onclick: () => { pauseOverlay.remove(); restart(); }, text: 'Restart' }),
      el('button.btn.btn--block', {
        type: 'button',
        onclick: () => {
          pauseOverlay.remove();
          session.destroy();
          session = null;
          navigate(`/item/${track.id}`, { replace: true });
        },
        text: 'Quit to song',
      }),
    ];
    const slider = el('input', { type: 'range', min: '25', max: '125', step: '5', value: String(Math.round(tempo * 100)) });
    slider.addEventListener('input', () => changeTempo((Number(slider.value) / 100 - tempo)));
    pauseOverlay.innerHTML = '';
    pauseOverlay.appendChild(
      el('div', { style: { marginTop: 'auto', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '8px' } }, [
        el('h2', { text: 'Paused', style: { textAlign: 'center' } }),
        el('div.card', {}, [
          el('div.hstack', {}, [el('b', { text: 'Speed' }), el('span.spacer'), el('span.tiny', { text: `${Math.round(tempo * 100)}%` })]),
          slider,
          el('p.tiny', { text: 'Slowing the song down is the fastest way to learn a hard bar.' }),
        ]),
        ...actions,
      ]),
    );
    stage.appendChild(pauseOverlay);
  }

  const pauseOverlay = el('div', {
    style: {
      position: 'absolute',
      inset: '0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '22px',
      background: 'rgba(4, 16, 32, 0.94)',
      zIndex: '6',
    },
  });

  /* --------------------------------------------------------------- overlays */

  function showCallout(judgement) {
    callout.className = `callout callout--${judgement}`;
    callout.textContent = JUDGEMENT_LABEL[judgement] || judgement;
    // restart the CSS animation
    void callout.offsetWidth;
    callout.classList.add('show');
  }

  let comboTimer = 0;
  function showCombo(n) {
    if (n < 4) return;
    clearTimeout(comboTimer);
    callout.className = 'callout callout--great';
    callout.textContent = `${n} in a row`;
    void callout.offsetWidth;
    callout.classList.add('show');
  }

  function showCountIn(n) {
    callout.className = 'callout callout--great';
    callout.textContent = n > 0 ? String(n) : 'Go';
    void callout.offsetWidth;
    callout.classList.add('show');
  }

  /* ---------------------------------------------------------------- results */

  function finish(summary) {
    const wasNew = (itemProgress(track.id).bestScore || 0) < summary.score;
    recordRun({
      itemId: track.id,
      stars: summary.stars,
      score: summary.score,
      accuracy: summary.accuracy,
      combo: summary.maxCombo,
      notes: summary.judged,
      seconds: summary.seconds,
    });
    if (session) {
      session.destroy();
      session = null;
    }
    if (raf) cancelAnimationFrame(raf);
    shell(renderResult(summary, { wasNew }));
  }

  function renderResult(summary, { wasNew }) {
    const nextId = nextRecommendation(itemProgress);
    const node = el('div.result.fade-in', {}, [
      el('div.tiny', { text: mode === 'play' ? 'PLAY MODE' : 'PRACTICE', style: { letterSpacing: '0.2em' } }),
      el('h2', { text: track.title, style: { margin: '0 0 2px' } }),
      el('div.result__stars', {}, [0, 1, 2].map((i) => (i < summary.stars ? el('b', { text: '★' }) : el('i', { text: '★' })))),
      el('div.result__score', { text: summary.score.toLocaleString() }),
      wasNew ? pill('New best', 'lime') : pill(`best ${itemProgress(track.id).bestScore.toLocaleString()}`),
      el('div.result__grid', {}, [
        el('div.result__cell', {}, [el('b', { text: `${Math.round(summary.accuracy * 100)}%` }), el('span', { text: 'accuracy' })]),
        el('div.result__cell', {}, [el('b', { text: String(summary.maxCombo) }), el('span', { text: 'best combo' })]),
        el('div.result__cell', {}, [el('b', { text: String(summary.counts.perfect) }), el('span', { text: 'perfect' })]),
        el('div.result__cell', {}, [el('b', { text: String(summary.counts.miss) }), el('span', { text: 'missed' })]),
      ]),
      el('div.result__actions', {}, [
        el('button.btn.btn--primary.btn--block', {
          type: 'button',
          onclick: () => navigate(`/play/${track.id}?mode=${mode}&tempo=${tempo}`),
        }, [icon('refresh', 18), 'Play again']),
        summary.accuracy < 0.85
          ? el('button.btn.btn--block', {
              type: 'button',
              onclick: () => navigate(`/play/${track.id}?mode=practice&tempo=${Math.max(0.25, tempo - 0.1)}&wait=1`),
            }, [icon('loop', 18), 'Perfect it — slower, waits for you'])
          : null,
        el('button.btn.btn--ghost.btn--block', {
          type: 'button',
          onclick: () => navigate(`/play/${nextId}?mode=practice`),
        }, [icon('next', 18), 'Next: ' + (getTrack(nextId)?.title || 'next')]),
        el('button.btn.btn--ghost.btn--block', { type: 'button', onclick: () => navigate(`/item/${track.id}`), text: 'Done' }),
      ]),
    ]);
    return { tab: null, node, fullScreen: true };
  }

  /* ----------------------------------------------------------------- teardown */

  const onVisibility = () => {
    if (document.hidden && session && !session.paused && !session.finished) {
      session.pause();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    destroyed = true;
    document.removeEventListener('visibilitychange', onVisibility);
    if (raf) cancelAnimationFrame(raf);
    if (session) session.destroy();
    highway?.destroy();
    band?.stop();
    input.disable();
  };
}
