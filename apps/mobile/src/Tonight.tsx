import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Deck } from "./Deck";
import { Film, MOCK_DECK } from "./films";
import { font, hue, MOODS, theme } from "./theme";

type Screen = "mood" | "thinking" | "deck" | "done";
const COMPANY = ["just me", "the two of us", "a group"];
const LENGTH = ["any length", "about 2 hours", "under 100 min"];

export function Tonight({ onKeep }: { onKeep: (films: Film[]) => void }) {
  const [screen, setScreen] = useState<Screen>("mood");
  const [selected, setSelected] = useState<string[]>([]);
  const [company, setCompany] = useState(1);
  const [length, setLength] = useState(1);
  const [kept, setKept] = useState<Film[]>([]);

  const toggle = (m: string) =>
    setSelected((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));

  const start = () => {
    setScreen("thinking");
    setTimeout(() => setScreen("deck"), 1600);
  };

  const headline = useMemo(() => {
    if (selected.length === 0) return null;
    return selected.map((m, i) => (
      <Text key={m}>
        <Text style={[styles.moodWord, { color: hue(m) }]}>{m}</Text>
        {i < selected.length - 2 ? <Text style={styles.moodJoin}>, </Text> : null}
        {i === selected.length - 2 ? <Text style={styles.moodJoin}> and </Text> : null}
      </Text>
    ));
  }, [selected]);

  if (screen === "thinking")
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.coral} />
        <Text style={styles.thinkBig}>Reading your taste and this moment</Text>
        <Text style={styles.thinkSub}>Dealing ten for {selected.slice(0, 3).join(", ")}…</Text>
      </View>
    );

  if (screen === "deck")
    return (
      <View style={{ flex: 1, paddingTop: 8 }}>
        <Text style={styles.deckHead}>Tonight's ten</Text>
        <Deck films={MOCK_DECK} onDone={(k) => { setKept(k); onKeep(k); setScreen("done"); }} />
      </View>
    );

  if (screen === "done")
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>{kept.length ? "Added to\nyour shortlist" : "Nothing\nlanded"}</Text>
        {kept.length === 0 && <Text style={styles.thinkSub}>Every pass teaches it. Deal again or shift the mood.</Text>}
        {kept.map((f) => (
          <View key={f.id} style={styles.keepRow}>
            <Text style={styles.keepTitle}>{f.title} <Text style={styles.keepYear}>({f.year})</Text></Text>
            <Text style={styles.keepMeta}>{f.runtimeMin} min · on {f.service}</Text>
          </View>
        ))}
        <Pressable style={[styles.cta, { marginTop: 22 }]} onPress={() => { setKept([]); setSelected([]); setScreen("mood"); }}>
          <Text style={styles.ctaText}>Back to moods</Text>
        </Pressable>
      </ScrollView>
    );

  return (
    <>
      <View style={styles.topbar}>
        <View style={styles.avatar}><Text style={styles.avatarText}>M</Text></View>
        <Text style={styles.dots}>···</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Tonight{"\n"}feels like…</Text>
        {selected.length > 0 && <Text style={styles.headlineMoods}>{headline}</Text>}
        <Text style={styles.sentence}>
          for <Text style={styles.link} onPress={() => setCompany((c) => (c + 1) % COMPANY.length)}>{COMPANY[company]}</Text>
          , with <Text style={styles.link} onPress={() => setLength((l) => (l + 1) % LENGTH.length)}>{LENGTH[length]}</Text>
        </Text>

        <View style={styles.pills}>
          {MOODS.map((m) => {
            const on = selected.includes(m);
            const h = hue(m);
            return (
              <Pressable key={m} onPress={() => toggle(m)}
                style={[styles.pill, { borderColor: on ? h : theme.line, backgroundColor: on ? h : "transparent" }]}>
                <Text style={[styles.pillText, { color: on ? "#16171D" : h }]}>{m}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable style={[styles.cta, { opacity: selected.length ? 1 : 0.4 }]} disabled={!selected.length} onPress={start}>
          <Text style={styles.ctaText}>{selected.length ? "Deal ten" : "Pick a mood to start"}</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topbar: { position: "absolute", top: 54, left: 22, right: 22, zIndex: 5, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.surface2, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: theme.coral },
  avatarText: { color: theme.ink, fontFamily: font.bodySemi, fontSize: 14 },
  dots: { color: theme.muted, fontSize: 22, letterSpacing: 1 },
  scroll: { paddingTop: 104, paddingHorizontal: 22, paddingBottom: 150 },
  h1: { color: theme.ink, fontFamily: font.display, fontSize: 46, lineHeight: 48, letterSpacing: -1.5 },
  headlineMoods: { marginTop: 14, lineHeight: 34 },
  moodWord: { fontFamily: font.display, fontSize: 26, letterSpacing: -0.5 },
  moodJoin: { fontFamily: font.body, fontSize: 22, color: theme.muted },
  sentence: { color: theme.muted, fontFamily: font.body, fontSize: 17, marginTop: 16, lineHeight: 24 },
  link: { color: theme.ink, fontFamily: font.bodyMed, textDecorationLine: "underline" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 22 },
  pill: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 15 },
  pillText: { fontFamily: font.bodyMed, fontSize: 14.5 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 22, paddingBottom: 24, backgroundColor: theme.bg, borderTopWidth: 1, borderTopColor: theme.line },
  cta: { backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 17, alignItems: "center" },
  ctaText: { color: theme.bg, fontFamily: font.bodySemi, fontSize: 17 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 14 },
  thinkBig: { color: theme.ink, fontFamily: font.displaySemi, fontSize: 22, textAlign: "center", marginTop: 6 },
  thinkSub: { color: theme.muted, fontFamily: font.body, fontSize: 15, textAlign: "center" },
  deckHead: { color: theme.ink, fontFamily: font.bodySemi, fontSize: 15, textAlign: "center", marginBottom: 4 },
  keepRow: { backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginTop: 10 },
  keepTitle: { color: theme.ink, fontFamily: font.bodySemi, fontSize: 18 },
  keepYear: { color: theme.muted, fontFamily: font.body },
  keepMeta: { color: theme.muted, fontFamily: font.body, fontSize: 13, marginTop: 4 },
});
