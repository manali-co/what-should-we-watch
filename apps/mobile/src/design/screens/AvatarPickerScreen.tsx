// AvatarPickerScreen — one big live disc, dials under it: colour · shape · face · blend.
// Ported 1:1 from the design's ui_kits/wsww-app/AvatarPicker.jsx. The big preview is itself a
// control (SwipeDisc): drag horizontally to cycle faces, vertically to cycle colours; it
// follows the finger a little and springs back. Each Dial is a stepper-slider: ‹ value › with
// a dot track and a thumb; tap the arrows, or drag the track. Lives under Account (and, later,
// onboarding). RN port uses PanResponder for the gestures (the app avoids Reanimated worklets
// that call back into JS) and the RN Animated API for the spring-back and thumb slide.
import { useMemo, useRef, useState } from "react";
import { Animated, Easing, PanResponder, Pressable, ScrollView, Text, View } from "react-native";
import { AVATAR_FACES, AVATAR_HUES, AVATAR_SHAPES, AvatarConfig, DiscAvatar } from "../DiscAvatar";
import { Body, Headline, Micro, Screen, TopRow } from "../primitives";
import { Button } from "../controls";
import { useTheme } from "../tokens";
import type { MoodHue } from "../tokens";

const SHAPES = Object.keys(AVATAR_SHAPES);
const FACES = Object.keys(AVATAR_FACES);
const DEFAULT: AvatarConfig = { hue: "coral", shape: "round", face: "smile", duo: null };

export function AvatarPickerScreen({
  avatar, mode = "account", onSave, onBack,
}: {
  avatar?: AvatarConfig | null;
  mode?: "account" | "onboarding";
  onSave: (a: AvatarConfig) => void;
  onBack: () => void;
}) {
  const t = useTheme();
  const cur = avatar || DEFAULT;
  const [av, setAv] = useState<AvatarConfig>(cur);
  const dirty = JSON.stringify(av) !== JSON.stringify(cur);

  const shuffle = () =>
    setAv({
      hue: AVATAR_HUES[Math.floor(Math.random() * 6)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      face: FACES[Math.floor(Math.random() * FACES.length)],
      duo: Math.random() < 0.25 ? AVATAR_HUES.filter((h) => h !== av.hue)[Math.floor(Math.random() * 5)] : null,
    });

  const onSwipe = (dx: number, dy: number) => {
    if (Math.abs(dx) >= Math.abs(dy)) {
      setAv((a) => ({ ...a, face: FACES[(FACES.indexOf(a.face) + (dx > 0 ? 1 : -1) + FACES.length) % FACES.length] }));
    } else {
      setAv((a) => ({ ...a, hue: AVATAR_HUES[(AVATAR_HUES.indexOf(a.hue) + (dy > 0 ? 1 : -1) + 6) % 6] }));
    }
  };

  const caption = `${av.hue} · ${av.shape} · ${av.face}${av.duo ? ` · blend with ${av.duo}` : ""}`;

  return (
    <Screen>
      <TopRow
        left={<Button variant="ghost" size="sm" onPress={onBack}>{mode === "onboarding" ? "Skip" : "Back"}</Button>}
        right={<Button size="sm" disabled={!dirty} onPress={() => onSave(av)}>{mode === "onboarding" ? "Use this" : "Save"}</Button>}
      />
      <View style={{ flex: 1, minHeight: 0 }}>
        <View style={{ alignItems: "center", gap: 14, paddingTop: 18, paddingBottom: 6 }}>
          <SwipeDisc onSwipe={onSwipe}>
            <DiscAvatar {...av} size={168} live />
          </SwipeDisc>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Headline size="m">Your Disco.</Headline>
            <Body style={[t.type.caption, { textAlign: "center" }]}>{caption}</Body>
            <Micro style={{ marginTop: 2 }}>swipe it · ↔ face · ↕ colour</Micro>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: t.space[6] }} showsVerticalScrollIndicator={false}>
          <Dial
            label="Colour" options={AVATAR_HUES} value={av.hue}
            onChange={(h) => setAv((a) => ({ ...a, hue: h as MoodHue, duo: a.duo === h ? null : a.duo }))}
            render={(h) => <View style={{ width: 22, height: 22, borderRadius: 99, backgroundColor: t.color.mood[h as MoodHue].fill }} />}
          />
          <Dial
            label="Shape" options={SHAPES} value={av.shape}
            onChange={(s) => setAv((a) => ({ ...a, shape: s }))}
            render={(s) => <DiscAvatar hue={av.hue} shape={s} face="deadpan" size={26} style={{ opacity: 0.9 }} />}
          />
          <Dial
            label="Face" options={FACES} value={av.face}
            onChange={(f) => setAv((a) => ({ ...a, face: f }))}
            render={(f) => <DiscAvatar hue={av.hue} shape="round" face={f} size={26} />}
          />
          <Dial
            label="Blend" hint="a second colour behind yours, like the logo"
            options={["none", ...AVATAR_HUES.filter((h) => h !== av.hue)]} value={av.duo || "none"}
            onChange={(d) => setAv((a) => ({ ...a, duo: d === "none" ? null : (d as MoodHue) }))}
            render={(d) =>
              d === "none" ? (
                <View style={{ width: 22, height: 22, borderRadius: 99, borderWidth: 1.5, borderColor: t.color.hairlineStrong }} />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ width: 18, height: 18, borderRadius: 99, backgroundColor: t.color.mood[d as MoodHue].fill, opacity: 0.9 }} />
                  <View style={{ width: 18, height: 18, borderRadius: 99, backgroundColor: t.color.mood[av.hue].fill, marginLeft: -8, opacity: 0.9 }} />
                </View>
              )
            }
          />
          <View style={{ alignItems: "center", paddingTop: t.space[2] }}>
            <Button variant="outline" size="sm" onPress={shuffle}>Surprise me</Button>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

