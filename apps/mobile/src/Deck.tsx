import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  Animated, Easing, ImageBackground, Linking, PanResponder, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions,
} from "react-native";
import { Film, serviceLabel } from "./films";
import { font, theme } from "./theme";

type Decision = "dislike" | "like" | "maybe" | "watched";
const SWIPE = 110;

// Haptics throw on web, so only fire them on native platforms.
const haptic = (fn: () => void) => {
  if (Platform.OS !== "web") fn();
};

type Decided = (film: Film, action: Decision, reaction?: "loved" | "okay" | "disliked") => void;

export function Deck({ films, firstTime, onDecision, onDone }: {
  films: Film[]; firstTime?: boolean; onDecision?: Decided; onDone: (kept: Film[]) => void;
}) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [kept, setKept] = useState<Film[]>([]);
  const [reactFor, setReactFor] = useState<Film | null>(null);
  const pos = useRef(new Animated.ValueXY()).current;
  const [showHint, setShowHint] = useState(!!firstTime);
  const hint = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!showHint) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hint, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(hint, { toValue: 0.35, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [showHint, hint]);

  const dismissHint = () => showHint && setShowHint(false);

  const openTrailer = (f: Film) => {
    const q = encodeURIComponent(`${f.title} ${f.year ?? ""} official trailer`);
    Linking.openURL(`https://www.youtube.com/results?search_query=${q}`).catch(() => {});
  };

  const film = films[index];
  const next = films[index + 1];

  const stampOpacity = (dir: "like" | "dislike" | "maybe") => {
    if (dir === "like") return pos.x.interpolate({ inputRange: [0, SWIPE], outputRange: [0, 1] });
    if (dir === "dislike") return pos.x.interpolate({ inputRange: [-SWIPE, 0], outputRange: [1, 0] });
    return pos.y.interpolate({ inputRange: [-SWIPE, 0], outputRange: [1, 0] });
  };

  const advance = (f: Film, decision: Decision) => {
    if (decision === "like" || decision === "maybe") {
      setKept((k) => [...k, f]);
      haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    } else if (decision === "dislike") {
      haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    }
    pos.setValue({ x: 0, y: 0 });
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (nextIndex >= films.length)
      onDone(decision === "like" || decision === "maybe" ? [...kept, f] : kept);
  };

  const fling = (decision: Decision, to: { x: number; y: number }) => {
    Animated.timing(pos, { toValue: to, duration: 220, useNativeDriver: false }).start(() =>
      advance(film, decision),
    );
  };

  const pan = useRef(
    PanResponder.create({
      // Tap (no movement) must still grab the responder so release-based tap-to-trailer fires.
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
      onPanResponderGrant: () => dismissHint(),
      onPanResponderMove: (_, g) => pos.setValue({ x: g.dx, y: Math.min(40, g.dy) }),
      onPanResponderRelease: (_, g) => {
        if (g.dy < -SWIPE && Math.abs(g.dy) > Math.abs(g.dx)) fling("maybe", { x: 0, y: -900 });
        else if (g.dx > SWIPE) fling("like", { x: 900, y: 0 });
        else if (g.dx < -SWIPE) fling("dislike", { x: -900, y: 0 });
        else if (g.dy > SWIPE) setReactFor(film);
        else if (Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) openTrailer(film);
        else Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    }),
  ).current;

  if (!film) return null;
  const rotate = pos.x.interpolate({ inputRange: [-width, 0, width], outputRange: ["-14deg", "0deg", "14deg"] });

  const Card = ({ f, top }: { f: Film; top?: boolean }) => (
    <ImageBackground
      source={{ uri: f.posterUrl }}
      style={styles.card}
      imageStyle={styles.cardImg}
    >
      <LinearGradient colors={["rgba(10,11,15,0.05)", "rgba(10,11,15,0.55)", "rgba(10,11,15,0.96)"]}
        locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      {f.wildcard && <Text style={styles.wild}>Wildcard</Text>}
      <View style={{ flex: 1 }} />
      <Text style={styles.title}>{f.title}</Text>
      <Text style={styles.meta}>
        {[f.year, f.runtimeMin ? `${f.runtimeMin} min` : null].filter(Boolean).join(" · ")}
      </Text>
      <Text style={styles.why}>{f.why}</Text>
      <Text style={styles.svc}>
        On {serviceLabel(f.service)}{f.leavingInDays != null ? ` · leaving in ${f.leavingInDays} days` : ""}
      </Text>
      {top && (
        <>
          <Animated.Text style={[styles.stamp, styles.stampYes, { opacity: stampOpacity("like") }]}>LIKE</Animated.Text>
          <Animated.Text style={[styles.stamp, styles.stampNo, { opacity: stampOpacity("dislike") }]}>PASS</Animated.Text>
          <Animated.Text style={[styles.stamp, styles.stampMaybe, { opacity: stampOpacity("maybe") }]}>MAYBE</Animated.Text>
        </>
      )}
    </ImageBackground>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.deck}>
        {next && <View style={[styles.cardHolder, styles.under]}><Card f={next} /></View>}
        <Animated.View
          {...pan.panHandlers}
          style={[styles.cardHolder, { transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }] }]}
        >
          <Card f={film} top />
        </Animated.View>
        {showHint && (
          <Animated.View pointerEvents="none" style={[styles.guide, { opacity: hint }]}>
            <View style={[styles.guideTag, styles.guideTop]}>
              <Text style={styles.guideText}>↑  Maybe</Text>
            </View>
            <View style={styles.guideMid}>
              <View style={[styles.guideTag, styles.guideSide]}><Text style={[styles.guideText, { color: theme.no }]}>←  Pass</Text></View>
              <View style={styles.guideCenter}><Text style={styles.guideCenterText}>Tap for trailer</Text></View>
              <View style={[styles.guideTag, styles.guideSide]}><Text style={[styles.guideText, { color: theme.yes }]}>Like  →</Text></View>
            </View>
            <View style={[styles.guideTag, styles.guideBottom]}>
              <Text style={styles.guideText}>↓  Already seen it</Text>
            </View>
          </Animated.View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.act, { borderColor: theme.no }]} onPress={() => fling("dislike", { x: -900, y: 0 })}>
          <Text style={[styles.actText, { color: theme.no }]}>Pass</Text>
        </Pressable>
        <Pressable style={[styles.act, styles.actYes]} onPress={() => fling("like", { x: 900, y: 0 })}>
          <Text style={[styles.actText, { color: "#16171D" }]}>Like</Text>
        </Pressable>
        <Pressable style={[styles.act, { borderColor: theme.lilac }]} onPress={() => fling("maybe", { x: 0, y: -900 })}>
          <Text style={[styles.actText, { color: theme.lilac }]}>Maybe</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>Left pass · right like · up maybe · down if you've seen it</Text>

      {reactFor && (
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>You've seen {reactFor.title}. How was it?</Text>
          <View style={styles.pillRow}>
            {([["Loved it", theme.yes, "loved"], ["It was okay", theme.muted, "okay"], ["Not for me", theme.no, "disliked"]] as const).map(([label, c, reaction]) => (
              <Pressable key={label as string} style={[styles.rpill, { borderColor: c as string }]}
                onPress={() => { haptic(() => Haptics.selectionAsync()); setReactFor(null); advance(reactFor, "watched"); }}>
                <Text style={{ color: c as string, fontFamily: font.bodySemi }}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 18 },
  deck: { flex: 1, marginTop: 8, marginBottom: 10 },
  cardHolder: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  card: { flex: 1, borderRadius: 26, overflow: "hidden", padding: 20, justifyContent: "flex-end", backgroundColor: theme.surface2 },
  cardImg: { borderRadius: 26 },
  under: { transform: [{ scale: 0.94 }, { translateY: 16 }], opacity: 0.6 },
  wild: { position: "absolute", top: 18, left: 18, color: "#fff", borderColor: "#fff", borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, fontSize: 12, fontFamily: font.bodyMed, opacity: 0.9 },
  title: { fontFamily: font.display, fontSize: 34, color: "#fff", letterSpacing: -1.2, lineHeight: 36 },
  meta: { fontFamily: font.bodyMed, fontSize: 15, color: "#fff", opacity: 0.85, marginTop: 6 },
  why: { fontFamily: font.body, fontSize: 15.5, color: "#fff", opacity: 0.92, marginTop: 10, lineHeight: 21 },
  svc: { fontFamily: font.bodyMed, fontSize: 13.5, color: "#fff", opacity: 0.8, marginTop: 12 },
  stamp: { position: "absolute", top: 24, fontFamily: font.display, fontSize: 26, borderWidth: 3, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2, color: "#fff" },
  stampYes: { right: 22, color: theme.yes, borderColor: theme.yes, transform: [{ rotate: "12deg" }] },
  stampNo: { left: 22, color: theme.no, borderColor: theme.no, transform: [{ rotate: "-12deg" }] },
  stampMaybe: { alignSelf: "center", color: theme.lilac, borderColor: theme.lilac },
  actions: { flexDirection: "row", gap: 10 },
  act: { flex: 1, borderWidth: 1.5, borderRadius: 999, paddingVertical: 15, alignItems: "center" },
  actYes: { backgroundColor: theme.ink, borderColor: theme.ink, flex: 1.3 },
  actText: { fontFamily: font.bodySemi, fontSize: 16 },
  hint: { color: theme.muted, fontFamily: font.body, fontSize: 12, textAlign: "center", marginTop: 10 },
  guide: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "space-between", alignItems: "center", paddingVertical: 24 },
  guideMid: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", paddingHorizontal: 6 },
  guideTop: {}, guideBottom: {}, guideSide: {},
  guideTag: { backgroundColor: "rgba(10,11,15,0.66)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  guideText: { color: "#fff", fontFamily: font.bodySemi, fontSize: 15 },
  guideCenter: { backgroundColor: "rgba(10,11,15,0.5)", borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  guideCenterText: { color: "#fff", fontFamily: font.bodyMed, fontSize: 13 },
  sheet: { position: "absolute", left: 18, right: 18, bottom: 20, backgroundColor: theme.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: theme.line },
  sheetTitle: { color: theme.ink, fontFamily: font.bodySemi, fontSize: 16, marginBottom: 12 },
  pillRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  rpill: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14 },
});
