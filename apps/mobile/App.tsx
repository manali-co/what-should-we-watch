import {
  BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, useFonts,
} from "@expo-google-fonts/figtree";
import { ClerkProvider, useAuth, useBiometricCredentials, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { setAuthTokenGetter } from "./src/api";
import { publishableKey } from "./src/clerk";
import { Film } from "./src/films";
import { SignIn } from "./src/SignIn";

import { ThemeProvider } from "./src/design/ThemeProvider";
import { darkColors, fontFamily } from "./src/design/tokens";
import { TonightFlow } from "./src/design/screens/TonightFlow";
import { WelcomeScreen } from "./src/design/screens/WelcomeScreen";
import { OnboardingScreen } from "./src/design/screens/OnboardingScreen";
import { ShortlistScreen } from "./src/design/screens/ShortlistScreen";
import { TasteScreen } from "./src/design/screens/TasteScreen";
import { SettingsScreen } from "./src/design/screens/SettingsScreen";

type Tab = "tonight" | "shortlist" | "taste" | "settings";
const STORE = "wsww:v1";

export default function App() {
  const [loaded] = useFonts({
    BricolageGrotesque_800ExtraBold, BricolageGrotesque_600SemiBold,
    Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold,
  });
  if (!loaded)
    return <View style={[styles.root, styles.center]}><Text style={styles.loadingText}>…</Text></View>;
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider><ThemeProvider name="dark"><Root /></ThemeProvider></SafeAreaProvider>
    </ClerkProvider>
  );
}

