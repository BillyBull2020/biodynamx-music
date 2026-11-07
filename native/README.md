# Native packaging (Android + iOS)

Bio Dynamx Music is a **web app with no build step**. That is deliberate: the
fastest, least fragile way to get it onto a phone is the PWA, and the native
shells below exist for when you want a real `.apk` / `.ipa` (an icon on the home
screen with no browser chrome, and microphone permissions handled by the OS).

Two paths, in order of how much work they are.

---

## Path A — install the PWA (works today, both platforms)

You need the app served over **HTTPS** (or `localhost`). Microphone access is
refused on plain `http://` for any other host — that is a browser rule, not a
limitation of this app.

Any static host works. From this folder:

```powershell
# 1. sanity check locally (localhost counts as a secure context)
node tools/serve.mjs
#    open http://127.0.0.1:5173

# 2. deploy the www/ folder anywhere that serves HTTPS, e.g. Netlify:
npx netlify deploy --dir=www --prod
```

Then:

- **Android (Chrome / Edge / Samsung Internet)** — open the URL, tap the
  **Install** chip in the app header (or ⋮ → *Add to Home screen*).
- **iPhone / iPad (Safari)** — open the URL, tap **Share** → **Add to Home
  Screen**. It launches full-screen from the icon.

The service worker caches the whole app, so it keeps working with no connection.

---

## Path B — a real native shell with Capacitor

This produces an Android Studio project and an Xcode project that wrap the exact
same `www/` folder. It needs:

- **Android:** JDK 21 + Android Studio (or the Android SDK + Gradle)
- **iOS:** macOS + Xcode

Neither toolchain is installed on the machine this repo was written on, so path B
is scaffolded and documented but not built here. Path A is verified.

### One-time setup

```powershell
cd native/capacitor
npm install
node ../prepare.mjs            # copies ../../www -> ./www
npx cap add android
npx cap add ios
```

### Every time you change the app

```powershell
cd native/capacitor
node ../prepare.mjs
npx cap sync
npx cap open android           # or: npx cap open ios
```

Then build from Android Studio / Xcode as usual.

### Permissions you must add (both platforms refuse the mic otherwise)

**Android** — `android/app/src/main/AndroidManifest.xml`, inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

**iOS** — `ios/App/App/Info.plist`, inside the top-level `<dict>`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Bio Dynamx Music listens to your guitar to tell you which notes you played. Audio is analysed on the device and never uploaded.</string>
```

### Notes that save time

- The Android WebView treats `https://` (the configured `androidScheme`) as a
  secure context, which is what `getUserMedia` requires. Do not switch it to
  `http`.
- iOS may silence Web Audio when the ring/silent switch is on. The app sets
  `navigator.audioSession.type = 'playback'` where that API exists; on older iOS,
  ask the player to flip the switch.
- Bluetooth headphones add 150–300 ms of latency. The app has a calibration
  screen (`You → Latency calibration`); wired headphones or the built-in mic are
  better for grading.
- Store listing needs a privacy answer: the app has **no network calls at all**
  after the first load. Audio never leaves the device.

---

## Why not just ship an APK from here?

Because an unsigned, sideloaded APK still needs `RECORD_AUDIO` in the manifest,
an app id, an icon set and a signing key — all of which the Capacitor project
above generates correctly for your machine and your keystore. Doing it by hand
here would produce a binary nobody could reproduce.
