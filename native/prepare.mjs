#!/usr/bin/env node
/**
 * Copy the web app into the Capacitor project.
 *
 *   node native/prepare.mjs
 *
 * Keeps a single source of truth (www/) and never hand-edits the native copy.
 * Also writes the permission snippets the platforms need, so a fresh
 * `npx cap add android|ios` is easy to complete correctly.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const SRC = path.join(ROOT, 'www');
const DEST = path.join(HERE, 'capacitor', 'www');

async function copyDir(from, to) {
  await fs.mkdir(to, { recursive: true });
  const entries = await fs.readdir(from, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else if (entry.isFile()) await fs.copyFile(s, d);
  }
}

const stat = await fs.stat(SRC).catch(() => null);
if (!stat) {
  console.error(`No web app at ${SRC}`);
  process.exit(1);
}

await fs.rm(DEST, { recursive: true, force: true });
await copyDir(SRC, DEST);

let files = 0;
async function count(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) await count(path.join(dir, e.name));
    else files++;
  }
}
await count(DEST);

console.log(`Copied ${files} files to ${path.relative(ROOT, DEST)}`);
console.log('');
console.log('Next steps (once):');
console.log('  npx cap add android');
console.log('  npx cap add ios');
console.log('');
console.log('Then add the microphone permissions — see native/README.md:');
console.log('  Android: <uses-permission android:name="android.permission.RECORD_AUDIO" />');
console.log('  iOS:     NSMicrophoneUsageDescription in Info.plist');
