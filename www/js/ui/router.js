/**
 * Hash router. No dependencies: patterns are simple `:param` segments.
 */

const routes = [];
let current = null;
let outlet = null;
let cleanup = null;
const listeners = new Set();

export function define(pattern, handler) {
  const keys = [];
  const regex = new RegExp(
    '^' +
      pattern
        .split('/')
        .map((seg) => {
          if (seg.startsWith(':')) {
            keys.push(seg.slice(1));
            return '([^/]+)';
          }
          return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        })
        .join('/') +
      '/?$',
  );
  routes.push({ pattern, regex, keys, handler });
}

export function onRouteChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function currentPath() {
  const hash = location.hash.replace(/^#/, '');
  return hash || '/home';
}

export function navigate(path, { replace = false } = {}) {
  const target = `#${path}`;
  if (location.hash === target) {
    render();
    return;
  }
  if (replace) history.replaceState(null, '', target);
  else location.hash = target;
  if (replace) render();
}

export function back() {
  if (history.length > 1) history.back();
  else navigate('/home');
}

export function mount(el) {
  outlet = el;
}

export function start() {
  window.addEventListener('hashchange', render);
  render();
}

export function render() {
  if (!outlet) return;
  const raw = currentPath();
  const qIndex = raw.indexOf('?');
  const path = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
  const query = {};
  if (qIndex >= 0) {
    for (const part of raw.slice(qIndex + 1).split('&')) {
      if (!part) continue;
      const [k, v = ''] = part.split('=');
      query[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    }
  }
  for (const r of routes) {
    const m = r.regex.exec(path);
    if (!m) continue;
    const params = {};
    r.keys.forEach((k, i) => {
      params[k] = decodeURIComponent(m[i + 1]);
    });
    if (cleanup) {
      try {
        cleanup();
      } catch {
        /* a failing teardown must not block navigation */
      }
      cleanup = null;
    }
    current = path;
    const result = r.handler({ params, path, query });
    if (typeof result === 'function') cleanup = result;
    else if (result && typeof result.teardown === 'function') cleanup = result.teardown;
    for (const fn of listeners) fn(path, params);
    outlet.scrollTop = 0;
    return;
  }
  navigate('/home', { replace: true });
}
