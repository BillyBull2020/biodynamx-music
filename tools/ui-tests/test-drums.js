(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tap = (lane) => {
    const pad = document.querySelector(`.pad[data-lane="${lane}"]`);
    if (!pad) return false;
    pad.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    return true;
  };

  const gate = [...document.querySelectorAll('button')].find((b) => /Turn on microphone/i.test(b.textContent || ''));
  if (!gate) return JSON.stringify({ error: 'gate button missing', body: document.body.innerText.slice(0, 300) });
  gate.click();
  await sleep(1400);

  const pads = document.querySelectorAll('.pad').length;
  const started = !document.querySelector('.game__canvas') ? false : true;

  // Practice mode waits for each note, so cycling the pads will always reach the
  // lane the chart is asking for. This exercises the real judge, not a mock.
  const seen = [];
  let lane = 0;
  for (let i = 0; i < 400; i++) {
    const result = document.querySelector('.result');
    if (result) {
      seen.push(result.innerText.replace(/\s+/g, ' ').slice(0, 300));
      break;
    }
    tap(lane % 4);
    lane++;
    await sleep(45);
  }

  const resultEl = document.querySelector('.result');
  return JSON.stringify(
    {
      pads,
      started,
      result: resultEl ? resultEl.innerText.replace(/\s+/g, ' ').slice(0, 400) : null,
      taps: lane,
      timeline: seen,
    },
    null,
    1,
  );
})()
