// Deck — the swipe deck, ported 1:1 from the design's Deck.jsx.
// Physics: rotation = dx*0.06deg (max 12), commit at 96px or 800px/s, fly-out, stamp fades 32→96px.
import { useEffect, useRef, useState } from "react";
import { Animated, Linking, PanResponder, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Micro, Screen, TopRow } from "../primitives";
import { Button, Pill } from "../controls";
import { PosterCard, Stamp, CardFilm } from "../poster";
import { useTheme } from "../tokens";
import type { Film } from "../../films";
import { formatRuntime, serviceLabel } from "../../films";
import { Kind, Action, THRESH, actionFor, isKept, isTap, shouldCommit, swipeDirection } from "../deckLogic";

const ROT = 0.06, ROT_MAX = 12;
const W = 390, H = 844;
const TINTS = ["#3E6B6F", "#8A5A3C", "#5B3F3A", "#4F6A5A", "#6C4B6E", "#5C5A6E", "#3A4A5E", "#4A6B8A", "#7A5C48", "#8A7A4A"];

type Reaction = "loved" | "okay" | "disliked";

const hap = (fn: () => void) => { if (Platform.OS !== "web") fn(); };
const toCard = (f: Film, i: number): CardFilm => ({
  title: f.title, year: f.year ?? undefined, runtime: formatRuntime(f.runtimeMin), service: serviceLabel(f.service),
  leavingInDays: f.leavingInDays ?? null, why: f.why, posterUrl: f.posterUrl, tint: TINTS[i % TINTS.length],
});

