// Mascot — the three-disc mark as a quiet character, native (Reanimated). Faithful to the
// design's Mascot.jsx: one disc leads per emotion (swells; others soften), and — the point —
// the discs, eyes and mouth MORPH between states rather than snapping. On a state change a
// per-pair transition (thinking→found overshoots then pops; →empty melts slowly; →error
// stumbles) interpolates every pose value from the old state to the new one; the idle loop
// (drift/blob) runs on top, and one-shot accents (pop/shake/bounce) fire only once the pose
// has landed. The one approximation of the web is the CSS disc-overlap blend (RN has no
// mix-blend-mode) — discs are laid with slight transparency instead.
import { useEffect, useRef } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Animated, { Easing, EasingFunctionFactory, SharedValue, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, interpolate } from "react-native-reanimated";
import { useTheme } from "./tokens";
import type { MoodHue } from "./tokens";

export type MascotState = "idle" | "thinking" | "found" | "surprise" | "empty" | "error" | "celebrate";

type Disc = { x?: number; y?: number; sx?: number; sy?: number; rotate?: number; blob?: number };
type Eyes = { x?: number; y?: number; sx?: number; sy?: number; rotate?: number };
type Face = {
  lead: MoodHue | null;
  mouth: { shape: "line" | "smile" | "frown" | "o" | "grin"; scale?: number; x?: number; y?: number; rotate?: number };
  eyes?: Eyes;
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

// Per-pair morph timing (ms, easing, and how fast the face lands vs the body). Mirrors the
// design's TRANSITIONS: overshoot into found, a slow melt into empty, a stumble into error.
type Tr = { ms: number; ease: EasingFunctionFactory; face: number };
const EASE = {
  standard: Easing.bezier(0.2, 1, 0.3, 1),
  overshoot: Easing.bezier(0.2, 1.2, 0.3, 1),
  slow: Easing.bezier(0.4, 0, 0.2, 1),
  stumble: Easing.bezier(0.3, 0, 0.7, 1),
};
function transitionFor(from: MascotState, to: MascotState): Tr {
  const key = `${from}>${to}`;
  const T: Record<string, Tr> = {
    "thinking>found": { ms: 600, ease: EASE.overshoot, face: 0.7 },
    "thinking>empty": { ms: 1100, ease: EASE.slow, face: 0.9 },
    "thinking>error": { ms: 400, ease: EASE.stumble, face: 0.6 },
    "found>celebrate": { ms: 700, ease: EASE.overshoot, face: 0.7 },
  };
  if (T[key]) return T[key];
  if (to === "surprise") return { ms: 380, ease: EASE.overshoot, face: 0.5 };
  if (to === "empty") return { ms: 1100, ease: EASE.slow, face: 0.9 };
  if (to === "error") return { ms: 400, ease: EASE.stumble, face: 0.6 };
  return { ms: 700, ease: EASE.standard, face: 0.75 };
}

export function Mascot({ state = "idle", size = 120, label, style }: { state?: MascotState; size?: number; label?: string; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const s = STATES[state] ?? STATES.idle;
  const prevRef = useRef<MascotState>(state);
  const sPrev = STATES[prevRef.current] ?? STATES.idle;
  const tr = transitionFor(prevRef.current, state);
  const d = size * 0.58;
  const eyeSize = size * 0.075;
  const gap = size * 0.13;
  const ink = t.color.inkInverse;

  // morph: 0 at a state change → 1 as the pose lands (body pace). morphFace lands sooner.
  // loop: continuous 0..1 yoyo for idle drift/blob. enter: the one-shot accent, delayed
  // until the morph completes so pop/shake/bounce read as a reaction, not a jump-cut.
  const morph = useSharedValue(1);
  const morphFace = useSharedValue(1);
  const loop = useSharedValue(0);
  const enter = useSharedValue(0);

  useEffect(() => {
    loop.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);

  useEffect(() => {
    const same = prevRef.current === state;
    morph.value = same ? 1 : 0;
    morphFace.value = same ? 1 : 0;
    if (!same) {
      morph.value = withTiming(1, { duration: tr.ms, easing: tr.ease });
      morphFace.value = withTiming(1, { duration: Math.round(tr.ms * tr.face), easing: tr.ease });
    }
    // Fire the one-shot accent once the pose has landed.
    enter.value = 0;
    const oneShot = s.accent === "shake"
      ? withSequence(withTiming(1, { duration: 60 }), withTiming(-1, { duration: 60 }), withTiming(1, { duration: 60 }), withTiming(0, { duration: 60 }))
      : withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    enter.value = same ? oneShot : withDelay(tr.ms, oneShot);
    const id = setTimeout(() => { prevRef.current = state; }, tr.ms + 30);
    return () => clearTimeout(id);
  }, [state]);

  const groupStyle = useAnimatedStyle(() => {
    if (s.accent === "breathe") return { transform: [{ scale: interpolate(loop.value, [0, 1], [1, 1.03]) }] };
    if (s.accent === "bounce") return { transform: [{ translateY: interpolate(loop.value, [0, 1], [0, -size * 0.09]) }] };
    if (s.accent === "pop") return { transform: [{ scale: interpolate(enter.value, [0, 0.5, 1], [0.9, 1.12, 1]) }] };
    if (s.accent === "sag") return { transform: [{ translateY: interpolate(enter.value, [0, 1], [0, size * 0.05]) }], opacity: interpolate(enter.value, [0, 1], [1, 0.85]) };
    if (s.accent === "shake") return { transform: [{ translateX: interpolate(enter.value, [-1, 1], [-size * 0.04, size * 0.04]) }] };
    return {};
  });

  const ep = sPrev.eyes ?? {}, en = s.eyes ?? {};
  const eyesStyle = useAnimatedStyle(() => {
    const m = morphFace.value;
    const scan = s.accent === "scan" ? interpolate(loop.value, [0, 0.5, 1], [-(gap + eyeSize) * 0.22, (gap + eyeSize) * 0.22, -(gap + eyeSize) * 0.22]) : 0;
    return {
      transform: [
        { translateX: scan + (interpolate(m, [0, 1], [ep.x ?? 0, en.x ?? 0]) / 100) * size },
        { translateY: (interpolate(m, [0, 1], [ep.y ?? 0, en.y ?? 0]) / 100) * size },
        { rotate: `${interpolate(m, [0, 1], [ep.rotate ?? 0, en.rotate ?? 0])}deg` },
        { scaleX: interpolate(m, [0, 1], [ep.sx ?? 1, en.sx ?? 1]) },
        { scaleY: interpolate(m, [0, 1], [ep.sy ?? 1, en.sy ?? 1]) },
      ],
    };
  });

  const mp = sPrev.mouth, mn = s.mouth;
  const mouthStyle = useAnimatedStyle(() => {
    const m = morphFace.value;
    return {
      transform: [
        { translateX: (interpolate(m, [0, 1], [mp.x ?? 0, mn.x ?? 0]) / 100) * size },
        { translateY: (interpolate(m, [0, 1], [mp.y ?? 0, mn.y ?? 0]) / 100) * size },
        { rotate: `${interpolate(m, [0, 1], [mp.rotate ?? 0, mn.rotate ?? 0])}deg` },
        { scale: interpolate(m, [0, 1], [mp.scale ?? 1, mn.scale ?? 1]) },
      ],
    };
  });

  return (
    <Animated.View accessibilityLabel={label ?? `mascot: ${state}`} style={[{ width: size, height: size }, groupStyle, style]}>
      {HUES.map((h, i) => (
        <Disc
          key={h} hue={h} pose={s.discs[i]} posePrev={sPrev.discs[i]}
          lead={s.lead === h} leadPrev={sPrev.lead === h}
          dim={s.lead != null && s.lead !== h} dimPrev={sPrev.lead != null && sPrev.lead !== h}
          d={d} left={POS[i][0] * size - d / 2} top={POS[i][1] * size - d / 2}
          fill={t.color.mood[h].fill} loop={loop} morph={morph} accent={s.accent} index={i}
        />
      ))}

      <Animated.View style={[{ position: "absolute", left: size / 2 - (gap + eyeSize) / 2, top: size * 0.53 - eyeSize / 2, width: gap + eyeSize, height: eyeSize, flexDirection: "row", justifyContent: "space-between" }, eyesStyle]}>
        {[0, 1].map((k) => (
          <View key={k} style={{ width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: ink }} />
        ))}
      </Animated.View>

      <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: size * 0.53 + size * 0.09, alignItems: "center" }, mouthStyle]}>
        <Mouth shape={s.mouth.shape} size={size} ink={ink} />
      </Animated.View>
    </Animated.View>
  );
}

