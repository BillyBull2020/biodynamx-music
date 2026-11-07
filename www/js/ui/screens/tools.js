/**
 * Tools: tuner, metronome, ear trainer and fretboard quiz. These all work
 * without a song and are the fastest way to get value in the first minute.
 */

import { el, icon, toast } from '../../util/dom.js';
import { get, setSetting } from '../../util/storage.js';
import { analyseNote, centsBetween, midiToHz } from '../../audio/pitch.js';
import { sharedInput, appContext, configureAudioSession } from '../../audio/engine.js';
import { Band } from '../../audio/band.js';
import { TUNINGS, midiToHz as _m, noteName, noteWithOctave, parseNote, pitchClass } from '../../music/theory.js';
import { backButton, pill, segmented, tile, topbar } from '../components.js';

const TUNING_ORDER = ['standard', 'dropD', 'halfStepDown', 'openG', 'openD', 'dadgad', 'fullStepDown', 'sevenString'];

/* ------------------------------------------------------------------- hub */

export function toolsScreen({ navigate, present }) {
  const node = el('div.fade-in', {}, [
    el('h1', { text: 'Tools' }),
    el('p.sub', { text: 'Everything here works on its own — no song, no setup.', style: { marginBottom: '18px' } }),
    el('div.tiles', {}, [
      tile({ title: 'Tuner', meta: 'Chromatic + 8 tunings', iconName: 'tuner', onClick: () => navigate('/tuner') }),
      tile({ title: 'Metronome', meta: '20–240 BPM', iconName: 'metronome', onClick: () => navigate('/metronome') }),
      tile({ title: 'Ear trainer', meta: 'Intervals by sound', iconName: 'ear', onClick: () => navigate('/ear') }),
      tile({ title: 'Fretboard quiz', meta: 'Name the note', iconName: 'fretboard', onClick: () => navigate('/fretboard') }),
      tile({ title: 'Scale check', meta: 'Play any scale', iconName: 'scale', onClick: () => navigate('/scale') }),
    ]),
    el('div.card', { style: { marginTop: '16px' } }, [
      el('div.hstack', {}, [icon('mic', 18), el('b', { text: 'Getting a good sound' })]),
      el('p.sub', { style: { marginTop: '8px' }, text: 'Sit close to the guitar, mute notifications, and turn the app volume down. Headphones help a lot. Electric guitars need an amp at about speaking volume.' }),
    ]),
  ]);
  present({ tab: '/tools', topbar: topbar({ brand: true }), node });
}

/* ----------------------------------------------------------------- tuner */

