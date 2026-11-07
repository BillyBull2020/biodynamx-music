(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const started = { hasCanvas: !!document.querySelector('canvas'), hud: document.querySelector('.game__hud')?.innerText.replace(/\s+/g, ' ') || null };
  let gateVisible = !!document.body.innerText.match(/Turn on microphone/i);

  // Do not click anything: auto-start should have begun already.
  const timeline = [];
  for (let i = 0; i < 26; i++) {
    await sleep(500);
    const result = document.querySelector('.result');
    timeline.push({ t: (i + 1) * 0.5, score: document.querySelector('.chip--ghost')?.textContent || null, result: !!result });
    if (result) {
      return JSON.stringify({
        gateShown: gateVisible,
        startedImmediately: started.hasCanvas,
        hud: started.hud,
        finishedAt: (i + 1) * 0.5,
        result: result.innerText.replace(/\s+/g, ' ').slice(0, 220),
      }, null, 1);
    }
  }
  return JSON.stringify({ gateShown: gateVisible, startedImmediately: started.hasCanvas, hud: started.hud, timeline: timeline.slice(-3), error: 'no result' }, null, 1);
})()
