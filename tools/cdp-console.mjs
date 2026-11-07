// CDP console collector: loads a URL in the already-running Chrome and reports
// console output, uncaught exceptions and failed requests for N seconds.
// usage: node cdp-console.mjs <url> [seconds]
const EP = process.env.CDP_ENDPOINT || 'http://127.0.0.1:9333';
const url = process.argv[2];
const seconds = Number(process.argv[3] || 6);

if (!url) {
  console.error('usage: node cdp-console.mjs <url> [seconds]');
  process.exit(2);
}

const res = await fetch(`${EP}/json/new?about:blank`, { method: 'PUT' });
const target = await res.json();

const ws = new WebSocket(target.webSocketDebuggerUrl);
const events = [];
const pending = new Map();
let id = 0;

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}

await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve);
  ws.addEventListener('error', reject);
});

ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
    return;
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    const text = (msg.params.args || [])
      .map((a) => (a.value !== undefined ? String(a.value) : a.description || a.type))
      .join(' ');
    events.push({ kind: msg.params.type, text });
  } else if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    events.push({ kind: 'exception', text: d.exception?.description || d.text });
  } else if (msg.method === 'Log.entryAdded') {
    const e = msg.params.entry;
    events.push({ kind: e.level, text: `${e.source}: ${e.text}${e.url ? ` (${e.url})` : ''}` });
  } else if (msg.method === 'Network.loadingFailed') {
    events.push({ kind: 'netfail', text: `${msg.params.type} ${msg.params.errorText}` });
  } else if (msg.method === 'Network.responseReceived') {
    const r = msg.params.response;
    if (r.status >= 400) events.push({ kind: 'http', text: `${r.status} ${r.url}` });
  }
});

await send('Runtime.enable');
await send('Log.enable');
await send('Network.enable');
await send('Page.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', {
  width: 412,
  height: 892,
  deviceScaleFactor: 2,
  mobile: true,
});

// A registered service worker serves the previous build from cache, which makes
// automated checks see stale files. Clear it and the cache stores first.
await send('Page.navigate', { url });
await new Promise((r) => setTimeout(r, 1200));
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
     return 'cleared';
   })()`,
  awaitPromise: true,
  returnByValue: true,
});
await send('Page.navigate', { url });

await new Promise((r) => setTimeout(r, seconds * 1000));

const info = await send('Runtime.evaluate', {
  expression: `JSON.stringify({
    title: document.title,
    url: location.href,
    body: (document.body.innerText || '').slice(0, 1500),
    appChildren: document.getElementById('app')?.children.length || 0,
    hasTabbar: !!document.querySelector('.tabbar'),
    hasCanvas: !!document.querySelector('canvas'),
  })`,
  returnByValue: true,
});
console.log('--- PAGE ---');
console.log(info.result.value);
console.log('--- EVENTS ---');
for (const e of events) console.log(`[${e.kind}] ${e.text.slice(0, 400)}`);
if (events.length === 0) console.log('(none)');

await fetch(`${EP}/json/close/${target.id}`);
ws.close();
