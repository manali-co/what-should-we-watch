import {
  BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, useFonts,
} from "@expo-google-fonts/figtree";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Platform, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { setAuthTokenGetter } from "./src/api";
import { publishableKey } from "./src/clerk";
import { Film } from "./src/films";
import { Onboarding } from "./src/Onboarding";
import { Settings } from "./src/Settings";
import { Shortlist } from "./src/Shortlist";
import { SignIn } from "./src/SignIn";
import { Taste } from "./src/Taste";
import { font, theme } from "./src/theme";
import { Tonight } from "./src/Tonight";

type Tab = "tonight" | "shortlist" | "taste" | "settings";
const STORE = "wsww:v1";

export default function App() {
  const [loaded] = useFonts({
    BricolageGrotesque_800ExtraBold, BricolageGrotesque_600SemiBold,
    Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold,
  });
  if (!loaded)
    return <View style={[styles.root, styles.center]}><Text style={{ color: theme.muted }}>…</Text></View>;
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider><Root /></SafeAreaProvider>
    </ClerkProvider>
  );
}

function Root() {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("tonight");
  const [shortlist, setShortlist] = useState<Film[]>([]);
  const [decisions, setDecisions] = useState(0);
  const [locked, setLocked] = useState(true);

  useEffect(() => { setAuthTokenGetter(() => getToken()); return () => setAuthTokenGetter(null); }, [getToken]);

  useEffect(() => {
    AsyncStorage.getItem(STORE).then((raw) => {
      if (raw) {
        try { const s = JSON.parse(raw); setServices(s.services ?? []); setOnboarded(!!s.onboarded); } catch {}
      }
      setReady(true);
    });
  }, []);

  // Face ID lock on cold start when signed in
  useEffect(() => {
    if (!isSignedIn || Platform.OS === "web") { setLocked(false); return; }
    (async () => {
      const has = await LocalAuthentication.hasHardwareAsync().catch(() => false);
      const enrolled = has && (await LocalAuthentication.isEnrolledAsync().catch(() => false));
      if (!enrolled) { setLocked(false); return; }
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: "Unlock What Should We Watch" }).catch(() => ({ success: false }));
      setLocked(!r.success);
    })();
  }, [isSignedIn]);

  const persist = (next: { services?: string[]; onboarded?: boolean }) =>
    AsyncStorage.setItem(STORE, JSON.stringify({ services, onboarded, ...next })).catch(() => {});
  const finishOnboarding = (svcs: string[]) => { setServices(svcs); setOnboarded(true); persist({ services: svcs, onboarded: true }); };
  const toggleService = (s: string) => { const n = services.includes(s) ? services.filter((x) => x !== s) : [...services, s]; setServices(n); persist({ services: n }); };
  const addToShortlist = (films: Film[]) => {
    setShortlist((prev) => { const ids = new Set(prev.map((f) => f.id)); return [...prev, ...films.filter((f) => !ids.has(f.id))]; });
    setDecisions((d) => d + 10);
  };
  const reset = () => { void signOut(); AsyncStorage.removeItem(STORE).catch(() => {}); setServices([]); setOnboarded(false); setShortlist([]); setDecisions(0); setTab("tonight"); };

  if (!isLoaded || !ready)
    return <SafeAreaView style={[styles.root, styles.center]}><Text style={{ color: theme.muted }}>…</Text></SafeAreaView>;
  if (!isSignedIn) return <SignIn />;
  if (locked)
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <Text style={styles.lockTitle}>Locked</Text>
        <Pressable style={styles.unlock} onPress={async () => {
          const r = await LocalAuthentication.authenticateAsync({ promptMessage: "Unlock" }).catch(() => ({ success: false }));
          setLocked(!r.success);
        }}><Text style={styles.unlockText}>Unlock with Face ID</Text></Pressable>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" />
      {!onboarded ? (
        <Onboarding onDone={finishOnboarding} />
      ) : (
        <>
          <View style={{ flex: 1 }}>
            {tab === "tonight" && <Tonight services={services} firstTime={decisions === 0} onKeep={addToShortlist} />}
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
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: "center", justifyContent: "center", gap: 16 },
  lockTitle: { color: theme.ink, fontFamily: font.display, fontSize: 32 },
  unlock: { backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 24 },
  unlockText: { color: theme.bg, fontFamily: font.bodySemi, fontSize: 16 },
  nav: { flexDirection: "row", gap: 4, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 30, borderTopWidth: 1, borderTopColor: theme.line, backgroundColor: theme.bg },
  navItem: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 999 },
  navItemOn: { backgroundColor: theme.surface2 },
  navText: { color: theme.muted, fontFamily: font.bodyMed, fontSize: 13 },
  navTextOn: { color: theme.ink, fontFamily: font.bodySemi },
});
