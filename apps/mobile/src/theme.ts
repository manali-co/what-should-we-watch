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

// warm=coral, cerebral=lilac, slow/beauty=lagoon, fun=amber, wistful=sky, tender=rose
export const MOOD_HUE: Record<string, string> = {
  cozy: theme.coral, "date night": theme.coral, romance: theme.coral, "cry it out": theme.coral,
  "feel-good": theme.amber, "big laughs": theme.amber, "brain off": theme.amber, chaotic: theme.amber,
  "slow burn": theme.lagoon, "gorgeous to look at": theme.lagoon, "quiet and tender": theme.lagoon,
  "mind-bender": theme.lilac, "dark and twisty": theme.lilac, "cult classic": theme.lilac, "sharp satire": theme.lilac,
  "rainy Sunday": theme.sky, "comfort rewatch": theme.sky, "coming of age": theme.sky, nostalgic: theme.sky,
  "true story": theme.rose, "road trip": theme.rose, underdog: theme.rose, whodunit: theme.rose,
  "properly scary": theme.lilac, "outer space": theme.sky, "a proper epic": theme.amber, "foreign gem": theme.lagoon,
};

export const hue = (m: string) => MOOD_HUE[m] ?? theme.coral;

export const MOODS = [
  "feel-good", "slow burn", "cozy", "cry it out", "date night", "romance", "quiet and tender",
  "mind-bender", "dark and twisty", "cult classic", "sharp satire", "gorgeous to look at",
  "rainy Sunday", "comfort rewatch", "coming of age", "true story", "big laughs", "road trip",
  "chaotic", "brain off", "whodunit", "outer space",
];

export const API_BASE = "https://wsww-dev-api.azurewebsites.net";

export const font = {
  display: "BricolageGrotesque_800ExtraBold",
  displaySemi: "BricolageGrotesque_600SemiBold",
  body: "Figtree_400Regular",
  bodyMed: "Figtree_500Medium",
  bodySemi: "Figtree_600SemiBold",
};
