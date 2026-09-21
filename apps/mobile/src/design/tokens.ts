// What Should We Watch — design tokens, ported 1:1 from the Claude Design project
// (project 38096b66, tokens/theme.ts + tokens/typography.css). Single source of truth
// for the app's look. Keep in sync with the design; do not hand-tune values here.
import { createContext, useContext } from "react";
import type { TextStyle, ViewStyle } from "react-native";

export const palette = {
  graphite950: "#101114", graphite900: "#17181B", graphite800: "#212227", graphite700: "#2B2C32", graphite600: "#35363D",
  paper100: "#F5F4F1", paper200: "#ECEBE7", paper300: "#EAE9E5", paper400: "#DEDDD8", paper600: "#9D9D9B", paper700: "#8A8A8E",
  mint500: "#62C79A", mint700: "#157A50", coralred500: "#E0626C", coralred700: "#C0393F",
  // mood family — coral / lilac / lagoon are the logo discs
  coral: "#E8796F", coralDeep: "#B5463D", lilac: "#AE9BE0", lilacDeep: "#6F57AD", lagoon: "#4DBFB0", lagoonDeep: "#167A70",
  butter: "#E6C76E", butterDeep: "#8C6B0F", moss: "#8FBF8A", mossDeep: "#3F7A3D", sky: "#6FA8DC", skyDeep: "#2A69A8",
} as const;

export type MoodHue = "coral" | "lilac" | "lagoon" | "butter" | "moss" | "sky";
export type MoodColors = Record<MoodHue, { fill: string; ink: string }> & { onFill: string; blendMode: "screen" | "multiply" };

export type ThemeColors = {
  bg: string; bgDeep: string; surface: string; surfaceRaised: string; surfacePressed: string;
  hairline: string; hairlineStrong: string;
  ink: string; inkSecondary: string; inkTertiary: string; inkInverse: string;
  accent: string; accentStrong: string; onAccent: string;
  yes: string; onYes: string; no: string; onNo: string; maybe: string; watched: string; danger: string;
  scrim: string; focus: string;
  mood: MoodColors;
};

const moodDark: MoodColors = {
  coral: { fill: palette.coral, ink: palette.coral }, lilac: { fill: palette.lilac, ink: palette.lilac }, lagoon: { fill: palette.lagoon, ink: palette.lagoon },
  butter: { fill: palette.butter, ink: palette.butter }, moss: { fill: palette.moss, ink: palette.moss }, sky: { fill: palette.sky, ink: palette.sky },
  onFill: palette.graphite900, blendMode: "screen",
};
const moodLight: MoodColors = {
  coral: { fill: palette.coral, ink: palette.coralDeep }, lilac: { fill: palette.lilac, ink: palette.lilacDeep }, lagoon: { fill: palette.lagoon, ink: palette.lagoonDeep },
  butter: { fill: palette.butter, ink: palette.butterDeep }, moss: { fill: palette.moss, ink: palette.mossDeep }, sky: { fill: palette.sky, ink: palette.skyDeep },
  onFill: palette.graphite900, blendMode: "multiply",
};

export const darkColors: ThemeColors = {
  bg: palette.graphite900, bgDeep: palette.graphite950,
  surface: palette.graphite800, surfaceRaised: palette.graphite700, surfacePressed: palette.graphite600,
  hairline: "rgba(242,241,238,0.12)", hairlineStrong: "rgba(242,241,238,0.22)",
  ink: "#F2F1EE", inkSecondary: palette.paper600, inkTertiary: palette.paper700, inkInverse: palette.graphite900,
  accent: "#F2F1EE", accentStrong: "#FFFFFF", onAccent: palette.graphite900,
  yes: palette.mint500, onYes: palette.graphite900, no: palette.coralred500, onNo: palette.graphite900,
  maybe: "#F2F1EE", watched: palette.paper600, danger: palette.coralred500,
  scrim: "rgba(16,17,20,0.6)", focus: "#F2F1EE", mood: moodDark,
};

