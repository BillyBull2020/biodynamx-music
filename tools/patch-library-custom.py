"""Teach library.js about custom songs."""
import io

P = r"www/js/content/library.js"
s = io.open(P, encoding="utf-8").read()

if "buildCustom" in s:
    print("already wired")
    raise SystemExit(0)

imp = "import { parseMelody, simplify } from './tunes/notation.js';"
assert s.count(imp) == 1
s = s.replace(
    imp,
    imp + "\nimport { customSongs, customSong } from '../util/storage.js';\nimport { buildCustom } from './custom.js';",
)

# getTrack: try a custom song first, then the built-in registry.
old_head = """export function getTrack(id) {
  if (cache.has(id)) return cache.get(id);
  const spec = SPECS[id];
  if (!spec) return null;"""
new_head = """export function getTrack(id) {
  if (cache.has(id)) return cache.get(id);

  // Custom songs live in storage, not in the SPECS registry.
  const custom = String(id).startsWith('mine-') ? customSong(id) : null;
  if (custom) {
    const built = buildCustom(custom);
    if (built) {
      const track = makeTrack({
        id: custom.id,
        title: custom.title || 'My song',
        subtitle: 'Added by you',
        kind: 'song',
        level: custom.level || 3,
        bpm: custom.bpm || 90,
        beatsPerBar: custom.beatsPerBar || 4,
        difficulty: 2,
        tags: ['mine'],
        about: custom.body ? `Your own chart. ${custom.format === 'tab' || /^[A-Ga-g]/.test(custom.body) ? 'Tab' : 'Chords'}: ${String(custom.body).split('\\n')[0].slice(0, 80)}` : '',
        notes: built.notes || [],
        chords: built.chords || [],
        tuningId: built.tuningId || 'standard',
        mode: built.mode,
      });
      cache.set(id, track);
      return track;
    }
  }

  const spec = SPECS[id];
  if (!spec) return null;"""
assert s.count(old_head) == 1, "getTrack head anchor"
s = s.replace(old_head, new_head)

# allItems: append custom songs
old_all = """export function allItems() {
  return itemIds()
    .map((id) => ({ id, ...SPECS[id] }))
    .filter((s) => s && s.title);
}"""
new_all = """export function allItems() {
  const builtIn = itemIds()
    .map((id) => ({ id, ...SPECS[id] }))
    .filter((s) => s && s.title);
  // Custom songs come last so the public-domain catalogue stays first in the list.
  const mine = customSongs().map((c) => ({
    id: c.id,
    title: c.title || 'My song',
    subtitle: 'Added by you',
    kind: 'song',
    level: c.level || 3,
    bpm: c.bpm || 90,
    difficulty: 2,
    tags: ['mine'],
  }));
  return [...builtIn, ...mine];
}"""
assert s.count(old_all) == 1, "allItems anchor"
s = s.replace(old_all, new_all)

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("library.js: custom songs wired")
