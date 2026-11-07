/**
 * You: progress, settings, latency calibration, and progress backup.
 */

import { el, icon, modal, toast } from '../../util/dom.js';
import {
  exportProgress,
  get,
  importProgress,
  itemProgress,
  resetAll,
  setSetting,
} from '../../util/storage.js';
import { pathItemIds, songs } from '../../content/library.js';
import { TOLERANCES } from '../../music/scoring.js';
import { TUNINGS } from '../../music/theory.js';
import { appContext, configureAudioSession, sharedInput } from '../../audio/engine.js';
import { Band } from '../../audio/band.js';
import { backButton, progressBar, segmented, starsEl, topbar } from '../components.js';
import { VERSION_LABEL } from '../../version.js';

export function youScreen({ navigate, present }) {
  const s = get();
  const totalStars = pathItemIds().reduce((n, id) => n + (itemProgress(id).stars || 0), 0);
  const maxStars = pathItemIds().length * 3;
  const played = Object.keys(s.items || {}).length;

  function settingRow({ title, sub, control }) {
    return el('div.setting', {}, [el('div.setting__main', {}, [el('b', { text: title }), sub ? el('span', { text: sub }) : null]), control]);
  }

  const node = el('div.fade-in', {}, [
    el('div.hero', { style: { padding: '18px' } }, [
      el('div.hero__glow'),
      el('div.tiny', { text: 'YOUR PLAYING', style: { letterSpacing: '0.2em' } }),
      el('h1', { text: `${s.streak.count || 0}-day streak` }),
      el('div.bigstat', {}, [
        el('div', {}, [el('b', { text: String(s.totals.notes || 0) }), el('span', { text: 'notes' })]),
        el('div', {}, [el('b', { text: `${Math.round((s.totals.seconds || 0) / 60)}m` }), el('span', { text: 'played' })]),
        el('div', {}, [el('b', { text: String(played) }), el('span', { text: 'pieces' })]),
      ]),
      el('div', { style: { marginTop: '14px' } }, [
        el('div.hstack', {}, [
          el('span.tiny', { text: `${totalStars}/${maxStars} path stars` }),
          el('span.spacer'),
          starsEl(Math.min(3, Math.floor((totalStars / Math.max(1, maxStars)) * 3)), { size: 12 }),
        ]),
        el('div', { style: { marginTop: '6px' } }, [progressBar(totalStars / Math.max(1, maxStars), { height: 6 })]),
      ]),
    ]),

    el('div.section-head', {}, [el('h2', { text: 'Practice' })]),
    settingRow({
      title: 'Difficulty',
      sub: 'How strict the timing and pitch windows are',
      control: segmented(
        Object.entries(TOLERANCES).map(([v, t]) => ({ label: t.label, value: v })),
        s.settings.tolerance,
        (v) => setSetting('tolerance', v),
      ),
    }),
    settingRow({
      title: 'Default mode',
      sub: 'Practice waits for you; Play runs at full tempo',
      control: segmented(
        [
          { label: 'Practice', value: 'practice' },
          { label: 'Play', value: 'play' },
        ],
        s.settings.mode,
        (v) => setSetting('mode', v),
      ),
    }),
    settingRow({
      title: 'Tuning',
      sub: 'Used by the tuner and the string labels',
      control: el(
        'select',
        {
          style: {
            background: 'var(--card)',
            color: 'var(--white)',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            padding: '9px 10px',
            font: 'inherit',
          },
          onchange: (ev) => setSetting('tuning', ev.target.value),
        },
        Object.entries(TUNINGS).map(([id, t]) => el('option', { value: id, text: t.label, selected: s.settings.tuning === id })),
      ),
    }),
    settingRow({
      title: 'Daily goal',
      sub: 'Just for the progress ring — nothing is locked',
      control: segmented([5, 10, 20, 30].map((m) => ({ label: `${m}m`, value: m })), s.dailyGoalMinutes, (v) => {
        const state = get();
        state.dailyGoalMinutes = v;
        setSetting('dailyGoalMinutes', v);
      }),
    }),

    el('div.section-head', {}, [el('h2', { text: 'Sound' })]),
    settingRow({
      title: 'Backing band',
      sub: 'Drums and bass synthesised live',
      control: toggle(s.settings.backing !== false, (v) => setSetting('backing', v)),
    }),
    settingRow({
      title: 'Metronome',
      sub: 'Click on every beat',
      control: toggle(!!s.settings.metronome, (v) => setSetting('metronome', v)),
    }),
    settingRow({
      title: 'Count-in',
      sub: 'One bar before the first note',
      control: toggle(s.settings.countIn !== false, (v) => setSetting('countIn', v)),
    }),
    settingRow({
      title: 'Volume',
      sub: 'Keep it low so the microphone hears the guitar, not the speakers',
      control: el('div', { style: { width: '120px' } }, [
        el('input', {
          type: 'range',
          min: '0',
          max: '100',
          value: String(Math.round((s.settings.musicVolume ?? 0.5) * 100)),
          oninput: (ev) => setSetting('musicVolume', Number(ev.target.value) / 100),
        }),
      ]),
    }),

    el('div.section-head', {}, [el('h2', { text: 'Timing' })]),
    settingRow({
      title: 'Latency calibration',
      sub: `Currently ${Math.round(s.settings.latencyMs || 0)} ms`,
      control: el('button.btn.btn--sm', { type: 'button', onclick: () => navigate('/calibrate'), text: 'Calibrate' }),
    }),

    el('div.section-head', {}, [el('h2', { text: 'Your data' })]),
    el('div.vstack', { style: { gap: '8px' } }, [
      el('button.btn.btn--block', { type: 'button', onclick: async () => { exportProgress(); toast('Progress file downloaded.', 'ok'); } }, [
        icon('check', 16),
        'Export progress',
      ]),
      el('label.btn.btn--block', { style: { cursor: 'pointer' } }, [
        icon('refresh', 16),
        'Import progress',
        el('input', {
          type: 'file',
          accept: 'application/json',
          style: { display: 'none' },
          onchange: async (ev) => {
            const file = ev.target.files?.[0];
            if (!file) return;
            try {
              await importProgress(file);
              toast('Progress restored.', 'ok');
              navigate('/you', { replace: true });
            } catch (err) {
              toast(err.message || 'That file could not be read.', 'error', 4200);
            }
          },
        }),
      ]),
      el('button.btn.btn--danger.btn--block', {
        type: 'button',
        onclick: async () => {
          const ok = await modal({
            title: 'Reset everything?',
            body: 'Stars, streaks and totals will be deleted from this device. This cannot be undone.',
            actions: [
              { label: 'Cancel', value: false },
              { label: 'Reset', value: true, variant: 'danger' },
            ],
          });
          if (ok) {
            resetAll();
            toast('Progress reset.', '', 2000);
            navigate('/home', { replace: true });
          }
        },
      }, 'Reset progress'),
    ]),

    el('p.tiny', {
      style: { textAlign: 'center', marginTop: '22px', lineHeight: '1.6' },
      text: 'Bio Dynamx Music · no account, no subscription, nothing leaves this device. All songs are public domain or written for this app.',
    }),
    el('div.center', { style: { marginTop: '12px' } }, [el('span.pill', { text: VERSION_LABEL })]),
    el('div.center', { style: { marginTop: '8px' } }, [
      el('button.btn.btn--sm.btn--ghost', {
        type: 'button',
        text: 'Check for updates',
        onclick: async () => {
          try {
            const reg = await navigator.serviceWorker?.getRegistration();
            if (!reg) {
              toast('Not installed as an app, so this copy always loads fresh.', '', 3400);
              return;
            }
            await reg.update();
            toast('Checked. If a newer version exists a Reload banner appears.', 'ok', 3600);
          } catch {
            toast('Could not check for updates.', 'warn');
          }
        },
      }),
    ]),
  ]);

  present({ tab: '/you', topbar: topbar({ brand: true }), node });
}

