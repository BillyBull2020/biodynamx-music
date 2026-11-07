"""Wire the progressions screen, home entry, filter chip, and bump the build."""
import io

# --- main.js route ----------------------------------------------------------
M = r"www/js/main.js"
m = io.open(M, encoding="utf-8").read()
if "progressionsScreen" not in m:
    a = "import { addSongScreen } from './ui/screens/add-song.js';"
    assert m.count(a) == 1
    m = m.replace(a, a + "\nimport { progressionsScreen } from './ui/screens/progressions.js';")
    r = "define('/add', wrap(addSongScreen));"
    assert m.count(r) == 1
    m = m.replace(r, r + "\ndefine('/progressions', wrap(progressionsScreen));")
    io.open(M, "w", encoding="utf-8", newline="\n").write(m)
    print("main.js: /progressions route")

# --- home entry -------------------------------------------------------------
H = r"www/js/ui/screens/home.js"
h = io.open(H, encoding="utf-8").read()
if "navigate('/progressions')" not in h:
    a = """      el('button.row', { type: 'button', onclick: () => navigate('/drums') }, ["""
    assert h.count(a) == 1, "home drums row"
    h = h.replace(
        a,
        """      el('button.row', { type: 'button', onclick: () => navigate('/progressions') }, [
        el('div.row__badge', {}, [icon('scale', 16)]),
        el('div.row__main', {}, [
          el('div.row__title', { text: 'Progressions' }),
          el('div.row__meta', { text: '12 patterns x 12 keys - the songs behind the songs' }),
        ]),
        el('span', { style: { color: 'var(--muted-2)', display: 'flex' } }, [icon('next', 16)]),
      ]),
      el('button.row', { type: 'button', onclick: () => navigate('/drums') }, [""",
    )
    io.open(H, "w", encoding="utf-8", newline="\n").write(h)
    print("home.js: progressions row")

# --- songs filter chip + search placeholder --------------------------------
L = r"www/js/ui/screens/library.js"
s = io.open(L, encoding="utf-8").read()
if "id: 'progression'" not in s:
    a = "  { id: 'campfire', label: 'Campfire' },"
    assert s.count(a) == 1
    s = s.replace(a, "  { id: 'progression', label: 'Progressions' },\n" + a)
    io.open(L, "w", encoding="utf-8", newline="\n").write(s)
    print("library screen: Progressions chip")

# --- service worker + version ----------------------------------------------
W = r"www/sw.js"
w = io.open(W, encoding="utf-8").read()
w = w.replace("const VERSION = 'bdm-v5';", "const VERSION = 'bdm-v6';")
if "progressions.js" not in w:
    a = "  'js/content/custom.js',"
    assert w.count(a) == 1
    w = w.replace(a, a + "\n  'js/content/progressions.js',")
if "progressions screen" not in w:
    a2 = "  'js/ui/screens/add-song.js',"
    assert w.count(a2) == 1
    w = w.replace(a2, a2 + "\n  'js/ui/screens/progressions.js',")
io.open(W, "w", encoding="utf-8", newline="\n").write(w)
print("sw.js -> bdm-v6")

V = r"www/js/version.js"
v = io.open(V, encoding="utf-8").read()
v = v.replace("APP_VERSION = '6'", "APP_VERSION = '7'")
io.open(V, "w", encoding="utf-8", newline="\n").write(v)
print("version.js -> v7")
