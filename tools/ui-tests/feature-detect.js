(async () => {
  const has = (k) => {
    try {
      return !!k();
    } catch {
      return false;
    }
  };
  const ua = navigator.userAgent;
  const out = {
    userAgent: ua,
    engine: /Firefox\//.test(ua) ? 'Gecko' : /Safari\//.test(ua) && !/Chrome\//.test(ua) ? 'WebKit' : 'Blink',
    features: {
      esModules: 'noModule' in document.createElement('script'),
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      audioContext: !!(window.AudioContext || window.webkitAudioContext),
      scriptProcessor: !!(window.AudioContext && AudioContext.prototype.createScriptProcessor),
      serviceWorker: 'serviceWorker' in navigator,
      caches: 'caches' in window,
      localStorage: has(() => window.localStorage),
      beforeInstallPrompt: 'onbeforeinstallprompt' in window,
      audioSession: 'audioSession' in navigator,
      canvas2d: !!document.createElement('canvas').getContext('2d'),
      pointerEvents: 'PointerEvent' in window,
      safeAreaEnv: CSS.supports('padding-top', 'env(safe-area-inset-top)'),
    },
    secureContext: window.isSecureContext,
    protocol: location.protocol,
    standalone: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
    routerWorks: !!document.querySelector('.tabbar') && document.getElementById('app').children.length >= 2,
    micState: (await navigator.permissions?.query?.({ name: 'microphone' }).then((p) => p.state).catch(() => 'unknown')) ?? 'api-missing',
  };
  return JSON.stringify(out, null, 1);
})()
