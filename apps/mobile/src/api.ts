import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { API_BASE } from "./theme";
import { Film } from "./films";

const DEVICE_KEY = "wsww:device";

let authTokenGetter: (() => Promise<string | null>) | null = null;
export function setAuthTokenGetter(fn: (() => Promise<string | null>) | null) {
  authTokenGetter = fn;
}
async function authHeaders(): Promise<Record<string, string>> {
  const id = await deviceId();
  const h: Record<string, string> = { "X-Device-Id": id };
  try {
    const t = authTokenGetter ? await authTokenGetter() : null;
    if (t) h["Authorization"] = `Bearer ${t}`;
  } catch { /* fall back to device id */ }
  return h;
}

let cachedDevice: string | null = null;
async function deviceId(): Promise<string> {
  if (cachedDevice) return cachedDevice;
  let id = await AsyncStorage.getItem(DEVICE_KEY).catch(() => null);
  if (!id) {
    // Crypto-secure so a device id can't be guessed to read another guest's taste data.
    id = "dev_" + randomUUID();
    AsyncStorage.setItem(DEVICE_KEY, id).catch(() => {});
  }
  cachedDevice = id;
  return id;
}

export type Moment = {
  daypart: string; weekday: string; is_weekend: boolean; season: string; holiday: string;
};

export function moment(): Moment {
  const d = new Date();
  const h = d.getHours();
  const daypart = h < 5 ? "late night" : h < 11 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "late night";
  const wd = d.getDay();
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][wd];
  const is_weekend = wd === 0 || wd === 6 || (wd === 5 && h >= 17);
  const m = d.getMonth();
  const season = m < 2 || m === 11 ? "winter" : m < 5 ? "spring" : m < 8 ? "summer" : "autumn";
  const day = d.getDate();
  let holiday = "";
  if (m === 9 && day >= 15) holiday = "Halloween run-up";
  else if (m === 10 && day >= 20) holiday = "Thanksgiving week";
  else if ((m === 11 && day >= 10) || (m === 0 && day <= 1)) holiday = "December holidays";
  else if (m === 1 && day >= 9 && day <= 14) holiday = "Valentine's week";
  return { daypart, weekday, is_weekend, season, holiday };
}

export async function fetchDeck(opts: {
  services: string[]; moods: string[]; company?: string; length?: string; country?: string;
}): Promise<Film[]> {
  const mo = moment();
  const p = new URLSearchParams({
    country: (opts.country ?? "us").toLowerCase(),
    services: opts.services.join(","),
    moods: opts.moods.join(","),
    company: opts.company ?? "",
    length: opts.length ?? "",
    daypart: mo.daypart, weekday: mo.weekday, is_weekend: String(mo.is_weekend),
    season: mo.season, holiday: mo.holiday, limit: "10",
  });
  // fetch has no default timeout in RN; abort a hung request so the caller can show an error
  // instead of the user being stranded on the Thinking screen forever.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(`${API_BASE}/v1/catalog/deck?${p.toString()}`, {
      headers: await authHeaders(),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`deck ${r.status}`);
    const data = await r.json();
    return (data.films ?? []) as Film[];
  } finally {
    clearTimeout(timer);
  }
}

// The moment shape the backend stores on a decision / reads for ranking (camelCase).
function momentPayload() {
  const mo = moment();
  return { daypart: mo.daypart, weekday: mo.weekday, isWeekend: mo.is_weekend, season: mo.season };
}

export async function recordDecision(d: {
  titleId: string; title: string; action: "like" | "dislike" | "maybe" | "watched";
  reaction?: "loved" | "okay" | "disliked"; moods: string[];
}): Promise<void> {
  const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
  fetch(`${API_BASE}/v1/catalog/decisions`, {
    // Send the moment too, so the engine can learn what they say yes to late at
    // night, on weekends, in winter… (behavioural patterns, not fabricated ones).
    method: "POST", headers, body: JSON.stringify({ ...d, moment: momentPayload() }),
  }).catch(() => {}); // fire-and-forget; a lost decision is not worth blocking the swipe
}

// A group participant's contribution to the ranking: their durable taste and tonight's votes.
export type Participant = { name: string; tasteNotes?: string; votes?: Record<string, string> };

export type RankedResult = { films: Film[]; verdict: string };

// After the deck: rank what was kept into tonight's decision. Solo unless
// `participants` are supplied (a group session), where it ranks for the room.
export async function fetchResults(opts: {
  kept: Film[]; moods: string[]; company?: string; length?: string; participants?: Participant[];
}): Promise<RankedResult> {
  const body = {
    kept: opts.kept, moods: opts.moods, company: opts.company ?? "", length: opts.length ?? "",
    moment: momentPayload(), participants: opts.participants ?? [],
  };
  const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(`${API_BASE}/v1/catalog/results`, {
      method: "POST", headers, body: JSON.stringify(body), signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`results ${r.status}`);
    return (await r.json()) as RankedResult;
  } finally {
    clearTimeout(timer);
  }
}

export type TastePattern = { signal: string; moods: string[]; sampleTitle: string; count: number };

export type TasteProfile = {
  notes: string;
  total: number;
  actions: { like: number; maybe: number; dislike: number; watched: number };
  reactions: { loved: number; okay: number; disliked: number };
  topMoods: string[];
  patterns: TastePattern[];
};

// The viewer's real taste: the engine's running notes + honest tallies. Cold-start
// (a new or guest viewer) comes back all-zero, so the UI can be truthful, not invented.
export async function fetchTaste(): Promise<TasteProfile> {
  const r = await fetch(`${API_BASE}/v1/catalog/taste`, { headers: await authHeaders() });
  if (!r.ok) throw new Error(`taste ${r.status}`);
  return (await r.json()) as TasteProfile;
}