export function DeckScreen({ films, moods, onDecision, onDone, onBack }: {
  films: Film[]; moods: string[];
  onDecision: (film: Film, action: Action, reaction?: Reaction) => void;
  onDone: (kept: Film[]) => void; onBack: () => void;
}) {
  const t = useTheme();
  const [index, setIndex] = useState(0);
  const kept = useRef<Film[]>([]);
  const history = useRef<number[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [toast, setToast] = useState<{ msg: string; noUndo?: boolean } | null>(null);
  const [sheetFilm, setSheetFilm] = useState<Film | null>(null);
  const pos = useRef(new Animated.ValueXY()).current;

  const film = films[index];
  const next = films[index + 1];

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const stampOpacity = (kind: Kind): Animated.AnimatedInterpolation<number> => {
    if (kind === "like") return pos.x.interpolate({ inputRange: [32, THRESH], outputRange: [0, 1], extrapolate: "clamp" });
    if (kind === "nope") return pos.x.interpolate({ inputRange: [-THRESH, -32], outputRange: [1, 0], extrapolate: "clamp" });
    if (kind === "maybe") return pos.y.interpolate({ inputRange: [-THRESH, -32], outputRange: [1, 0], extrapolate: "clamp" });
    return pos.y.interpolate({ inputRange: [32, THRESH], outputRange: [0, 1], extrapolate: "clamp" });
  };

  const advance = (kind: Kind) => {
    const f = film;
    if (isKept(kind)) kept.current.push(f);
    if (kind !== "watched") onDecision(f, actionFor(kind));
    hap(() => Haptics.impactAsync(kind === "like" || kind === "nope" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light));
    const msg = { like: `${f.title} → shortlist`, nope: `Not ${f.title}`, maybe: `${f.title} → maybe`, watched: "Marked as seen" }[kind];
    history.current.push(index);
    setCanUndo(true);
    pos.setValue({ x: 0, y: 0 });
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (kind === "watched") setSheetFilm(f);
    else setToast({ msg });
    if (nextIndex >= films.length) setTimeout(() => onDone(kept.current), 420);
  };

  const fling = (kind: Kind) => {
    const to = { like: { x: W * 1.6, y: 0 }, nope: { x: -W * 1.6, y: 0 }, maybe: { x: 0, y: -H * 1.6 }, watched: { x: 0, y: H * 1.6 } }[kind];
    Animated.timing(pos, { toValue: to, duration: 280, useNativeDriver: false }).start(() => advance(kind));
  };

  const openTrailer = () => {
    if (!film) return;
    const q = encodeURIComponent(`${film.title} ${film.year ?? ""} official trailer`);
    Linking.openURL(`https://www.youtube.com/results?search_query=${q}`).catch(() => {});
  };

  // The PanResponder is created once; route through a ref so gestures always use the
  // CURRENT card's handlers instead of the first render's (stale-closure bug otherwise).
  const gest = useRef({ fling, openTrailer });
  gest.current = { fling, openTrailer };

  const undo = () => {
    if (!history.current.length) return;
    const prev = history.current.pop()!;
    kept.current = kept.current.filter((f) => f.id !== films[prev].id);
    setIndex(prev);
    setCanUndo(history.current.length > 0);
    setToast(null);
    setSheetFilm(null);
    pos.setValue({ x: 0, y: 0 });
  };

  const react = (r: Reaction) => {
    if (sheetFilm) onDecision(sheetFilm, "watched", r);
    setSheetFilm(null);
    setToast({ msg: "Noted. That teaches us something." });
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
      onPanResponderMove: (_, g) => pos.setValue({ x: g.dx, y: g.dy }),
      onPanResponderRelease: (_, g) => {
        if (shouldCommit(g.dx, g.dy, g.vx, g.vy)) gest.current.fling(swipeDirection(g.dx, g.dy));
        else if (isTap(g.dx, g.dy)) gest.current.openTrailer();
        else Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false, stiffness: 320, damping: 28 }).start();
      },
    }),
  ).current;

  if (!film) return null;
  const rotate = pos.x.interpolate({ inputRange: [-W, 0, W], outputRange: [`-${ROT_MAX}deg`, "0deg", `${ROT_MAX}deg`] });
  const progress = pos.x.interpolate({ inputRange: [-THRESH, 0, THRESH], outputRange: [1, 0, 1], extrapolate: "clamp" });

  return (
    <Screen>
      <TopRow
        left={
          <View style={{ gap: 2 }}>
            <Micro>Tonight</Micro>
            <Pressable onPress={onBack}><Text style={[t.type.title, { color: t.color.ink }]}>{moods.length ? moods.join(" · ") : "anything"}</Text></Pressable>
          </View>
        }
        right={
          <>
            <Text style={[t.type.body, { color: t.color.inkSecondary, marginRight: 6 }]}>{Math.min(index + 1, films.length)} of {films.length}</Text>
            <Pressable onPress={undo} style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: t.color.surfaceRaised, alignItems: "center", justifyContent: "center", opacity: canUndo ? 1 : 0.35 }}>
              <Text style={{ color: t.color.ink, fontSize: 18 }}>{"↺"}</Text>
            </Pressable>
          </>
        }
      />

      <View style={{ marginTop: t.space[5], height: t.size.cardHeight }}>
        {next ? (
          <Animated.View style={{ position: "absolute", left: 0, right: 0, top: 0, height: t.size.cardHeight, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }}>
            <PosterCard film={toCard(next, index + 1)} compact />
          </Animated.View>
        ) : null}
        <Animated.View
          {...pan.panHandlers}
          style={{ position: "absolute", left: 0, right: 0, top: 0, height: t.size.cardHeight, transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }] }}
        >
          <PosterCard film={toCard(film, index)} />
          {(["like", "nope", "maybe", "watched"] as Kind[]).map((k) => (
            <Animated.View key={k} pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: stampOpacity(k) }]}>
              <Stamp kind={k} opacity={1} />
            </Animated.View>
          ))}
        </Animated.View>
      </View>

      <View style={{ marginTop: t.space[6], flexDirection: "row", justifyContent: "center", gap: 6 }}>
        <Pill tone="yes" leading size="sm" onPress={() => { onDecision(film, "watched", "loved"); advanceWatchedQuiet(); }}>Watched, liked it</Pill>
        <Pill tone="watched" size="sm" onPress={() => { onDecision(film, "watched", "okay"); advanceWatchedQuiet(); }}>It was okay</Pill>
        <Pill tone="no" leading size="sm" onPress={() => { onDecision(film, "watched", "disliked"); advanceWatchedQuiet(); }}>Not for me</Pill>
      </View>
      <Micro style={{ textAlign: "center", marginTop: t.space[3] }}>{"←"} pass {"·"} like {"→"} {"·"} {"↑"} maybe {"·"} {"↓"} seen it {"·"} tap for trailer</Micro>

      {sheetFilm ? (
        <View style={[{ position: "absolute", left: t.space.pageInset, right: t.space.pageInset, bottom: 24, backgroundColor: t.color.surface, borderRadius: t.radius.sheet, padding: 18, borderWidth: 1, borderColor: t.color.hairline }, t.elevation.sheet]}>
          <Text style={[t.type.title, { color: t.color.ink, marginBottom: 12 }]}>Seen it. How was it?</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Pill tone="yes" leading onPress={() => react("loved")}>Liked it</Pill>
            <Pill tone="watched" onPress={() => react("okay")}>It was okay</Pill>
            <Pill tone="no" leading onPress={() => react("disliked")}>Not for me</Pill>
          </View>
          <Button variant="ghost" size="sm" full style={{ marginTop: t.space[3] }} onPress={() => setSheetFilm(null)}>Skip</Button>
        </View>
      ) : null}

      {toast && !sheetFilm ? (
        <View style={[{ position: "absolute", left: t.space.pageInset, right: t.space.pageInset, bottom: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: t.color.surfaceRaised, borderRadius: t.radius.full, paddingVertical: 12, paddingHorizontal: 18 }, t.elevation.toast]}>
          <Text style={[t.type.label, { color: t.color.ink, flex: 1 }]}>{toast.msg}</Text>
          {!toast.noUndo ? <Pressable onPress={undo} hitSlop={8}><Text style={[t.type.label, { color: t.color.inkSecondary }]}>Undo</Text></Pressable> : null}
        </View>
      ) : null}
    </Screen>
  );

  // Quick "watched" pills: mark seen + advance without opening the sheet again.
  function advanceWatchedQuiet() {
    hap(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    history.current.push(index);
    setCanUndo(true);
    setSheetFilm(null);
    setToast({ msg: "Marked as seen" });
    pos.setValue({ x: 0, y: 0 });
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (nextIndex >= films.length) setTimeout(() => onDone(kept.current), 420);
  }
}
