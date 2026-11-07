// Drive a practice run with the fake microphone and capture frames mid-song.
// usage: node tools/game-shot.mjs <url> <prefix> [clickWaitMs] [shotAtMs...]
import fsp from 'node:fs/promises';

const EP = process.env.CDP_ENDPOINT || 'http://127.0.0.1:9334';
const [, , url, prefix = 'shots/game', clickWait = '1200', ...shotTimes] = process.argv;
const times = shotTimes.length ? shotTimes.map(Number) : [2600, 4200, 6000];

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 892, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url });
await sleep(900);
await send('Runtime.evaluate', {
  expression: `(async () => {
    if (navigator.serviceWorker) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister())); }
    if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); }
    return 1; })()`,
  awaitPromise: true,
  returnByValue: true,
});
await send('Page.navigate', { url });
await sleep(1500);

const clicked = await send('Runtime.evaluate', {
  expression: `(() => { const b = [...document.querySelectorAll('button')].find(x => /Turn on microphone/i.test(x.textContent||'')); if (!b) return false; b.click(); return true; })()`,
  returnByValue: true,
});
console.log('clicked microphone gate:', clicked.result.value);
await sleep(Number(clickWait));

let t = 0;
for (const at of times) {
  await sleep(Math.max(0, at - t));
  t = at;
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const file = `${prefix}-${at}ms.png`;
  await fsp.writeFile(file, Buffer.from(shot.data, 'base64'));
  console.log('saved', file);
}

await fetch(`${EP}/json/close/${target.id}`);
ws.close();
