(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const setVal = (node, value) => {
    const proto = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(node, value);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  };

  location.hash = '#/add';
  await sleep(700);

  const title = document.querySelector('input[type="text"]');
  const body = document.querySelector('textarea');
  if (!title || !body) return JSON.stringify({ error: 'form not found', body: document.body.innerText.slice(0, 200) });

  setVal(title, 'Test Song Alpha');
  setVal(body, 'G C D Em G C D G');
  await sleep(300);

  const hint = [...document.querySelectorAll('.tiny')].map((n) => n.textContent).join(' | ');

  const saveOnly = [...document.querySelectorAll('button')].find((b) => /Save only/i.test(b.textContent || ''));
  if (!saveOnly) return JSON.stringify({ error: 'save button missing' });
  saveOnly.click();
  await sleep(900);

  // back on the songs screen: filter to Mine and confirm it is listed
  const mineChip = [...document.querySelectorAll('.chip')].find((c) => c.textContent.trim() === 'Mine');
  mineChip?.click();
  await sleep(500);
  const listed = document.body.innerText.includes('Test Song Alpha');
  const rows = document.querySelectorAll('.screen button.row').length;

  // open it and start a practice run
  const row = [...document.querySelectorAll('.screen button.row')].find((r) => /Test Song Alpha/.test(r.innerText));
  row?.click();
  await sleep(700);
  const detailShows = document.body.innerText.includes('Delete this song');

  const practice = [...document.querySelectorAll('button')].find((b) => /Practice — the song waits/i.test(b.textContent || ''));
  practice?.click();
  await sleep(1200);
  const gate = [...document.querySelectorAll('button')].find((b) => /Turn on microphone/i.test(b.textContent || ''));
  gate?.click();
  await sleep(2200);
  const inSession = !!document.querySelector('canvas');

  const stored = JSON.parse(localStorage.getItem('biodynamx.music.v1') || '{}');
  const saved = (stored.customSongs || []).map((c) => c.title);

  return JSON.stringify(
    {
      hint: hint.slice(0, 160),
      listedOnMine: listed,
      rowsOnMine: rows,
      detailHasDelete: detailShows,
      sessionStarted: inSession,
      savedSongs: saved,
    },
    null,
    1,
  );
})()
