import AsyncStorage from "@react-native-async-storage/async-storage";
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
    id = "dev_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
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
  services: string[]; moods: string[]; company?: string; length?: string;
}): Promise<Film[]> {
  const mo = moment();
  const p = new URLSearchParams({
    country: "us",
    services: opts.services.join(","),
    moods: opts.moods.join(","),
    company: opts.company ?? "",
    length: opts.length ?? "",
    daypart: mo.daypart, weekday: mo.weekday, is_weekend: String(mo.is_weekend),
    season: mo.season, holiday: mo.holiday, limit: "10",
  });
  const r = await fetch(`${API_BASE}/v1/catalog/deck?${p.toString()}`, {
    headers: await authHeaders(),
  });
  if (!r.ok) throw new Error(`deck ${r.status}`);
  const data = await r.json();
  return (data.films ?? []) as Film[];
}

export async function recordDecision(d: {
  titleId: string; title: string; action: "like" | "dislike" | "maybe" | "watched";
  reaction?: "loved" | "okay" | "disliked"; moods: string[];
}): Promise<void> {
  const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
  fetch(`${API_BASE}/v1/catalog/decisions`, {
    method: "POST", headers, body: JSON.stringify(d),
  }).catch(() => {}); // fire-and-forget; a lost decision is not worth blocking the swipe
}
