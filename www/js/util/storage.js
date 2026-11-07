/**
 * Local persistence. Bio Dynamx Music has no accounts and no server: progress
 * lives in this browser/profile and can be exported to a file for backup or to
 * move between devices.
 */

const KEY = 'biodynamx.music.v1';

const DEFAULTS = {
  version: 1,
  // itemId -> { stars, bestScore, accuracy, plays, lastPlayed, bestCombo }
  items: {},
  streak: { count: 0, lastDay: null, bestCount: 0 },
  totals: { notes: 0, seconds: 0, sessions: 0 },
  settings: {
    mode: 'practice', // 'practice' | 'play'
    waitToPlay: true,
    tempo: 1,
    autoSpeed: true,
    metronome: false,
    backing: true,
    countIn: true,
    tuning: 'standard',
    inputDeviceId: '',
    latencyMs: 0,
    haptics: true,
    leftHanded: false,
    colorBlind: false,
    soundEffects: true,
    musicVolume: 0.5,
    tolerance: 'normal', // 'easy' | 'normal' | 'strict'
    noteNaming: 'sharps',
  },
  dailyGoalMinutes: 10,
  today: { day: null, seconds: 0, notes: 0, items: 0 },
  recentlyPlayed: [],
};

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

let state = null;
let saveTimer = null;
const listeners = new Set();

export function load() {
  if (state) return state;
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    stored = null;
  }
  state = clone(DEFAULTS);
  if (stored && typeof stored === 'object') {
    // Shallow-merge each top-level section so a new setting is additive.
    for (const [k, v] of Object.entries(stored)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && state[k] && typeof state[k] === 'object') {
        Object.assign(state[k], v);
      } else {
        state[k] = v;
      }
    }
  }
  rollDay();
  return state;
}

export function get() {
  return load();
}

export function save() {
  if (!state) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 160);
}

export function flush() {
  if (!state) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode — the app still works, progress just will not persist */
  }
  for (const fn of listeners) {
    try {
      fn(state);
    } catch {
      /* a bad listener must not break persistence */
    }
  }
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetAll() {
  state = clone(DEFAULTS);
  rollDay();
  flush();
}

/* ------------------------------------------------------------------ helpers */

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Roll the "today" bucket and the weekly streak when the calendar day changes. */
export function rollDay() {
  const s = load();
  const today = todayKey();
  if (s.today.day === today) return;
  s.today = { day: today, seconds: 0, notes: 0, items: 0 };
  const last = s.streak.lastDay;
  if (last !== today) {
    if (last) {
      const lastDate = new Date(`${last}T12:00:00`);
      const now = new Date(`${today}T12:00:00`);
      const diffDays = Math.round((now - lastDate) / 86400000);
      // A streak survives a same-day replay and continues on the next day.
      if (diffDays > 1) s.streak.count = 0;
    }
  }
  save();
}

export function touchStreak() {
  const s = load();
  const today = todayKey();
  rollDay();
  if (s.streak.lastDay === today) return s.streak.count;
  const last = s.streak.lastDay;
  if (last) {
    const diff = Math.round((new Date(`${today}T12:00:00`) - new Date(`${last}T12:00:00`)) / 86400000);
    s.streak.count = diff === 1 ? s.streak.count + 1 : diff === 0 ? s.streak.count : 1;
  } else {
    s.streak.count = 1;
  }
  s.streak.lastDay = today;
  s.streak.bestCount = Math.max(s.streak.bestCount || 0, s.streak.count);
  save();
  return s.streak.count;
}

/** Record one finished run of an item. */
export function recordRun({ itemId, stars, score, accuracy, combo, notes, seconds }) {
  const s = load();
  rollDay();
  const prev = s.items[itemId] || { stars: 0, bestScore: 0, accuracy: 0, plays: 0, bestCombo: 0 };
  s.items[itemId] = {
    stars: Math.max(prev.stars || 0, stars),
    bestScore: Math.max(prev.bestScore || 0, Math.round(score)),
    accuracy: Math.max(prev.accuracy || 0, accuracy),
    plays: (prev.plays || 0) + 1,
    bestCombo: Math.max(prev.bestCombo || 0, combo || 0),
    lastPlayed: new Date().toISOString(),
  };
  s.totals.notes += notes || 0;
  s.totals.seconds += Math.round(seconds || 0);
  s.totals.sessions += 1;
  s.today.seconds += Math.round(seconds || 0);
  s.today.notes += notes || 0;
  s.today.items += 1;
  s.recentlyPlayed = [itemId, ...(s.recentlyPlayed || []).filter((x) => x !== itemId)].slice(0, 12);
  touchStreak();
  flush();
  return s.items[itemId];
}

export function setSetting(key, value) {
  const s = load();
  s.settings[key] = value;
  save();
}

export function itemProgress(itemId) {
  const s = load();
  return s.items[itemId] || { stars: 0, bestScore: 0, accuracy: 0, plays: 0, bestCombo: 0 };
}

/** Export / import progress as a JSON file. */
export function exportProgress() {
  const s = load();
  const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const stamp = new Date().toISOString().slice(0, 10);
  a.download = `biodynamx-music-progress-${stamp}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function importProgress(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || !data.items) throw new Error('That file is not a Bio Dynamx progress export.');
  state = clone(DEFAULTS);
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && state[k] && typeof state[k] === 'object') Object.assign(state[k], v);
    else state[k] = v;
  }
  rollDay();
  flush();
  return true;
}
