import { useRef, useState } from "react";
import {
  Animated, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions,
} from "react-native";
import { Film } from "./films";
import { theme } from "./theme";

type Decision = "dislike" | "like" | "maybe" | "watched";
const SWIPE = 110;

function cardHue(i: number) {
  return theme.moodHues[i % theme.moodHues.length];
}

export function Deck({ films, onDone }: { films: Film[]; onDone: (kept: Film[]) => void }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [kept, setKept] = useState<Film[]>([]);
  const [reactFor, setReactFor] = useState<Film | null>(null);
  const pos = useRef(new Animated.ValueXY()).current;

  const film = films[index];
  const next = films[index + 1];

  const stampOpacity = (dir: "like" | "dislike" | "maybe") => {
    if (dir === "like") return pos.x.interpolate({ inputRange: [0, SWIPE], outputRange: [0, 1] });
    if (dir === "dislike") return pos.x.interpolate({ inputRange: [-SWIPE, 0], outputRange: [1, 0] });
    return pos.y.interpolate({ inputRange: [-SWIPE, 0], outputRange: [1, 0] });
  };

  const advance = (film: Film, decision: Decision) => {
    if (decision === "like" || decision === "maybe") setKept((k) => [...k, film]);
    pos.setValue({ x: 0, y: 0 });
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (nextIndex >= films.length) onDone(decision === "like" || decision === "maybe" ? [...kept, film] : kept);
  };

  const fling = (decision: Decision, to: { x: number; y: number }) => {
    Animated.timing(pos, { toValue: to, duration: 220, useNativeDriver: false }).start(() =>
      advance(film, decision),
    );
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
      onPanResponderMove: (_, g) => pos.setValue({ x: g.dx, y: Math.min(40, g.dy) }),
      onPanResponderRelease: (_, g) => {
        if (g.dy < -SWIPE && Math.abs(g.dy) > Math.abs(g.dx)) fling("maybe", { x: 0, y: -900 });
        else if (g.dx > SWIPE) fling("like", { x: 900, y: 0 });
        else if (g.dx < -SWIPE) fling("dislike", { x: -900, y: 0 });
        else if (g.dy > SWIPE) setReactFor(film);
        else Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    }),
  ).current;

  if (!film) return null;

  const rotate = pos.x.interpolate({ inputRange: [-width, 0, width], outputRange: ["-16deg", "0deg", "16deg"] });

  return (
    <View style={styles.wrap}>
      <View style={styles.deck}>
        {next && (
          <View style={[styles.card, styles.under, { backgroundColor: cardHue(index + 1) }]}>
            <Text style={styles.title}>{next.title}</Text>
          </View>
        )}
        <Animated.View
          {...pan.panHandlers}
          style={[
            styles.card,
            { backgroundColor: cardHue(index), transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }] },
          ]}
        >
          {film.wildcard && <Text style={styles.wild}>Wildcard</Text>}
          <Text style={styles.title}>{film.title}</Text>
          <Text style={styles.meta}>{film.year} · {film.runtimeMin} min</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.why}>{film.why}</Text>
          <Text style={styles.svc}>
            On {film.service}{film.leavingInDays ? ` · leaving in ${film.leavingInDays} days` : ""}
          </Text>

          <Animated.Text style={[styles.stamp, styles.stampYes, { opacity: stampOpacity("like") }]}>LIKE</Animated.Text>
          <Animated.Text style={[styles.stamp, styles.stampNo, { opacity: stampOpacity("dislike") }]}>PASS</Animated.Text>
          <Animated.Text style={[styles.stamp, styles.stampMaybe, { opacity: stampOpacity("maybe") }]}>MAYBE</Animated.Text>
        </Animated.View>
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.act, { borderColor: theme.no }]} onPress={() => fling("dislike", { x: -900, y: 0 })}>
          <Text style={[styles.actText, { color: theme.no }]}>Pass</Text>
        </Pressable>
        <Pressable style={[styles.act, styles.actYes]} onPress={() => fling("like", { x: 900, y: 0 })}>
          <Text style={[styles.actText, { color: "#14151A" }]}>Like</Text>
        </Pressable>
        <Pressable style={[styles.act, { borderColor: theme.moodHues[1] }]} onPress={() => fling("maybe", { x: 0, y: -900 })}>
          <Text style={[styles.actText, { color: theme.moodHues[1] }]}>Maybe</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>Swipe left to pass, right to like, up for maybe, down if you've seen it.</Text>

      {reactFor && (
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>You've seen {reactFor.title}. How was it?</Text>
          <View style={styles.pillRow}>
            {[["Loved it", theme.yes], ["It was okay", theme.muted], ["Not for me", theme.no]].map(([label, c]) => (
              <Pressable key={label as string} style={[styles.rpill, { borderColor: c as string }]}
                onPress={() => { setReactFor(null); advance(reactFor, "watched"); }}>
                <Text style={{ color: c as string, fontWeight: "600" }}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 22 },
  deck: { flex: 1, marginTop: 8, marginBottom: 8 },
  card: {
    position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 26,
    padding: 22, justifyContent: "flex-start", overflow: "hidden",
  },
  under: { transform: [{ scale: 0.94 }, { translateY: 16 }], opacity: 0.5 },
  wild: { alignSelf: "flex-start", color: "#14151A", borderColor: "#14151A", borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, fontSize: 12, marginBottom: 8, opacity: 0.8 },
  title: { fontSize: 34, fontWeight: "800", color: "#14151A", letterSpacing: -1, lineHeight: 36 },
  meta: { fontSize: 15, color: "#14151A", opacity: 0.8, marginTop: 8 },
  why: { fontSize: 17, color: "#14151A", lineHeight: 23 },
  svc: { fontSize: 14, color: "#14151A", opacity: 0.85, marginTop: 12 },
  stamp: { position: "absolute", top: 22, fontSize: 26, fontWeight: "900", borderWidth: 3, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2 },
  stampYes: { right: 22, color: theme.yes, borderColor: theme.yes, transform: [{ rotate: "12deg" }] },
  stampNo: { left: 22, color: theme.no, borderColor: theme.no, transform: [{ rotate: "-12deg" }] },
  stampMaybe: { alignSelf: "center", top: 22, color: theme.moodHues[1], borderColor: theme.moodHues[1] },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  act: { flex: 1, borderWidth: 1.5, borderRadius: 999, paddingVertical: 15, alignItems: "center" },
  actYes: { backgroundColor: theme.ink, borderColor: theme.ink, flex: 1.3 },
  actText: { fontSize: 16, fontWeight: "700" },
  hint: { color: theme.muted, fontSize: 12, textAlign: "center", marginTop: 10 },
  sheet: { position: "absolute", left: 22, right: 22, bottom: 24, backgroundColor: theme.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: theme.line },
  sheetTitle: { color: theme.ink, fontSize: 16, fontWeight: "600", marginBottom: 12 },
  pillRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  rpill: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14 },
});
