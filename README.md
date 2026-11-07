# Bio Dynamx Music

Guitar practice that starts the second you open it.

No account. No subscription. No trial timer. You open the app, it listens through
your microphone, and it tells you which notes you actually played and how well
you kept time.

Built for Android and Apple devices as an installable web app (PWA), with a
Capacitor shell in [`native/`](native/) if you want a real `.apk` / `.ipa`.

Guitar **and drums** — with rock, love and campfire songs.

![Home screen](shots/home.png)
![Drum chart](shots/drums-3000ms.png)

---

## Live

**<https://billybull2020.github.io/biodynamx-music/>**

That URL is the whole app: open it on a phone, tap **Install** (Android) or
**Share → Add to Home Screen** (iPhone), and it runs full-screen and offline from
then on.

---

## Does it work in a browser? Yes — it *is* a browser app

There is no native code and no build step. Everything it needs is standard and
widely shipped: ES modules, Web Audio, `getUserMedia`, Canvas 2D, service
workers.

| Browser | Status | Notes |
| --- | --- | --- |
| Chrome / Edge 100+ (desktop, Android) | **Verified** | Full run tested end-to-end, including the microphone pipeline |
| Safari 15+ (macOS) | Expected good | Same WebKit APIs; not machine-tested here |
| iOS / iPadOS Safari 15.4+ | Expected good | Install via Share → Add to Home Screen; mic requires a tap first (the Start button is that tap) |
| Firefox 100+ | Expected good | No `beforeinstallprompt`, so no in-app Install chip — use the browser menu. Everything else works |
| Anything older than ~2021 | No | No ES modules / no `getUserMedia` |

Two hard requirements that are browser rules, not app limitations:

1. **HTTPS or `localhost`.** Microphones are refused on plain `http://` for any
   other host. GitHub Pages gives you HTTPS for free.
2. **A user gesture before audio.** iOS will not open an `AudioContext` or the
   mic without one, which is why the app asks you to tap **Start practising**
   rather than listening on page load.

Verified on the live URL: secure context, service worker active and 30 files
precached, manifest valid with all four icons reachable, and a full practice run
scored 100,000 with 8/8 notes perfect.

---

## Start it

```powershell
node tools/serve.mjs
```

Open <http://127.0.0.1:5173>, tap **Start practising**, allow the microphone.
That is the whole setup. Nothing to install, no build step, no dependencies.

Requirements: Node 18+ for the dev server only. The app itself is plain
ES-module JavaScript with zero npm dependencies.

---

## Put it on a phone

Already deployed — just open <https://billybull2020.github.io/biodynamx-music/>:

- **Android / Chrome:** tap **Install** in the header.
- **iPhone / Safari:** **Share** → **Add to Home Screen**.

Full-screen, offline-capable, and the icon sits next to your other apps.
For a native shell, see [`native/README.md`](native/README.md).

### Deploying your own copy

The app is a static folder. Anything that serves `www/` over HTTPS works.

```powershell
# GitHub Pages (what this repo uses): push to main, .github/workflows/pages.yml
# publishes www/ automatically.

# Netlify, if you prefer:
npx netlify deploy --dir=www --prod
```

The workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
uploads `www/` as the Pages artefact. One-time setup on a fresh repo:
**Settings → Pages → Build and deployment → Source: GitHub Actions**, or:

```powershell
gh api -X POST /repos/OWNER/REPO/pages -f build_type=workflow
gh workflow run pages.yml
```

---

## What is in it

**Practice that waits for you.** In Practice mode the song stops at the next note
until you play it, so a beginner is never left behind. Play mode runs at full
tempo and is what earns stars.

**Real note detection, not a tap-along.** The app listens to the microphone,
estimates the fundamental with YIN, then refines it against the partial series so
that string inharmonicity does not skew the reading. Measured accuracy on the
synthetic test bench: **±0.03 cents** across the neck at 44.1 and 48 kHz.

**A six-lane note highway** built from real tablature: low E nearest you, fret
numbers on the notes, chord blocks with strum direction, bar numbers down the
side, and a live read-out of what the app is hearing.

**Drums too.** Yousician doesn't teach drums, so this is an addition rather than a
port: drum charts are graded on *attack timing* (spectral flux plus an energy-rise
gate) instead of pitch, and you can play them on a real kit near the microphone
**or** on four on-screen pads that always work.

**Ten levels, 53 pieces.** Open strings → first melodies → cowboy chords →
the four-chord loop → riffs → lead → barre → fingerstyle → groove → full pieces.
Nothing is locked; skip ahead whenever you like.

**22 songs and 31 drills**, filterable by **Rock**, **Campfire**, **Love** and
**Drums**:

- *Rock* — Redline (punk), Highway Fire, Deep Water (blues-rock), Static Bloom
- *Campfire* — Kumbaya, She'll Be Coming Round the Mountain, Oh! Susanna,
  Home on the Range, I've Been Working on the Railroad
- *Love* — Slow Burn, Only You, Lamplight, The Water Is Wide
- *Drums* — First beat, Four on the floor, Fast and loud, Half-time feel, Beat into a fill