export const lightColors: ThemeColors = {
  bg: palette.paper100, bgDeep: palette.paper200,
  surface: "#FFFFFF", surfaceRaised: palette.paper300, surfacePressed: palette.paper400,
  hairline: "rgba(23,24,27,0.12)", hairlineStrong: "rgba(23,24,27,0.22)",
  ink: palette.graphite900, inkSecondary: "#5F6064", inkTertiary: "#6E6F73", inkInverse: palette.paper100,
  accent: palette.graphite900, accentStrong: "#000000", onAccent: palette.paper100,
  yes: palette.mint700, onYes: palette.paper100, no: palette.coralred700, onNo: palette.paper100,
  maybe: palette.graphite900, watched: "#5F6064", danger: palette.coralred700,
  scrim: "rgba(23,24,27,0.45)", focus: palette.graphite900, mood: moodLight,
};

// Expo-font keys (loaded in App.tsx). Display = Bricolage Grotesque SemiBold (weight 600 per typography.css).
export const fontFamily = {
  display: "BricolageGrotesque_600SemiBold",
  body: "Figtree_400Regular",
  bodyMedium: "Figtree_500Medium",
  bodySemiBold: "Figtree_600SemiBold",
} as const;

export const type = {
  displayXl: { fontFamily: fontFamily.display, fontSize: 44, lineHeight: 46, letterSpacing: -1.1 },
  displayL:  { fontFamily: fontFamily.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.68 },
  displayM:  { fontFamily: fontFamily.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.42 },
  title:     { fontFamily: fontFamily.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.22 },
  bodyL:     { fontFamily: fontFamily.body, fontSize: 17, lineHeight: 24 },
  body:      { fontFamily: fontFamily.body, fontSize: 15, lineHeight: 22 },
  label:     { fontFamily: fontFamily.bodyMedium, fontSize: 14, lineHeight: 18 },
  caption:   { fontFamily: fontFamily.body, fontSize: 12, lineHeight: 16 },
  micro:     { fontFamily: fontFamily.bodyMedium, fontSize: 11, lineHeight: 14, letterSpacing: 0.88, textTransform: "uppercase" as const },
} satisfies Record<string, TextStyle>;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 56, 10: 80, pageInset: 20 } as const;
export const radius = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, card: 24, sheet: 28, full: 999 } as const;
export const size = { control: 48, controlSm: 36, controlLg: 56, hitMin: 44, avatar: 32, serviceMark: 20, cardWidth: 350, cardHeight: 540 } as const;

export const elevation = {
  card:       { shadowColor: "#000", shadowOpacity: 0.55, shadowRadius: 40, shadowOffset: { width: 0, height: 18 }, elevation: 12 },
  cardLifted: { shadowColor: "#000", shadowOpacity: 0.65, shadowRadius: 56, shadowOffset: { width: 0, height: 28 }, elevation: 18 },
  sheet:      { shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 32, shadowOffset: { width: 0, height: -8 }, elevation: 16 },
  toast:      { shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
} satisfies Record<string, ViewStyle>;

export const motion = {
  duration: { instant: 80, fast: 140, base: 220, slow: 360, flyout: 280, deal: 420, stamp: 120, thinkingBeat: 1400, staggerStep: 40 },
  swipe: { threshold: 96, velocityThreshold: 800, rotationMax: 12, rotationPerPx: 0.06, stampStart: 32, stampFull: 96, nextCardScale: 0.94, nextCardOffset: 14, flyoutDistance: 1.6 },
} as const;

export const themes = { dark: darkColors, light: lightColors } as const;
export type ThemeName = keyof typeof themes;

export type Theme = {
  name: ThemeName;
  color: ThemeColors;
  type: typeof type;
  space: typeof space;
  radius: typeof radius;
  size: typeof size;
  elevation: typeof elevation;
  motion: typeof motion;
  fontFamily: typeof fontFamily;
};

export const makeTheme = (name: ThemeName): Theme => ({
  name, color: themes[name], type, space, radius, size, elevation, motion, fontFamily,
});

export const ThemeContext = createContext<Theme>(makeTheme("dark"));
export const useTheme = () => useContext(ThemeContext);
