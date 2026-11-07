(async () => {
  const out = { url: location.href, origin: location.origin };
  // Service worker
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    out.serviceWorker = reg
      ? {
          scope: reg.scope,
          active: !!reg.active,
          state: reg.active ? reg.active.state : null,
          scriptURL: reg.active ? reg.active.scriptURL : null,
        }
      : 'not registered';
  } catch (e) {
    out.serviceWorker = 'error: ' + e.message;
  }
  // Manifest
  try {
    const link = document.querySelector('link[rel="manifest"]');
    out.manifestHref = link ? link.href : null;
    const res = await fetch(link.href);
    const m = await res.json();
    out.manifest = {
      status: res.status,
      name: m.name,
      short_name: m.short_name,
      start_url: m.start_url,
      scope: m.scope,
      display: m.display,
      icons: (m.icons || []).map((i) => `${i.sizes} ${i.purpose || 'any'}`),
    };
    // resolve start_url relative to the manifest
    out.resolvedStart = new URL(m.start_url, link.href).href;
    out.resolvedScope = new URL(m.scope || '.', link.href).href;
    const startRes = await fetch(out.resolvedStart, { method: 'GET' });
    out.startUrlStatus = startRes.status;
    // icons actually reachable?
    out.iconChecks = [];
    for (const icon of m.icons || []) {
      const u = new URL(icon.src, link.href).href;
      const r = await fetch(u, { method: 'HEAD' });
      out.iconChecks.push(`${icon.sizes} ${icon.purpose || 'any'} -> ${r.status}`);
    }
  } catch (e) {
    out.manifest = 'error: ' + e.message;
  }
  // Cache contents prove the SW precached the shell
  try {
    const keys = await caches.keys();
    out.caches = keys;
    if (keys.length) {
      const c = await caches.open(keys[0]);
      const reqs = await c.keys();
      out.cachedFiles = reqs.length;
    }
  } catch (e) {
    out.caches = 'error: ' + e.message;
  }
  return JSON.stringify(out, null, 1);
})()
