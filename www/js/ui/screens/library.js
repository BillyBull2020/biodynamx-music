/**
 * Songs list and the item detail screen (the one place that offers
 * Practice / Play before you commit).
 */

import { el, icon } from '../../util/dom.js';
import { itemProgress } from '../../util/storage.js';
import { allItems, getTrack } from '../../content/library.js';
import { backButton, pill, starsEl, topbar } from '../components.js';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'song', label: 'Songs' },
  { id: 'riff', label: 'Riffs' },
  { id: 'chord', label: 'Chords' },
  { id: 'drill', label: 'Drills' },
];

const KIND_LABEL = {
  song: 'Song',
  riff: 'Riff',
  chord: 'Chord workout',
  drill: 'Exercise',
  scale: 'Scale',
  pattern: 'Pattern',
};

export function songsScreen({ navigate, present }) {
  let filter = 'all';
  const listHost = el('div.vstack', { style: { gap: '8px' } });

  function paint() {
    const items = allItems()
      .filter((i) => filter === 'all' || i.kind === filter)
      .sort((a, b) => a.level - b.level || a.title.localeCompare(b.title));
    listHost.innerHTML = '';
    for (const spec of items) {
      const t = getTrack(spec.id);
      if (!t) continue;
      const prog = itemProgress(spec.id);
      listHost.appendChild(
        el('button.row', { type: 'button', onclick: () => navigate(`/item/${spec.id}`) }, [
          el('div.row__badge', { text: String(t.level) }),
          el('div.row__main', {}, [
            el('div.row__title', { text: t.title }),
            el('div.row__meta', {
              text: `${KIND_LABEL[t.kind] || t.kind} · ${t.bpm} BPM · ${Math.round(t.seconds)}s`,
            }),
          ]),
          prog.plays ? starsEl(prog.stars || 0) : null,
          el('span', { style: { color: 'var(--muted-2)', display: 'flex' } }, [icon('next', 16)]),
        ]),
      );
    }
    if (!listHost.children.length) listHost.appendChild(el('div.card', { text: 'Nothing here yet.' }));
  }

  const chips = FILTERS.map((f) =>
    el('button', {
      type: 'button',
      class: 'chip',
      'aria-pressed': String(f.id === filter),
      text: f.label,
      style: { cursor: 'pointer' },
      onclick: (ev) => {
        filter = f.id;
        for (const c of chips) c.setAttribute('aria-pressed', String(c === ev.currentTarget));
        paint();
      },
    }),
  );

  paint();

  const node = el('div.fade-in', {}, [
    el('h1', { text: 'Songs & riffs' }),
    el('p.sub', { text: 'Twelve public-domain and original pieces, plus the drills that build them.', style: { marginBottom: '14px' } }),
    el('div.hstack', { style: { overflowX: 'auto', paddingBottom: '12px', gap: '6px' } }, chips),
    listHost,
  ]);

  present({ tab: '/songs', topbar: topbar({ brand: true }), node });
}

export function itemScreen({ params, navigate, present }) {
  const t = getTrack(params.id);
  if (!t) {
    navigate('/songs', { replace: true });
    return;
  }
  const prog = itemProgress(params.id);

  const facts = el('div.result__grid', { style: { maxWidth: 'none', marginBottom: '4px' } }, [
    el('div.result__cell', {}, [el('b', { text: String(t.events.length) }), el('span', { text: 'notes' })]),
    el('div.result__cell', {}, [el('b', { text: `${t.bpm}` }), el('span', { text: 'BPM' })]),
    el('div.result__cell', {}, [el('b', { text: `${t.beatsPerBar}/4` }), el('span', { text: 'time' })]),
    el('div.result__cell', {}, [el('b', { text: String(t.level) }), el('span', { text: 'level' })]),
  ]);

  const node = el('div.fade-in', {}, [
    el('div.hstack', { style: { marginBottom: '6px', gap: '8px' } }, [
      pill(KIND_LABEL[t.kind] || t.kind, 'cyan'),
      prog.plays ? pill(`played ${prog.plays}×`, 'lime') : pill('not played yet'),
    ]),
    el('h1', { text: t.title }),
    el('p.sub', { text: t.subtitle, style: { marginBottom: '12px' } }),
    prog.plays
      ? el('div.hstack', { style: { marginBottom: '12px', gap: '10px' } }, [
          starsEl(prog.stars || 0, { size: 20 }),
          el('span.tiny', { text: `best ${prog.bestScore.toLocaleString()} · ${Math.round((prog.accuracy || 0) * 100)}%` }),
        ])
      : null,
    facts,
    t.about ? el('div.card', { style: { marginTop: '12px' } }, [el('p.sub', { text: t.about, style: { margin: 0 } })]) : null,
    el('div.vstack', { style: { marginTop: '16px', gap: '8px' } }, [
      el(
        'button.btn.btn--primary.btn--lg.btn--block',
        { type: 'button', onclick: () => navigate(`/play/${t.id}?mode=practice`) },
        [icon('play', 18), 'Practice — the song waits for you'],
      ),
      el(
        'button.btn.btn--block',
        { type: 'button', onclick: () => navigate(`/play/${t.id}?mode=play`) },
        [icon('songs', 18), 'Play at full tempo for stars'],
      ),
    ]),
    el('p.tiny', { style: { marginTop: '12px' }, text: 'Hold your phone or laptop near the guitar. Headphones make recognition more reliable.' }),
  ]);

  present({
    tab: '/songs',
    topbar: topbar({ title: 'Song', left: backButton(() => navigate('/songs')) }),
    node,
  });
}
