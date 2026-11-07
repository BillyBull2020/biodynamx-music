/**
 * Shared UI pieces. Everything is plain DOM: no virtual DOM, no templates.
 */

import { el, icon } from '../util/dom.js';
import { get } from '../util/storage.js';

export function topbar({ title, subtitle, brand = false, right = [], left = null }) {
  return el('div.topbar', {}, [
    left,
    brand
      ? el('div.brand', {}, [el('b', { html: 'BIO<span>DYNAMX</span>' }), el('i', { text: 'MUSIC' })])
      : el('div', { class: 'brand' }, [
          el('b', { text: title || '', style: { fontSize: '16px', letterSpacing: '0.01em' } }),
          subtitle ? el('i', { text: subtitle, style: { letterSpacing: '0.06em' } }) : null,
        ]),
    ...right,
  ]);
}

const TABS = [
  { path: '/home', label: 'Play', icon: 'play' },
  { path: '/learn', label: 'Learn', icon: 'learn' },
  { path: '/songs', label: 'Songs', icon: 'songs' },
  { path: '/tools', label: 'Tools', icon: 'tools' },
  { path: '/you', label: 'You', icon: 'you' },
];

export function tabbar(active, navigate) {
  return el(
    'nav.tabbar',
    { role: 'navigation' },
    TABS.map((t) =>
      el(
        'button',
        {
          type: 'button',
          'aria-current': active === t.path ? 'page' : null,
          onclick: () => navigate(t.path),
        },
        [icon(t.icon, 22), el('span', { text: t.label })],
      ),
    ),
  );
}

/** Star rating: three slots, filled = earned. */
export function starsEl(count, { size = 13, gold = true } = {}) {
  return el('span', { class: `stars ${gold ? 'stars--gold' : ''}`, style: { fontSize: `${size}px` } }, [
    ...[0, 1, 2].map((i) => (i < count ? el('b', { text: '★' }) : el('i', { text: '★' }))),
  ]);
}

export function pill(text, kind = '') {
  return el('span', { class: `pill ${kind ? `pill--${kind}` : ''}`, text });
}

export function progressBar(ratio, { height = 7 } = {}) {
  return el('div.bar', { style: { height: `${height}px` } }, [el('i', { style: { width: `${Math.round(ratio * 100)}%` } })]);
}

export function streakChip() {
  const s = get();
  return el('span.chip.chip--flame', {}, [icon('flame', 15), el('span', { text: String(s.streak.count || 0) })]);
}

export function settingsButton(navigate) {
  return el('button.icon-btn', { type: 'button', 'aria-label': 'Settings', onclick: () => navigate('/settings') }, [icon('gear', 18)]);
}

export function backButton(back) {
  return el('button.icon-btn', { type: 'button', 'aria-label': 'Back', onclick: back }, [icon('back', 18)]);
}

/** A big tappable list row. */
export function listRow({ title, meta, badge, stars = 0, onClick, right = null, disabled = false }) {
  return el(
    'button.row',
    {
      type: 'button',
      onclick: disabled ? null : onClick,
      disabled,
      style: disabled ? { opacity: '0.55' } : null,
    },
    [
      badge !== undefined && badge !== null ? el('div.row__badge', { text: String(badge) }) : null,
      el('div.row__main', {}, [el('div.row__title', { text: title }), meta ? el('div.row__meta', { text: meta }) : null]),
      stars ? starsEl(stars) : null,
      right,
      el('span', { style: { color: 'var(--muted-2)', display: 'flex' } }, [icon('next', 16)]),
    ],
  );
}

export function tile({ title, meta, iconName, onClick }) {
  return el('button.tile', { type: 'button', onclick: onClick }, [
    el('div.tile__icon', {}, [icon(iconName, 18)]),
    el('div.tile__title', { text: title }),
    meta ? el('div.tile__meta', { text: meta }) : null,
  ]);
}

export function emptyState(text) {
  return el('div.card', { style: { textAlign: 'center', color: 'var(--muted)', padding: '26px 16px' } }, [
    el('div', { text, style: { fontSize: '13.5px' } }),
  ]);
}

export function scoreLine(label, value) {
  return el('div.row', { style: { background: 'transparent', border: '0', padding: '7px 0' } }, [
    el('div.row__main', {}, [el('div.row__meta', { text: label, style: { fontSize: '12.5px', color: 'var(--muted)' } })]),
    el('b', { text: value, style: { fontVariantNumeric: 'tabular-nums' } }),
  ]);
}

export function segmented(options, current, onSelect) {
  return el(
    'div.seg',
    {},
    options.map((o) =>
      el('button', {
        type: 'button',
        'aria-pressed': String(o.value === current),
        text: o.label,
        onclick: () => onSelect(o.value),
      }),
    ),
  );
}

export { el, icon };
