"""One-shot patcher: add a Drums tile to the Tools hub."""
import io

P = r"www/js/ui/screens/tools.js"
s = io.open(P, encoding="utf-8").read()

anchor = "      tile({ title: 'Scale check', meta: 'Play any scale', iconName: 'scale', onClick: () => navigate('/scale') }),"
addition = "\n      tile({ title: 'Drums', meta: 'Play the kit', iconName: 'metronome', onClick: () => navigate('/drums') }),"

assert s.count(anchor) == 1, f"anchor count {s.count(anchor)}"
if "/drums" in s:
    print("already patched")
else:
    io.open(P, "w", encoding="utf-8", newline="\n").write(s.replace(anchor, anchor + addition))
    print("tools.js patched: drums tile added")
