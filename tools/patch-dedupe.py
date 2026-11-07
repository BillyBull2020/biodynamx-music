"""Dedupe custom songs by title so re-pasting a list updates instead of stacking."""
import io

P = r"www/js/util/storage.js"
s = io.open(P, encoding="utf-8").read()

old = """export function addCustomSong(song) {
  const s = load();
  if (!Array.isArray(s.customSongs)) s.customSongs = [];
  s.customSongs = [song, ...s.customSongs.filter((c) => c.id !== song.id)];
  flush();
  return song;
}"""
new = """export function addCustomSong(song) {
  const s = load();
  if (!Array.isArray(s.customSongs)) s.customSongs = [];
  // Re-pasting a list should update, not stack duplicates: match on title.
  const title = String(song.title || '').trim().toLowerCase();
  s.customSongs = [
    song,
    ...s.customSongs.filter((c) => c.id !== song.id && String(c.title || '').trim().toLowerCase() !== title),
  ];
  flush();
  return song;
}"""
assert s.count(old) == 1, "addCustomSong anchor"
s = s.replace(old, new)
io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("storage.js: custom songs dedupe by title")
