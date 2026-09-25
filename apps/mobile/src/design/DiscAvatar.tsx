// DiscAvatar ("Disco") — a person is one disc: a mood hue, a blob shape, a small face.
// Abstract on purpose (no skin, hair or gender): identity comes from colour, shape and
// expression, so it's inclusive by construction. Ported 1:1 from the design's
// components/brand/DiscAvatar.jsx. Two approximations of the web, both the same ones the
// Mascot makes: RN has no mix-blend-mode (duo discs are laid with slight transparency and
// overlap instead of screen/multiply), and RN border-radius can't take separate horizontal
// and vertical corner radii, so each shape's elliptical corners collapse to a single
// per-corner radius — the silhouette is carried mostly by the scale + rotate, as in the web.
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleProp, View, ViewStyle } from "react-native";
import { useTheme } from "./tokens";
import type { MoodHue } from "./tokens";

export const AVATAR_HUES: MoodHue[] = ["coral", "lilac", "lagoon", "butter", "moss", "sky"];

// Per-shape geometry. `r` is the four corner radii as a fraction of the box (tl, tr, br, bl),
// averaged from the web's horizontal/vertical border-radius pair; sx/sy/rotate shape the disc.
type ShapeDef = { r: [number, number, number, number]; sx: number; sy: number; rotate: number };
export const AVATAR_SHAPES: Record<string, ShapeDef> = {
  round:  { r: [0.5, 0.5, 0.5, 0.5], sx: 1, sy: 1, rotate: 0 },
  pebble: { r: [0.54, 0.5, 0.46, 0.5], sx: 1.04, sy: 0.96, rotate: -8 },
  drop:   { r: [0.56, 0.56, 0.42, 0.46], sx: 0.94, sy: 1.08, rotate: 0 },
  bean:   { r: [0.5, 0.5, 0.51, 0.49], sx: 1.1, sy: 0.9, rotate: 12 },
  tall:   { r: [0.55, 0.55, 0.43, 0.43], sx: 0.88, sy: 1.14, rotate: 0 },
  squish: { r: [0.56, 0.56, 0.4, 0.4], sx: 1.14, sy: 0.84, rotate: 0 },
};

type EyeKind = "dot" | "arc" | "line" | "look" | "wink" | "big";
type MouthKind = "smile" | "grin" | "line" | "o" | "smirk";
type FaceDef = { eyes: EyeKind; mouth: MouthKind; eyeScale?: number; eyesY?: number; mouthX?: number };
export const AVATAR_FACES: Record<string, FaceDef> = {
  smile:    { eyes: "dot", mouth: "smile" },
  grin:     { eyes: "arc", mouth: "grin" },
  calm:     { eyes: "line", mouth: "smile" },
  wink:     { eyes: "wink", mouth: "smile" },
  curious:  { eyes: "dot", mouth: "o", eyeScale: 1.25 },
  thinking: { eyes: "look", mouth: "line", mouthX: 18 }, // round eyes glancing up-right; never narrowed
  sleepy:   { eyes: "line", mouth: "line", eyesY: 12 },
  cheeky:   { eyes: "dot", mouth: "smirk" },
  deadpan:  { eyes: "dot", mouth: "line" },
  starry:   { eyes: "big", mouth: "grin" },
};

export type AvatarConfig = { hue: MoodHue; shape: string; face: string; duo?: MoodHue | null };

