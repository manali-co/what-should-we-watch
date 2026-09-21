// Interactive controls, ported 1:1 from the design's core components (Pill, Button, Segmented).
import { ReactNode, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleProp, Text, TextStyle, View, ViewStyle } from "react-native";
import { useTheme } from "./tokens";
import type { MoodHue } from "./tokens";

type Tone = "neutral" | "yes" | "no" | "maybe" | "watched" | "accent";

/** Pill — compact tappable statement. Mood pills pass `hue`; decisions pass `tone`. */
export function Pill({
  children, selected = false, tone = "neutral", hue, size = "md", onPress, leading = false, disabled = false, style, textStyle,
}: {
  children: ReactNode; selected?: boolean; tone?: Tone; hue?: MoodHue; size?: "sm" | "md" | "lg";
  onPress?: () => void; leading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  const [pressed, setPressed] = useState(false);
  const toneColor = hue ? t.color.mood[hue].fill : ({ neutral: t.color.ink, yes: t.color.yes, no: t.color.no, maybe: t.color.maybe, watched: t.color.watched, accent: t.color.accent } as const)[tone];
  const textColor = hue ? t.color.mood[hue].ink : toneColor;
  const onTone = hue ? t.color.mood.onFill : ({ neutral: t.color.inkInverse, yes: t.color.onYes, no: t.color.onNo, maybe: t.color.onAccent, watched: t.color.inkInverse, accent: t.color.onAccent } as const)[tone];
  const h = size === "sm" ? 32 : size === "lg" ? 48 : 40;
  const borderColor = selected ? toneColor : hue ? textColor : t.color.hairlineStrong;
  const bg = selected ? toneColor : pressed ? t.color.surfaceRaised : "transparent";
  const color = selected ? onTone : tone === "neutral" && !hue ? t.color.ink : textColor;
  const font: TextStyle = size === "sm" ? t.type.caption : t.type.label;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      style={{
        flexDirection: "row", alignItems: "center", gap: t.space[2], height: h,
        paddingHorizontal: size === "sm" ? 12 : 16, borderRadius: t.radius.full,
        borderWidth: 1, borderColor, backgroundColor: bg, opacity: disabled ? 0.4 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      }}
    >
      {leading ? <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: selected ? onTone : textColor }} /> : null}
      <Text numberOfLines={1} style={[font, { fontFamily: t.fontFamily.bodyMedium, color }, textStyle]}>{children}</Text>
    </Pressable>
  );
}

export function PillRow({ children, wrap = true, justify = "flex-start", style }: { children: ReactNode; wrap?: boolean; justify?: ViewStyle["justifyContent"]; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[{ flexDirection: "row", flexWrap: wrap ? "wrap" : "nowrap", gap: t.space[2], justifyContent: justify }, style]}>{children}</View>;
}

type Variant = "primary" | "secondary" | "ghost" | "outline" | "destructive" | "yes" | "no";

