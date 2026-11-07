# Reverse-engineering report: Yousician / GuitarTuna

**Subject:** what actually ships in Yousician's web properties, what could be
observed from shipped artefacts, and how that shaped **Bio Dynamx Music**.

**Tooling:** REA (`rea-agents` 6.8.0, CLI), plus the *Awesome REA* catalog
(`~/.agents/awesome-rea`, 572 resources / 251 cases / 165 papers, source review
2026-10-20) as a method index. Raw REA evidence is archived in
[`docs/evidence/`](evidence/).

**Date of capture:** 2026-11-06. All captures are of publicly served assets.

---

## 1. What the target actually is

The link in the request (`yousician.com/lp/guitar?…`) is a **paid-search landing
page**, not the app. Confirming that first saved a lot of wasted effort:

| Probe | Result |
| --- | --- |
| `GET /` | `200` — Next.js marketing site, 15 scripts, ~1.06 MB of JS |
| `GET /app` | `404` |
| `GET /login` | `404` |
| `GET /tuner` | `404` |
| `GET /songs` | `200` — marketing page, not a player |
| `GET /guitar-tuner` | `302` → `guitartuna.com/online-guitar-tuner` |
| `GET /sitemap.xml` | 421 URLs: 272 blog posts, 5 language mirrors, legal pages, 5 instrument landing pages |

**Observation.** There is no playable Yousician web client. The practice engine
ships only as native apps (iOS / Android / macOS / Windows), so its internals
were *not* available as a shipped web artefact to decompile. Everything the
report says about the practice loop is therefore either (a) statically observed
in a shipped web artefact, or (b) documented by the vendor, and is labelled as
such. No claim here is a guess about native code.

The sister property **GuitarTuna does ship a real-time audio engine on the web**.
That turned out to be the most valuable target on the site.

**A note on drums.** Yousician teaches **guitar, piano, ukulele, bass and
singing** — there is no drum instrument anywhere in the product, on the site or in
the support documentation. Any drum feature in Bio Dynamx Music is therefore
original work, not a reconstruction of something observed here.

---

## 2. Evidence captured

| # | Artefact | Method | Evidence ID / digest |
| --- | --- | --- | --- |
| E1 | `https://yousician.com/` JS bundle (15 scripts) | `rea analyze-web-bundle` | `ev_93598a594016c6b8de58cfe07ff72f10f3eef95986e6cc337c8bed63ec9dd0c9` |
| E2 | `https://yousician.com/guitar` JS bundle (15 scripts) | `rea analyze-web-bundle` | `ev_749201df2dd51516a2e864e0a043e25b2f196f867b039d47da77bb0d382fb99d` |
| E3 | `https://guitartuna.com/online-guitar-tuner` bundle (24 scripts) | `rea analyze-web-bundle` | `ev_e3ee0d018578466667f2607a0a94ad72b896a42c713bc6c765bf81db61454103` |
| E4 | `WebTuna.js` glue | fetched from the page origin, hashed | `sha256:a9625e3449d47def341840c95258927787137e347d4b6c38406433ffd9dc6026` · 31,890 B |
| E5 | `WebTuna.wasm` engine | fetched from the page origin, hashed | `sha256:14ec8582a5cd1becfc8597fbc8bec75d2361f57522046ffdb0fbafc9394508bd` · 296,937 B |
| E6 | Tuner React chunk `3e-n1q1s5sjbw.js` | fetched from the page origin | 87,267 B, contains the engine call site |
| E7 | Product documentation (scoring, learning path, recognition setup, tablature) | vendor support site | see `docs/yousician-product-brief.md` |

`E1`–`E3` are REA "web bundle analysis" evidence bundles; `docs/evidence/` holds
the retained records. `E4`–`E6` were fetched **through the page's own origin**
from a CDP-driven browser session, because a direct HTTP request to the CDN was
closed by bot protection — an honest limitation of the method, recorded here so
the capture cannot be mistaken for a plain download.

---

## 3. The GuitarTuna web tuner: what the engine is

`WebTuna.wasm` is an Emscripten build of a C++ audio engine, exposed to
JavaScript through **embind**. Parsing the module directly (sections, imports,
exports, data-section symbols) gives:

