// Capture a screenshot of a page in the running Chrome.
// usage: node tools/shot.mjs <url> <outfile.png> [width] [height] [waitMs]
import fsp from 'node:fs/promises';

const EP = process.env.CDP_ENDPOINT || 'http://127.0.0.1:9333';
const [, , url, out, w = '412', h = '892', waitMs = '1600'] = process.argv;
if (!url || !out) {
  console.error('usage: node tools/shot.mjs <url> <out.png> [w] [h] [waitMs]');
  process.exit(2);
}

const target = await (await fetch(`${EP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let id = 0;
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

await new Promise((res, rej) => {
  ws.addEventListener('open', res);
  ws.addEventListener('error', rej);
});
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  }
});

await send('Page.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', {
  width: Number(w),
  height: Number(h),
  deviceScaleFactor: 2,
  mobile: true,
});
// Clear a previously installed service worker so screenshots show the current
// files rather than the cached previous build.
await send('Page.navigate', { url });
await new Promise((r) => setTimeout(r, 900));
await send('Runtime.evaluate', {
  expression: `(async () => {
     if (navigator.serviceWorker) {
       const regs = await navigator.serviceWorker.getRegistrations();
       await Promise.all(regs.map((r) => r.unregister()));
     }
     if (window.caches) {
       const keys = await caches.keys();
       await Promise.all(keys.map((k) => caches.delete(k)));
     }
     return 1;
   })()`,
  awaitPromise: true,
  returnByValue: true,
});
await send('Page.navigate', { url });
await new Promise((r) => setTimeout(r, Number(waitMs)));
const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
await fsp.writeFile(out, Buffer.from(shot.data, 'base64'));
console.log(`saved ${out}`);

// optional scripted click: pass a CSS selector as the 6th argument
if (process.argv[7]) {
  const sel = process.argv[7];
  await send('Runtime.evaluate', {
    expression: `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (el) { el.click(); return true; } return false; })()`,
    returnByValue: true,
  });
  await new Promise((r) => setTimeout(r, 2500));
  const shot2 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fsp.writeFile(out.replace(/\.png$/, '-after.png'), Buffer.from(shot2.data, 'base64'));
  console.log(`saved ${out.replace(/\.png$/, '-after.png')}`);
}

await fetch(`${EP}/json/close/${target.id}`);
ws.close();