function toggle(value, onChange) {
  const knob = el('span', {
    style: {
      display: 'block',
      width: '22px',
      height: '22px',
      borderRadius: '50%',
      background: value ? 'var(--cyan)' : '#5b7089',
      transform: `translateX(${value ? 16 : 0}px)`,
      transition: 'transform .15s ease, background .15s ease',
    },
  });
  const track = el('span', {
    style: {
      display: 'inline-block',
      width: '42px',
      height: '26px',
      padding: '2px',
      borderRadius: '999px',
      background: value ? 'rgba(0,212,255,0.25)' : 'rgba(120,170,220,0.18)',
      border: '1px solid var(--line)',
      transition: 'background .15s ease',
    },
    'aria-checked': String(!!value),
    role: 'switch',
  }, [knob]);
  return el('button', {
    type: 'button',
    style: { padding: '0' },
    onclick: () => {
      const next = !knob.style.transform.includes('16px');
      knob.style.transform = `translateX(${next ? 16 : 0}px)`;
      knob.style.background = next ? 'var(--cyan)' : '#5b7089';
      track.style.background = next ? 'rgba(0,212,255,0.25)' : 'rgba(120,170,220,0.18)';
      track.setAttribute('aria-checked', String(next));
      onChange(next);
    },
  }, [track]);
}