// SwipeDisc — the big preview follows the finger a little, then springs back. A drag past a
// small threshold cycles a dimension (horizontal → face, vertical → colour).
function SwipeDisc({ onSwipe, children }: { onSwipe: (dx: number, dy: number) => void; children: React.ReactNode }) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const rot = useRef(new Animated.Value(0)).current;
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.hypot(g.dx, g.dy) > 4,
        onPanResponderMove: (_e, g) => {
          pan.setValue({ x: g.dx * 0.35, y: g.dy * 0.35 });
          rot.setValue(g.dx * 0.08);
        },
        onPanResponderRelease: (_e, g) => {
          if (Math.hypot(g.dx, g.dy) > 28) onSwipe(g.dx, g.dy);
          Animated.parallel([
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true, bounciness: 12 }),
            Animated.spring(rot, { toValue: 0, useNativeDriver: true, bounciness: 12 }),
          ]).start();
        },
        onPanResponderTerminate: () => {
          Animated.parallel([
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
            Animated.spring(rot, { toValue: 0, useNativeDriver: true }),
          ]).start();
        },
      }),
    [onSwipe],
  );
  const rotate = rot.interpolate({ inputRange: [-40, 40], outputRange: ["-40deg", "40deg"] });
  return (
    <Animated.View {...responder.panHandlers} style={{ transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }}>
      {children}
    </Animated.View>
  );
}

// Dial — a stepper slider: ‹ value › with a dot track underneath; drag the track or tap the
// arrows. Changes apply live to the big disc.
function Dial({
  label, hint, options, value, onChange, render,
}: {
  label: string; hint?: string; options: string[]; value: string;
  onChange: (v: string) => void; render: (v: string) => React.ReactNode;
}) {
  const t = useTheme();
  const i = Math.max(0, options.indexOf(value));
  const n = options.length;
  const step = (k: number) => onChange(options[(i + k + n) % n]);
  const [w, setW] = useState(0);
  const thumbX = useRef(new Animated.Value(0)).current;
  const frac = n > 1 ? i / (n - 1) : 0;
  const trackInner = Math.max(0, w - 12);
  const thumbLeft = 6 + trackInner * frac - 17;
  Animated.timing(thumbX, { toValue: thumbLeft, duration: 420, easing: Easing.bezier(0.2, 1.3, 0.4, 1), useNativeDriver: true }).start();

  const setFromX = (x: number) => {
    if (w <= 0) return;
    const k = Math.min(n - 1, Math.max(0, Math.round(((x - 6) / trackInner) * (n - 1))));
    if (options[k] !== value) onChange(options[k]);
  };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX),
        onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX),
      }),
    [w, value, n],
  );

  const arrow = (dir: number) => (
    <Pressable
      onPress={() => step(dir)}
      accessibilityLabel={dir < 0 ? `previous ${label}` : `next ${label}`}
      style={({ pressed }) => ({
        width: 44, height: 44, borderRadius: 99, backgroundColor: t.color.surfaceRaised,
        alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.9 : 1 }],
      })}
    >
      <Text style={{ color: t.color.ink, fontFamily: t.fontFamily.bodyMedium, fontSize: 18 }}>{dir < 0 ? "‹" : "›"}</Text>
    </Pressable>
  );

  return (
    <View style={{ gap: 6, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.color.hairline }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text style={[t.type.micro, { color: t.color.inkTertiary }]}>{label}</Text>
        {hint ? <Text style={[t.type.caption, { color: t.color.inkTertiary }]}>{hint}</Text> : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {arrow(-1)}
        <View
          {...responder.panHandlers}
          onLayout={(e) => setW(e.nativeEvent.layout.width)}
          style={{ flex: 1, minWidth: 0, height: 44, justifyContent: "center" }}
        >
          {/* rail */}
          <View style={{ position: "absolute", left: 6, right: 6, top: 21, height: 2, borderRadius: 99, backgroundColor: t.color.surfaceRaised }} />
          {/* dots */}
          <View style={{ position: "absolute", left: 6, right: 6, top: 0, bottom: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            {options.map((o, k) => {
              const dist = Math.abs(k - i);
              const sz = dist === 0 ? 6 : dist === 1 ? 5 : 4;
              return <View key={o} style={{ width: sz, height: sz, borderRadius: 99, backgroundColor: dist === 0 ? t.color.ink : t.color.inkTertiary, opacity: dist === 0 ? 1 : dist === 1 ? 0.9 : 0.55 }} />;
            })}
          </View>
          {/* thumb */}
          {w > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute", top: 5, width: 34, height: 34, borderRadius: 99,
                backgroundColor: t.color.surface, borderWidth: 1.5, borderColor: t.color.ink,
                alignItems: "center", justifyContent: "center",
                transform: [{ translateX: thumbX }],
                ...t.elevation.toast,
              }}
            >
              {render(value)}
            </Animated.View>
          ) : null}
        </View>
        {arrow(1)}
      </View>
      <Text style={[t.type.label, { color: t.color.ink, textAlign: "center", minHeight: 18 }]}>{value}</Text>
    </View>
  );
}
