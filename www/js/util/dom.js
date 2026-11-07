/** Small DOM helpers. No framework, no dependencies. */

/**
 * Create an element.
 * @param {string} tag  e.g. 'div', 'button.row', 'svg.stars'
 * @param {object|null} [attrs]
 * @param {Array<Node|string|false|null|undefined>} [children]
 */
export function el(tag, attrs, children) {
  const [name, ...classes] = tag.split('.');
  const node = document.createElement(name === 'svg' ? 'svg' : name);
  if (classes.length) node.className = classes.join(' ');
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') node.className = classes.length ? `${node.className} ${v}`.trim() : String(v);
      else if (k === 'html') node.innerHTML = String(v);
      else if (k === 'text') node.textContent = String(v);
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (v === true) node.setAttribute(k, '');
      else node.setAttribute(k, String(v));
    }
  }
  append(node, children);
  return node;
}

export function append(node, children) {
  if (!children) return node;
  const list = Array.isArray(children) ? children : [children];
  for (const c of list) {
    if (c === null || c === undefined || c === false || c === '') continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function mount(parent, node) {
  clear(parent);
  parent.appendChild(node);
  return parent;
}

/** Minimal inline SVG icon set (stroke-based, 24x24 viewBox). */
const PATHS = {
  play: ['M8 5.5v13l11-6.5z'],
  learn: ['M4 5.5h16', 'M4 12h10', 'M4 18.5h13'],
  songs: ['M9 18V6.5l10-2v11.5', 'M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z', 'M19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z'],
  tools: ['M14.5 6.5a4 4 0 1 0 5 5L21 10l-3.5-3.5z', 'M3 21l8.5-8.5', 'M6 3.5l4 4', 'M3.5 6l4 4'],
  you: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4.5 20c1.2-3.6 4-5.5 7.5-5.5S18.3 16.4 19.5 20'],
  gear: [
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 13.6H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  ],
  tuner: ['M12 20V4', 'M7 8h5', 'M12 12h5', 'M7 16h5'],
  back: ['M15 18l-6-6 6-6'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  pause: ['M9 5v14', 'M15 5v14'],
  check: ['M5 13l4 4L19 7'],
  flame: ['M12 3c2 4 5 5 5 9a5 5 0 1 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8z'],
  mic: ['M12 15a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 1 0-7 0v5.5A3.5 3.5 0 0 0 12 15z', 'M5.5 11.5a6.5 6.5 0 0 0 13 0', 'M12 18.5V21'],
  tuning: ['M4 7h9', 'M17 7h3', 'M4 17h3', 'M11 17h9', 'M15 4.5v5', 'M9 14.5v5'],
  scale: ['M4 20V9', 'M9 20V5', 'M14 20v-8', 'M19 20V11'],
  ear: ['M8 20c0-4 4-4 4-8a3 3 0 1 0-6 0', 'M16 20c3-2 4-5 4-8a8 8 0 1 0-16 0'],
  metronome: ['M12 3l6 17H6z', 'M12 20l5-12'],
  fretboard: ['M3 7h18', 'M3 12h18', 'M3 17h18', 'M7.5 4v16', 'M12 4v16', 'M16.5 4v16'],
  refresh: ['M20 12a8 8 0 1 1-3-6.2', 'M20 4v5h-5'],
  next: ['M9 6l6 6-6 6'],
  speaker: ['M11 5L6.5 9H3v6h3.5L11 19z', 'M15.5 8.5a5 5 0 0 1 0 7'],
  loop: ['M4 10a6 6 0 0 1 6-6h9', 'M16 1.5L19 4l-3 2.5', 'M20 14a6 6 0 0 1-6 6H5', 'M8 22.5L5 20l3-2.5'],
};

export function icon(name, size = 22) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of PATHS[name] || []) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    if (name === 'play') p.setAttribute('fill', 'currentColor');
    svg.appendChild(p);
  }
  return svg;
}

/** Toast notifications. */
export function toast(message, kind = '', ms = 2600) {
  const host = document.getElementById('toast-host');
  if (!host) return;
  const node = el('div.toast', { class: kind ? `toast--${kind}` : '', text: message });
  host.appendChild(node);
  setTimeout(() => {
    node.style.transition = 'opacity .25s ease';
    node.style.opacity = '0';
    setTimeout(() => node.remove(), 260);
  }, ms);
}

/**
 * Promise-based modal. Resolves with whatever the action button resolves to,
 * or null when dismissed.
 * @param {{title:string,body?:string,actions?:{label:string,value:any,variant?:string}[]}} opts
 */
export function modal({ title, body, actions = [{ label: 'Got it', value: true }] }) {
  const host = document.getElementById('modal-host');
  return new Promise((resolve) => {
    const close = (value) => {
      host.hidden = true;
      clear(host);
      resolve(value ?? null);
    };
    const buttons = actions.map((a) =>
      el(
        'button',
        {
          class: `btn btn--block ${a.variant === 'primary' ? 'btn--primary' : a.variant === 'danger' ? 'btn--danger' : 'btn--ghost'}`,
          onclick: () => close(a.value),
          text: a.label,
        },
        [],
      ),
    );
    const node = el('div.modal', { role: 'dialog', 'aria-modal': 'true' }, [
      el('h2', { text: title }),
      body ? el('p.sub', { text: body, style: { marginBottom: '16px' } }) : null,
      el('div.vstack', {}, buttons),
    ]);
    mount(host, node);
    host.hidden = false;
  });
}

/** Format helpers. */
export const fmt = {
  int(n) {
    return Math.round(n).toLocaleString('en-US');
  },
  pct(n, digits = 0) {
    return `${(n * 100).toFixed(digits)}%`;
  },
  clock(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  },
  relativeDay(iso) {
    if (!iso) return 'never';
    const then = new Date(iso);
    const days = Math.floor((Date.now() - then.getTime()) / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return then.toLocaleDateString();
  },
};

/** Clamp helper. */
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