export function DiscAvatar({
  hue = "coral", shape = "round", face = "smile", size = 40, duo = null,
  ring = false, live = false, bodyless = false, label, style,
}: {
  hue?: MoodHue; shape?: string; face?: string; size?: number; duo?: MoodHue | null;
  ring?: boolean; live?: boolean; bodyless?: boolean; label?: string; style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const sh = AVATAR_SHAPES[shape] || AVATAR_SHAPES.round;
  const f = AVATAR_FACES[face] || AVATAR_FACES.smile;
  const ink = t.color.mood.onFill; // graphite in both themes: faces stay legible on every hue
  const eye = size * 0.11, gap = size * 0.2, stroke = Math.max(1.5, size * 0.03);

  // live: a little pulse on every change and an occasional blink (picker preview only). Static
  // everywhere else. Uses the RN Animated API (native driver, transform-only) — no reanimated
  // worklets, so nothing calls back into JS from the UI thread.
  const pulse = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (!live) return;
    if (first.current) { first.current = false; return; }
    pulse.setValue(0);
    Animated.timing(pulse, { toValue: 1, duration: 560, easing: Easing.bezier(0.2, 1, 0.3, 1), useNativeDriver: true }).start();
  }, [hue, shape, face, duo, live]);
  useEffect(() => {
    if (!live) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(4600),
        Animated.timing(blink, { toValue: 0.1, duration: 80, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [live]);
  const pulseScale = pulse.interpolate({ inputRange: [0, 0.35, 0.65, 1], outputRange: [1, 1.05, 0.98, 1] });

  const duoShown = !!duo && !bodyless;
  const faceShift = duo ? size * 0.14 : 0; // face rides the front disc, which is nudged right in duo

  const backRadius = size / 2;
  const bodyRadii = {
    borderTopLeftRadius: sh.r[0] * size,
    borderTopRightRadius: sh.r[1] * size,
    borderBottomRightRadius: sh.r[2] * size,
    borderBottomLeftRadius: sh.r[3] * size,
  };

  const eyesLeft = size / 2 - (gap + eye) / 2 + faceShift;
  const eyesTop = (size * (50 + (f.eyesY || 0) * 0.3)) / 100 - eye / 2 - size * 0.04;

  return (
    <Animated.View
      accessibilityRole="image"
      accessibilityLabel={label || `avatar: ${hue} ${shape} ${face}`}
      style={[
        { width: size, height: size, transform: [{ scale: live ? pulseScale : 1 }] },
        ring ? { borderRadius: 999, borderWidth: 2, borderColor: t.color.mood[hue].fill } : null,
        style,
      ]}
    >
      {/* duo disc behind: a second hue, offset left, laid with slight transparency to read as a blend */}
      {duoShown ? (
        <View style={{ position: "absolute", inset: 0, borderRadius: backRadius, backgroundColor: t.color.mood[duo].fill, opacity: 0.92, transform: [{ translateX: -size * 0.22 }, { scale: 0.92 }] }} />
      ) : null}

      {/* body disc */}
      {!bodyless ? (
        <View
          style={[
            { position: "absolute", inset: 0, backgroundColor: t.color.mood[hue].fill, opacity: duo ? 0.9 : 1 },
            bodyRadii,
            { transform: [{ translateX: duo ? size * 0.14 : 0 }, { rotate: `${sh.rotate}deg` }, { scaleX: sh.sx }, { scaleY: sh.sy }] },
          ]}
        />
      ) : null}

      {/* eyes */}
      <Animated.View style={{ position: "absolute", left: eyesLeft, top: eyesTop, width: gap + eye, height: eye, flexDirection: "row", justifyContent: "space-between", alignItems: "center", transform: [{ scaleY: live ? blink : 1 }] }}>
        <Eye kind={f.eyes} index={0} eye={eye} stroke={stroke} ink={ink} scale={f.eyeScale || 1} />
        <Eye kind={f.eyes} index={1} eye={eye} stroke={stroke} ink={ink} scale={f.eyeScale || 1} />
      </Animated.View>

      {/* mouth */}
      <View style={{ position: "absolute", left: 0, right: 0, top: size * 0.66, alignItems: "center" }}>
        <View style={{ transform: [{ translateX: (f.mouthX || 0) * 0.01 * size + faceShift }] }}>
          <Mouth kind={f.mouth} size={size} stroke={stroke} ink={ink} />
        </View>
      </View>
    </Animated.View>
  );
}

function Eye({ kind, index, eye, stroke, ink, scale }: { kind: EyeKind; index: number; eye: number; stroke: number; ink: string; scale: number }) {
  const base: ViewStyle = { width: eye, height: eye, borderRadius: eye / 2, backgroundColor: ink };
  const lid: ViewStyle = { width: eye, height: eye * 0.5, backgroundColor: "transparent", borderBottomWidth: stroke, borderColor: ink, borderBottomLeftRadius: eye * 0.5, borderBottomRightRadius: eye * 0.5 };
  if (kind === "line") return <View style={[lid, { transform: [{ scale }] }]} />;
  if (kind === "wink") return index === 1 ? <View style={lid} /> : <View style={base} />;
  if (kind === "arc") return <View style={{ width: eye, height: eye * 0.6, backgroundColor: ink, borderTopLeftRadius: eye * 0.36, borderTopRightRadius: eye * 0.36, borderBottomLeftRadius: eye * 0.24, borderBottomRightRadius: eye * 0.24 }} />;
  if (kind === "look") return <View style={[base, { transform: [{ translateX: eye * 0.22 }, { translateY: -eye * 0.22 }, { scale: 0.9 }] }]} />;
  if (kind === "big") return <View style={[base, { transform: [{ scale: 1.4 }] }]} />;
  return <View style={[base, { transform: [{ scale }] }]} />; // dot
}

function Mouth({ kind, size, stroke, ink }: { kind: MouthKind; size: number; stroke: number; ink: string }) {
  const w = size * 0.22, h = size * 0.12;
  if (kind === "grin") return <View style={{ width: w, height: h * 1.2, backgroundColor: ink, borderBottomLeftRadius: w, borderBottomRightRadius: w }} />;
  if (kind === "line") return <View style={{ width: w * 0.8, height: stroke, backgroundColor: ink, borderRadius: 99 }} />;
  if (kind === "o") return <View style={{ width: h, height: h, borderWidth: stroke, borderColor: ink, borderRadius: h / 2 }} />;
  if (kind === "smirk") return <View style={{ width: w * 0.7, height: h, borderBottomWidth: stroke, borderColor: ink, borderBottomLeftRadius: w, borderBottomRightRadius: w, transform: [{ translateX: w * 0.2 }, { rotate: "-10deg" }] }} />;
  return <View style={{ width: w, height: h, borderBottomWidth: stroke, borderColor: ink, borderBottomLeftRadius: w, borderBottomRightRadius: w }} />; // smile
}
