(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const routes = ['/home', '/learn', '/level/3', '/songs', '/item/song-twinkle', '/tools', '/you', '/calibrate', '/metronome', '/ear', '/fretboard', '/scale'];
  const results = [];
  for (const r of routes) {
    location.hash = `#${r}`;
    await sleep(420);
    const screen = document.querySelector('.screen');
    const text = screen ? screen.innerText.replace(/\s+/g, ' ').slice(0, 90) : '';
    results.push({
      route: r,
      rendered: !!screen,
      chars: screen ? screen.innerText.length : 0,
      head: text,
    });
  }
  return JSON.stringify({ results }, null, 1);
})()