/* ------------------------------------------------------------ calibration */

export function calibrateScreen({ navigate, present }) {
  const s = get();
  let band = null;
  let taps = [];
  let running = false;
  let clickStart = 0;
  let bpm = 80;

  const readout = el('div', { style: { fontSize: '44px', fontWeight: '900', textAlign: 'center' } }, [el('span', { text: `${Math.round(s.settings.latencyMs || 0)} ms` })]);
  const sub = el('p.sub', { text: 'Tap the button in time with the click. Eight taps is enough.' });
  const tapBtn = el('button.btn.btn--primary.btn--lg.btn--block', {
    type: 'button',
    onclick: async () => {
      if (!running) {
        await start();
        return;
      }
      const now = performance.now();
      const spb = 60000 / bpm;
      const sinceStart = now - clickStart;
      const nearest = Math.round(sinceStart / spb) * spb;
      const offset = sinceStart - nearest;
      // Ignore absurd taps (a mis-tap, or before the click started).
      if (Math.abs(offset) > spb * 0.5) return;
      taps.push(offset);
      if (taps.length >= 8) finish();
      else sub.textContent = `${taps.length}/8 taps…`;
    },
  }, [icon('metronome', 18), 'Start & tap']);

  async function start() {
    configureAudioSession();
    const ctx = await appContext();
    if (!band) band = new Band(ctx);
    band.setBacking(false);
    band.setMetronome(true);
    band.setVolume(0.6);
    band.start({ bpm, beatsPerBar: 4 });
    running = true;
    clickStart = performance.now();
    taps = [];
    tapBtn.textContent = 'Tap!';
    sub.textContent = '0/8 taps…';
  }

  function finish() {
    taps.sort((a, b) => a - b);
    const median = taps[Math.floor(taps.length / 2)];
    const value = Math.max(-150, Math.min(320, Math.round(median)));
    setSetting('latencyMs', value);
    readout.innerHTML = '';
    readout.appendChild(el('span', { text: `${value} ms` }));
    readout.style.color = 'var(--lime)';
    sub.textContent =
      value > 30
        ? 'You tap after the beat, which is normal. The app will shift its grading to match.'
        : 'Nearly perfect. The app will grade almost exactly on the beat.';
    band?.stop();
    running = false;
    tapBtn.textContent = 'Measure again';
  }

  const manual = el('input', {
    type: 'range',
    min: '-150',
    max: '320',
    step: '5',
    value: String(Math.round(s.settings.latencyMs || 0)),
    oninput: (ev) => {
      const v = Number(ev.target.value);
      setSetting('latencyMs', v);
      readout.innerHTML = '';
      readout.appendChild(el('span', { text: `${v} ms` }));
    },
  });

  const node = el('div.fade-in', {}, [
    el('div.card', {}, [readout, sub]),
    el('div', { style: { marginTop: '14px' } }, [tapBtn]),
    el('div.card', { style: { marginTop: '14px' } }, [
      el('div.hstack', {}, [el('b', { text: 'Fine tune by hand' }), el('span.spacer'), el('span.tiny', { text: 'ms' })]),
      manual,
      el('p.tiny', { text: 'Positive values mean your playing reaches the microphone late. Bluetooth headphones add a lot of delay — use wired ones if you can.' }),
    ]),
    el('button.btn.btn--ghost.btn--block', { type: 'button', onclick: () => navigate('/you'), style: { marginTop: '14px' }, text: 'Done' }),
  ]);

  present({
    tab: '/you',
    topbar: topbar({ title: 'Calibration', left: backButton(() => navigate('/you')) }),
    node,
  });

  return () => {
    running = false;
    band?.stop();
  };
}
