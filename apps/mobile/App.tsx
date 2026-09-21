import {
  BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, useFonts,
} from "@expo-google-fonts/figtree";
import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
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
  const ext = user?.externalAccounts?.[0]?.provider ?? "";
  const provider: "google" | "apple" | "email" = ext.includes("google") ? "google" : ext.includes("apple") ? "apple" : "email";
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("tonight");
  const [shortlist, setShortlist] = useState<Film[]>([]);
  const [decisions, setDecisions] = useState(0);
  const [locked, setLocked] = useState(false); // stays home unless the user opted into an app-lock
  const [bioLabel, setBioLabel] = useState("Face ID");
  const [bioAvailable, setBioAvailable] = useState(false);
  const [faceId, setFaceId] = useState(false); // app-lock is opt-in
  const [askedBio, setAskedBio] = useState(false); // whether we've offered the lock yet

  useEffect(() => { setAuthTokenGetter(() => getToken()); return () => setAuthTokenGetter(null); }, [getToken]);

  // Biometric only — never the device passcode. On failure we keep the lock and let the user retry.
  const runUnlock = useCallback(async () => {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock What Should We Watch",
      disableDeviceFallback: true,
      cancelLabel: "Cancel",
    }).catch(() => ({ success: false }));
    if (r.success) setLocked(false);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORE).then((raw) => {
      if (raw) {
        try { const s = JSON.parse(raw); setServices(s.services ?? []); setOnboarded(!!s.onboarded); setFaceId(!!s.faceId); setAskedBio(!!s.askedBio); } catch {}
      }
      setReady(true);
    });
  }, []);

  // On cold start when signed in: learn what biometric exists; lock only if the user opted in.
  useEffect(() => {
    if (!isSignedIn || Platform.OS === "web") { setLocked(false); return; }
    (async () => {
      const has = await LocalAuthentication.hasHardwareAsync().catch(() => false);
      const enrolled = has && (await LocalAuthentication.isEnrolledAsync().catch(() => false));
      setBioAvailable(!!enrolled);
      if (enrolled) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync().catch(() => [] as number[]);
        const T = LocalAuthentication.AuthenticationType;
        setBioLabel(
          types.includes(T.FACIAL_RECOGNITION) ? (Platform.OS === "ios" ? "Face ID" : "face unlock")
            : types.includes(T.FINGERPRINT) ? (Platform.OS === "ios" ? "Touch ID" : "fingerprint")
              : types.includes(T.IRIS) ? "iris" : "biometrics",
        );
      }
      if (faceId && enrolled) { setLocked(true); await runUnlock(); }
      else setLocked(false);
    })();
  }, [isSignedIn, faceId, runUnlock]);

  const toggleFaceId = async (v: boolean) => {
    if (v && Platform.OS !== "web") {
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: `Turn on ${bioLabel}`, disableDeviceFallback: true }).catch(() => ({ success: false }));
      if (!r.success) return; // don't enable unless they pass the biometric once
    }
    setFaceId(v); setAskedBio(true); persist({ faceId: v, askedBio: true });
  };
  const declineBio = () => { setAskedBio(true); persist({ askedBio: true }); };

  const persist = (next: { services?: string[]; onboarded?: boolean; faceId?: boolean; askedBio?: boolean }) =>
    AsyncStorage.setItem(STORE, JSON.stringify({ services, onboarded, faceId, askedBio, ...next })).catch(() => {});
  const finishOnboarding = (svcs: string[]) => { setServices(svcs); setOnboarded(true); persist({ services: svcs, onboarded: true }); };
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
  if (locked)
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <Text style={styles.lockTitle}>Locked</Text>
        <Pressable style={styles.unlock} onPress={runUnlock}><Text style={styles.unlockText}>Unlock with {bioLabel}</Text></Pressable>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" />
      {!onboarded ? (
        <OnboardingScreen onDone={(svcs) => finishOnboarding(svcs)} />
      ) : !askedBio && bioAvailable ? (
        <EnableFaceIdCard bioLabel={bioLabel} onEnable={() => toggleFaceId(true)} onSkip={declineBio} />
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
                userName={user?.firstName ?? undefined}
              />
            )}
            {tab === "shortlist" && <ShortlistScreen films={shortlist} onRemove={(id) => setShortlist((p) => p.filter((f) => f.id !== id))} onWatch={(f) => f.link && Linking.openURL(f.link).catch(() => {})} />}
            {tab === "taste" && <TasteScreen decisions={decisions} />}
            {tab === "settings" && <SettingsScreen services={services} onToggleService={toggleService} onReset={reset} onLogout={() => { void signOut(); setStarted(false); setTab("tonight"); }} faceId={faceId} onToggleFaceId={toggleFaceId} bioLabel={bioLabel} provider={provider} email={email} />}
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

function EnableFaceIdCard({ bioLabel, onEnable, onSkip }: { bioLabel: string; onEnable: () => void; onSkip: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28, gap: 14 }}>
      <Text style={{ color: darkColors.ink, fontFamily: fontFamily.display, fontSize: 30, letterSpacing: -0.8 }}>Lock the app with {bioLabel}?</Text>
      <Text style={{ color: darkColors.inkSecondary, fontFamily: fontFamily.body, fontSize: 16, lineHeight: 23 }}>
        You{"’"}re signed in, so this is optional — an extra layer that asks for {bioLabel} each time you open the app. You can change it anytime in Settings.
      </Text>
      <View style={{ gap: 10, marginTop: 8 }}>
        <Pressable onPress={onEnable} style={{ backgroundColor: darkColors.accent, borderRadius: 999, paddingVertical: 16, alignItems: "center" }}>
          <Text style={{ color: darkColors.onAccent, fontFamily: fontFamily.bodySemiBold, fontSize: 16 }}>Use {bioLabel}</Text>
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