export function tunerScreen({ navigate, present }) {
  const settings = get().settings;
  let tuningId = TUNINGS[settings.tuning] ? settings.tuning : 'standard';
  let chromatic = false;
  let listening = false;
  let inTuneSince = 0;
  let tuned = new Set();
  let raf = 0;
  let lastNote = null;
  const input = sharedInput();

  const noteBig = el('div.tuner__note', {}, [el('span', { text: '–' })]);
  const gaugeCanvas = el('canvas', { class: 'tuner__gauge' });
  const readingEl = el('div.tiny', { text: 'Tap to start the microphone' });
  const stringHost = el('div.tuner__strings');
  const meterFill = el('i');
  const meter = el('div.meter', {}, [meterFill]);

  function paintStrings() {
    stringHost.innerHTML = '';
    const mids = TUNINGS[tuningId].midis;
    // Show high string first, like the instrument from above.
    [...mids.keys()].reverse().forEach((idx) => {
      const midi = mids[idx];
      const btn = el('button.string-btn', { type: 'button', onclick: () => playReference(midi) }, [
        el('b', { text: noteName(midi) }),
        el('span', { text: String(Math.floor(midi / 12) - 1) }),
      ]);
      btn.dataset.string = String(idx);
      stringHost.appendChild(btn);
    });
    syncStringStates();
  }

  function syncStringStates() {
    for (const btn of stringHost.children) {
      const idx = Number(btn.dataset.string);
      const midi = TUNINGS[tuningId].midis[idx];
      const isTarget = lastNote && Math.round(lastNote.midi) === midi;
      btn.dataset.target = String(!!isTarget);
      btn.dataset.tuned = String(tuned.has(midi));
    }
  }

  let band = null;
  async function playReference(midi) {
    try {
      const ctx = await appContext();
      if (!band) band = new Band(ctx);
      band.setVolume(get().settings.musicVolume ?? 0.5);
      band.referenceTone(midi, 2.2);
    } catch (err) {
      toast('Audio could not start. Tap the screen once and try again.', 'warn');
    }
  }

  function drawGauge(cents) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = gaugeCanvas.getBoundingClientRect();
    const w = Math.max(160, rect.width);
    const h = Math.max(60, rect.height);
    gaugeCanvas.width = w * dpr;
    gaugeCanvas.height = h * dpr;
    const ctx = gaugeCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const baseY = h - 14;
    const radius = Math.min(w * 0.42, h - 16);

    // Arc
    ctx.beginPath();
    ctx.arc(cx, baseY, radius, Math.PI, 0);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(120,170,220,0.22)';
    ctx.stroke();

    // Centre in-tune zone
    const zone = (5 / 50) * Math.PI;
    ctx.beginPath();
    ctx.arc(cx, baseY, radius, Math.PI * 1.5 - zone, Math.PI * 1.5 + zone);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(157,255,92,0.75)';
    ctx.stroke();

    // Ticks every 10 cents
    for (let c = -50; c <= 50; c += 10) {
      const a = Math.PI + ((c + 50) / 100) * Math.PI;
      const r1 = radius - 8;
      const r2 = radius - (c === 0 ? 16 : 12);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, baseY + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r2, baseY + Math.sin(a) * r2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(143,167,196,0.45)';
      ctx.stroke();
    }

    // Needle
    const clamped = Math.max(-50, Math.min(50, cents));
    const angle = Math.PI + ((clamped + 50) / 100) * Math.PI;
    const nx = cx + Math.cos(angle) * (radius - 4);
    const ny = baseY + Math.sin(angle) * (radius - 4);
    const good = Math.abs(clamped) <= 5;
    ctx.beginPath();
    ctx.moveTo(cx, baseY);
    ctx.lineTo(nx, ny);
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = good ? '#9dff5c' : Math.abs(clamped) <= 20 ? '#ffc44d' : '#ff5c74';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, baseY, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = good ? '#9dff5c' : '#00d4ff';
    ctx.fill();
  }

  function loop() {
    if (!listening) return;
    raf = requestAnimationFrame(loop);
    const note = lastNote;
    meterFill.style.width = `${Math.round(input.level * 100)}%`;
    if (!note || !note.ok) {
      noteBig.className = 'tuner__note';
      noteBig.innerHTML = '';
      noteBig.appendChild(el('span', { text: '–' }));
      readingEl.textContent = 'Listening… play a string';
      drawGauge(0);
      return;
    }
    const midi = Math.round(note.midi);
    const target = nearestTarget(note.midi);
    const cents = target ? centsBetween(note.hz, midiToHz(target)) : (note.midi - midi) * 100;
    const displayMidi = chromatic || !target ? midi : target;
    noteBig.className = `tuner__note ${Math.abs(cents) <= 5 ? 'in-tune' : ''}`;
    noteBig.innerHTML = '';
    noteBig.appendChild(el('span', { text: noteName(displayMidi) }));
    noteBig.appendChild(el('small', { text: String(Math.floor(displayMidi / 12) - 1) }));
    const sign = cents > 0 ? '+' : '';
    readingEl.textContent =
      Math.abs(cents) <= 5
        ? `In tune · ${note.hz.toFixed(1)} Hz`
        : `${cents > 0 ? 'Tune down' : 'Tune up'} ${sign}${Math.round(cents)}¢ · ${note.hz.toFixed(1)} Hz`;
    drawGauge(cents);

    if (Math.abs(cents) <= 5) {
      if (!inTuneSince) inTuneSince = performance.now();
      if (performance.now() - inTuneSince > 260 && target) {
        tuned.add(target);
        syncStringStates();
        inTuneSince = performance.now();
      }
    } else {
      inTuneSince = 0;
    }
    syncStringStates();
  }

  function nearestTarget(midi) {
    if (chromatic) return Math.round(midi);
    const mids = TUNINGS[tuningId].midis;
    let best = null;
    let bestDist = Infinity;
    for (const m of mids) {
      const d = Math.abs(midi - m);
      if (d < bestDist) {
        bestDist = d;
        best = m;
      }
    }
    return bestDist <= 3 ? best : Math.round(midi);
  }

  async function start() {
    configureAudioSession();
    const ok = await input.enable({ deviceId: get().settings.inputDeviceId || '' });
    if (!ok) {
      readingEl.textContent = input.error || 'Microphone unavailable';
      toast(input.error || 'Microphone unavailable', 'error', 4000);
      return;
    }
    input.setRange(midiToHz(33), 2400);
    listening = true;
    input.listen((buf, sr) => {
      lastNote = analyseNote(buf, sr, { minHz: 60, maxHz: 1400 });
    });
    loop();
  }

  paintStrings();
  requestAnimationFrame(() => drawGauge(0));

  const tuneSeg = segmented(
    TUNING_ORDER.map((id) => ({ label: TUNINGS[id].label, value: id })),
    tuningId,
    (v) => {
      tuningId = v;
      setSetting('tuning', v);
      tuned = new Set();
      lastNote = null;
      paintStrings();
    },
  );

  const node = el('div.fade-in.tuner', {}, [
    el('div.hstack', { style: { width: '100%' } }, [
      el('b', { text: TUNINGS[tuningId].short, style: { marginRight: 'auto' } }),
      el('button.btn.btn--sm', { type: 'button', onclick: () => { chromatic = !chromatic; toast(chromatic ? 'Chromatic mode' : 'String mode', '', 1200); } , text: 'Chromatic' }),
    ]),
    noteBig,
    gaugeCanvas,
    readingEl,
    meter,
    stringHost,
    el('div', { style: { width: '100%', marginTop: '10px' } }, [tuneSeg]),
    el('div.hstack', { style: { width: '100%', gap: '8px' } }, [
      el('button.btn.btn--primary.btn--block', { type: 'button', onclick: () => start() }, [icon('mic', 16), 'Start microphone']),
      el('button.btn.btn--ghost', { type: 'button', onclick: () => { band?.stop(); }, text: 'Stop tone' }),
    ]),
    el('p.tiny', { style: { textAlign: 'center' }, text: 'Tap a string name to hear its reference pitch.' }),
  ]);

  present({
    tab: '/tools',
    topbar: topbar({ title: 'Tuner', left: backButton(() => navigate('/tools')) }),
    node,
  });

  return () => {
    listening = false;
    if (raf) cancelAnimationFrame(raf);
    input.disable();
    band?.stop();
  };
}

