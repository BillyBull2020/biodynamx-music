(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  location.hash = '#/songs';
  await sleep(600);
  const chips = [...document.querySelectorAll('.chip')].filter((c) => c.tagName === 'BUTTON');
  const out = { chips: chips.map((c) => c.textContent.trim()) };
  const counts = {};
  for (const chip of chips) {
    chip.click();
    await sleep(220);
    const rows = document.querySelectorAll('.screen button.row').length;
    counts[chip.textContent.trim()] = rows;
  }
  out.counts = counts;
  // Sanity: rock must include the punk riff, campfire must include Kumbaya,
  // drums must include the drum charts.
  chipClick('Rock');
  await sleep(250);
  out.rockHasRedline = document.querySelector('.screen').innerText.includes('Redline');
  chipClick('Campfire');
  await sleep(250);
  out.campfireHasKumbaya = document.querySelector('.screen').innerText.includes('Kumbaya');
  chipClick('Drums');
  await sleep(250);
  out.drumsHasFourFloor = document.querySelector('.screen').innerText.includes('Four on the floor');
  chipClick('Love');
  await sleep(250);
  out.loveHasSlowBurn = document.querySelector('.screen').innerText.includes('Slow Burn');

  function chipClick(label) {
    const c = [...document.querySelectorAll('.chip')].find((x) => x.tagName === 'BUTTON' && x.textContent.trim() === label);
    if (c) c.click();
  }

  return JSON.stringify(out, null, 1);
})()
