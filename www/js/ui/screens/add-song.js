/**
 * "Add songs" — one at a time, or a whole list at once.
 *
 * You type a chord chart or paste a tab, it becomes a normal playable piece.
 * Stored in this browser only; nothing is uploaded and nothing ships in the repo.
 *
 * Bulk mode takes one song per line:
 *
 *   Wonderwall | Em7 G Dsus4 A7sus4
 *   Knockin'   | G D Am | G D C
 *   My riff    | G:8 D:8 | Em:4 C:4
 *
 * That is the fastest honest way to get hundreds of songs you want into one
 * place: your place.
 */

import { el, icon, toast } from '../../util/dom.js';
import { addCustomSong, customSongs } from '../../util/storage.js';
import { buildCustom, newCustomId, parseChordLine } from '../../content/custom.js';
import { backButton, pill, topbar } from '../components.js';

const CHORD_EXAMPLES = ['G C D Em', 'Am F C G', 'G:4 D:4 Em:2 C:2', 'E A B7 E'];

const BULK_EXAMPLE = `Wonderwall | Em7 G Dsus4 A7sus4
Knockin' on Heaven's Door | G D Am | G D C
Sweet Home Alabama | D C G | D C G
Three Little Birds | A D A E A`;

export function addSongScreen({ navigate, present }) {
  let format = 'chords';
  let bpm = 90;
  let beatsPerBar = 4;

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

  const title = el('input', { type: 'text', placeholder: 'Song name', style: inputStyle() });

  const body = el('textarea', {
    rows: '6',
    placeholder: 'G C D Em',
    style: { ...inputStyle(), fontFamily: 'var(--mono)', minHeight: '130px', resize: 'vertical' },
    oninput: () => preview(),
  });

  const hint = el('p.tiny', { style: { marginTop: '8px' } });
  const previewEl = el('div.card', { style: { marginTop: '12px' } });
  const titleRow = el('div.vstack', { style: { gap: '6px' } }, [el('label.tiny', { text: 'NAME' }), title]);
  const bodyLabel = el('label.tiny', { text: 'CHORDS', style: { marginTop: '6px' } });

  /** Parse one bulk line: "Title | chords". */
  function parseBulkLine(line) {
    const idx = line.indexOf('|');
    if (idx < 0) return null;
    const songTitle = line.slice(0, idx).trim();
    const chart = line.slice(idx + 1).replace(/\|/g, ' ').trim();
    if (!songTitle || !chart) return null;
    const { chords, unknown } = parseChordLine(chart, { beatsPerBar });
    if (unknown.length || !chords.length) return { songTitle, error: unknown[0] || 'no chords' };
    return { songTitle, chords, body: chart };
  }

  function preview() {
    const text = body.value.trim();
    previewEl.innerHTML = '';
    if (!text) {
      hint.textContent =
        format === 'chords'
          ? 'Type chords, e.g. G C D Em'
          : format === 'tab'
            ? 'Paste tablature from any tab site'
            : 'One song per line: Title | chords';
      return;
    }

    if (format === 'bulk') {
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const ok = [];
      const bad = [];
      for (const line of lines) {
        const r = parseBulkLine(line);
        if (!r) bad.push(line.slice(0, 18));
        else if (r.error) bad.push(`${r.songTitle} (${r.error})`);
        else ok.push(r);
      }
      hint.textContent = `${ok.length} ready${bad.length ? `, ${bad.length} need fixing` : ''}`;
      previewEl.appendChild(
        el('div.vstack', { style: { gap: '6px' } }, [
          ...ok.slice(0, 8).map((r) => el('div.tiny', { text: `✓ ${r.songTitle} — ${r.chords.length} chords` })),
          ok.length > 8 ? el('div.tiny', { text: `…and ${ok.length - 8} more` }) : null,
          ...bad.slice(0, 5).map((b) => el('div.tiny', { text: `✗ ${b}`, style: { color: 'var(--rose)' } })),
        ]),
      );
      return;
    }

    if (format === 'chords') {
      const { chords, unknown } = parseChordLine(text, { beatsPerBar });
      if (unknown.length) {
        previewEl.appendChild(
          el('p.sub', {
            text: `Not in the chord library: ${unknown.join(', ')}. Try a simpler spelling.`,
            style: { color: 'var(--rose)', margin: 0 },
          }),
        );
        return;
      }
      const secs = Math.round((chords.reduce((n, c) => n + c.durBeats, 0) * 60) / bpm);
      hint.textContent = `${chords.length} chord${chords.length === 1 ? '' : 's'} — about ${secs}s at ${bpm} BPM`;
      previewEl.appendChild(
        el('div.hstack', { style: { flexWrap: 'wrap', gap: '6px' } }, chords.map((c) => pill(`${c.chord} · ${c.durBeats}`, 'cyan'))),
      );
      return;
    }

    const built = buildCustom({ id: 'preview', title: 'Preview', body: text, format, bpm, beatsPerBar });
    if (!built) {
      hint.textContent = 'Could not read that tab. Each line needs a string label and a |, e.g. e|--0--|';
      return;
    }
    hint.textContent = `${built.notes.length} notes parsed`;
    previewEl.appendChild(
      el('p.sub', { text: `First notes: ${built.notes.slice(0, 8).map((n) => n.fret ?? n.midi).join(' ')}`, style: { margin: 0 } }),
    );
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
    if (format === 'bulk') {
      examples.appendChild(
        el('button.btn.btn--sm', {
          type: 'button',
          text: 'Insert a sample list',
          onclick: () => {
            body.value = BULK_EXAMPLE;
            preview();
          },
        }),
      );
      return;
    }
    for (const ex of format === 'chords' ? CHORD_EXAMPLES : []) {
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

  const saveBtnLabel = el('span', { text: 'Save and practise' });
  const saveBtn = el(
    'button.btn.btn--primary.btn--lg.btn--block',
    { type: 'button', onclick: () => saveAll() },
    [icon('check', 18), saveBtnLabel],
  );

  const fmtSeg = el('div.seg', {}, [
    el('button', { type: 'button', 'aria-pressed': 'true', text: 'One song', onclick: (ev) => setFormat('chords', ev) }),
    el('button', { type: 'button', 'aria-pressed': 'false', text: 'Tab', onclick: (ev) => setFormat('tab', ev) }),
    el('button', { type: 'button', 'aria-pressed': 'false', text: 'Whole list', onclick: (ev) => setFormat('bulk', ev) }),
  ]);

  function setFormat(v, ev) {
    format = v;
    for (const b of fmtSeg.children) b.setAttribute('aria-pressed', String(b === ev.currentTarget));
    const bulk = v === 'bulk';
    titleRow.style.display = bulk ? 'none' : '';
    bodyLabel.textContent = bulk ? 'ONE SONG PER LINE — TITLE | CHORDS' : v === 'tab' ? 'TABLATURE' : 'CHORDS';
    body.placeholder = bulk ? BULK_EXAMPLE : v === 'chords' ? 'G C D Em' : 'e|--0--2--|\nB|--1--3--|\nG|--------|';
    body.style.minHeight = bulk ? '200px' : '130px';
    saveBtnLabel.textContent = bulk ? 'Add them all' : 'Save and practise';
    paintExamples();
    preview();
  }

  function saveAll() {
    const text = body.value.trim();
    if (!text) {
      toast('Add some chords or tab first.', 'warn');
      return 0;
    }

    if (format === 'bulk') {
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      let added = 0;
      let failed = 0;
      for (const line of lines) {
        const r = parseBulkLine(line);
        if (!r || r.error) {
          failed++;
          continue;
        }
        addCustomSong({
          id: newCustomId(r.songTitle),
          title: r.songTitle,
          body: r.body,
          format: 'chords',
          bpm,
          beatsPerBar,
          level: 3,
          added: new Date().toISOString(),
        });
        added++;
      }
      toast(`Added ${added} song${added === 1 ? '' : 's'}${failed ? `, skipped ${failed}` : ''}.`, added ? 'ok' : 'warn', 3600);
      if (added) navigate('/songs');
      return added;
    }

    if (format === 'chords') {
      const { chords, unknown } = parseChordLine(text, { beatsPerBar });
      if (unknown.length) {
        toast(`Unknown chord: ${unknown[0]}`, 'warn');
        return 0;
      }
      if (!chords.length) {
        toast('No chords found in that line.', 'warn');
        return 0;
      }
    } else if (!buildCustom({ id: 'x', title: 'x', body: text, format, bpm, beatsPerBar })) {
      toast('That tab could not be read.', 'warn');
      return 0;
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
    navigate(`/play/${song.id}?mode=practice`);
    return 1;
  }

  const existing = customSongs();

  const node = el('div.fade-in', {}, [
    el('div.card', { style: { marginBottom: '14px' } }, [
      el('div.hstack', {}, [icon('check', 18), el('b', { text: 'Your songs stay on this device' })]),
      el('p.sub', {
        style: { marginTop: '8px', marginBottom: 0 },
        text: 'Anything you add here is stored in this browser only. It is not uploaded and it is not in the repo — so any song you know the chords to becomes playable, and the list can be as long as you like.',
      }),
    ]),

    el('div.vstack', { style: { gap: '10px' } }, [
      fmtSeg,
      titleRow,
      bodyLabel,
      body,
      hint,
      examples,
      el('div.hstack', {}, [el('b', { text: 'Tempo' }), el('span.spacer'), bpmLabel]),
      bpmSlider,
      previewEl,
    ]),

    el('div.vstack', { style: { gap: '8px', marginTop: '16px' } }, [saveBtn]),

    existing.length
      ? el('div', { style: { marginTop: '20px' } }, [
          el('div.section-head', {}, [el('h2', { text: `Your songs (${existing.length})` })]),
          el(
            'div.vstack',
            { style: { gap: '8px' } },
            existing.slice(0, 12).map((c) =>
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
          existing.length > 12
            ? el('p.tiny', { style: { marginTop: '8px' }, text: `…and ${existing.length - 12} more, all in Songs → Mine.` })
            : null,
        ])
      : null,
  ]);

  paintExamples();
  preview();

  present({
    tab: '/songs',
    topbar: topbar({ title: 'Add songs', left: backButton(() => navigate('/songs')) }),
    node,
  });
}
