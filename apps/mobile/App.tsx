import {
  BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, useFonts,
} from "@expo-google-fonts/figtree";
import { useEffect, useState } from "react";
import { Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { Film } from "./src/films";
import { Shortlist } from "./src/Shortlist";
import { Taste } from "./src/Taste";
import { font, theme } from "./src/theme";
import { Tonight } from "./src/Tonight";

type Tab = "tonight" | "shortlist" | "taste";

export default function App() {
  const [tab, setTab] = useState<Tab>("tonight");
  const [shortlist, setShortlist] = useState<Film[]>([]);
  const [decisions, setDecisions] = useState(0);

  const [loaded] = useFonts({
    BricolageGrotesque_800ExtraBold, BricolageGrotesque_600SemiBold,
    Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold,
  });

  const addToShortlist = (films: Film[]) => {
    setShortlist((prev) => {
      const ids = new Set(prev.map((f) => f.id));
      return [...prev, ...films.filter((f) => !ids.has(f.id))];
    });
    setDecisions((d) => d + 10);
  };

  if (!loaded)
    return <View style={[styles.root, styles.center]}><Text style={{ color: theme.muted }}>…</Text></View>;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1 }}>
        {tab === "tonight" && <Tonight onKeep={addToShortlist} />}
        {tab === "shortlist" && (
          <Shortlist films={shortlist} onRemove={(id) => setShortlist((p) => p.filter((f) => f.id !== id))} />
        )}
        {tab === "taste" && <Taste decisions={decisions} />}
      </View>

      <View style={styles.nav}>
        {([["tonight", "Tonight"], ["shortlist", `Shortlist${shortlist.length ? ` ${shortlist.length}` : ""}`], ["taste", "Taste"]] as [Tab, string][]).map(
          ([key, label]) => (
            <Pressable key={key} style={[styles.navItem, tab === key && styles.navItemOn]} onPress={() => setTab(key)}>
              <Text style={[styles.navText, tab === key && styles.navTextOn]}>{label}</Text>
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: "center", justifyContent: "center" },
  nav: { flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 30, borderTopWidth: 1, borderTopColor: theme.line, backgroundColor: theme.bg },
  navItem: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 999 },
  navItemOn: { backgroundColor: theme.surface2 },
  navText: { color: theme.muted, fontFamily: font.bodyMed, fontSize: 14 },
  navTextOn: { color: theme.ink, fontFamily: font.bodySemi },
});
