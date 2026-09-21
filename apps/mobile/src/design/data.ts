// Shared UI data ported from the Claude Design project (ui_kits/wsww-app/data.js).
// Mood copy, hues, service names, countries and the "thinking" lines are the design's;
// real film availability comes from the API at runtime.
import type { MoodHue } from "./tokens";

export type Mood = { w: string; hue: MoodHue; weight: number };

export const MOODS: Mood[] = (
  [
    ["cozy", "coral", 3], ["cry it out", "coral", 1], ["date night", "coral", 2], ["romance", "coral", 1], ["quiet and tender", "coral", 1],
    ["mind-bender", "lilac", 2], ["dark and twisty", "lilac", 1], ["cult classic", "lilac", 1], ["sharp satire", "lilac", 1], ["gorgeous to look at", "lilac", 1],
    ["slow burn", "lagoon", 2], ["rainy Sunday", "lagoon", 2], ["comfort rewatch", "lagoon", 2], ["coming of age", "lagoon", 1], ["true story", "lagoon", 1],
    ["big laughs", "butter", 3], ["chaotic", "butter", 1], ["road trip", "butter", 1], ["brain off", "butter", 2], ["feel-good", "butter", 2],
    ["a proper epic", "moss", 1], ["outer space", "moss", 1], ["underdog", "moss", 1], ["foreign gem", "moss", 1], ["nostalgic", "moss", 2],
    ["edge of the seat", "sky", 2], ["properly scary", "sky", 1], ["spooky not scary", "sky", 1], ["heist energy", "sky", 2], ["whodunit", "sky", 2],
  ] as [string, MoodHue, number][]
).map(([w, hue, weight]) => ({ w, hue, weight }));

export const hueHex: Record<MoodHue, string> = {
  coral: "#E8796F", lilac: "#AE9BE0", lagoon: "#4DBFB0", butter: "#E6C76E", moss: "#8FBF8A", sky: "#6FA8DC",
};

const HUE_CYCLE: MoodHue[] = ["coral", "lilac", "lagoon", "butter", "moss", "sky"];
const byWord = new Map(MOODS.map((m) => [m.w, m]));

// Hue for a mood word. Known moods use their assigned hue; custom (natural-language)
// moods cycle through the palette by their position among the selected custom moods.
export const hueOf = (word: string, customIndex = 0): MoodHue =>
  byWord.get(word)?.hue ?? HUE_CYCLE[customIndex % HUE_CYCLE.length];

export type Service = { id: string; name: string; detected: boolean };

export const SERVICES: Service[] = (
  [
    ["netflix", "Netflix", true], ["hulu", "Hulu", true], ["max", "Max", true], ["disney", "Disney+"], ["apple", "Apple TV+"], ["prime", "Prime Video"], ["peacock", "Peacock"],
    ["paramount", "Paramount+"], ["criterion", "Criterion Channel"], ["mubi", "MUBI"], ["tubi", "Tubi"], ["pluto", "Pluto TV"], ["roku", "The Roku Channel"], ["starz", "Starz"],
    ["amc", "AMC+"], ["shudder", "Shudder"], ["kanopy", "Kanopy"], ["hoopla", "Hoopla"], ["britbox", "BritBox"], ["acorn", "Acorn TV"],
  ] as [string, string, boolean?][]
).map(([id, name, detected]) => ({ id, name, detected: !!detected }));

export const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Ireland", "India", "Germany", "France", "Netherlands", "Sweden",
  "Brazil", "Mexico", "Japan", "South Korea", "New Zealand", "Spain", "Italy", "Singapore",
];

export const COUNTRY_CODE: Record<string, string> = {
  "United States": "us", "United Kingdom": "gb", "Canada": "ca", "Australia": "au",
  "Ireland": "ie", "India": "in", "Germany": "de", "France": "fr", "Netherlands": "nl",
  "Sweden": "se", "Brazil": "br", "Mexico": "mx", "Japan": "jp", "South Korea": "kr",
  "New Zealand": "nz", "Spain": "es", "Italy": "it", "Singapore": "sg",
};
export const countryCode = (name?: string) => (name && COUNTRY_CODE[name]) || "us";

export const thinkingLines = (services: string[], moods: string[], country: string): string[] => [
  `Checking what’s on ${services.join(", ")} in ${country} tonight`,
  "Leaving out the ones you’ve already seen",
  moods.length ? `Finding the ones that feel ${moods.join(" and ")}` : "Finding the ones you’d say yes to",
  "Putting the one that leaves soonest near the top",
];

export type Person = { id: string; name: string; initial: string };
export const PEOPLE: Person[] = [
  { id: "m", name: "Manali", initial: "M" }, { id: "j", name: "Jo", initial: "J" }, { id: "s", name: "Sam", initial: "S" },
  { id: "a", name: "Ana", initial: "A" }, { id: "r", name: "Ravi", initial: "R" }, { id: "k", name: "Kit", initial: "K" },
];
