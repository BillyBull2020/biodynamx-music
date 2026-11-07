"""Update README + docs counts for the second content wave."""
import io

ROOT = "."

README = r"README.md"
s = io.open(README, encoding="utf-8").read()

s = s.replace(
    "**Ten levels, 53 pieces.**",
    "**Ten levels, 84 pieces.**",
)
s = s.replace(
    "**22 songs and 31 drills**, filterable by **Rock**, **Campfire**, **Love** and\n**Drums**:",
    "**45 songs and 39 riffs, drills and patterns**, filterable by **Rock**,\n**Campfire**, **Love**, **Folk**, **Classical** and **Drums**:",
)

old_lists = """- *Rock* — Redline (punk), Highway Fire, Deep Water (blues-rock), Static Bloom
- *Campfire* — Kumbaya, She'll Be Coming Round the Mountain, Oh! Susanna,
  Home on the Range, I've Been Working on the Railroad
- *Love* — Slow Burn, Only You, Lamplight, The Water Is Wide
- *Drums* — First beat, Four on the floor, Fast and loud, Half-time feel, Beat into a fill"""
new_lists = """- *Rock* (16) — Redline, Highway Fire, Deep Water, Static Bloom, Blacktop,
  Northbound, Garage Band, Open Road, Tin Roof
- *Campfire* (14) — Kumbaya, She'll Be Coming Round the Mountain, Oh! Susanna,
  Home on the Range, I've Been Working on the Railroad, Down by the Riverside,
  This Little Light of Mine, Michael Row the Boat Ashore, Swing Low,
  Wade in the Water, Will the Circle Be Unbroken, I Shall Not Be Moved
- *Love* (7) — Slow Burn, Only You, Lamplight, The Water Is Wide, Loch Lomond,
  Drink to Me Only with Thine Eyes, Plaisir d'amour
- *Folk* (6) — Red River Valley, Banks of the Ohio, Cripple Creek, Wildwood
  Flower, The Shady Grove, Shenandoah
- *Classical* (7) — Ode to Joy, Für Elise, Minuet in G, Blue Danube,
  Morning Mood, Canon in D, broken-chord study
- *Blues* (6) — Blues shuffle in A, Deep Water, Boogie bass line, Twelve-bar in E,
  Shuffle in G, Midnight Room
- *Drums* (8) — First beat, Four on the floor, Fast and loud, Half-time feel,
  Beat into a fill, Sixteenth hats, Off-beat kick, Soft shuffle"""
assert old_lists in s, "song list anchor missing"
s = s.replace(old_lists, new_lists)

io.open(README, "w", encoding="utf-8", newline="\n").write(s)
print("README updated")

# ---- user guide ------------------------------------------------------------
UG = r"docs/USER-GUIDE.md"
u = io.open(UG, encoding="utf-8").read()
u = u.replace(
    "The **Campfire** filter is five traditional singalongs that use three chords at\nmost — Kumbaya, She'll Be Coming Round the Mountain, Oh! Susanna, Home on the\nRange and I've Been Working on the Railroad. They are chord charts on purpose:\nthe point is to strum and sing, not to read a melody.",
    "The **Campfire** filter is a dozen traditional singalongs that use three chords\nat most — Kumbaya, She'll Be Coming Round the Mountain, Oh! Susanna, Home on the\nRange, I've Been Working on the Railroad, Down by the Riverside, This Little\nLight of Mine, Michael Row the Boat Ashore, Swing Low, Wade in the Water, Will\nthe Circle Be Unbroken and I Shall Not Be Moved. They are chord charts on\npurpose: the point is to strum and sing, not to read a melody.\n\nThere is also a **Folk** filter (Red River Valley, Banks of the Ohio, Cripple\nCreek, Wildwood Flower, The Shady Grove, Shenandoah) and **Classical** (Ode to\nJoy, Für Elise, Minuet in G, Blue Danube, Morning Mood, Canon in D).",
)
u = u.replace(
    "**Love** is Slow Burn, Only You, Lamplight and The Water Is Wide — slower tempos,\nsofter strums, and one fingerpicked piece.",
    "**Love** is Slow Burn, Only You, Lamplight, The Water Is Wide, Loch Lomond,\nDrink to Me Only with Thine Eyes and Plaisir d'amour — slower tempos, softer\nstrums, and a couple of fingerpicked pieces.",
)
io.open(UG, "w", encoding="utf-8", newline="\n").write(u)
print("USER-GUIDE updated")

# ---- RE findings table -----------------------------------------------------
RE = r"docs/REA-FINDINGS.md"
r = io.open(RE, encoding="utf-8").read()
r = r.replace(
    "| 10,000+ licensed songs | 22 public-domain / original songs + 31 drills, all legal to ship |",
    "| 10,000+ licensed songs | 45 public-domain / original songs + 39 riffs and drills, all legal to ship |",
)
io.open(RE, "w", encoding="utf-8", newline="\n").write(r)
print("REA-FINDINGS updated")
