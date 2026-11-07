/**
 * Songs list and the item detail screen (the one place that offers
 * Practice / Play before you commit).
 *
 * The catalogue is three hundred pieces, so the list needs search and paging:
 * rendering every row at once is slow on a phone and unreadable.
 */

import { el, icon } from '../../util/dom.js';
import { itemProgress, customSong, removeCustomSong } from '../../util/storage.js';
import { allItems, getTrack } from '../../content/library.js';
import { backButton, pill, starsEl, topbar } from '../components.js';

// Filters match the item kind (song/riff/drill) or any tag (rock, carol, ...).
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'Mine' },
  { id: 'progression', label: 'Progressions' },
  { id: 'campfire', label: 'Campfire' },
  { id: 'rock', label: 'Rock' },
  { id: 'love', label: 'Love' },
  { id: 'folk', label: 'Folk' },
  { id: 'classical', label: 'Classical' },
  { id: 'carol', label: 'Christmas' },
  { id: 'spiritual', label: 'Spirituals' },
  { id: 'kids', label: 'Kids' },
  { id: 'hymn', label: 'Hymns' },
  { id: 'blues', label: 'Blues' },
  { id: 'world', label: 'World' },
  { id: 'ragtime', label: 'Ragtime' },
  { id: 'drums', label: 'Drums' },
  { id: 'riff', label: 'Riffs' },
  { id: 'drill', label: 'Drills' },
];

const KIND_LABEL = {
  song: 'Song',
  riff: 'Riff',
  chord: 'Chord workout',
  drill: 'Exercise',
  scale: 'Scale',
  pattern: 'Pattern',
  drums: 'Drum chart',
};

const PAGE = 40;

function matchesFilter(item, filter) {
  if (filter === 'all') return true;
  if (item.kind === filter) return true;
  return Array.isArray(item.tags) && item.tags.includes(filter);
}

export function songsScreen({ navigate, present }) {
  let filter = 'all';
  let query = '';
  let shown = PAGE;
  const listHost = el('div.vstack', { style: { gap: '8px' } });
  const countEl = el('span.sub');
  const moreHost = el('div', { style: { marginTop: '10px' } });

  function selection() {
    const q = query.trim().toLowerCase();
    return allItems()
      .filter((i) => matchesFilter(i, filter))
      .filter((i) => !q || i.title.toLowerCase().includes(q) || (i.subtitle || '').toLowerCase().includes(q))
      .sort((a, b) => (a.tags?.includes('mine') ? 1 : 0) - (b.tags?.includes('mine') ? 1 : 0) || a.title.localeCompare(b.title));
  }

  function paint() {
    const items = selection();
    countEl.textContent = `${items.length} piece${items.length === 1 ? '' : 's'}`;
    listHost.innerHTML = '';
    moreHost.innerHTML = '';

    if (!items.length) {
      listHost.appendChild(el('div.card', { text: 'Nothing matches that search.' }));
      return;
    }

    for (const spec of items.slice(0, shown)) {
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

    if (items.length > shown) {
      moreHost.appendChild(
        el('button.btn.btn--block', {
          type: 'button',
          text: `Show ${Math.min(PAGE, items.length - shown)} more of ${items.length}`,
          onclick: () => {
            shown += PAGE;
            paint();
          },
        }),
      );
    }
  }

  const search = el('input', {
    type: 'search',
    placeholder: 'Search the songs…',
    'aria-label': 'Search songs',
    style: {
      width: '100%',
      padding: '13px 14px',
      borderRadius: '13px',
      border: '1px solid var(--line)',
      background: 'var(--card)',
      color: 'var(--white)',
      font: 'inherit',
      outline: 'none',
    },
    oninput: (ev) => {
      query = ev.target.value;
      shown = PAGE;
      paint();
    },
  });

  const addBtn = el(
    'button.btn.btn--sm.btn--primary',
    { type: 'button', style: { flex: 'none' }, onclick: () => navigate('/add') },
    [icon('check', 14), 'Add'],
  );

  const chips = FILTERS.map((f) =>
    el('button', {
      type: 'button',
      class: 'chip',
      'aria-pressed': String(f.id === filter),
      text: f.label,
      style: { cursor: 'pointer', flex: 'none' },
      onclick: (ev) => {
        filter = f.id;
        shown = PAGE;
        for (const c of chips) c.setAttribute('aria-pressed', String(c === ev.currentTarget));
        paint();
      },
    }),
  );

  paint();

  const node = el('div.fade-in', {}, [
    el('h1', { text: 'Songs' }),
    el('p.sub', {
      text: 'Classical, Christmas, folk, spirituals, kids, hymns, ragtime, rock, blues and drums — all public domain or written for this app. Add your own with the Add button.',
      style: { marginBottom: '12px' },
    }),
    el('div.hstack', { style: { gap: '8px' } }, [search, addBtn]),
    el('div.hstack', { style: { overflowX: 'auto', padding: '12px 0', gap: '6px' } }, chips),
    el('div.hstack', { style: { marginBottom: '10px' } }, [countEl]),
    listHost,
    moreHost,
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
  const mine = customSong(params.id);

  const facts = el('div.result__grid', { style: { maxWidth: 'none', marginBottom: '4px' } }, [
    el('div.result__cell', {}, [el('b', { text: String(t.events.length) }), el('span', { text: 'notes' })]),
    el('div.result__cell', {}, [el('b', { text: `${t.bpm}` }), el('span', { text: 'BPM' })]),
    el('div.result__cell', {}, [el('b', { text: `${t.beatsPerBar}/4` }), el('span', { text: 'time' })]),
    el('div.result__cell', {}, [el('b', { text: String(t.level) }), el('span', { text: 'level' })]),
  ]);

  const node = el('div.fade-in', {}, [
    el('div.hstack', { style: { marginBottom: '6px', gap: '8px' } }, [
      pill(KIND_LABEL[t.kind] || t.kind, mine ? 'violet' : 'cyan'),
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
        [
          icon('play', 18),
          t.mode === 'drums' ? 'Practice — the pattern waits for you' : 'Practice — the song waits for you',
        ],
      ),
      el(
        'button.btn.btn--block',
        { type: 'button', onclick: () => navigate(`/play/${t.id}?mode=play`) },
        [icon('songs', 18), 'Play at full tempo for stars'],
      ),
      mine
        ? el('button.btn.btn--danger.btn--block', {
            type: 'button',
            style: { marginTop: '10px' },
            text: 'Delete this song',
            onclick: () => {
              removeCustomSong(mine.id);
              navigate('/songs', { replace: true });
            },
          })
        : null,
    ]),
    el('p.tiny', {
      style: { marginTop: '12px' },
      text:
        t.mode === 'drums'
          ? 'Drum charts are graded on timing. Tap the pads at the bottom of the screen, or play a real kit near the microphone.'
          : 'Hold your phone or laptop near the guitar. Headphones make recognition more reliable.',
    }),
  ]);

  present({
    tab: '/songs',
    topbar: topbar({ title: 'Song', left: backButton(() => navigate('/songs')) }),
    node,
  });
}
