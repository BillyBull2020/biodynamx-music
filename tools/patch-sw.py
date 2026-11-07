"""Bump the service worker: new version, new files in the precache list."""
import io

P = r"www/sw.js"
s = io.open(P, encoding="utf-8").read()

s = s.replace("const VERSION = 'bdm-v2';", "const VERSION = 'bdm-v3';")

adds = [
    ("  'js/main.js',", "  'js/version.js',"),
    ("  'js/ui/screens/practice.js',", "  'js/ui/screens/drums.js',"),
]
for anchor, extra in adds:
    if extra not in s:
        assert s.count(anchor) == 1, f"anchor {anchor}"
        s = s.replace(anchor, anchor + "\n" + extra)

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("sw.js -> bdm-v3 with version.js and drums screen precached")

# bump the visible app version too
V = r"www/js/version.js"
v = io.open(V, encoding="utf-8").read()
v = v.replace("APP_VERSION = '3'", "APP_VERSION = '4'").replace("APP_BUILD = '2026-11-07'", "APP_BUILD = '2026-11-08'")
io.open(V, "w", encoding="utf-8", newline="\n").write(v)
print("version.js -> v4")
