(async () => {
  const out = {};
  const mh = document.getElementById('modal-host');
  out.modalHost = mh ? { display: getComputedStyle(mh).display, hidden: mh.hidden, rect: mh.getBoundingClientRect().toJSON() } : null;
  out.topEl = (() => {
    const e = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return e ? { tag: e.tagName, cls: e.className, id: e.id } : null;
  })();
  const blurry = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if ((cs.filter && cs.filter !== 'none') || (cs.backdropFilter && cs.backdropFilter !== 'none')) {
      const r = el.getBoundingClientRect();
      blurry.push({
        tag: el.tagName,
        cls: String(el.className).slice(0, 40),
        filter: cs.filter,
        backdrop: cs.backdropFilter,
        w: Math.round(r.width),
        h: Math.round(r.height),
        pos: cs.position,
        z: cs.zIndex,
      });
    }
  }
  out.blurry = blurry;
  out.viewport = { w: window.innerWidth, h: window.innerHeight };
  return JSON.stringify(out, null, 1);
})()
