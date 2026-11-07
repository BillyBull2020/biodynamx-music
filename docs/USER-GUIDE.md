# Onboarding + the shots

The app opens on **Play**, already pointing at the next thing you should try.
There is no sign-up, no tutorial modal, no permissions screen until you tap
**Start practising** — that button is the gesture iOS needs before it will let a
web app use the microphone.

---

## The first five minutes

1. **Tune.** Tap **Tools → Tuner**, tap **Start microphone**, play each string.
   The arc turns lime and says "In tune" when you are within 5 cents. If a string
   will not register, you are either too quiet or the guitar is far from the mic.
2. **Back to Play → Start practising.** You will get a one-bar count-in (4, 3, 2,
   then go), then the first exercise: open low E, eight quarter notes. The song
   **stops and waits** at each note until you play it — you cannot fall behind.
3. **Play mode** (the button next to Start practising) runs at full tempo. This is
   what earns stars: one silver for getting through it, two for decent accuracy,
   three gold for playing it cleanly *and* in time.

---

## Reading the screen

```
 bar numbers ──┤ 3
               │        ●  correct note = cyan circle, fret number inside
               │
               │   [ Em ▼ ]     chord block, arrow = strum direction
               │
               │        ●
   hit line ───┼───────────────  notes are played here
               │  ▬▬▬▬▬▬▬▬▬      input level: this is the app hearing you
               │  hearing E
   strings  ───┤  E    A    D    G    B    e   (low E nearest you)
```

- Left to right is **low E to high e**, matching how you look down at the guitar.
- The number on a note is the **fret**; `0` is an open string.
- Chord blocks span the strings you should strum, and the arrow tells you down or
  up.
- **Perfect / Great / Good / Miss** flashes above the hit line as you play.

---

## The controls along the bottom

| Control | What it does |
| --- | --- |
| `–` / `+` | Tempo, 25 %–125 %. Slowing a hard bar down is the single fastest way to learn it. |
| **Wait** | Toggles wait-for-me. On by default in Practice. |
| **Hear it** | Plays the note you are stuck on, so you know what to aim for. |
| Pause (top right) | Resume, restart, quit, tempo slider. |

If you get stuck on one note for ten seconds the app gives up on it and moves on,
so a lesson can never trap you.

---

## The tabs

| Tab | Why you would open it |
| --- | --- |
| **Play** | Daily session, riff of the day, quick tools, whatever you were last practising. |
| **Learn** | The 10-level path. Missions contain 2–3 tasks. Level 1 is open strings; level 10 is full pieces. |
| **Songs** | Everything in one list, filterable by **Rock**, **Campfire**, **Love**, **Drums**, riffs and drills. |
| **Tools** | Tuner, metronome, ear trainer, fretboard quiz, scale checker. All work without a song. |
| **You** | Stats, difficulty, tuning, volume, latency calibration, export/reset. |

---

## Drums

Drum charts work differently from guitar pieces, so a few things are worth
knowing:

- They are graded on **when you hit**, not what note you played. A drum kit is not
  pitched in any useful way through a phone microphone.
- You can play them **on a real kit** near the microphone, or **tap the four pads**
  at the bottom of the screen. The pads are the reliable option on a phone, and
  they always work.
- The lanes are **K**ick, **S**nare, **H**at and **T**om. One physical hit can
  satisfy more than one lane at once when a chart puts a kick and a hat together.
- Practice mode waits for you here too, so you can learn a beat at half speed and
  build up.

Start with **First beat** (level 1). It is the same kick-snare-hat pattern behind
most of the rock and pop you have ever heard.

---

## Campfire and love songs

The **Campfire** filter is five traditional singalongs that use three chords at
most — Kumbaya, She'll Be Coming Round the Mountain, Oh! Susanna, Home on the
Range and I've Been Working on the Railroad. They are chord charts on purpose:
the point is to strum and sing, not to read a melody.

**Love** is Slow Burn, Only You, Lamplight and The Water Is Wide — slower tempos,
softer strums, and one fingerpicked piece.

---

## Settings that are worth changing

- **Difficulty** (You → Practice). *Easy* widens the timing windows and pitch
  tolerance. Start there if you are getting frustrated; move to *Strict* when
  Normal feels easy.
- **Latency calibration** (You → Timing). If notes feel late or early, tap
  **Calibrate** and tap eight times with the click. Bluetooth headphones can add
  300 ms; wired ones add almost nothing.
- **Backing band** (You → Sound). Off is nicer while you are learning a part.
- **Volume.** Counter-intuitive but important: keep the app quiet so the
  microphone hears the guitar, not the speakers.

---

## If the app cannot hear you

1. Play louder, or move the phone closer to the sound hole.
2. Turn the device volume down, or use headphones.
3. Check that you got the permission prompt. If you dismissed it, reload and
   allow it — the app will say "Microphone permission was blocked" if not.
4. Tune first. A guitar 40 cents sharp reads as the wrong note.
5. Electric guitar: use a clean sound at about speaking volume.

---

## Moving to a second device

**You → Export progress** writes a JSON file. On the other device,
**You → Import progress** reads it back. That is the whole sync story; there is
no account and no server.
