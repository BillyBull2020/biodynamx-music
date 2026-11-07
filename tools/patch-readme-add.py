"""Document the importer and the copyright position."""
import io

P = r"README.md"
s = io.open(P, encoding="utf-8").read()

anchor = "**A band that costs nothing.**"
assert s.count(anchor) == 1, "anchor"

block = """**300 pieces, and you can add your own.** The shipped catalogue is 261 songs
plus 39 riffs, drills and drum charts — all public domain or written for this
app: Bach, Beethoven, Tchaikovsky, Christmas carols, Stephen Foster, Scott
Joplin, sea shanties, fiddle tunes, spirituals, hymns, nursery rhymes, and the
rock/blues/campfire originals from earlier.

**Add any song you know.** Songs → **Add**: type a chord chart (`G C D Em`) or
paste tab, and it becomes a normal playable piece — same highway, same grading,
same stars. It is stored in your browser only. It is never uploaded and it is
not in this repo.

**Why the hits are missing.** Popular songs are copyrighted; their melodies and
arrangements cannot be redistributed. Nothing in the catalogue is a copy of a
commercial recording, and no song content was extracted from Yousician — their
app ships no web client, and its catalogue was never part of this project's
evidence (see docs/REA-FINDINGS.md). If you want the top 40, add them yourself
with the Add screen: for one person's private practice that is the right tool,
and it keeps this repo clean.

"""

s = s.replace(anchor, block + anchor)
io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("README: importer + copyright position documented")