/* -------------------------------------------------------------- metronome */

export function metronomeScreen({ navigate, present }) {
  let bpm = 90;
  let beatsPerBar = 4;
  let running = false;
  let band = null;

  const bpmEl = el('div', { text: String(bpm), style: { fontSize: '64px', fontWeight: '900', letterSpacing: '-0.03em' } });
  const dotHost = el('div.hstack', { style: { justifyContent: 'center', gap: '8px', margin: '10px 0' } });
  const slider = el('input', { type: 'range', min: '20', max: '240', step: '1', value: String(bpm) });

  function paintDots(active = -1) {
    dotHost.innerHTML = '';
    for (let i = 0; i < beatsPerBar; i++) {
      dotHost.appendChild(
        el('span', {
          style: {
            width: i === active ? '16px' : '11px',
            height: i === active ? '16px' : '11px',
            borderRadius: '50%',
            transition: 'all .08s ease',
            background: i === active ? (i === 0 ? 'var(--cyan)' : 'var(--lime)') : 'rgba(120,170,220,0.25)',
          },
        }),
      );
    }
  }
  paintDots();

  slider.addEventListener('input', () => {
    bpm = Number(slider.value);
    bpmEl.textContent = String(bpm);
    if (band) band.bpm = bpm;
    if (running) start(); // restart at the new tempo
  });

  async function start() {
    const ctx = await appContext();
    if (!band) band = new Band(ctx);
    band.setBacking(false);
    band.setMetronome(true);
    band.start({ bpm, beatsPerBar });
    running = true;
  }

  const toggle = el('button.btn.btn--primary.btn--lg.btn--block', {
    type: 'button',
    onclick: () => {
      if (running) {
        band?.stop();
        running = false;
        toggle.textContent = 'Start';
        paintDots();
      } else {
        start();
        toggle.textContent = 'Stop';
        let beat = 0;
        const iv = setInterval(() => {
          if (!running) {
            clearInterval(iv);
            return;
          }
          paintDots(beat % beatsPerBar);
          beat++;
        }, (60 / bpm) * 1000);
      }
    },
  }, [icon('metronome', 18), 'Start']);

  const node = el('div.fade-in', { style: { textAlign: 'center', paddingTop: '20px' } }, [
    bpmEl,
    el('div.tiny', { text: 'BPM' }),
    dotHost,
    slider,
    el('div', { style: { marginTop: '16px' } }, [
      segmented([{ label: '3/4', value: 3 }, { label: '4/4', value: 4 }, { label: '6/8', value: 6 }], beatsPerBar, (v) => {
        beatsPerBar = v;
        paintDots();
        if (running) start();
      }),
    ]),
    el('div', { style: { marginTop: '18px' } }, [toggle]),
  ]);

  present({
    tab: '/tools',
    topbar: topbar({ title: 'Metronome', left: backButton(() => navigate('/tools')) }),
    node,
  });

  return () => {
    running = false;
    band?.stop();
  };
}

