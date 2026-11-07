/**
 * Progressions.
 *
 * Twelve harmonic patterns, each playable in all twelve keys. This screen exists
 * because the progressions are the thing that actually lets you play along to
 * songs you recognise, and burying 144 items inside the Songs list would repeat
 * the mistake the drum charts made.
 */

import { el, icon } from '../../util/dom.js';
import { itemProgress } from '../../util/storage.js';
import { PROGRESSIONS, KEYS, progressionLabel } from '../../content/progressions.js';
import { getTrack } from '../../content/library.js';
import { backButton, pill, starsEl, topbar } from '../components.js';

export function progressionsScreen({ navigate, present }) {
  const cards = PROGRESSIONS.map((prog) => {
    const keys = KEYS.map((key) => {
      const id = `prg-${prog.id}-${key.slug}`;
      const exists = !!getTrack(id);
      return { key, id, exists };
    }).filter((k) => k.exists);

    const best = keys.reduce((n, k) => Math.max(n, itemProgress(k.id).stars || 0), 0);

    const keyChips = keys.map((k) =>
      el(
        'button.btn.btn--sm',
        {
          type: 'button',
          style: { minWidth: '46px' },
          text: k.key.name,
          onclick: () => navigate(`/item/${k.id}`),
        },
      ),
    );

    return el('div.card', { style: { marginBottom: '10px' } }, [
      el('div.hstack', { style: { marginBottom: '4px' } }, [
        el('b', { text: prog.name, style: { fontSize: '14.5px' } }),
        el('span.spacer'),
        best ? starsEl(best) : null,
      ]),
      el('div', { style: { marginBottom: '4px' } }, [pill(prog.roman, 'violet')]),
      el('p.sub', { style: { margin: '6px 0 4px' }, text: prog.about }),
      el('div.tiny', { style: { marginBottom: '10px' }, text: `In C: ${progressionLabel(prog, KEYS[0])}` }),
      el('div.hstack', { style: { flexWrap: 'wrap', gap: '6px' } }, keyChips),
    ]);
  });

  const node = el('div.fade-in', {}, [
    el('div.hero', { style: { padding: '20px' } }, [
      el('div.hero__glow'),
      el('div.tiny', { text: 'PROGRESSIONS', style: { letterSpacing: '0.22em', marginBottom: '6px' } }),
      el('h1', { text: 'The songs behind the songs' }),
      el('p.sub', {
        text: 'Nearly all popular music is built from about a dozen chord patterns. Learn the pattern in a few keys and you can play along with records you have never seen a chart for.',
        style: { maxWidth: '36ch' },
      }),
    ]),

    el('div.section-head', {}, [
      el('h2', { text: 'Patterns' }),
      el('span.sub', { text: 'pick a key to practise' }),
    ]),
    ...cards,

    el('div.card', { style: { marginTop: '6px' } }, [
      el('div.hstack', {}, [icon('ear', 18), el('b', { text: 'How to use these' })]),
      el('p.sub', {
        style: { marginTop: '8px', marginBottom: 0 },
        text: 'Play one pattern in one key until it is automatic, then move the same shape to a new key. Do that for all twelve and you can follow almost any band.',
      }),
    ]),
  ]);

  present({
    tab: '/learn',
    topbar: topbar({ title: 'Progressions', left: backButton(() => navigate('/home')) }),
    node,
  });
}
