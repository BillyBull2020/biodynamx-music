"""Use lookupChord() in the importer so enharmonic spellings resolve."""
import io

P = r"www/js/content/custom.js"
s = io.open(P, encoding="utf-8").read()

if "lookupChord" in s:
    print("already patched")
    raise SystemExit(0)

s = s.replace(
    "import { CHORDS } from '../music/theory.js';",
    "import { lookupChord } from '../music/theory.js';",
)
s = s.replace(
    "    const shape = CHORDS[name];",
    "    const shape = lookupChord(name);",
)
io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("custom.js uses lookupChord")
