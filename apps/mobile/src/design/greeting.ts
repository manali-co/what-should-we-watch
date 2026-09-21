// Personalized, context-aware headline. Ported 1:1 from the design's Mood.jsx greetingFor().
// Keeps the "___ feels like…" completion so picked moods flow into it.
// Priority (first match wins): fresh → holiday → welcome-back (14+ days) → daypart x weekday/weekend x season.
export type Greeting = { id: string; text: string; size: "xl" | "l" | "m"; label: string };
export type Ctx = { hour: number; dow: number; season: "winter" | "spring" | "summer" | "autumn"; holiday: string | null; daysAway: number; fresh: boolean };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function greetingFor(ctx: Ctx, name?: string): { id: string; text: string; size: "xl" | "l" | "m" } {
  const { hour, dow, season, holiday, daysAway, fresh } = ctx;
  const weekend = dow === 0 || dow === 6;
  const evening = hour >= 17 && hour < 23;
  const who = name ? `, ${name}` : "";
  if (fresh) return { id: "fresh", text: `Let’s start simple${who}. Tonight feels like…`, size: "l" };
  if (holiday === "Halloween") return { id: "halloween", text: "Halloween feels like…", size: "xl" };
  if (holiday === "Christmas Eve") return { id: "xmas", text: "Christmas Eve feels like…", size: "xl" };
  if (holiday === "New Year’s Eve") return { id: "nye", text: "The last night of the year feels like…", size: "l" };
  if (holiday === "Valentine’s") return { id: "valentine", text: "Valentine’s night feels like…", size: "xl" };
  if (holiday === "Thanksgiving") return { id: "thanksgiving", text: "Full, and on the sofa. Tonight feels like…", size: "l" };
  if (daysAway >= 14) return { id: "back", text: `Welcome back${who}. ${evening ? "Tonight" : "Today"} feels like…`, size: "l" };
  if (hour >= 23 || hour < 4) return { id: "late", text: `Still up${who}? The small hours feel like…`, size: "l" };
  if (hour < 8) return { id: "early", text: "Up early. This morning feels like…", size: "l" };
  if (hour < 12) return { id: "morning", text: "A film before lunch. This morning feels like…", size: "l" };
  if (hour < 17) return weekend ? { id: "lazy", text: `A lazy ${DAYS[dow]} afternoon feels like…`, size: "l" } : { id: "afternoon", text: "This afternoon feels like…", size: "xl" };
  if (dow === 5) return { id: "friday", text: "Friday night feels like…", size: "xl" };
  if (dow === 6) return { id: "saturday", text: "Saturday night feels like…", size: "xl" };
  if (dow === 0) return { id: "sunday", text: "Sunday night feels like…", size: "xl" };
  if (season === "summer" && !weekend && hour < 21) return { id: "summer", text: "A long summer evening feels like…", size: "l" };
  if (season === "winter" && hour >= 19) return { id: "winter", text: "A dark winter night feels like…", size: "l" };
  return { id: "default", text: "Tonight feels like…", size: "xl" };
}

function seasonOf(month: number): Ctx["season"] {
  if (month === 11 || month <= 1) return "winter";
  if (month <= 4) return "spring";
  if (month <= 7) return "summer";
  return "autumn";
}

// Holidays computed from the date to match the design's named set.
function holidayOf(d: Date): string | null {
  const m = d.getMonth(), day = d.getDate(), dow = d.getDay(), h = d.getHours();
  if (m === 9 && day === 31) return "Halloween";
  if (m === 9 && day >= 29 && (dow === 5 || dow === 6 || dow === 0)) return "Halloween";
  if (m === 11 && day >= 24 && day <= 26) return "Christmas Eve";
  if (m === 11 && day === 31 && h >= 17) return "New Year’s Eve";
  if (m === 1 && day === 14 && h >= 17) return "Valentine’s";
  // Thanksgiving: 4th Thursday of November, from 15:00
  if (m === 10 && dow === 4 && day >= 22 && day <= 28 && h >= 15) return "Thanksgiving";
  return null;
}

function ctxLabel(ctx: Ctx): string {
  const h12 = ctx.hour % 12 === 0 ? 12 : ctx.hour % 12;
  const ampm = ctx.hour < 12 ? "am" : "pm";
  return [DAYS[ctx.dow], `${h12}:00 ${ampm}`, ctx.season, ctx.holiday].filter(Boolean).join(" · ");
}

export function currentGreeting(name?: string, fresh = false, daysAway = 0): Greeting {
  const now = new Date();
  const ctx: Ctx = { hour: now.getHours(), dow: now.getDay(), season: seasonOf(now.getMonth()), holiday: holidayOf(now), daysAway, fresh };
  const g = greetingFor(ctx, name);
  return { ...g, label: ctxLabel(ctx) };
}
