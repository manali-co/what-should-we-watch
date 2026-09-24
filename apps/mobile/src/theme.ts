export const theme = {
  bg: "#16171D",
  surface: "#1E2027",
  surface2: "#282B34",
  ink: "#F0ECE3",
  muted: "#9A9BA8",
  line: "#33363F",
  yes: "#6BA687",
  no: "#C1745F",
  // mood hue families
  coral: "#E8796F",
  lilac: "#AE9BE0",
  lagoon: "#4DBFB0",
  amber: "#E7B15A",
  sky: "#7FA7D9",
  rose: "#D98FB0",
  moodHues: ["#E8796F", "#AE9BE0", "#4DBFB0", "#E7B15A", "#7FA7D9", "#D98FB0"],
};

// NOTE: the mood list + hue mapping live in src/design/data.ts (the single source of
// truth used by the live MoodScreen). The stale copies that were here — MOODS, MOOD_HUE,
// hue — were only consumed by the removed legacy src/Tonight.tsx. Don't re-add them here.

export const API_BASE = "https://wsww-dev-api.azurewebsites.net";

export const font = {
  display: "BricolageGrotesque_800ExtraBold",
  displaySemi: "BricolageGrotesque_600SemiBold",
  body: "Figtree_400Regular",
  bodyMed: "Figtree_500Medium",
  bodySemi: "Figtree_600SemiBold",
};
