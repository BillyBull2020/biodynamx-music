// Minimal CDP helper using Node's built-in WebSocket client.
// usage: node cdp.mjs eval <targetId> <expressionFile>
//        node cdp.mjs list
const EP = process.env.CDP_ENDPOINT || 'http://127.0.0.1:9333';

async function targets() {
  const r = await fetch(`${EP}/json/list`);
  return r.json();
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    ws.addEventListener('open', () => resolve({
      send(method, params = {}) {
        return new Promise((res, rej) => {
          const mid = ++id;
          pending.set(mid, { res, rej });
          ws.send(JSON.stringify({ id: mid, method, params }));
        });
      },
      close() { ws.close(); },
    }));
    ws.addEventListener('error', (e) => reject(new Error('ws error ' + (e.message || ''))));
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result);
      }
    });
  });
}

const [, , cmd, targetId, exprFile] = process.argv;

if (cmd === 'list') {
  const t = await targets();
  for (const x of t) if (x.type === 'page') console.log(`${x.id}\t${x.url}\t${x.title}`);
} else if (cmd === 'eval') {
  const t = await targets();
  const target = t.find((x) => x.id === targetId) || t.find((x) => x.type === 'page' && x.url.includes(targetId));
  if (!target) { console.error('target not found'); process.exit(2); }
  const fs = await import('node:fs/promises');
  const expr = await fs.readFile(exprFile, 'utf8');
  const c = await connect(target.webSocketDebuggerUrl);
  try {
    await c.send('Runtime.enable');
    const res = await c.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
      timeout: 60000,
    });
    if (res.exceptionDetails) {
      console.error('EXCEPTION', JSON.stringify(res.exceptionDetails).slice(0, 2000));
      process.exitCode = 1;
    } else {
      const v = res.result?.value;
      process.stdout.write(typeof v === 'string' ? v : JSON.stringify(v, null, 1));
    }
  } finally { c.close(); }
} else {
  console.log('usage: node cdp.mjs list | eval <targetId> <exprFile>');
}
