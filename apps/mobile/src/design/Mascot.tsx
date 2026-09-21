// Mascot — the three-disc mark as a quiet character, reimplemented natively with Reanimated
// (per the chosen approach). Faithful to the design's Mascot.jsx poses + keyframes: one disc
// leads per emotion (swells; others soften), discs morph (blob border-radius) and move, eyes
// and a small mouth emote. The one approximation is the CSS disc-overlap blend (RN has no
// mix-blend-mode) — discs are laid with slight transparency instead.
import { useEffect } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Animated, { Easing, SharedValue, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, interpolate } from "react-native-reanimated";
import { useTheme } from "./tokens";
import type { MoodHue } from "./tokens";

export type MascotState = "idle" | "thinking" | "found" | "surprise" | "empty" | "error" | "celebrate";

type Disc = { x?: number; y?: number; sx?: number; sy?: number; rotate?: number; blob?: number };
type Face = {
  lead: MoodHue | null;
  mouth: { shape: "line" | "smile" | "frown" | "o" | "grin"; scale?: number; x?: number; y?: number; rotate?: number };
  eyes?: { x?: number; y?: number; sx?: number; sy?: number; rotate?: number };
  discs: [Disc, Disc, Disc];
  accent: "breathe" | "scan" | "pop" | "wide" | "sag" | "shake" | "bounce";
};

const HUES: MoodHue[] = ["coral", "lilac", "lagoon"];
const POS = [[0.5, 0.4], [0.36, 0.62], [0.64, 0.62]];

const STATES: Record<MascotState, Face> = {
  idle: { lead: null, mouth: { shape: "smile", scale: 0.7 }, discs: [{ blob: 1 }, { blob: 1 }, { blob: 1 }], accent: "breathe" },
  thinking: { lead: "lilac", mouth: { shape: "line", scale: 0.6, x: 18 }, eyes: { sy: 0.72 }, discs: [{ sx: 1.22, sy: 0.86, rotate: -18, blob: 1 }, { sx: 0.9, sy: 1.18, rotate: 14, blob: 1 }, { sx: 1.15, sy: 0.9, rotate: 26, blob: 1 }], accent: "scan" },
  found: { lead: "lagoon", mouth: { shape: "smile", scale: 1.1 }, eyes: { sy: 0.5, y: -12 }, discs: [{ y: 12 }, { x: 12, y: -8 }, { x: -12, y: -8 }], accent: "pop" },
  surprise: { lead: "coral", mouth: { shape: "o", scale: 1 }, eyes: { sx: 1.3, sy: 1.3 }, discs: [{ y: -12, sx: 0.92, sy: 1.18 }, { x: -12, y: 8, sx: 1.12, sy: 0.96, rotate: -20 }, { x: 12, y: 8, sx: 1.12, sy: 0.96, rotate: 20 }], accent: "wide" },
  empty: { lead: "lilac", mouth: { shape: "frown", scale: 0.8, y: 6 }, eyes: { sy: 0.45, y: 4 }, discs: [{ y: 14, sx: 1.08, sy: 0.84 }, { x: -10, y: 16, sx: 1.22, sy: 0.74 }, { x: 10, y: 16, sx: 1.22, sy: 0.74 }], accent: "sag" },
  error: { lead: "coral", mouth: { shape: "line", scale: 0.8, rotate: -7, y: 6 }, eyes: { rotate: -7, y: 10, x: -6, sy: 0.3 }, discs: [{ x: -8, y: -2, sx: 0.9, sy: 1.1, rotate: -14 }, { x: -6, y: 6, sx: 1.1, sy: 0.92, rotate: 10 }, { x: 14, y: 2, sx: 0.96, sy: 1.04, rotate: 18 }], accent: "shake" },
  celebrate: { lead: "coral", mouth: { shape: "grin", scale: 1.3 }, eyes: { sy: 0.45, y: -10, rotate: -4 }, discs: [{ sx: 0.9, sy: 1.16 }, { sx: 0.92, sy: 1.12, rotate: -8 }, { sx: 0.92, sy: 1.12, rotate: 8 }], accent: "bounce" },
};