function Disc({ hue, pose, posePrev, lead, leadPrev, dim, dimPrev, d, left, top, fill, loop, morph, accent, index }: {
  hue: MoodHue; pose: Disc; posePrev: Disc; lead: boolean; leadPrev: boolean; dim: boolean; dimPrev: boolean;
  d: number; left: number; top: number; fill: string; loop: SharedValue<number>; morph: SharedValue<number>; accent: Face["accent"]; index: number;
}) {
  const anim = useAnimatedStyle(() => {
    const m = morph.value;
    // Interpolate the whole pose from where we were to where we're going.
    const px = interpolate(m, [0, 1], [posePrev.x ?? 0, pose.x ?? 0]);
    const py = interpolate(m, [0, 1], [posePrev.y ?? 0, pose.y ?? 0]);
    const psx = interpolate(m, [0, 1], [posePrev.sx ?? 1, pose.sx ?? 1]);
    const psy = interpolate(m, [0, 1], [posePrev.sy ?? 1, pose.sy ?? 1]);
    const prot = interpolate(m, [0, 1], [posePrev.rotate ?? 0, pose.rotate ?? 0]);
    const leadScale = interpolate(m, [0, 1], [leadPrev ? 1.14 : 1, lead ? 1.14 : 1]);
    const opacity = interpolate(m, [0, 1], [dimPrev ? 0.78 : 0.92, dim ? 0.78 : 0.92]);
    // Idle loop (drift + blob), phase-shifted per disc, layered on top of the posed transform.
    const phase = (loop.value + index * 0.15) % 1;
    let dx = 0, dy = 0, rot = 0;
    if (accent === "scan" || accent === "breathe") { dx = interpolate(phase, [0, 0.5, 1], [-0.04, 0.04, -0.04]) * d; dy = interpolate(phase, [0, 0.5, 1], [0.03, -0.03, 0.03]) * d; }
    if (accent === "shake") rot = interpolate(phase, [0, 0.5, 1], [-3, 3, -3]);
    const rBase = interpolate(loop.value, [0, 1], [0.5, pose.blob ? 0.42 : 0.5]) * d;
    const rAlt = interpolate(loop.value, [0, 1], [0.5, pose.blob ? 0.58 : 0.5]) * d;
    return {
      transform: [
        { translateX: (px / 100) * d + dx },
        { translateY: (py / 100) * d + dy },
        { rotate: `${prot + rot}deg` },
        { scaleX: psx * leadScale },
        { scaleY: psy * leadScale },
      ],
      borderTopLeftRadius: rAlt, borderTopRightRadius: rBase, borderBottomRightRadius: rAlt, borderBottomLeftRadius: rBase,
      opacity,
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