/* ------------------------------------------------------------ ear trainer */

const INTERVALS = [
  { semis: 0, label: 'Same note' },
  { semis: 2, label: 'Major 2nd' },
  { semis: 3, label: 'Minor 3rd' },
  { semis: 4, label: 'Major 3rd' },
  { semis: 5, label: 'Perfect 4th' },
  { semis: 7, label: 'Perfect 5th' },
  { semis: 9, label: 'Major 6th' },
  { semis: 12, label: 'Octave' },
];

export function earScreen({ navigate, present }) {
  let band = null;
  let round = 0;
  let correct = 0;
  let current = null;
  let answered = false;

  const prompt = el('h2', { text: 'Tap Play to hear two notes.' });
  const feedback = el('p.sub', { text: '' });
  const scoreEl = el('div.tiny', { text: 'Round 0 · 0 correct' });

  async function ensureBand() {
    const ctx = await appContext();
    if (!band) band = new Band(ctx);
    band.setVolume(get().settings.musicVolume ?? 0.5);
    return band;
  }

  async function playRound() {
    answered = false;
    const b = await ensureBand();
    const root = 52 + Math.floor(Math.random() * 8);
    current = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
    b.referenceTone(root, 1.1);
    setTimeout(() => b.referenceTone(root + current.semis, 1.4), 1250);
    prompt.textContent = 'Which interval was that?';
    feedback.textContent = '';
    paintOptions();
  }

  const optionsHost = el('div.vstack', { style: { gap: '7px' } });
  function paintOptions() {
    optionsHost.innerHTML = '';
    for (const iv of INTERVALS) {
      optionsHost.appendChild(
        el('button.btn.btn--block', {
          type: 'button',
          text: iv.label,
          onclick: () => {
            if (!current || answered) return;
            answered = true;
            round++;
            const ok = iv.semis === current.semis;
            if (ok) correct++;
            feedback.textContent = ok ? `Correct — ${current.label}.` : `That was a ${current.label}.`;
            feedback.style.color = ok ? 'var(--lime)' : 'var(--rose)';
            scoreEl.textContent = `Round ${round} · ${correct} correct`;
            if (round < 10) setTimeout(playRound, 1100);
            else prompt.textContent = 'Nice. Start another round whenever you like.';
          },
        }),
      );
    }
  }
  paintOptions();

  const node = el('div.fade-in', {}, [
    el('div.card', { style: { marginBottom: '12px' } }, [scoreEl, prompt, feedback]),
    el('div.vstack', { style: { gap: '7px' } }, [
      el('button.btn.btn--primary.btn--block', { type: 'button', onclick: () => playRound() }, [icon('play', 16), 'Play interval']),
      optionsHost,
    ]),
  ]);

  present({
    tab: '/tools',
    topbar: topbar({ title: 'Ear trainer', left: backButton(() => navigate('/tools')) }),
    node,
  });

  return () => band?.stop();
}

/* --------------------------------------------------------- fretboard quiz */

