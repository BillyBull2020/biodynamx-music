"""Add a customSongs store to storage.js."""
import io

P = r"www/js/util/storage.js"
s = io.open(P, encoding="utf-8").read()

if "customSongs" in s:
    print("already present")
    raise SystemExit(0)

# 1) default bucket
anchor = "  recentlyPlayed: [],\n};"
assert s.count(anchor) == 1, "defaults anchor"
s = s.replace(
    anchor,
    "  recentlyPlayed: [],\n"
    "  // Songs the player added themselves. Local only, never uploaded.\n"
    "  customSongs: [],\n};",
)

# 2) helpers at the end
s += r'''

/* --------------------------------------------------------- your own songs */

/** All custom songs, newest first. */
export function customSongs() {
  const s = load();
  return Array.isArray(s.customSongs) ? s.customSongs : [];
}

export function customSong(id) {
  return customSongs().find((c) => c.id === id) || null;
}

export function addCustomSong(song) {
  const s = load();
  if (!Array.isArray(s.customSongs)) s.customSongs = [];
  s.customSongs = [song, ...s.customSongs.filter((c) => c.id !== song.id)];
  flush();
  return song;
}

export function removeCustomSong(id) {
  const s = load();
  s.customSongs = (s.customSongs || []).filter((c) => c.id !== id);
  delete s.items[id];
  flush();
}
'''
io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("storage.js: customSongs added")
