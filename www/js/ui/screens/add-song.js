/**
 * "Add a song" — the answer to "I want hundreds of songs".
 *
 * You type a chord chart or paste a tab, it becomes a normal playable piece.
 * Stored in this browser only; nothing is uploaded and nothing ships in the repo.
 */

import { el, icon, toast } from '../../util/dom.js';
import { addCustomSong, customSongs, get } from '../../util/storage.js';
import { buildCustom, looksLikeTab, newCustomId, parseChordLine } from '../../content/custom.js';
import { backButton, pill, topbar } from '../components.js';

const CHORD_EXAMPLES = ['G C D Em', 'Am F C G', 'G:4 D:4 Em:2 C:2', 'E A B7 E'];

export function addSongScreen({ navigate, present }) {
  let format = 'chords';
  let bpm = 90;
  let beatsPerBar = 4;

  const title = el('input', {
    type: 'text',
    placeholder: 'Song name',
    style: inputStyle(),
  });

  const body = el('textarea', {
    rows: '6',
    placeholder: 'G C D Em',
    style: { ...inputStyle(), fontFamily: 'var(--mono)', minHeight: '130px', resize: 'vertical' },
    oninput: () => preview(),
  });

  const hint = el('p.tiny', { style: { marginTop: '8px' } });
  const previewEl = el('div.card', { style: { marginTop: '12px' } });

  function inputStyle() {
    return {
      width: '100%',
      padding: '13px 14px',
      borderRadius: '13px',
      border: '1px solid var(--line)',
      background: 'var(--card)',
      color: 'var(--white)',
      font: 'inherit',
      outline: 'none',
    };
  }

  function currentInput() {
    return {
      id: 'preview',
      title: title.value || 'Preview',
      body: body.value,
      format,
      bpm,
      beatsPerBar,
      level: 3,
    };
  }

  function preview() {
    const text = body.value.trim();
    if (!text) {
      hint.textContent = format === 'chords' ? 'Type chords, e.g. G C D Em' : 'Paste tablature from any tab site';
      previewEl.innerHTML = '';
      return;
    }

    if (format === 'chords') {
      const { chords, unknown } = parseChordLine(text, { beatsPerBar });
      previewEl.innerHTML = '';
      if (unknown.length) {
        previewEl.appendChild(
          el('p.sub', {
            text: `Not in the chord library: ${unknown.join(', ')}. Try a simpler spelling (Bb instead of A#, etc.).`,
            style: { color: 'var(--rose)', margin: 0 },
          }),
        );
        return;
      }
      hint.textContent = `${chords.length} chord${chords.length === 1 ? '' : 's'} — about ${Math.round((chords.reduce((n, c) => n + c.durBeats, 0) * 60) / bpm)}s at ${bpm} BPM`;
      previewEl.appendChild(
        el('div.hstack', { style: { flexWrap: 'wrap', gap: '6px' } }, chords.map((c) => pill(`${c.chord} · ${c.durBeats}`, 'cyan'))),
      );
    } else {
      const built = buildCustom({ ...currentInput(), body: text });
      previewEl.innerHTML = '';
      if (!built) {
        hint.textContent = 'Could not read that tab. Each line needs a string label and a |, e.g. e|--0--|';
        return;
      }
      hint.textContent = `${built.notes.length} notes parsed`;
      previewEl.appendChild(
        el('p.sub', { text: `First notes: ${built.notes.slice(0, 8).map((n) => n.fret ?? n.midi).join(' ')}`, style: { margin: 0 } }),
      );
    }
  }

  const fmtSeg = el('div.seg', {}, [
    el('button', { type: 'button', 'aria-pressed': 'true', text: 'Chords', onclick: (ev) => setFormat('chords', ev) }),
    el('button', { type: 'button', 'aria-pressed': 'false', text: 'Tab', onclick: (ev) => setFormat('tab', ev) }),
  ]);

  function setFormat(v, ev) {
    format = v;
    for (const b of fmtSeg.children) b.setAttribute('aria-pressed', String(b === ev.currentTarget));
    body.placeholder = v === 'chords' ? 'G C D Em' : 'e|--0--2--|\nB|--1--3--|\nG|--------|';
    preview();
  }

  const bpmSlider = el('input', {
    type: 'range',
    min: '40',
    max: '180',
    step: '2',
    value: String(bpm),
    oninput: (ev) => {
      bpm = Number(ev.target.value);
      bpmLabel.textContent = `${bpm} BPM`;
      preview();
    },
  });
  const bpmLabel = el('div.tiny', { text: `${bpm} BPM` });

  const examples = el('div.hstack', { style: { flexWrap: 'wrap', gap: '6px', marginTop: '8px' } });

  function paintExamples() {
    examples.innerHTML = '';
    if (format !== 'chords') return;
    for (const ex of CHORD_EXAMPLES) {
      examples.appendChild(
        el('button.btn.btn--sm', {
          type: 'button',
          text: ex,
          onclick: () => {
            body.value = ex;
            preview();
          },
        }),
      );
    }
  }

  function save(andPlay) {
    const text = body.value.trim();
    if (!text) {
      toast('Add some chords or tab first.', 'warn');
      return;
    }
    if (format === 'chords') {
      const { chords, unknown } = parseChordLine(text, { beatsPerBar });
      if (unknown.length) {
        toast(`Unknown chord: ${unknown[0]}`, 'warn');
        return;
      }
      if (!chords.length) {
        toast('No chords found in that line.', 'warn');
        return;
      }
    } else if (!buildCustom({ ...currentInput(), body: text })) {
      toast('That tab could not be read.', 'warn');
      return;
    }

    const song = {
      id: newCustomId(title.value || 'my song'),
      title: title.value.trim() || 'My song',
      body: text,
      format,
      bpm,
      beatsPerBar,
      level: 3,
      added: new Date().toISOString(),
    };
    addCustomSong(song);
    toast('Saved to your songs.', 'ok');
    navigate(andPlay ? `/play/${song.id}?mode=practice` : '/songs');
  }

  const existing = customSongs();

  const node = el('div.fade-in', {}, [
    el('div.card', { style: { marginBottom: '14px' } }, [
      el('div.hstack', {}, [icon('check', 18), el('b', { text: 'Your songs stay on this device' })]),
      el('p.sub', {
        style: { marginTop: '8px', marginBottom: 0 },
        text: 'Anything you add here is stored in this browser only. It is not uploaded and it is not in the repo — so any song you know the chords to becomes playable.',
      }),
    ]),

    el('div.vstack', { style: { gap: '10px' } }, [
      el('label.tiny', { text: 'NAME' }),
      title,
      fmtSeg,
      el('label.tiny', { text: format === 'chords' ? 'CHORDS' : 'TABLATURE', style: { marginTop: '6px' } }),
      body,
      hint,
      examples,
      el('div.hstack', {}, [el('b', { text: 'Tempo' }), el('span.spacer'), bpmLabel]),
      bpmSlider,
      previewEl,
    ]),

    el('div.vstack', { style: { gap: '8px', marginTop: '16px' } }, [
      el('button.btn.btn--primary.btn--lg.btn--block', { type: 'button', onclick: () => save(true) }, [
        icon('play', 18),
        'Save and practise',
      ]),
      el('button.btn.btn--block', { type: 'button', onclick: () => save(false) }, [icon('check', 16), 'Save only']),
    ]),

    existing.length
      ? el('div', { style: { marginTop: '20px' } }, [
          el('div.section-head', {}, [el('h2', { text: `Your songs (${existing.length})` })]),
          el(
            'div.vstack',
            { style: { gap: '8px' } },
            existing.map((c) =>
              el('button.row', { type: 'button', onclick: () => navigate(`/item/${c.id}`) }, [
                el('div.row__badge', { text: String(c.level || 3) }),
                el('div.row__main', {}, [
                  el('div.row__title', { text: c.title }),
                  el('div.row__meta', { text: `${c.bpm} BPM · ${c.format === 'tab' ? 'tab' : 'chords'}` }),
                ]),
                el('span', { style: { color: 'var(--muted-2)', display: 'flex' } }, [icon('next', 16)]),
              ]),
            ),
          ),
        ])
      : null,
  ]);

  paintExamples();
  preview();

  present({
    tab: '/songs',
    topbar: topbar({ title: 'Add a song', left: backButton(() => navigate('/songs')) }),
    node,
  });
}
