#!/usr/bin/env node
/**
 * Zero-dependency static server for Bio Dynamx Music.
 *
 *   node tools/serve.mjs            # http://localhost:5173
 *   node tools/serve.mjs --port 8080
 *   node tools/serve.mjs --host 0.0.0.0   # reachable on your Wi-Fi (see note)
 *
 * Note on phones: microphone access requires a secure context. http://localhost
 * counts as secure, http://192.168.x.x does not. To test on a phone either
 * deploy over HTTPS or use the Capacitor app in native/. For a quick LAN test
 * with a self-signed certificate, use tools/serve-https.mjs.
 */
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'www');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const PORT = Number(getArg('port', process.env.PORT || 5173));
const HOST = getArg('host', '127.0.0.1');

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const filePath = path.join(ROOT, pathname);

    // Never serve outside the web root.
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    let stat = null;
    try {
      stat = await fsp.stat(filePath);
    } catch {
      stat = null;
    }

    if (!stat || !stat.isFile()) {
      // SPA fallback: unknown paths render the app, which routes by hash.
      const fallback = path.join(ROOT, 'index.html');
      const body = await fsp.readFile(fallback);
      res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-cache' });
      res.end(body);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=0, must-revalidate',
      'service-worker-allowed': '/',
    };
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain' }).end(`Server error: ${err.message}`);
  }
});

server.listen(PORT, HOST, () => {
  const shown = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`Bio Dynamx Music → http://${shown}:${PORT}`);
  console.log(`Serving ${ROOT}`);
  if (HOST !== '127.0.0.1' && HOST !== 'localhost') {
    console.log('Reminder: microphones need HTTPS (or localhost). Use a tunnel or native/ for phones.');
  }
});
