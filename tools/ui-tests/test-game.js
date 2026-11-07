(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const snap = () => ({
    hud: document.querySelector('.game__hud')?.innerText.replace(/\s+/g, ' ').slice(0, 120) || null,
    callout: document.querySelector('.callout')?.textContent || null,
    result: document.querySelector('.result') ? document.querySelector('.result').innerText.replace(/\s+/g, ' ').slice(0, 500) : null,
    hasCanvas: !!document.querySelector('canvas'),
  });

  const btn = [...document.querySelectorAll('button')].find((b) => /Turn on microphone/i.test(b.textContent || ''));
  if (!btn) return JSON.stringify({ error: 'gate button missing', body: document.body.innerText.slice(0, 300) });
  btn.click();

  const timeline = [];
  for (let i = 0; i < 26; i++) {
    await sleep(500);
    const s = snap();
    timeline.push({ t: (i + 1) * 0.5, ...s });
    if (s.result) break;
  }
  return JSON.stringify(
    {
      last: timeline[timeline.length - 1],
      milestones: timeline.filter((x, i) => i === 0 || i % 4 === 0 || x.result),
      totalSeconds: timeline[timeline.length - 1].t,
    },
    null,
    1,
  );
})()
