import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, useFonts,
} from "@expo-google-fonts/figtree";
import { useEffect, useState } from "react";
import { Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Film } from "./src/films";
import { Onboarding } from "./src/Onboarding";
import { Settings } from "./src/Settings";
import { Shortlist } from "./src/Shortlist";
import { Taste } from "./src/Taste";
import { font, theme } from "./src/theme";
import { Tonight } from "./src/Tonight";

type Tab = "tonight" | "shortlist" | "taste" | "settings";
const STORE = "wsww:v1";

export default function App() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("tonight");
  const [shortlist, setShortlist] = useState<Film[]>([]);
  const [decisions, setDecisions] = useState(0);

  const [loaded] = useFonts({
    BricolageGrotesque_800ExtraBold, BricolageGrotesque_600SemiBold,
    Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold,
  });

  useEffect(() => {
    AsyncStorage.getItem(STORE).then((raw) => {
      if (raw) {
        try {
          const s = JSON.parse(raw);
          setServices(s.services ?? []);
          setOnboarded(!!s.onboarded);
        } catch {}
      }
      setReady(true);
    });
  }, []);

  const persist = (next: { services?: string[]; onboarded?: boolean }) =>
    AsyncStorage.setItem(STORE, JSON.stringify({ services, onboarded, ...next })).catch(() => {});

  const finishOnboarding = (svcs: string[]) => {
    setServices(svcs);
    setOnboarded(true);
    persist({ services: svcs, onboarded: true });
  };

  const toggleService = (s: string) => {
    const next = services.includes(s) ? services.filter((x) => x !== s) : [...services, s];
    setServices(next);
    persist({ services: next });
  };

  const addToShortlist = (films: Film[]) => {
    setShortlist((prev) => {
      const ids = new Set(prev.map((f) => f.id));
      return [...prev, ...films.filter((f) => !ids.has(f.id))];
    });
    setDecisions((d) => d + 10);
  };

  const reset = () => {
    AsyncStorage.removeItem(STORE).catch(() => {});
    setServices([]); setOnboarded(false); setShortlist([]); setDecisions(0); setTab("tonight");
  };

  if (!loaded || !ready)
    return <View style={[styles.root, styles.center]}><Text style={{ color: theme.muted }}>…</Text></View>;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <StatusBar barStyle="light-content" />
        {!onboarded ? (
          <Onboarding onDone={finishOnboarding} />
        ) : (
          <>
            <View style={{ flex: 1 }}>
              {tab === "tonight" && <Tonight services={services} onKeep={addToShortlist} />}
              {tab === "shortlist" && <Shortlist films={shortlist} onRemove={(id) => setShortlist((p) => p.filter((f) => f.id !== id))} />}
              {tab === "taste" && <Taste decisions={decisions} />}
              {tab === "settings" && <Settings services={services} onToggleService={toggleService} onReset={reset} />}
            </View>
            <View style={styles.nav}>
              {([["tonight", "Tonight"], ["shortlist", `Shortlist${shortlist.length ? ` ${shortlist.length}` : ""}`], ["taste", "Taste"], ["settings", "Settings"]] as [Tab, string][]).map(
                ([key, label]) => (
                  <Pressable key={key} style={[styles.navItem, tab === key && styles.navItemOn]} onPress={() => setTab(key)}>
                    <Text style={[styles.navText, tab === key && styles.navTextOn]}>{label}</Text>
                  </Pressable>
                ),
              )}
            </View>
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: "center", justifyContent: "center" },
  nav: { flexDirection: "row", gap: 4, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 30, borderTopWidth: 1, borderTopColor: theme.line, backgroundColor: theme.bg },
  navItem: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 999 },
  navItemOn: { backgroundColor: theme.surface2 },
  navText: { color: theme.muted, fontFamily: font.bodyMed, fontSize: 13 },
  navTextOn: { color: theme.ink, fontFamily: font.bodySemi },
});
