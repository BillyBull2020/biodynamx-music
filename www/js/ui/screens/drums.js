/**
 * Drums hub.
 *
 * This exists because drums were technically shipped but impossible to find:
 * the only entry was a filter chip inside Songs. A first-class instrument needs
 * a first-class door.
 */

import { el, icon } from '../../util/dom.js';
import { itemProgress } from '../../util/storage.js';
import { allItems, getTrack } from '../../content/library.js';
import { backButton, pill, starsEl, topbar } from '../components.js';

export function drumsScreen({ navigate, present }) {
  const drumItems = allItems()
    .filter((i) => i.kind === 'drums' || (i.tags || []).includes('drums'))
    .sort((a, b) => a.level - b.level);

  const rows = drumItems.map((spec) => {
    const t = getTrack(spec.id);
    const prog = itemProgress(spec.id);
    if (!t) return null;
    return el('button.row', { type: 'button', onclick: () => navigate(`/play/${spec.id}?mode=practice`) }, [
      el('div.row__badge', { text: String(t.level) }),
      el('div.row__main', {}, [
        el('div.row__title', { text: t.title }),
        el('div.row__meta', { text: `${t.bpm} BPM · ${Math.round(t.seconds)}s · ${t.events.length} hits` }),
      ]),
      prog.plays ? starsEl(prog.stars || 0) : null,
      el('span', { style: { color: 'var(--muted-2)', display: 'flex' } }, [icon('next', 16)]),
    ]);
  });

  const first = drumItems[0];

  const node = el('div.fade-in', {}, [
    el('div.hero', { style: { padding: '20px' } }, [
      el('div.hero__glow'),
      el('div.tiny', { text: 'DRUMS', style: { letterSpacing: '0.22em', marginBottom: '6px' } }),
      el('h1', { text: 'Play the kit' }),
      el('p.sub', {
        text: 'Graded on timing, not pitch. Tap the four pads, or play a real kit near the microphone.',
        style: { maxWidth: '32ch' },
      }),
      el(
        'button.btn.btn--primary.btn--lg',
        {
          type: 'button',
          style: { marginTop: '14px', width: '100%' },
          onclick: () => navigate(`/play/${first ? first.id : 'drums-basic'}?mode=practice`),
        },
        [icon('play', 18), first ? `Start with ${first.title}` : 'Start'],
      ),
    ]),

    el('div.section-head', {}, [el('h2', { text: 'How it works' })]),
    el('div.card', {}, [
      el('div.vstack', { style: { gap: '10px' } }, [
        el('div.hstack', {}, [
          el('div.row__badge', { text: 'K' }),
          el('div.row__main', {}, [
            el('b', { text: 'Kick, Snare, Hat, Tom' }),
            el('div.row__meta', { text: 'Four lanes, drawn like the guitar highway.' }),
          ]),
        ]),
        el('div.hstack', {}, [
          el('div.row__badge', {}, [icon('mic', 16)]),
          el('div.row__main', {}, [
            el('b', { text: 'Real kit or pads' }),
            el('div.row__meta', { text: 'The pads always work. The mic hears a real kit, a practice pad, or a table.' }),
          ]),
        ]),
        el('div.hstack', {}, [
          el('div.row__badge', { text: '★' }),
          el('div.row__main', {}, [
            el('b', { text: 'Wait mode works here too' }),
            el('div.row__meta', { text: 'Practice stops on each hit until you play it, so you can learn at any speed.' }),
          ]),
        ]),
      ]),
    ]),

    el('div.section-head', {}, [
      el('h2', { text: 'Charts' }),
      el('span.sub', { text: `${drumItems.length} beats` }),
    ]),
    el('div.vstack', { style: { gap: '8px' } }, rows),

    el('p.tiny', {
      style: { marginTop: '16px', textAlign: 'center' },
      text: 'Drum charts are original to this app. Yousician has no drum instrument at all.',
    }),
  ]);

  present({
    tab: '/tools',
    topbar: topbar({ title: 'Drums', left: backButton(() => navigate('/home')) }),
    node,
  });
}
