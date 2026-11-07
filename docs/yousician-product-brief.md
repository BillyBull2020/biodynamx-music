# Yousician Guitar — Documented Behavior Brief

All facts below are quoted/paraphrased only from Yousician support articles. Where the source is ambiguous, that is stated rather than resolved.

## Screen graph

**Persistent chrome** — "shortcuts to navigate in Yousician, accessible on the top row of the app screen when you log in." Top-left button opens **Profile / Badges / Streaks / Activity / Followers & Following**. Profile stats = "practice, playtime, and the number of notes played so far." Streaks = "how many weeks you've played in a row." Tapping a badge shows "the requirements for earning it." (`https://support.yousician.com/hc/en-us/articles/201558312-How-to-navigate-in-Yousician`)

**Tabs:** Home, Learn, Songs, plus Tuner, Settings, Search buttons.
- **Home:** shortcuts to **Daily Session**, **Continue Learning** (goes to "the instrument learning path in the Learn → Path tab"), **Your Songs** (Favorites, Recently Played, Missing Stars), **New On Yousician**, **Challenges**, **Riff Of The Day**, other collections.
- **Learn:** **Path** tab = learning path; **Workouts** tab = "play for missing silver and gold stars… may also feature trainers relevant to your instrument."
- **Songs:** New On Yousician ("latest popular songs available with Premium+"), curated collections, recently played, favorites, personal collections.
- **Settings** contains **Game**, **Account**, **Support**, **Privacy** tabs.
(Same article.)

**Game tab, in page order** (`.../203751452-Game-tab`): **Volume** slider (songs and tutorial videos); **Sound effects** slider; **Instrument** button (Guitar, Piano, Ukulele, Bass, Singing); **Language**; **Advanced audio settings** — **Input activity** ("If the dots light up with sound, Yousician can hear you play"), **Buffer size**, **Use MIDI** (piano), **Connect Bluetooth MIDI keyboard** (piano), **Driver** ("like ASIO… if you experience latency problems on Android, try switching"), **Input device** (built-in mic default; audio interface selectable), **Input channel**, **Latency calibration**, **MIDI sensitivity**; **Shortcuts** (PC & Mac); **Built-in keyboard** (beginner exercises, mobile/touch only); **Fullscreen** + display resolution; **Colorblind mode** (Protanopia, Deuteranopia, Tritanopia); **Dark mode** ("Practice and Play mode for guitar, ukulele and bass"); **Pre-song chord trainers** ("practice guitar or ukulele chords before you play a song"); **Left-handed mode**; **Song data cache**.

**Song flow:** start screen offers **Practice** and **Play**; toggle between them from the **Pause** menu. In-song, "tap or click anywhere on the screen," choose **Options** from the **Pause** menu, pick notation, select **Done**. (`.../201558362-Practice-and-Play-modes-in-guitar`)

**Song end screen:** "top right-hand corner shows your score"; action buttons "**Play again**, **Practice**, **Perfect it,** or **Continue**"; favorite/collection icons; daily-goal progress shown. **Leaderboard** button sits "in the top right corner of the song screen," with **My level / Global / Friends** views. (`.../208014795-Song-scoring-and-leaderboards`)

## Practice loop timings/inputs

Practice mode "restarts at the end so you can keep practicing." On-screen: **Tempo slider** and **Wait To Play** toggle. Options menu adds **Show/Hide lyrics**, **Show/Hide chord diagrams**, **Play for me** (synthesizer preview), **Auto-adjust speed**, **Metronome**, **Mute song** ("practice without the backing track"), **Loop lead-in** ("one-bar-count-in at restart"). The progress bar at the bottom "shows your position in a song. You can loop any section by moving the sliders." (`.../201558362`)

**Auto-adjust speed:** "The app controls the song speed and adjusts it up or down depending on how you play. It works from **25% to 125% in 5% increments**." (Same.)

**Wait To Play** is documented self-contradictorily — reproduce only as written: "**On**: The song plays in real time, whether you play a note or not. **Off**: The song pauses and waits for you to play the right note." (Same.)

**Notation:** 5 options — **tablature, tab & notes, notes, standard, standard & tab** (guitar). (Same.)

**Verification of practice behaviors elsewhere:** 30-day challenge tasks reference "a 10-minute playing session," "a 20-minute playing session," "a 30-minute playing session," "practice something difficult using a 'loop' in practice mode," and "play a song in **125% speed** in practice mode." (`.../360017752598-30-day-playing-challenge`)

## Scoring & stars

- Play mode "allows you to put your skills into action and progress in the learning path… play songs for stars and points." (`.../201558362`)
- **Multiplier:** "your points multiplier begins at **3x** — you see it in the **top left corner** of the screen… By hitting notes correctly and with good timing, you can boost the multiplier up to **5x**." (Same.)
- **Stars:** "Stars range from **one silver star to three gold stars** for each song part. To earn gold stars, you need to play everything right with good timing." (`.../208014795`)
- **Your score vs Your best:** Your score = most recent play-through; Your best = "highest overall score… combines the best results for each part of the song across all your plays." Worked example given: Your score 51,000, Your best 59,000. Leaderboards "always show your best score"; replaying shows your best at song start. (Same.)
- **Weekly Challenge:** "If you replay a song from a past Weekly Challenge, the challenge leaderboard does not update, since the challenge has ended. However, your score counts towards the song leaderboard." (Same.)

## Recognition setup & failure modes

**Supported input:** "any real 6-string guitar… acoustic, electric and electroacoustic… in standard E, A, D, G, B, E tuning." (`.../46277332028817-Guitar-sound-recognition-issues`)

