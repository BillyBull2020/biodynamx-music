"""Wire the Add-a-song screen: route, Songs button, Mine filter, delete."""
import io

# --- main.js: route ---------------------------------------------------------
M = r"www/js/main.js"
m = io.open(M, encoding="utf-8").read()
if "addSongScreen" not in m:
    a = "import { drumsScreen } from './ui/screens/drums.js';"
    assert m.count(a) == 1
    m = m.replace(a, a + "\nimport { addSongScreen } from './ui/screens/add-song.js';")
    r = "define('/drums', wrap(drumsScreen));"
    assert m.count(r) == 1
    m = m.replace(r, r + "\ndefine('/add', wrap(addSongScreen));")
    io.open(M, "w", encoding="utf-8", newline="\n").write(m)
    print("main.js: /add route")
else:
    print("main.js already wired")

# --- library screen ---------------------------------------------------------
L = r"www/js/ui/screens/library.js"
s = io.open(L, encoding="utf-8").read()

# custom-song helpers must be a static import; a dynamic import would need an
# async screen function, which the router does not expect.
old_imp = "import { itemProgress } from '../../util/storage.js';"
if old_imp in s:
    s = s.replace(old_imp, "import { itemProgress, customSong, removeCustomSong } from '../../util/storage.js';")
    print("library screen: static import for custom songs")

if "id: 'mine'" not in s:
    a = "  { id: 'drill', label: 'Drills' },"
    assert s.count(a) == 1
    s = s.replace(a, "  { id: 'drill', label: 'Drills' },\n  { id: 'mine', label: 'Mine' },")
    print("library screen: Mine filter")

if "navigate('/add')" not in s:
    a = "  const search = el('input', {"
    assert s.count(a) == 1
    s = s.replace(
        a,
        """  const addBtn = el(
    'button.btn.btn--sm.btn--primary',
    {
      type: 'button',
      style: { flex: 'none' },
      onclick: () => navigate('/add'),
    },
    [icon('check', 14), 'Add'],
  );

  const search = el('input', {""",
    )
    a2 = "    search,\n"
    assert s.count(a2) == 1
    s = s.replace(a2, "    el('div.hstack', { style: { gap: '8px' } }, [search, addBtn]),\n")
    print("library screen: Add button")

if "removeCustomSong(mine.id)" not in s:
    a3 = "  const prog = itemProgress(params.id);"
    assert s.count(a3) == 1
    s = s.replace(a3, "  const prog = itemProgress(params.id);\n  const mine = customSong(params.id);")
    a4 = "    el('p.tiny', {\n      style: { marginTop: '12px' },\n      text:\n        t.mode === 'drums'"
    assert s.count(a4) == 1, "item tail anchor"
    s = s.replace(
        a4,
        """    mine
      ? el('button.btn.btn--danger.btn--block', {
          type: 'button',
          style: { marginTop: '10px' },
          text: 'Delete this song',
          onclick: () => {
            removeCustomSong(mine.id);
            navigate('/songs', { replace: true });
          },
        })
      : null,
    el('p.tiny', {
      style: { marginTop: '12px' },
      text:
        t.mode === 'drums'""",
    )
    print("library screen: delete control")

io.open(L, "w", encoding="utf-8", newline="\n").write(s)

# --- service worker ---------------------------------------------------------
W = r"www/sw.js"
w = io.open(W, encoding="utf-8").read()
w = w.replace("const VERSION = 'bdm-v4';", "const VERSION = 'bdm-v5';")
pairs = [
    ("  'js/content/library.js',", "  'js/content/custom.js',"),
    (
        "  'js/ui/screens/drums.js',",
        "  'js/ui/screens/add-song.js',\n"
        "  'js/content/tunes/index.js',\n"
        "  'js/content/tunes/notation.js',\n"
        "  'js/content/tunes/classical.js',\n"
        "  'js/content/tunes/folk.js',\n"
        "  'js/content/tunes/kids-blues.js',",
    ),
]
for anchor, extra in pairs:
    first = extra.split(",")[0].strip()
    if first in w:
        continue
    assert w.count(anchor) == 1, f"sw anchor {anchor}"
    w = w.replace(anchor, anchor + "\n" + extra)
io.open(W, "w", encoding="utf-8", newline="\n").write(w)
print("sw.js -> bdm-v5 with the new modules precached")

V = r"www/js/version.js"
v = io.open(V, encoding="utf-8").read()
v = v.replace("APP_VERSION = '5'", "APP_VERSION = '6'")
io.open(V, "w", encoding="utf-8", newline="\n").write(v)
print("version.js -> v6")
