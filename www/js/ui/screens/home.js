/**
 * Home / Play. This is the screen the app opens on, and it works with one tap:
 * the hero button starts the recommended item immediately.
 */

import { el, icon } from '../../util/dom.js';
import { get, itemProgress } from '../../util/storage.js';
import { getTrack, nextRecommendation, pathItemIds, riffOfTheDay, songs } from '../../content/library.js';
import { backButton, progressBar, settingsButton, starsEl, streakChip, tile, topbar } from '../components.js';

export function homeScreen({ navigate, present }) {
  const state = get();
  const recId = nextRecommendation(itemProgress);
  const rec = getTrack(recId);
  const daily = state.today.seconds || 0;
  const goalSeconds = (state.dailyGoalMinutes || 10) * 60;
  const goalRatio = Math.min(1, daily / Math.max(60, goalSeconds));
  const riffId = riffOfTheDay();
  const riff = getTrack(riffId);
  const recent = (state.recentlyPlayed || [])
    .map((id) => getTrack(id))
    .filter(Boolean)
    .slice(0, 3);

  const totalStars = Object.values(state.items || {}).reduce((n, it) => n + (it.stars || 0), 0);
  const pathStars = pathItemIds().reduce((n, id) => n + (itemProgress(id).stars || 0), 0);

  const node = el('div.fade-in', {}, [
    el('div.hero', {}, [
      el('div.hero__glow'),
      el('div', {}, [
        el('div.tiny', { text: 'TODAY', style: { letterSpacing: '0.22em', marginBottom: '6px' } }),
        el('h1', { text: rec ? rec.title : 'Start practising' }),
        el('p.sub', {
          text: rec
            ? `${rec.kind === 'song' ? 'Song' : rec.kind === 'chord' ? 'Chord workout' : rec.kind === 'scale' ? 'Scale' : 'Exercise'} · ${Math.round(rec.seconds)}s · level ${rec.level}`
            : 'Pick anything from the library.',
        }),
      ]),
      el('div.hstack', { style: { marginTop: '16px', gap: '8px' } }, [
        el(
          'button.btn.btn--primary.btn--lg',
          {
            type: 'button',
            style: { flex: '1' },
            onclick: () => navigate(`/play/${recId}?mode=practice`),
          },
          [icon('play', 18), 'Start practising'],
        ),
        el('button.btn.btn--ghost.btn--lg', {
          type: 'button',
          'aria-label': 'Play mode',
          onclick: () => navigate(`/play/${recId}?mode=play`),
          text: 'Play',
        }),
      ]),
    ]),

    el('div.card', { style: { marginTop: '12px' } }, [
      el('div.hstack', {}, [
        el('div.row__main', {}, [
          el('div.row__title', { text: 'Daily goal' }),
          el('div.row__meta', {
            text: daily >= goalSeconds ? 'Done for today — nice.' : `${Math.max(0, Math.round((goalSeconds - daily) / 60))} min to go`,
          }),
        ]),
        el('b.cyan', { text: `${Math.round(daily / 60)}/${state.dailyGoalMinutes || 10}m` }),
      ]),
      el('div', { style: { marginTop: '10px' } }, [progressBar(goalRatio)]),
      el('div.hstack', { style: { marginTop: '14px', gap: '18px' } }, [
        el('div', {}, [el('b', { text: String(state.totals.notes || 0), style: { display: 'block', fontSize: '17px' } }), el('span.tiny', { text: 'notes played' })]),
        el('div', {}, [el('b', { text: String(totalStars), style: { display: 'block', fontSize: '17px' } }), el('span.tiny', { text: 'stars' })]),
        el('div', {}, [el('b', { text: `${Math.round((state.totals.seconds || 0) / 60)}m`, style: { display: 'block', fontSize: '17px' } }), el('span.tiny', { text: 'practised' })]),
      ]),
    ]),

    el('div.section-head', {}, [
      el('h2', { text: 'Riff of the day' }),
      el('span.sub', { text: 'changes every day' }),
    ]),
    el('button.row', { type: 'button', onclick: () => navigate(`/item/${riffId}`) }, [
      el('div.row__badge', {}, [icon('flame', 16)]),
      el('div.row__main', {}, [
        el('div.row__title', { text: riff ? riff.title : 'Riff of the day' }),
        el('div.row__meta', { text: riff ? `${riff.subtitle || 'Original'} · ${Math.round(riff.seconds)}s` : '' }),
      ]),
      starsEl(itemProgress(riffId).stars || 0),
      el('span', { style: { color: 'var(--muted-2)', display: 'flex' } }, [icon('next', 16)]),
    ]),

    el('div.section-head', {}, [el('h2', { text: 'Quick tools' }), el('span.sub', { text: 'no song needed' })]),
    el('div.tiles', {}, [
      tile({ title: 'Tuner', meta: 'Tune up first', iconName: 'tuner', onClick: () => navigate('/tuner') }),
      tile({ title: 'Metronome', meta: 'Keep time', iconName: 'metronome', onClick: () => navigate('/metronome') }),
      tile({ title: 'Ear trainer', meta: 'Identify intervals', iconName: 'ear', onClick: () => navigate('/ear') }),
      tile({ title: 'Fretboard', meta: 'Learn the notes', iconName: 'fretboard', onClick: () => navigate('/fretboard') }),
    ]),

    recent.length
      ? el('div.section-head', {}, [el('h2', { text: 'Pick up where you left off' })])
      : null,
    recent.length
      ? el(
          'div.vstack',
          { style: { gap: '8px' } },
          recent.map((t) =>
            el('button.row', { type: 'button', onclick: () => navigate(`/item/${t.id}`) }, [
              el('div.row__main', {}, [el('div.row__title', { text: t.title }), el('div.row__meta', { text: t.subtitle || t.kind })]),
              starsEl(itemProgress(t.id).stars || 0),
            ]),
          ),
        )
      : null,

    el('div.section-head', {}, [el('h2', { text: 'The path' })]),
    el('button.row', { type: 'button', onclick: () => navigate('/learn') }, [
      el('div.row__badge', { text: '10' }),
      el('div.row__main', {}, [
        el('div.row__title', { text: 'Learning path' }),
        el('div.row__meta', { text: `${pathStars} of ${pathItemIds().length * 3} stars earned · ${songs().length} songs` }),
      ]),
      el('span', { style: { color: 'var(--muted-2)', display: 'flex' } }, [icon('next', 16)]),
    ]),
  ]);

  present({
    tab: '/home',
    topbar: topbar({
      brand: true,
      right: [streakChip(), settingsButton(navigate)],
    }),
    node,
  });
}

export { backButton };