export function fretboardScreen({ navigate, present }) {
  const strings = [64, 59, 55, 50, 45, 40]; // e B G D A E as open MIDI
  const names = ['e', 'B', 'G', 'D', 'A', 'E'];
  let correct = 0;
  let asked = 0;
  let answer = null;
  let answered = false;

  const prompt = el('h2', { text: 'Which note is this?' });
  const sub = el('p.sub', { text: '' });
  const scoreEl = el('div.tiny', { text: '0 / 0' });
  const optionsHost = el('div.vstack', { style: { gap: '7px' } });

  function next() {
    answered = false;
    const s = Math.floor(Math.random() * 6);
    const fret = 1 + Math.floor(Math.random() * 11);
    const midi = strings[s] + fret;
    answer = pitchClass(midi);
    prompt.textContent = `${names[s]} string, fret ${fret}`;
    sub.textContent = 'Name the note.';
    const pool = new Set([answer]);
    while (pool.size < 4) pool.add(Math.floor(Math.random() * 12));
    const options = [...pool].sort(() => Math.random() - 0.5);
    optionsHost.innerHTML = '';
    for (const pc of options) {
      optionsHost.appendChild(
        el('button.btn.btn--block', {
          type: 'button',
          text: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][pc],
          onclick: () => {
            if (answered) return;
            answered = true;
            asked++;
            const ok = pc === answer;
            if (ok) correct++;
            scoreEl.textContent = `${correct} / ${asked}`;
            sub.textContent = ok ? 'Correct.' : `It was ${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][answer]}.`;
            sub.style.color = ok ? 'var(--lime)' : 'var(--rose)';
            setTimeout(next, 700);
          },
        }),
      );
    }
  }
  next();

  const node = el('div.fade-in', {}, [
    el('div.card', { style: { marginBottom: '12px' } }, [scoreEl, prompt, sub]),
    optionsHost,
  ]);

  present({
    tab: '/tools',
    topbar: topbar({ title: 'Fretboard', left: backButton(() => navigate('/tools')) }),
    node,
  });
}

/* ------------------------------------------------------------- scale check */

export function scaleScreen({ navigate, present }) {
  let band = null;
  let listening = false;
  let raf = 0;
  let last = null;
  let hits = 0;
  const input = sharedInput();

  const ROOTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const SCALES = { pentatonicMinor: 'Minor pentatonic', major: 'Major', blues: 'Blues' };
  let root = 'A';
  let scale = 'pentatonicMinor';

  const readout = el('div', { style: { fontSize: '46px', fontWeight: '900', textAlign: 'center' } }, [el('span', { text: '–' })]);
  const status = el('p.sub', { text: 'Start the microphone and play the scale up and back.' });
  const counter = el('div.tiny', { text: '0 notes heard' });

  const SEMIS = { pentatonicMinor: [0, 3, 5, 7, 10], major: [0, 2, 4, 5, 7, 9, 11], blues: [0, 3, 5, 6, 7, 10] };
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function expectedSet() {
    const set = new Set();
    for (const i of SEMIS[scale]) set.add((PC[root] + i) % 12);
    return set;
  }

  async function start() {
    configureAudioSession();
    const ok = await input.enable({ deviceId: get().settings.inputDeviceId || '' });
    if (!ok) {
      status.textContent = input.error || 'Microphone unavailable';
      return;
    }
    input.setRange(60, 1200);
    listening = true;
    input.listen((buf, sr) => {
      last = analyseNote(buf, sr, { minHz: 60, maxHz: 1200 });
    });
    loop();
    status.textContent = 'Listening. Play the scale.';
  }

  function loop() {
    if (!listening) return;
    raf = requestAnimationFrame(loop);
    if (!last || !last.ok) return;
    const midi = Math.round(last.midi);
    readout.innerHTML = '';
    readout.appendChild(el('span', { text: noteName(midi) }));
    const inScale = expectedSet().has(pitchClass(midi));
    readout.style.color = inScale ? 'var(--lime)' : 'var(--rose)';
    if (inScale) {
      hits++;
      counter.textContent = `${hits} notes heard`;
    }
  }

  const node = el('div.fade-in', {}, [
    el('div.hstack', { style: { gap: '6px', justifyContent: 'center', flexWrap: 'wrap' } }, [
      ...ROOTS.map((r) =>
        el('button.btn.btn--sm', { type: 'button', text: r, onclick: (ev) => { root = r; for (const c of ev.currentTarget.parentElement.children) c.classList.remove('btn--primary'); ev.currentTarget.classList.add('btn--primary'); } }),
      ),
    ]),
    el('div', { style: { marginTop: '10px' } }, [
      segmented(Object.entries(SCALES).map(([v, label]) => ({ label, value: v })), scale, (v) => { scale = v; }),
    ]),
    el('div.card', { style: { marginTop: '14px' } }, [counter, readout, status]),
    el('button.btn.btn--primary.btn--block', { type: 'button', onclick: () => start(), style: { marginTop: '12px' } }, [icon('mic', 16), 'Start microphone']),
  ]);

  present({
    tab: '/tools',
    topbar: topbar({ title: 'Scale check', left: backButton(() => navigate('/tools')) }),
    node,
  });

  return () => {
    listening = false;
    if (raf) cancelAnimationFrame(raf);
    input.disable();
  };
}
