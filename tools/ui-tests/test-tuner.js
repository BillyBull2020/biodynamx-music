(async () => {
  const log = [];
  const btn = [...document.querySelectorAll('button')].find((b) => /Start microphone/i.test(b.textContent || ''));
  if (!btn) return JSON.stringify({ error: 'start button not found', body: document.body.innerText.slice(0, 400) });
  btn.click();
  await new Promise((r) => setTimeout(r, 1200));
  const samples = [];
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const noteEl = document.querySelector('.tuner__note');
    const reading = document.querySelector('.tuner .tiny');
    samples.push({
      note: noteEl ? noteEl.innerText.replace(/\s+/g, ' ') : null,
      inTune: noteEl ? noteEl.classList.contains('in-tune') : null,
      reading: reading ? reading.textContent : null,
    });
  }
  return JSON.stringify(
    {
      micState: window.__bdm?.pc || 'n/a',
      samples,
      tunerText: (document.querySelector('.tuner')?.innerText || '').slice(0, 400),
    },
    null,
    1,
  );
})()
