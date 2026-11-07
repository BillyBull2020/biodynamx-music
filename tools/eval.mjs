// Open a URL in the running Chrome, wait for the app to boot, evaluate an
// expression file against the page, and print the result.
// usage: node tools/eval.mjs <url> <expr.js> [waitMs]
import fsp from 'node:fs/promises';

const EP = process.env.CDP_ENDPOINT || 'http://127.0.0.1:9333';
const [, , url, exprPath, waitMs = '1600'] = process.argv;
if (!url || !exprPath) {
  console.error('usage: node tools/eval.mjs <url> <expr.js> [waitMs]');
  process.exit(2);
}

const store = process.env.FRESH === '0' ? 'skip' : 'clear';
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
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 892, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url });
await new Promise((r) => setTimeout(r, 900));

if (store === 'clear') {
  await send('Runtime.evaluate', {
    expression: `(async () => {
      if (navigator.serviceWorker) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister())); }
      if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); }
      return 1;
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  await send('Page.navigate', { url });
}

await new Promise((r) => setTimeout(r, Number(waitMs)));

const expr = await fsp.readFile(exprPath, 'utf8');
const res = await send('Runtime.evaluate', {
  expression: expr,
  awaitPromise: true,
  returnByValue: true,
  timeout: 30000,
});
if (res.exceptionDetails) {
  console.error('EXCEPTION', JSON.stringify(res.exceptionDetails).slice(0, 1500));
  process.exitCode = 1;
} else {
  const v = res.result?.value;
  console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 1));
}

await fetch(`${EP}/json/close/${target.id}`);
ws.close();