/** Button — the one action per screen. Primary is ink; mood hues never appear here. */
export function Button({
  variant = "primary", size = "md", full = false, disabled = false, icon, children, onPress, style,
}: {
  variant?: Variant; size?: "sm" | "md" | "lg"; full?: boolean; disabled?: boolean;
  icon?: ReactNode; children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const [pressed, setPressed] = useState(false);
  const h = size === "lg" ? t.size.controlLg : size === "sm" ? t.size.controlSm : t.size.control;
  const skins: Record<Variant, { bg: string; color: string; border?: string }> = {
    primary: { bg: t.color.accent, color: t.color.onAccent },
    secondary: { bg: t.color.surfaceRaised, color: t.color.ink },
    ghost: { bg: "transparent", color: t.color.inkSecondary },
    outline: { bg: "transparent", color: t.color.ink, border: t.color.hairlineStrong },
    destructive: { bg: "transparent", color: t.color.danger, border: t.color.hairline },
    yes: { bg: t.color.yes, color: t.color.onYes },
    no: { bg: t.color.no, color: t.color.onNo },
  };
  const s = skins[variant];
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      style={[
        {
          flexDirection: "row", alignItems: "center", justifyContent: "center", gap: t.space[2],
          height: h, paddingHorizontal: size === "sm" ? t.space[4] : t.space[6], borderRadius: t.radius.full,
          width: full ? "100%" : undefined, minWidth: t.size.hitMin,
          backgroundColor: s.bg, borderWidth: s.border ? 1 : 0, borderColor: s.border,
          opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {icon ? <View style={{ width: 18, height: 18, alignItems: "center", justifyContent: "center" }}>{icon}</View> : null}
      <Text style={[size === "lg" ? t.type.bodyL : t.type.body, { fontFamily: t.fontFamily.bodyMedium, color: s.color, letterSpacing: -0.1 }]}>{children}</Text>
    </Pressable>
  );
}

/** IconButton — 44 round hit target for chrome. Never carries the accent. */
export function IconButton({ children, onPress, size = 44, tone = "default", style }: { children: ReactNode; onPress?: () => void; size?: number; tone?: "default" | "filled"; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        {
          width: size, height: size, borderRadius: 999, alignItems: "center", justifyContent: "center",
          backgroundColor: tone === "filled" || pressed ? t.color.surfaceRaised : "transparent",
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export type Option = { value: string; label: string };

/** Segmented — mutually exclusive choice. bar: iOS track with sliding thumb; sentence: words in a sentence. */
export function Segmented({ options, value, onChange, variant = "bar", style }: { options: Option[]; value: string; onChange: (v: string) => void; variant?: "bar" | "sentence"; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const idx = Math.max(0, options.findIndex((o) => o.value === value));

  if (variant === "sentence") {
    return (
      <View style={[{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: t.space[3] }, style]}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable key={o.value} onPress={() => onChange(o.value)} style={{ paddingVertical: 6, minHeight: t.size.hitMin, justifyContent: "center" }}>
              <Text style={[t.type.title, { color: on ? t.color.ink : t.color.inkTertiary, textDecorationLine: on ? "underline" : "none", textDecorationColor: t.color.accent }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  const [w, setW] = useState(0);
  const thumb = useRef(new Animated.Value(idx)).current;
  Animated.timing(thumb, { toValue: idx, duration: t.motion.duration.base, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  const seg = w > 0 ? (w - 6) / options.length : 0;
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[{ flexDirection: "row", padding: 3, borderRadius: t.radius.full, backgroundColor: t.color.surfaceRaised, height: 40 }, style]}
    >
      {w > 0 ? (
        <Animated.View
          style={{
            position: "absolute", top: 3, bottom: 3, left: 3, width: seg, borderRadius: t.radius.full, backgroundColor: t.color.ink,
            transform: [{ translateX: thumb.interpolate({ inputRange: [0, 1], outputRange: [0, seg] }) }],
          }}
        />
      ) : null}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={{ flex: 1, alignItems: "center", justifyContent: "center", borderRadius: t.radius.full }}>
            <Text numberOfLines={1} style={[t.type.label, { color: on ? t.color.inkInverse : t.color.inkSecondary }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Switch — on/off. Ink when on. */
export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const t = useTheme();
  const x = useRef(new Animated.Value(checked ? 1 : 0)).current;
  Animated.timing(x, { toValue: checked ? 1 : 0, duration: t.motion.duration.base, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  return (
    <Pressable onPress={() => onChange(!checked)} style={{ width: 50, height: 30, borderRadius: 999, padding: 2, backgroundColor: checked ? t.color.accent : t.color.surfacePressed }}>
      <Animated.View style={{ width: 26, height: 26, borderRadius: 999, backgroundColor: checked ? t.color.onAccent : t.color.ink, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }} />
    </Pressable>
  );
}

/** Stepper — +/- for a small count (group size). */
export function Stepper({ value, min = 1, max = 6, onChange, format = (v: number) => String(v) }: { value: number; min?: number; max?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  const t = useTheme();
  const btn = (txt: string, fn: () => void, dis: boolean) => (
    <Pressable onPress={fn} disabled={dis} style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: t.color.surfaceRaised, alignItems: "center", justifyContent: "center", opacity: dis ? 0.35 : 1 }}>
      <Text style={[t.type.title, { color: t.color.ink }]}>{txt}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: t.space[3] }}>
      {btn("−", () => onChange(Math.max(min, value - 1)), value <= min)}
      <Text style={[t.type.title, { color: t.color.ink, minWidth: 32, textAlign: "center" }]}>{format(value)}</Text>
      {btn("+", () => onChange(Math.min(max, value + 1)), value >= max)}
    </View>
  );
}