Everything is public domain (Twinkle, Ode to Joy, Greensleeves, Scarborough Fair,
Amazing Grace, House of the Rising Sun, Für Elise, Minuet in G, and the
traditional songs above) or written for this app. No licensed material, nothing
to take down.

**A band that costs nothing.** Kick, snare, hats, bass and click are synthesised
at runtime from oscillators and a noise buffer. No audio files, so the whole app
is a few hundred kilobytes and works with the phone in aeroplane mode.

**Tools that stand alone:** chromatic tuner with 8 tunings and reference tones,
metronome 20–240 BPM, ear trainer, fretboard quiz, scale checker, latency
calibration.

**Progress that stays put.** Stars, streaks and totals live in `localStorage`.
Export them to a JSON file and import on another device; there is no server to
lose them on.

---

## How the reverse engineering fed into this

Yousician's practice engine is not shipped on the web — `yousician.com/app`,
`/login` and `/tuner` all 404, and the site is a Next.js marketing funnel. Their
sister product **GuitarTuna does ship a real-time pitch engine as WebAssembly**,
and that is what was actually analysed: an Emscripten/embind build of a C++
`Yousician::Ooura_FFT` engine exposing `analyseBuffer()` and returning
`MeasuredPitchHz`, `TuningErrorCents` and `CanHearANote`.

The findings — evidence IDs, digests, what was observed versus what is
documentation versus what is this project's own design decision — are written up
in **[docs/REA-FINDINGS.md](docs/REA-FINDINGS.md)**, with the raw REA bundles in
[`docs/evidence/`](docs/evidence/).

Short version of the design consequence: the *experience* is modelled on the
documented behaviour (one silver → three gold stars per part, a 3×→5× multiplier,
a 10-level path, wait-to-play practice, tablature with strum arrows), while the
engine, the note highway geometry and the judgment windows are original work.

---

## Verification

```powershell
node tools/pitch-test.mjs      # pitch engine against synthesised strings
node tools/onset-test.mjs      # drum attack detection against synthesised kit hits
node tools/content-test.mjs    # every piece builds, is in range, is playable
node tools/serve.mjs           # then run the browser tests below
```

The pitch bench checks all six open strings, 40 fretted notes, a ±40 cent detune
sweep, silence/noise rejection and chord chroma, at 44.1 and 48 kHz.

The onset bench streams a synthesised beat through the detector the way the live
engine does and requires every hit to be found, none duplicated, and nothing to
fire on silence, steady noise, or a **sustained guitar chord** — that last one is
what forced the energy-rise gate, because spectral flux alone rattles along with a
decaying note.

The gameplay path was verified end-to-end in a real browser using Chrome's fake
audio device fed with a synthesised low-E loop
(`tools/make_test_audio.py` → `tools/fixtures/lowE-loop.wav`): the microphone
opened, the count-in ran, all 8 notes were judged Perfect, and the run scored
100,000 with three stars. The drum path was verified the same way through the
on-screen pads: 24/24 hits judged Perfect, 100,000, three stars.

---

## Layout

```
www/                 the entire app — this folder is the deliverable
  index.html
  js/audio/pitch.js      YIN + inharmonicity-aware spectral refinement
  js/audio/onset.js      drum attack detection (spectral flux + energy gate)
  js/audio/engine.js     microphone capture (ScriptProcessor, iOS-safe)
  js/audio/band.js       synthesised drums, bass, metronome, reference tones
  js/game/session.js     playhead, wait-mode clamping, judging (pitch and drums)
  js/ui/highway.js       canvas note highway (string lanes or drum lanes)
  js/music/scoring.js    windows, multiplier, stars, score
  js/music/drums.js      drum lane grid notation
  js/content/library.js  53 pieces + the 10-level path
tools/               dev server, test benches, icon/audio generators
native/              Capacitor shell + instructions for APK/IPA
docs/                reverse-engineering report, product brief, evidence
```

No bundler, no framework, no `node_modules`. Open `www/index.html` and read it.

---

## Limits worth knowing

- **Microphone quality decides everything.** Built-in laptop mics are fine for
  single notes; chords need you reasonably close and a quiet room. Wired
  headphones help a lot; Bluetooth adds latency.
- **Chords are graded by pitch-class coverage**, not by full polyphonic
  transcription. A cleanly strummed cowboy chord is judged reliably; a
  five-string barre with a dead note may still pass.
- **Native builds are not produced here.** No Android SDK or macOS was available
  on the build machine, so `native/` is a verified scaffold with exact steps
  rather than a signed binary. The PWA path is fully working.
- **Two players, no accounts.** If you want separate progress per person, use
  separate browser profiles or the export/import buttons.

---

## Licence and credits

App code, drills, exercises and original pieces: written for this project.
Traditional melodies are public domain. Brand colours follow the BioDynamX
identity (deep navy `#0B1D3A`, electric cyan `#00D4FF`).

Not affiliated with Yousician Oy. GuitarTuna and Yousician are their trademarks;
no code or content from either is included in this repository.
