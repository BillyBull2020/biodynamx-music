"""Repair double-encoded UTF-8 in source files.

A PowerShell round-trip (Get-Content -Raw -> Set-Content/WriteAllText) read UTF-8
bytes as Windows-1252 and wrote the resulting mojibake back out as UTF-8. This
reverses exactly that: decode as UTF-8, re-encode to bytes as cp1252, decode those
bytes as UTF-8 again.

Run: python tools/fix_encoding.py [--dry-run]
"""
import glob
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY = "--dry-run" in sys.argv

MARKERS = ("\u00c2", "\u00e2\u20ac", "\u00ef\u00bb\u00bf")


def looks_mojibake(s):
    return any(m in s for m in MARKERS)


def repair(s):
    try:
        return s.encode("cp1252").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return None


targets = []
for pattern in ("www/**/*.js", "www/*.html", "www/**/*.css", "www/*.webmanifest", "tools/*.mjs"):
    targets.extend(glob.glob(os.path.join(ROOT, pattern), recursive=True))

changed = 0
for path in sorted(set(targets)):
    raw = open(path, "rb").read()
    had_bom = raw.startswith(b"\xef\xbb\xbf")
    if had_bom:
        raw = raw[3:]
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        print(f"SKIP (not utf-8) {path}")
        continue
    if not looks_mojibake(text):
        if had_bom and not DRY:
            open(path, "wb").write(raw)
        continue
    fixed = repair(text)
    if fixed is None:
        print(f"FAIL (cp1252 round-trip) {os.path.relpath(path, ROOT)}")
        continue
    if looks_mojibake(fixed):
        print(f"WARN still has markers {os.path.relpath(path, ROOT)}")
    print(f"fix  {os.path.relpath(path, ROOT):<55} {len(text)} -> {len(fixed)} chars")
    if not DRY:
        open(path, "wb").write(fixed.encode("utf-8"))
    changed += 1

print(f"\n{changed} file(s) repaired" + (" (dry run)" if DRY else ""))
