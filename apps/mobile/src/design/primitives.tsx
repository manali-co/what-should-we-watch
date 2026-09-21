// Layout + text primitives, ported 1:1 from the design's Shell.jsx.
import { ReactNode } from "react";
import { View, Text, StyleProp, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "./tokens";
import type { MoodHue } from "./tokens";

/** Screen — page container. Horizontal page inset by default; the top safe area is applied
 *  once by the app's SafeAreaView, so this does not add it again. */
export function Screen({ children, padded = true, style }: { children: ReactNode; padded?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: t.color.bg, paddingHorizontal: padded ? t.space.pageInset : 0 }, style]}>
      {children}
    </View>
  );
}

/** TopRow — left/right header row, 44 min height. */
export function TopRow({ left, right, style }: { left?: ReactNode; right?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 44, marginTop: 8 }, style]}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>{left}</View>
      <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>{right}</View>
    </View>
  );
}

export function Headline({ children, size = "xl", style }: { children: ReactNode; size?: "xl" | "l" | "m" | "title"; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  const f = { xl: t.type.displayXl, l: t.type.displayL, m: t.type.displayM, title: t.type.title }[size];
  return <Text style={[f, { color: t.color.ink }, style]}>{children}</Text>;
}

export function Body({ children, tone = "secondary", size = "body", style }: { children: ReactNode; tone?: "ink" | "secondary" | "tertiary"; size?: "body" | "l"; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  const c = { ink: t.color.ink, secondary: t.color.inkSecondary, tertiary: t.color.inkTertiary }[tone];
  return <Text style={[size === "l" ? t.type.bodyL : t.type.body, { color: c }, style]}>{children}</Text>;
}

export function Micro({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text style={[t.type.micro, { color: t.color.inkTertiary }, style]}>{children}</Text>;
}

/** Blend — overlapping mood discs. RN has no mix-blend-mode, so hues are laid with slight
 *  transparency and overlap to read as merging. */
export function Blend({ hues, size = 24, style }: { hues: MoodHue[]; size?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  if (!hues.length) return null;
  return (
    <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>
      {hues.map((h, i) => (
        <View
          key={i}
          style={{
            width: size, height: size, borderRadius: 999, backgroundColor: t.color.mood[h].fill,
            marginLeft: i ? -size * 0.42 : 0, opacity: 0.9,
          }}
        />
      ))}
    </View>
  );
}

export function Avatar({ person, size = 32, ring, style }: { person: { name: string; initial: string }; size?: number; ring?: MoodHue | null; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          width: size, height: size, borderRadius: 999, backgroundColor: t.color.surfaceRaised,
          alignItems: "center", justifyContent: "center",
          borderWidth: 2, borderColor: ring ? t.color.mood[ring].fill : t.color.bg,
        },
        style,
      ]}
    >
      <Text style={{ color: t.color.ink, fontFamily: t.fontFamily.bodySemiBold, fontSize: Math.round(size * 0.38) }}>{person.initial}</Text>
    </View>
  );
}

export function Dots({ n, i }: { n: number; i: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {Array.from({ length: n }).map((_, k) => (
        <View key={k} style={{ width: k === i ? 18 : 6, height: 6, borderRadius: 999, backgroundColor: k === i ? t.color.ink : t.color.hairlineStrong }} />
      ))}
    </View>
  );
}