```
sections : type 676 · import 175 · function 741 · table 7 · memory 7
           global 8 · export 32 · element 816 · datacount 1
           code 261,469 · data 32,967
imports  : 29  (all from module "a": __embind_register_*, __cxa_throw,
                __abort_js, fd_*, emscripten helpers)
exports  : 7   (D=memory, I=table, F/G/H/J=functions, E=init)
```

The data section retains **C++ RTTI/embind class names**, which identify the
internals:

```
Yousician::FFTBase
Yousician::FFTBase::FFTBuffer
Yousician::Ooura_FFT
Yousician::ArraySlice<float, 1|2|4|8|16>
Yousician::ArraySlice<int, …>
Yousician::OwnedArraySlice<float|int, …>
Yousician::v23::VectorPrimitiveFallback
Yousician::v24::VectorPrimitiveInterface
```

and the property names it hands back to JavaScript:

```
MeasuredPitchHz   MeasuredPitchMidi   TuningErrorCents
MicRms            CanHearANote        analyseBuffer
setTuning         Invalid MIDI pitch
```

That is enough to state the architecture with confidence:

- **Ooura FFT** (a well-known radix-2 FFT) inside a generic `FFTBase`, i.e. this
  is a **frequency-domain** detector, not an autocorrelation/YIN time-domain one.
- Two SIMD code paths (`VectorPrimitiveInterface` vs `VectorPrimitiveFallback`)
  — the engine is compiled to pick vectorised intrinsics where available.
- A single `analyseBuffer` entry point that consumes a block of samples and
  returns a **JSON string**, and a `setTuning` control for the string layout.

### The JavaScript contract

From the call site in `E6`:

```js
const { data, dataHeap, analyseBuffer } = window.WebTuna;
data.set(samples);                          // copy mic samples into wasm memory
dataHeap.set(new Uint8Array(data.buffer));  // publish the Float32 view to the heap
const json = analyseBuffer(dataHeap.byteOffset, data.length, tuningIndex, sampleRate);
const g = JSON.parse(json);
// g.CurrentString, g.MeasuredPitchMidi, g.MeasuredPitchHz,
// g.TuningErrorCents, g.InTuneRatio, g.CanHearANote
```

Two behavioural details are visible in the same chunk:

- **In-tune decision**: `if (g.InTuneRatio <= 0.9) return;` — the UI only declares
  "in tune" once ~90 % of recent frames agree, not on a single frame.
- **Licensing lock**: the glue imports a `checkDomain` function that returns true
  only when the page URL contains `guitartuna`, `yousician` or `localhost`. The
  wasm refuses to be useful off their origins. This is a shipped anti-embedding
  measure and is recorded here as an observation, not adopted.

### Capture path

`getUserMedia({ audio: true })`, then a recorder node whose callback receives
`inputBuffer.getChannelData()` — the ScriptProcessor/AudioWorklet shape — feeding
the engine with the context's `sampleRate`.

---

## 4. What the marketing bundle does and does not reveal

`E1` and `E2` parse to a Next.js app with 15 scripts and a route inventory that
contains only marketing paths (`/blog`, `/blog/all`, `/blog/category/news`, …).
There are no practice routes, no score models, no tunings. Both captures are
`completeness.status: "partial"` because one script (`scr_b758def4…`, ~379 kB)
exceeded REA's 30 s per-script analysis deadline; that script is minified
third-party code, and the retained unknowns note it explicitly.

**Inference (bounded).** The marketing site is a separate Next.js deployment from
the product. Nothing about the practice engine can be learned from it.

What it *does* give is the vendor's own product taxonomy — 5 instruments
(guitar, bass, ukulele, piano, singing), 6 tuners, a songs library, chord charts,
a family plan, and a 7-day Premium+ trial — which is exactly the funnel the
requested app should *not* reproduce.

---

## 5. Documented behaviour used for the clone

Full brief: [`docs/yousician-product-brief.md`](yousician-product-brief.md).
The mechanics that mattered for design:

