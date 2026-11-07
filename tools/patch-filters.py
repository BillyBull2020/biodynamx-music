"""Add Folk and Classical filter chips, and bump the build."""
import io

P = r"www/js/ui/screens/library.js"
s = io.open(P, encoding="utf-8").read()

old = """  { id: 'drums', label: 'Drums' },
  { id: 'riff', label: 'Riffs' },
  { id: 'drill', label: 'Drills' },"""
new = """  { id: 'drums', label: 'Drums' },
  { id: 'folk', label: 'Folk' },
  { id: 'classical', label: 'Classical' },
  { id: 'blues', label: 'Blues' },
  { id: 'riff', label: 'Riffs' },
  { id: 'drill', label: 'Drills' },"""
assert s.count(old) == 1, f"filters anchor {s.count(old)}"
s = s.replace(old, new)
io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("library.js: Folk / Classical / Blues chips added")

W = r"www/sw.js"
w = io.open(W, encoding="utf-8").read()
w = w.replace("const VERSION = 'bdm-v3';", "const VERSION = 'bdm-v4';")
io.open(W, "w", encoding="utf-8", newline="\n").write(w)
print("sw.js -> bdm-v4")

V = r"www/js/version.js"
v = io.open(V, encoding="utf-8").read()
v = v.replace("APP_VERSION = '4'", "APP_VERSION = '5'")
io.open(V, "w", encoding="utf-8", newline="\n").write(v)
print("version.js -> v5")
