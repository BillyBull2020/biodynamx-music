(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  location.hash = '#/songs';
  await sleep(1200);
  const screen = document.querySelector('.screen');
  if (!screen) return JSON.stringify({ error: 'no screen', hash: location.hash, body: document.body.innerText.slice(0, 200) });

  const chips = [...document.querySelectorAll('.chip')].filter((c) => c.tagName === 'BUTTON');
  const counts = {};
  for (const chip of chips) {
    chip.click();
    await sleep(200);
    const label = chip.textContent.trim();
    const countText = [...document.querySelectorAll('.sub')].map((n) => n.textContent).find((t) => /piece/.test(t));
    counts[label] = countText || '?';
  }
  return JSON.stringify({ chips: chips.map((c) => c.textContent.trim()), counts }, null, 1);
})()