function Root() {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const { user } = useUser();
  const userInitial = (user?.firstName?.[0] ?? user?.username?.[0] ?? user?.primaryEmailAddress?.emailAddress?.[0] ?? "").toUpperCase();
  const email = user?.primaryEmailAddress?.emailAddress ?? undefined;
  const externals = user?.externalAccounts ?? [];
  const googleConnected = externals.some((a) => (a.provider ?? "").includes("google"));
  const appleConnected = externals.some((a) => (a.provider ?? "").includes("apple"));
  const provider: "google" | "apple" | "email" = googleConnected ? "google" : appleConnected ? "apple" : "email";
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const [country, setCountry] = useState("United States");
  const [displayName, setDisplayName] = useState("");
  const [tab, setTab] = useState<Tab>("tonight");
  const [shortlist, setShortlist] = useState<Film[]>([]);
  const [decisions, setDecisions] = useState(0);
  // Clerk's native biometric sign-in (Face ID / Touch ID). No custom app-lock: a valid
  // session flows straight to home; Face ID is an optional faster re-sign-in, enrolled once.
  const { getAvailability, enroll } = useBiometricCredentials();
  const [bioAsked, setBioAsked] = useState(false);
  const [bioOffer, setBioOffer] = useState(false);

  useEffect(() => { setAuthTokenGetter(() => getToken()); return () => setAuthTokenGetter(null); }, [getToken]);

  useEffect(() => {
    AsyncStorage.getItem(STORE).then((raw) => {
      if (raw) {
        try { const s = JSON.parse(raw); setServices(s.services ?? []); setOnboarded(!!s.onboarded); setBioAsked(!!s.bioAsked); setCountry(s.country ?? "United States"); setDisplayName(s.displayName ?? ""); } catch {}
      }
      setReady(true);
    });
  }, []);

  // After sign-in, offer to set up Face ID sign-in once — only if the device can enroll one.
  useEffect(() => {
    if (!isSignedIn || bioAsked || Platform.OS === "web") { setBioOffer(false); return; }
    (async () => {
      try {
        const a = await getAvailability();
        setBioOffer(!a.isAvailable && a.unavailableReason === "no_local_credential");
      } catch { setBioOffer(false); }
    })();
  }, [isSignedIn, bioAsked]);

  const enrollBio = async () => {
    try { await enroll({ reason: "Set up Face ID sign-in for next time" }); } catch { /* cancelled / unavailable */ }
    setBioAsked(true); setBioOffer(false); persist({ bioAsked: true });
  };
  const declineBio = () => { setBioAsked(true); setBioOffer(false); persist({ bioAsked: true }); };

  const persist = (next: { services?: string[]; onboarded?: boolean; bioAsked?: boolean; country?: string; displayName?: string }) =>
    AsyncStorage.setItem(STORE, JSON.stringify({ services, onboarded, bioAsked, country, displayName, ...next })).catch(() => {});
  const finishOnboarding = (svcs: string[], countryName: string, name: string) => {
    setServices(svcs); setCountry(countryName); setDisplayName(name); setOnboarded(true);
    persist({ services: svcs, country: countryName, displayName: name, onboarded: true });
  };
  const toggleService = (s: string) => { const n = services.includes(s) ? services.filter((x) => x !== s) : [...services, s]; setServices(n); persist({ services: n }); };
  const addToShortlist = (films: Film[]) => {
    setShortlist((prev) => { const ids = new Set(prev.map((f) => f.id)); return [...prev, ...films.filter((f) => !ids.has(f.id))]; });
  };
  const reset = () => { void signOut(); AsyncStorage.removeItem(STORE).catch(() => {}); setServices([]); setOnboarded(false); setShortlist([]); setDecisions(0); setTab("tonight"); };

  if (!isLoaded || !ready)
    return <SafeAreaView style={[styles.root, styles.center]}><Text style={styles.loadingText}>…</Text></SafeAreaView>;
  if (!isSignedIn) {
    if (started) return <SignIn />;
    return (
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <StatusBar barStyle="light-content" />
        <WelcomeScreen onGetStarted={() => setStarted(true)} />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" />
      {!onboarded ? (
        <OnboardingScreen onDone={finishOnboarding} />
      ) : bioOffer ? (
        <EnableFaceIdCard onEnable={enrollBio} onSkip={declineBio} />
      ) : (
        <>
          <View style={{ flex: 1 }}>
            {tab === "tonight" && (
              <TonightFlow
                services={services}
                onKeep={addToShortlist}
                onDecided={() => setDecisions((d) => d + 1)}
                onOpenSettings={() => setTab("settings")}
                onOpenShortlist={() => setTab("shortlist")}
                firstTime={decisions === 0}
                userInitial={userInitial}
                userName={displayName || (user?.firstName ?? undefined)}
                country={country}
              />
            )}
            {tab === "shortlist" && <ShortlistScreen films={shortlist} onRemove={(id) => setShortlist((p) => p.filter((f) => f.id !== id))} onWatch={(f) => f.link && Linking.openURL(f.link).catch(() => {})} />}
            {tab === "taste" && <TasteScreen decisions={decisions} />}
            {tab === "settings" && <SettingsScreen services={services} onToggleService={toggleService} onReset={reset} onLogout={() => { void signOut(); setStarted(false); setTab("tonight"); }} provider={provider} appleConnected={appleConnected} googleConnected={googleConnected} email={email} country={country} />}
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

// One-time offer, after sign-in, to enroll Clerk's biometric sign-in for next time.
function EnableFaceIdCard({ onEnable, onSkip }: { onEnable: () => void; onSkip: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28, gap: 14 }}>
      <Text style={{ color: darkColors.ink, fontFamily: fontFamily.display, fontSize: 30, letterSpacing: -0.8 }}>Sign in faster with Face ID?</Text>
      <Text style={{ color: darkColors.inkSecondary, fontFamily: fontFamily.body, fontSize: 16, lineHeight: 23 }}>
        Next time, use Face ID to sign in instead of Google or an email code. You can turn it off anytime.
      </Text>
      <View style={{ gap: 10, marginTop: 8 }}>
        <Pressable onPress={onEnable} style={{ backgroundColor: darkColors.accent, borderRadius: 999, paddingVertical: 16, alignItems: "center" }}>
          <Text style={{ color: darkColors.onAccent, fontFamily: fontFamily.bodySemiBold, fontSize: 16 }}>Set up Face ID</Text>
        </Pressable>
        <Pressable onPress={onSkip} style={{ paddingVertical: 14, alignItems: "center" }}>
          <Text style={{ color: darkColors.inkSecondary, fontFamily: fontFamily.bodyMedium, fontSize: 15 }}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: darkColors.bg },
  center: { alignItems: "center", justifyContent: "center", gap: 16 },
  lockTitle: { color: darkColors.ink, fontFamily: fontFamily.display, fontSize: 32 },
  unlock: { backgroundColor: darkColors.accent, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 24 },
  unlockText: { color: darkColors.onAccent, fontFamily: fontFamily.bodySemiBold, fontSize: 16 },
  nav: { flexDirection: "row", gap: 4, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10, borderTopWidth: 1, borderTopColor: darkColors.hairline, backgroundColor: darkColors.bg },
  navItem: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 999 },
  navItemOn: { backgroundColor: darkColors.surfaceRaised },
  navText: { color: darkColors.inkSecondary, fontFamily: fontFamily.bodyMedium, fontSize: 13 },
  navTextOn: { color: darkColors.ink, fontFamily: fontFamily.bodySemiBold },
  loadingText: { color: darkColors.inkSecondary, fontFamily: fontFamily.body },
});
