/**
 * Bio Dynamx Music — application boot.
 *
 * No accounts, no server, no login screen: the app renders the home screen and
 * the first tap is the only gate, because the microphone needs a gesture on iOS.
 */

import { el, icon, toast } from './util/dom.js';
import { get, onChange, rollDay } from './util/storage.js';
import { define, mount, navigate, start, back } from './ui/router.js';
import { tabbar } from './ui/components.js';
import { APP_VERSION } from './version.js';
import { homeScreen } from './ui/screens/home.js';
import { learnScreen, levelScreen } from './ui/screens/learn.js';
import { songsScreen, itemScreen } from './ui/screens/library.js';
import { drumsScreen } from './ui/screens/drums.js';
import { practiceScreen } from './ui/screens/practice.js';
import {
  earScreen,
  fretboardScreen,
  metronomeScreen,
  scaleScreen,
  toolsScreen,
  tunerScreen,
} from './ui/screens/tools.js';
import { calibrateScreen, youScreen } from './ui/screens/you.js';

const app = document.getElementById('app');
let present = null;

/** Replace the whole app surface with a screen. */
function render({ tab = null, topbar = null, node, fullScreen = false, hideTabs = false }) {
  app.replaceChildren();
  app.className = fullScreen ? 'app app--full' : 'app';
  if (topbar) app.appendChild(topbar);
  if (fullScreen) {
    // Gameplay and results own the viewport and handle their own safe areas.
    app.appendChild(node);
  } else {
    // Every other screen lives in a padded, scrollable region that leaves room
    // for the fixed tab bar at the bottom.
    app.appendChild(el('div.screen', {}, [node]));
  }
  if (!hideTabs && !fullScreen) app.appendChild(tabbar(tab, navigate));
  window.scrollTo(0, 0);
}

present = render;

const ctx = { navigate, present, shell: render, back };

function wrap(fn) {
  return (args) => {
    const teardown = fn({ ...args, ...ctx });
    return teardown;
  };
}

/* ------------------------------------------------------------------ routes */

define('/home', wrap(homeScreen));
define('/learn', wrap(learnScreen));
define('/level/:n', wrap(levelScreen));
define('/songs', wrap(songsScreen));
define('/drums', wrap(drumsScreen));
define('/item/:id', wrap(itemScreen));
define('/play/:id', wrap(practiceScreen));
define('/tools', wrap(toolsScreen));
define('/tuner', wrap(tunerScreen));
define('/metronome', wrap(metronomeScreen));
define('/ear', wrap(earScreen));
define('/fretboard', wrap(fretboardScreen));
define('/scale', wrap(scaleScreen));
define('/you', wrap(youScreen));
define('/calibrate', wrap(calibrateScreen));
define('/settings', wrap(youScreen));

/* -------------------------------------------------------------- install UX */

/**
 * Persistent "new version" banner. A toast is too easy to miss, and an installed
 * copy can otherwise sit on an old build for weeks.
 */
function showUpdateBanner() {
  if (document.getElementById('update-banner')) return;
  const banner = el('div.update-banner', { id: 'update-banner', role: 'status' }, [
    el('div.update-banner__text', {}, [
      el('b', { text: 'A new version is ready' }),
      el('span', { text: ` You are on an older build. Reload to get v${APP_VERSION}.` }),
    ]),
    el('button.btn.btn--sm.btn--primary', {
      type: 'button',
      text: 'Reload',
      onclick: () => location.reload(),
    }),
  ]);
  document.body.appendChild(banner);
}

let installEvent = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
  paintInstallChip();
});

function paintInstallChip() {
  const bar = app.querySelector('.topbar');
  if (!bar || !installEvent) return;
  if (bar.querySelector('[data-install]')) return;
  const btn = el(
    'button.chip',
    {
      type: 'button',
      dataset: { install: '1' },
      style: { color: 'var(--cyan)', gap: '5px' },
      onclick: async () => {
        if (!installEvent) return;
        installEvent.prompt();
        const choice = await installEvent.userChoice;
        if (choice.outcome === 'accepted') {
          toast('Installed. Open it from your home screen.', 'ok');
          btn.remove();
        }
        installEvent = null;
      },
    },
    [icon('check', 14), 'Install'],
  );
  // Always the last element, so it never lands to the left of the wordmark.
  bar.appendChild(btn);
}

window.addEventListener('appinstalled', () => {
  installEvent = null;
  document.querySelector('[data-install]')?.remove();
});

/* ------------------------------------------------------------------- boot */

async function boot() {
  get();
  rollDay();
  mount(app);
  start();

  // Re-render cheaply when progress changes so stars update without a reload.
  onChange(() => {
    // Screens read storage on render; nothing to do here beyond keeping the
    // install chip available after a navigation.
    paintInstallChip();
  });

  // iOS needs the audio session configured before the first sound.
  const unlock = async () => {
    try {
      const { configureAudioSession } = await import('./audio/engine.js');
      configureAudioSession();
    } catch {
      /* older browsers simply do not have this */
    }
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  // Service worker: offline support and installability. Skipped on file:// URLs.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    try {
      const reg = await navigator.serviceWorker.register('sw.js', { scope: './' });

      // A new version is installed but the page is still running the old one.
      // Say so loudly and offer the one tap that fixes it — a silent toast is
      // how a whole feature can ship without anyone seeing it.
      const announce = () => showUpdateBanner();
      if (reg.waiting && navigator.serviceWorker.controller) announce();
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) announce();
        });
      });
      // Also re-check when the app comes back to the foreground.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        reg.update().catch(() => {});
      });
    } catch (err) {
      console.warn('Service worker registration failed', err);
    }
  }

  // Keep the splash from lingering if the first paint is slow.
  requestAnimationFrame(paintInstallChip);
}

boot();