export function Mascot({ state = "idle", size = 120, label, style }: { state?: MascotState; size?: number; label?: string; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const s = STATES[state] ?? STATES.idle;
  const d = size * 0.58;
  const eyeSize = size * 0.075;
  const gap = size * 0.13;
  const ink = t.color.inkInverse;

  // loop: continuous yoyo 0..1; enter: one-shot 0..1 on state change.
  const loop = useSharedValue(0);
  const enter = useSharedValue(0);
  useEffect(() => {
    loop.value = 0;
    loop.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }), -1, true);
    if (s.accent === "shake") { enter.value = 0; enter.value = withSequence(withTiming(1, { duration: 60 }), withTiming(-1, { duration: 60 }), withTiming(1, { duration: 60 }), withTiming(0, { duration: 60 })); }
    else { enter.value = 0; enter.value = withTiming(1, { duration: 640, easing: Easing.out(Easing.cubic) }); }
  }, [state]);

  const groupStyle = useAnimatedStyle(() => {
    if (s.accent === "breathe") return { transform: [{ scale: interpolate(loop.value, [0, 1], [1, 1.03]) }] };
    if (s.accent === "bounce") return { transform: [{ translateY: interpolate(loop.value, [0, 1], [0, -size * 0.09]) }] };
    if (s.accent === "pop") return { transform: [{ scale: interpolate(enter.value, [0, 0.5, 1], [0.9, 1.12, 1]) }] };
    if (s.accent === "sag") return { transform: [{ translateY: interpolate(enter.value, [0, 1], [0, size * 0.05]) }], opacity: interpolate(enter.value, [0, 1], [1, 0.85]) };
    if (s.accent === "shake") return { transform: [{ translateX: interpolate(enter.value, [-1, 1], [-size * 0.04, size * 0.04]) }] };
    return {};
  });

  const eyesStyle = useAnimatedStyle(() => {
    const scan = s.accent === "scan" ? interpolate(loop.value, [0, 0.5, 1], [-(gap + eyeSize) * 0.22, (gap + eyeSize) * 0.22, -(gap + eyeSize) * 0.22]) : 0;
    return {
      transform: [
        { translateX: scan + ((s.eyes?.x ?? 0) / 100) * size },
        { translateY: ((s.eyes?.y ?? 0) / 100) * size },
        { rotate: `${s.eyes?.rotate ?? 0}deg` },
        { scaleX: s.eyes?.sx ?? 1 },
        { scaleY: s.eyes?.sy ?? 1 },
      ],
    };
  });

  return (
    <Animated.View accessibilityLabel={label ?? `mascot: ${state}`} style={[{ width: size, height: size }, groupStyle, style]}>
      {HUES.map((h, i) => (
        <Disc key={h} hue={h} pose={s.discs[i]} lead={s.lead === h} dim={s.lead != null && s.lead !== h} d={d} left={POS[i][0] * size - d / 2} top={POS[i][1] * size - d / 2} fill={t.color.mood[h].fill} loop={loop} accent={s.accent} index={i} />
      ))}

      <Animated.View style={[{ position: "absolute", left: size / 2 - (gap + eyeSize) / 2, top: size * 0.53 - eyeSize / 2, width: gap + eyeSize, height: eyeSize, flexDirection: "row", justifyContent: "space-between" }, eyesStyle]}>
        {[0, 1].map((k) => (
          <View key={k} style={{ width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: ink }} />
        ))}
      </Animated.View>

      <View style={{ position: "absolute", left: 0, right: 0, top: size * 0.53 + size * 0.09, alignItems: "center", transform: [{ translateX: ((s.mouth.x ?? 0) / 100) * size }, { translateY: ((s.mouth.y ?? 0) / 100) * size }, { rotate: `${s.mouth.rotate ?? 0}deg` }, { scale: s.mouth.scale ?? 1 }] }}>
        <Mouth shape={s.mouth.shape} size={size} ink={ink} />
      </View>
    </Animated.View>
  );
}

function Disc({ hue, pose, lead, dim, d, left, top, fill, loop, accent, index }: { hue: MoodHue; pose: Disc; lead: boolean; dim: boolean; d: number; left: number; top: number; fill: string; loop: SharedValue<number>; accent: Face["accent"]; index: number }) {
  const anim = useAnimatedStyle(() => {
    const leadScale = lead ? 1.14 : 1;
    // Signature per-accent drift, phase-shifted per disc.
    const phase = (loop.value + index * 0.15) % 1;
    let dx = 0, dy = 0, rot = 0;
    if (accent === "scan" || accent === "breathe") { dx = interpolate(phase, [0, 0.5, 1], [-0.04, 0.04, -0.04]) * d; dy = interpolate(phase, [0, 0.5, 1], [0.03, -0.03, 0.03]) * d; }
    if (accent === "bounce") dy = interpolate(loop.value, [0, 1], [0, -0.06]) * d;
    if (accent === "shake") rot = interpolate(phase, [0, 0.5, 1], [-3, 3, -3]);
    const rBase = interpolate(loop.value, [0, 1], [0.5, pose.blob ? 0.42 : 0.5]) * d;
    const rAlt = interpolate(loop.value, [0, 1], [0.5, pose.blob ? 0.58 : 0.5]) * d;
    return {
      transform: [
        { translateX: ((pose.x ?? 0) / 100) * d + dx },
        { translateY: ((pose.y ?? 0) / 100) * d + dy },
        { rotate: `${(pose.rotate ?? 0) + rot}deg` },
        { scaleX: (pose.sx ?? 1) * leadScale },
        { scaleY: (pose.sy ?? 1) * leadScale },
      ],
      borderTopLeftRadius: rAlt, borderTopRightRadius: rBase, borderBottomRightRadius: rAlt, borderBottomLeftRadius: rBase,
      opacity: dim ? 0.78 : 0.92,
    };
  });
  return <Animated.View style={[{ position: "absolute", left, top, width: d, height: d, backgroundColor: fill }, anim]} />;
}

function Mouth({ shape, size, ink }: { shape: string; size: number; ink: string }) {
  const w = size * 0.12, h = size * 0.07, stroke = Math.max(1.5, size * 0.018);
  if (shape === "line") return <View style={{ width: w, height: stroke, backgroundColor: ink, borderRadius: 99 }} />;
  if (shape === "smile") return <View style={{ width: w, height: h, borderBottomWidth: stroke, borderLeftWidth: stroke, borderRightWidth: stroke, borderColor: ink, borderBottomLeftRadius: w, borderBottomRightRadius: w }} />;
  if (shape === "frown") return <View style={{ width: w, height: h, borderTopWidth: stroke, borderLeftWidth: stroke, borderRightWidth: stroke, borderColor: ink, borderTopLeftRadius: w, borderTopRightRadius: w }} />;
  if (shape === "o") return <View style={{ width: h * 1.1, height: h * 1.1, borderWidth: stroke, borderColor: ink, borderRadius: h }} />;
  return <View style={{ width: w, height: h * 1.2, backgroundColor: ink, borderBottomLeftRadius: w, borderBottomRightRadius: w }} />; // grin
}
