"""Fix the save button label: it was computed once at creation, so bulk mode
never showed 'Add them all'."""
import io

P = r"www/js/ui/screens/add-song.js"
s = io.open(P, encoding="utf-8").read()

if "saveBtn" in s:
    print("already patched")
    raise SystemExit(0)

# create the button early so setFormat can relabel it
anchor = "  const fmtSeg = el('div.seg', {}, ["
assert s.count(anchor) == 1, "fmtSeg anchor"
s = s.replace(
    anchor,
    """  const saveBtnLabel = el('span', { text: 'Save and practise' });
  const saveBtn = el(
    'button.btn.btn--primary.btn--lg.btn--block',
    { type: 'button', onclick: () => saveAll() },
    [icon('check', 18), saveBtnLabel],
  );

  const fmtSeg = el('div.seg', {}, [""",
)

# relabel inside setFormat
a2 = "    body.style.minHeight = bulk ? '200px' : '130px';"
assert s.count(a2) == 1, "setFormat anchor"
s = s.replace(a2, a2 + "\n    saveBtnLabel.textContent = bulk ? 'Add them all' : 'Save and practise';")

# use the early button in the layout
a3 = """    el('div.vstack', { style: { gap: '8px', marginTop: '16px' } }, [
      el('button.btn.btn--primary.btn--lg.btn--block', { type: 'button', onclick: () => saveAll() }, [
        icon('check', 18),
        format === 'bulk' ? 'Add them all' : 'Save and practise',
      ]),
    ]),"""
assert s.count(a3) == 1, "save button anchor"
s = s.replace(a3, "    el('div.vstack', { style: { gap: '8px', marginTop: '16px' } }, [saveBtn]),")

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("add-song.js: save button relabels in bulk mode")
