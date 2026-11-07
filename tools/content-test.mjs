/**
 * Content validation. Builds every item and checks it is musically and
 * mechanically sane before it ever reaches the UI.
 *
 * Run: node tools/content-test.mjs
 */
import { allItems, getTrack, LEVELS, pathItemIds, songs, riffOfTheDay } from '../www/js/content/library.js';
import { noteWithOctave } from '../www/js/music/theory.js';

let fail = 0;
const problems = [];

function bad(id, msg) {
  fail++;
  problems.push(`${id}: ${msg}`);
}

const items = allItems();
console.log(`Items in library: ${items.length}\n`);
console.log('id                        kind     lvl  bpm  evts  bars  span(s)  range');
console.log('-'.repeat(84));

const seen = new Set();
for (const spec of items) {
  const t = getTrack(spec.id);
  if (!t) {
    bad(spec.id, 'getTrack returned null');
    continue;
  }
  if (seen.has(spec.id)) bad(spec.id, 'duplicate id');
  seen.add(spec.id);

  if (t.events.length === 0) bad(spec.id, 'no events');
  if (t.totalBeats <= 0) bad(spec.id, 'zero length');
  if (!isFinite(t.bpm) || t.bpm < 30 || t.bpm > 240) bad(spec.id, `suspicious bpm ${t.bpm}`);
  if (!(t.beatsPerBar >= 2 && t.beatsPerBar <= 8)) bad(spec.id, `bad beatsPerBar ${t.beatsPerBar}`);

  for (const e of t.events) {
    if (!isFinite(e.beat) || e.beat < 0) bad(spec.id, `bad beat ${e.beat}`);
    if (e.beat > t.totalBeats + 0.001) bad(spec.id, `event past end (${e.beat} > ${t.totalBeats})`);
    if (!isFinite(e.durBeats) || e.durBeats <= 0) bad(spec.id, `bad duration ${e.durBeats}`);
    if (!e.midis.length) bad(spec.id, 'event without midis');
    for (const m of e.midis) {
      if (!isFinite(m) || m < 28 || m > 96) bad(spec.id, `midi out of guitar range: ${m}`);
    }
    if (e.isChord && e.midis.length < 2) bad(spec.id, `chord with ${e.midis.length} note(s)`);
    if (!e.isChord && e.midis.length !== 1) bad(spec.id, `melody note with ${e.midis.length} notes`);
  }

  // A note shorter than ~60 ms at the item tempo cannot be judged reliably.
  const minDurBeats = t.events.reduce((m, e) => Math.min(m, e.durBeats), Infinity);
  const minMs = (minDurBeats * 60000) / t.bpm;
  if (minMs < 55) bad(spec.id, `note too short to judge: ${minMs.toFixed(0)} ms`);

  // A melody event may legitimately sound two strings at once (a double stop);
  // makeTrack merges those into one chord event, so duplicates here are a typo.
  if (t.mode === 'melody') {
    const keyed = new Map();
    for (const e of t.events) {
      const k = e.beat.toFixed(3);
      if (keyed.has(k)) bad(spec.id, `two melody events on beat ${e.beat}`);
      keyed.set(k, true);
    }
  }

  const bars = t.totalBeats / t.beatsPerBar;
  console.log(
    `${spec.id.padEnd(24)} ${spec.kind.padEnd(8)} ${String(t.level).padStart(3)} ${String(t.bpm).padStart(4)} ` +
      `${String(t.events.length).padStart(5)} ${String(Math.round(bars * 10) / 10).padStart(5)} ` +
      `${t.seconds.toFixed(1).padStart(7)}  ${noteWithOctave(t.minMidi)}..${noteWithOctave(t.maxMidi)}`,
  );
}

// Path integrity
const ids = new Set(allItems().map((i) => i.id));
const path = pathItemIds();
console.log(`\nPath: ${LEVELS.length} levels, ${path.length} tasks, ${new Set(path).size} unique`);
for (const id of path) if (!ids.has(id)) bad('path', `references missing item "${id}"`);
for (const level of LEVELS) {
  if (level.missions.length === 0) bad(`level ${level.n}`, 'no missions');
  for (const m of level.missions) if (m.items.length === 0) bad(`level ${level.n}/${m.title}`, 'no items');
}
const orphan = [...ids].filter((id) => !path.includes(id));
if (orphan.length) console.log(`Not in the path (fine, reachable from Songs): ${orphan.join(', ')}`);

// Determinism of the daily pick
const a = riffOfTheDay('2026-01-01');
const b = riffOfTheDay('2026-01-01');
const c = riffOfTheDay('2026-01-02');
if (a !== b) bad('riffOfTheDay', 'not deterministic');
console.log(`Riff of the day: ${a} (next day ${c})`);

console.log(`\nSongs: ${songs().length}`);
console.log(`${'='.repeat(60)}`);
if (fail) {
  console.log(`FAIL ${fail}`);
  for (const p of problems.slice(0, 60)) console.log('  -', p);
  process.exitCode = 1;
} else {
  console.log('All content checks passed.');
}
