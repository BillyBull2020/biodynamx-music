(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const setVal = (node, value) => {
    const proto = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  };

  location.hash = '#/add';
  await sleep(700);

  // switch to bulk mode
  const bulkTab = [...document.querySelectorAll('.seg button')].find((b) => /Whole list/i.test(b.textContent));
  if (!bulkTab) return JSON.stringify({ error: 'bulk tab missing' });
  bulkTab.click();
  await sleep(300);

  const body = document.querySelector('textarea');
  const lines = [
    "Wonderwall | Em7 G Dsus4 A7sus4",
    "Knockin' on Heaven's Door | G D Am G D C",
    'Sweet Home Alabama | D C G D C G',
    'Three Little Birds | A D A E',
    'Bad line with no pipe',
    'Unknown Chord Song | G Zz D',
  ];
  setVal(body, lines.join('\n'));
  await sleep(400);

  const hint = [...document.querySelectorAll('.tiny')].map((n) => n.textContent).join(' | ');

  const addAll = [...document.querySelectorAll('button')].find((b) => /Add them all/i.test(b.textContent));
  if (!addAll) return JSON.stringify({ error: 'add-all button missing' });
  addAll.click();
  await sleep(1200);

  const stored = JSON.parse(localStorage.getItem('biodynamx.music.v1') || '{}');
  const titles = (stored.customSongs || []).map((c) => c.title);

  // confirm they show up under Mine
  const mineChip = [...document.querySelectorAll('.chip')].find((c) => c.textContent.trim() === 'Mine');
  mineChip?.click();
  await sleep(500);
  const mineRows = document.querySelectorAll('.screen button.row').length;

  return JSON.stringify(
    {
      hint: hint.slice(0, 220),
      savedTitles: titles,
      savedCount: titles.length,
      mineRows,
      reachedAddScreen: document.body.innerText.includes('Your songs'),
    },
    null,
    1,
  );
})()