| Mechanic | Documented fact | Source |
| --- | --- | --- |
| Stars | one silver → three gold **per song part**; gold requires "everything right with good timing" | support article `208014795` |
| Score | "your best" = sum of best results **per part** across plays (51,000 vs 59,000 example) | same |
| Multiplier | starts at **3×**, can reach **5×** | same |
| Practice | tempo slider, "Wait To Play", auto-adjust speed **25 %→125 % in 5 % steps**, loop, metronome, "Play for me" | `201558362` |
| Learning path | **10 levels**, missions of songs + videos + trainers, unlocked | `206930639` |
| Tablature | strings drawn thickest-nearest-the-player, numbers = frets, `0` = open, chord **blocks** with up/down arrows, `X` = do not strum | `206932099` |
| Recognition | disable OS "audio enhancements", headphones help, clear tone, don't play `X` strings, red string = not heard | `46277332028817`, `202893201` |

**Deliberate omissions in the source material**, which means these are *our*
design decisions rather than REA findings:

- **No judgment windows are published.** The ±65/120/180 ms windows and ±50 cent
  pitch tolerance in `www/js/music/scoring.js` are this project's own tuning
  values, exposed to the player as Easy/Normal/Strict.
- **No note-highway geometry is published.** The six-lane perspective view in
  `www/js/ui/highway.js` is an original design consistent with the documented
  tablature conventions.
- **"Perfect it" is documented only as a button label.** Here it means "replay
  slower with Wait mode on", which is a reasonable reading but is not sourced.

---

## 6. Method notes and honest limits

- **No native app was analysed.** iOS/Android binaries were not obtained; the
  report makes no claims about compiled native behaviour. The catalog's Android
  and iOS tooling (JADX, Frida, objection, …) would be the next step and is out
  of scope for a two-person practice app.
- **Source maps.** `E1`–`E3` fetched source maps where the site published them;
  the product bundles are minified and un-obfuscated, so no deobfuscation stage
  (webcrack/wakaru) was needed.
- **Awesome REA gap.** The catalog has **no entry for audio DSP, pitch detection,
  microphone capture, or music-app reconstruction** — verified by searching
  titles and descriptions across its tool, case and paper indexes. The closest
  prior art it offers is Webamp (a browser audio *reimplementation*, playback
  only) and `reflecticon-224` (DSP emulation). That gap is why the pitch engine
  here is built from the DSP literature and validated numerically rather than
  derived from a catalogued method.
- **Reused catalogued methods:** `analyze-web-bundle` (REA), WABT/wasm-tools-style
  section parsing (implemented inline so the report needs no extra install), and
  Chrome DevTools Protocol capture for same-origin fetches.

---

## 7. What Bio Dynamx Music does differently, on purpose

The reverse engineering answered "how does this product work"; the brief answered
"what does the player actually experience". The clone keeps the experience and
drops the business model:

| Yousician | Bio Dynamx Music |
| --- | --- |
| Account + subscription, 7-day trial | No account, no payment, nothing to sign up for |
| Native apps only | Installable PWA, one URL, works on Android and iOS; optional native shells in `native/` |
| 10,000+ licensed songs | 45 public-domain / original songs + 39 riffs and drills, all legal to ship |
| Five instruments: guitar, piano, ukulele, bass, singing | Guitar, plus **drums** — which Yousician does not teach at all |
| Proprietary engine, origin-locked | Independent YIN + inharmonicity-aware spectral refinement (~0.03 cent accuracy on the test bench) and a separate spectral-flux onset detector for drums; no lock |
| Live backing tracks streamed | Drums, bass and click synthesised at runtime — offline, zero assets |

---

## 8. Verification of this project's own engine

The detector in `www/js/audio/pitch.js` was validated against synthesised
plucked strings (harmonic stack, string inharmonicity `B≈8e-5`, per-harmonic
decay, attack transient) at both 44.1 kHz and 48 kHz:

```
open strings E2..E4       worst error  -0.03 cents
fretted MIDI 40..79 (40)  worst error   0.02 cents
detune sweep ±40 c        measured within 0.1 cents
white noise / silence     rejected
full detection            2.8 ms per frame (16.6 ms budget at 60 fps)
```

Two real bugs were found and fixed by this bench, and are documented in the
source because they are easy to reintroduce:

1. A naive harmonic average was biased **+9.6 cents** by inharmonicity; fitting
   `f_h = h·f0·√(1+B·h²)` for both `f0` and `B` removes it.
2. An integer-lag autocorrelation "octave guard" was **halving correct readings**
   (period 115.58 samples rounds to 116 while 2T = 231.16 rounds to 231, so the
   second multiple wins). Octave decisions now use spectral evidence only.
