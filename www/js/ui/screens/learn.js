/**
 * Learn: the 10-level path, then a level's missions and tasks.
 */

import { el, icon } from '../../util/dom.js';
import { itemProgress } from '../../util/storage.js';
import { LEVELS, LEVEL_BY_N, getTrack, levelProgress } from '../../content/library.js';
import { backButton, pill, progressBar, starsEl, topbar } from '../components.js';

const THEME_PILL = { lead: 'cyan', rhythm: 'violet', knowledge: 'amber' };

export function learnScreen({ navigate, present }) {
  const rows = LEVELS.map((level) => {
    const p = levelProgress(level, itemProgress);
    const done = p.ratio >= 0.999;
    return el(
      'button.level-pill',
      {
        type: 'button',
        class: done ? 'level-pill--done' : '',
        onclick: () => navigate(`/level/${level.n}`),
        style: { marginBottom: '8px' },
      },
      [
        el('div.level-pill__n', { text: done ? '✓' : String(level.n) }),
        el('div.level-pill__t', {}, [
          el('b', { text: level.name }),
          el('span', { text: `${level.theme} · ${p.items} tasks · ${p.earned}/${p.max} stars` }),
        ]),
        el('div', { style: { width: '46px' } }, [progressBar(p.ratio, { height: 5 })]),
      ],
    );
  });

  const node = el('div.fade-in', {}, [
    el('h1', { text: 'Learning path' }),
    el('p.sub', {
      text: 'Ten levels from your first open string to full pieces. Nothing is locked — skip ahead whenever you like.',
      style: { marginBottom: '18px' },
    }),
    ...rows,
    el('div.card', { style: { marginTop: '10px' } }, [
      el('div.hstack', {}, [icon('learn', 18), el('b', { text: 'How it works' })]),
      el('p.sub', {
        style: { marginTop: '8px' },
        text: 'Each task is a short exercise you play with a microphone. Two stars unlocks the next one comfortably, three gold stars means you nailed it with good timing.',
      }),
    ]),
  ]);

  present({ tab: '/learn', topbar: topbar({ brand: true }), node });
}

export function levelScreen({ params, navigate, present }) {
  const level = LEVEL_BY_N.get(Number(params.n));
  if (!level) {
    navigate('/learn', { replace: true });
    return;
  }
  const p = levelProgress(level, itemProgress);

  const missions = level.missions.map((m) =>
    el('div', { style: { marginBottom: '16px' } }, [
      el('div.hstack', { style: { marginBottom: '8px' } }, [
        el('b', { text: m.title, style: { fontSize: '14px' } }),
        pill(m.theme === 'lead' ? 'Melody & lead' : 'Chords & rhythm', THEME_PILL[m.theme] || 'cyan'),
      ]),
      el(
        'div.vstack',
        { style: { gap: '7px' } },
        m.items.map((id) => {
          const t = getTrack(id);
          const prog = itemProgress(id);
          if (!t) return null;
          return el('button.row', { type: 'button', onclick: () => navigate(`/item/${id}`) }, [
            el('div.row__main', {}, [
              el('div.row__title', { text: t.title }),
              el('div.row__meta', {
                text: `${t.kind === 'song' ? 'Song' : t.kind === 'chord' ? 'Chord workout' : t.kind === 'scale' ? 'Scale' : t.kind === 'riff' ? 'Riff' : 'Exercise'} · ${Math.round(t.seconds)}s · ${t.events.length} notes`,
              }),
            ]),
            starsEl(prog.stars || 0),
            el('span', { style: { color: 'var(--muted-2)', display: 'flex' } }, [icon('next', 16)]),
          ]);
        }),
      ),
    ]),
  );

  const node = el('div.fade-in', {}, [
    el('div', { style: { marginBottom: '12px' } }, [progressBar(p.ratio)]),
    el('p.sub', { text: level.blurb, style: { marginBottom: '18px' } }),
    ...missions,
  ]);

  present({
    tab: '/learn',
    topbar: topbar({
      title: `Level ${level.n}`,
      subtitle: level.theme.toUpperCase(),
      left: backButton(() => navigate('/learn')),
    }),
    node,
  });
}
