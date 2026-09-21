import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StatusBar, StyleSheet, Text, View,
} from "react-native";
import { Deck } from "./src/Deck";
import { Film, MOCK_DECK } from "./src/films";
import { API_BASE, MOODS, theme } from "./src/theme";

type Screen = "mood" | "thinking" | "deck" | "done";
const hueFor = (i: number) => theme.moodHues[i % theme.moodHues.length];

export default function App() {
  const [screen, setScreen] = useState<Screen>("mood");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [kept, setKept] = useState<Film[]>([]);
  const [api, setApi] = useState<"checking" | "ok" | "down">("checking");

  useEffect(() => {
    fetch(`${API_BASE}/v1/health`).then((r) => r.json())
      .then((d) => setApi(d.status === "ok" ? "ok" : "down")).catch(() => setApi("down"));
  }, []);

  const toggle = (m: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(m) ? n.delete(m) : n.add(m);
      return n;
    });

  const start = () => {
    setScreen("thinking");
    setTimeout(() => setScreen("deck"), 1800);
  };

  const count = selected.size;
  const blend = useMemo(
    () => ([...selected].map((m) => hueFor(MOODS.indexOf(m)))).slice(0, 5),
    [selected],
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {screen === "mood" && (
        <>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.kicker}>What Should We Watch</Text>
            <Text style={styles.h1}>Tonight{"\n"}feels like</Text>
            <View style={styles.blendRow}>
              {(blend.length ? blend : ["#2A2D36"]).map((c, i) => (
                <View key={i} style={[styles.blendDot, { backgroundColor: c, marginLeft: i ? -14 : 0 }]} />
              ))}
              <Text style={styles.blendLabel}>
                {count === 0 ? "pick a few" : count === 1 ? "one mood" : `${count} moods, mixed`}
              </Text>
            </View>
            <View style={styles.pills}>
              {MOODS.map((m, i) => {
                const on = selected.has(m);
                const hue = hueFor(i);
                return (
                  <Pressable key={m} onPress={() => toggle(m)}
                    style={[styles.pill, { borderColor: on ? hue : theme.line, backgroundColor: on ? hue : "transparent" }]}>
                    <Text style={[styles.pillText, { color: on ? "#14151A" : theme.ink }]}>{m}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <Pressable style={[styles.cta, { opacity: count ? 1 : 0.4 }]} disabled={!count} onPress={start}>
              <Text style={styles.ctaText}>{count ? "Find films for this" : "Pick a mood to start"}</Text>
            </Pressable>
            <View style={styles.status}>
              {api === "checking" ? <ActivityIndicator size="small" color={theme.muted} />
                : <View style={[styles.dot, { backgroundColor: api === "ok" ? theme.yes : theme.no }]} />}
              <Text style={styles.statusText}>
                {api === "checking" ? "reaching the server" : api === "ok" ? "live API connected" : "server unreachable"}
              </Text>
            </View>
          </View>
        </>
      )}

      {screen === "thinking" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.moodHues[0]} />
          <Text style={styles.thinkBig}>Reading your taste and this moment</Text>
          <Text style={styles.thinkSub}>Dealing ten films for {[...selected].slice(0, 3).join(", ")}…</Text>
        </View>
      )}

      {screen === "deck" && (
        <View style={{ flex: 1, paddingTop: 60 }}>
          <Text style={styles.deckHead}>Tonight's ten</Text>
          <Deck films={MOCK_DECK} onDone={(k) => { setKept(k); setScreen("done"); }} />
        </View>
      )}

      {screen === "done" && (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.kicker}>What Should We Watch</Text>
          <Text style={styles.h1}>{kept.length ? "Your shortlist" : "Nothing landed"}</Text>
          {kept.length === 0 && <Text style={styles.thinkSub}>Every pass teaches it. Deal again or shift the mood.</Text>}
          {kept.map((f) => (
            <View key={f.id} style={styles.keepRow}>
              <Text style={styles.keepTitle}>{f.title} <Text style={styles.keepYear}>({f.year})</Text></Text>
              <Text style={styles.keepMeta}>{f.runtimeMin} min · on {f.service}</Text>
            </View>
          ))}
          <Pressable style={[styles.cta, { marginTop: 20 }]} onPress={() => { setKept([]); setScreen("mood"); }}>
            <Text style={styles.ctaText}>Back to moods</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scroll: { paddingTop: 72, paddingHorizontal: 22, paddingBottom: 160 },
  kicker: { color: theme.muted, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" },
  h1: { color: theme.ink, fontSize: 46, fontWeight: "800", lineHeight: 48, marginTop: 10, letterSpacing: -1 },
  blendRow: { flexDirection: "row", alignItems: "center", marginTop: 22, marginBottom: 8 },
  blendDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: theme.bg },
  blendLabel: { color: theme.muted, marginLeft: 14, fontSize: 14 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 },
  pill: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 },
  pillText: { fontSize: 15, fontWeight: "500" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 22, paddingBottom: 36, backgroundColor: theme.bg, borderTopWidth: 1, borderTopColor: theme.line },
  cta: { backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 17, alignItems: "center" },
  ctaText: { color: theme.bg, fontSize: 17, fontWeight: "700" },
  status: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 12, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: theme.muted, fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 14 },
  thinkBig: { color: theme.ink, fontSize: 22, fontWeight: "700", textAlign: "center", marginTop: 6 },
  thinkSub: { color: theme.muted, fontSize: 15, textAlign: "center" },
  deckHead: { color: theme.ink, fontSize: 15, fontWeight: "600", textAlign: "center", marginBottom: 4 },
  keepRow: { backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginTop: 10 },
  keepTitle: { color: theme.ink, fontSize: 18, fontWeight: "700" },
  keepYear: { color: theme.muted, fontWeight: "400" },
  keepMeta: { color: theme.muted, fontSize: 13, marginTop: 4 },
});