**Ordered troubleshooting checklist (start at 1):**
1. Tune with the in-app tuner — "If you tune your guitar with a different tuner, you may have recognition issues."
2. "Check that the app volume or background noise is not too loud. Try connecting wired headphones, or Bluetooth ones."
3. "Try turning off effects on your electric guitar — these can affect recognition. Use as clear sound as you can."
4. (a) microphone permission granted; (b) Advanced audio settings → "Ensure your device microphone shows **green** under the **Input device**"; (c) PC/Mac mic input "could be too low."
5. Double-check guitar setup.
6. **Android:** "re-calibrating audio"; "change audio driver to **Android Audio/Android OpenSL** and lower the buffer size. When you select **AAudio** driver, it adjusts the buffer automatically."
7. Audio interface must be chosen as **Input device**.
(Same article.)

**Chord-specific failures** (`.../202893201-Chords-are-not-recognized`): don't play strings marked **X** in the diagram ("chances are the note on that open string doesn't fit the chord") — mute them with fingers/thumb; strum evenly ("many people play the thicker strings hard and the thinner strings quietly or not at all"); "the high E string is often not heard if the strum is not clear enough"; buzzing → move finger closer to the fret; "**Yousician tells you if a string is not heard** when strumming chords. If you see a string marked **red**, pause the song to double check that the chord shape is correct"; keep fretting-hand nails short; ensure "suitable distance from your microphone (not too close so it overloads)"; "If you have the volume level of the device set high this can affect recognition. Try lowering the volume… connect headphones."

**OS-level audio filtering** (`.../360000488098-How-to-check-microphone-set-up-iOS-Android-PC-Mac`): Windows — Sound → Recording → Properties → Enhancements → "**Disable all enhancements**"; Mac — disable "Use ambient noise reduction" in Sound → Input. Both are stated to "affect the way the signal is delivered to Yousician." Latency tradeoff is stated in Game tab: "A smaller buffer decreases audio latency, but it may cause performance issues." For mobile piano sound delay: "set the buffer size to **256 or lower**."

## Learning path structure

(`.../206930639-How-the-guitar-learning-path-works`)
- **Missions** = "groups of songs, video tutorials and trainers"; each mission has a theme. "The path is unlocked, so you are free to explore it… you need to play each task within a mission to complete it."
- **10 complete playing levels** divided into themes: **Melody, riffs and lead** (picking, legato, hammer & pull, bending, speed); **Chord and rhythm** (strumming, riffs; cowboy, moveable and barre chords); **Knowledge** theme has **5 levels** (musical alphabet, fretboard, keys & octaves, "Ear trainers").
- **Levels:** **Basics** for beginners; "By level 5… pick up lots of popular songs and jam"; "By level 10… barre chords, fingerpicking, and solos." "Thousands of exercises from basics to level 10 and beyond."
- **Activity report** emailed "every Monday" — "number of notes you played and your total play time the previous week."
- **Certificate:** after the last task in a level, select the **Certificate** button "to the right of the level number," then **Make certificate** → **Email**. (`.../360000707797-How-to-get-level-completion-certificates`)
- **Exercise naming** (`.../360001819378-What-the-exercise-names-mean`): Chords = **Cowboy chords** (A, Am, C, D, Dm, E, Em, F, G), **Fancy chords** (Am7, Dsus4, Cadd9), **Moveable chords**, **Barre chords** ("full barre with the index finger, covering 5 or 6 strings"). Melody = **Riffs**, **Rhythm**, **Fingerpicking**, **Melody / Lead**, **Rhythm & Lead**. **basic / main / full** = simplified / core essence / complete recording.

## Note display (highway/strings/chords)

(`.../206932099-How-to-read-guitar-tablature`)
- Tab reads like looking down at your guitar: "the thickest E string is nearest to you, and the thinnest e string is furthest away."
- Numbers = frets; "**0** means to play a string open."
- "The **note colors** recommend which finger to use… e.g. **yellow** suggests to use the pointer finger."
- "We write chords as **blocks** that show you when to strum. Chord blocks have different colors… The **arrows** in a chord block show you the strum direction: **up ▲ or down ▼**."
- "The **chord diagrams at the top of the screen** show you the chord shape. The colors in a diagram show the recommended finger(s)… and which strings to strum."
- "**X**" in a chord diagram = don't strum that string.

## Gaps/unknowns

- **No documented judgment windows.** No article states a timing tolerance in ms, an accuracy percentage formula, or how "good timing" is thresholded for gold stars — only qualitative wording.
- **No documented note-highway behavior** (scroll speed, lane geometry, perspective, hit-line position). Only tab/chord-diagram rendering is described.
- **`Perfect it`** appears only as a song-end button label; no article defines what it does.
- **`Weekly Challenge`, `Riff Of The Day`, `Challenges`, `Daily Session`, `Trainers`** are named as Home/Workouts entries but have no dedicated support article found; rules, cadence and rewards are undocumented.
- **"Song end screen" article (ID 201558472) is unreachable** — it redirect-loops between `support.yousician.com` and `yousician.zendesk.com`. Star/score facts above come from the scoring article instead.
- **Site mixes products.** Articles `4419296622993-Tools-tab`, `4419297148817-Song-screen`, `360014361998-Settings-tab` are filed under **GuitarTuna**, not Yousician (chord-song scrolling, capo, Smart Scroll, metronome 30–240 BPM, ±1-cent tuner accuracy). Do not treat them as Yousician app behavior.
- Daily-goal units are documented ("play for stars or minutes") but no default target or streak-break rule is stated.
