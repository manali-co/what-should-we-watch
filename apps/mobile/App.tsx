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
import { Alert, Linking, Platform, Pressable, Share, StatusBar, StyleSheet, Text, useColorScheme, View } from "react-native";
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
import { AccountScreen } from "./src/design/screens/AccountScreen";
import { GateSheet, GateFeature } from "./src/design/screens/GateSheet";

type Tab = "tonight" | "shortlist" | "taste" | "settings";
const STORE = "wsww:v1";

// Persisted JSON is untrusted: a corrupted or wrong-shaped `dismissedNudges` (a string,
// array, null…) must not slip through `?? {}` and make `.taste`/`.shortlist` reads undefined,
// which would resurface an already-dismissed nudge. Accept only a plain record of booleans.
const cleanNudges = (v: unknown): Record<string, boolean> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, b]) => typeof b === "boolean")) as Record<string, boolean>
    : {};

export type ThemePref = "system" | "dark" | "light";
const THEME_KEY = "wsww:theme";

export default function App() {
  const [loaded] = useFonts({
    BricolageGrotesque_800ExtraBold, BricolageGrotesque_600SemiBold,
    Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold,
  });
  // Appearance: "system" follows the OS; "dark"/"light" force it. Persisted, applied live.
  const [themePref, setThemePref] = useState<ThemePref>("dark");
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((v) => {
      if (v === "system" || v === "dark" || v === "light") setThemePref(v);
    }).catch(() => {});
  }, []);
  const setTheme = (p: ThemePref) => { setThemePref(p); AsyncStorage.setItem(THEME_KEY, p).catch(() => {}); };
  const system = useColorScheme();
  const themeName = themePref === "system" ? (system === "light" ? "light" : "dark") : themePref;
  if (!loaded)
    return <View style={[styles.root, styles.center]}><Text style={styles.loadingText}>…</Text></View>;
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider><ThemeProvider name={themeName}><Root themePref={themePref} onThemePref={setTheme} /></ThemeProvider></SafeAreaProvider>
    </ClerkProvider>
  );
}

function Root({ themePref, onThemePref }: { themePref: ThemePref; onThemePref: (p: ThemePref) => void }) {
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
  // Film ids already decided on, so a new deal never re-shows them (persisted, capped).
  const [seenIds, setSeenIds] = useState<string[]>([]);
  // Guest mode: the full core loop works signed-out on this phone. Account-only
  // features (sync, group, account, export, delete) open a sign-in Gate instead.
  const [guest, setGuest] = useState(false);
  const [dismissedNudges, setDismissedNudges] = useState<Record<string, boolean>>({});
  const [showAccount, setShowAccount] = useState(false);
  const [gate, setGate] = useState<GateFeature | null>(null);
  const [signInOverlay, setSignInOverlay] = useState(false);
  // The deck/thinking flow is full-screen (tab bar hidden), matching the design.
  const [immersive, setImmersive] = useState(false);
  // Clerk's native biometric sign-in (Face ID / Touch ID). No custom app-lock: a valid
  // session flows straight to home; Face ID is an optional faster re-sign-in, enrolled once.
  const { getAvailability, enroll } = useBiometricCredentials();
  const [bioAsked, setBioAsked] = useState(false);
  const [bioOffer, setBioOffer] = useState(false);

  useEffect(() => { setAuthTokenGetter(() => getToken()); return () => setAuthTokenGetter(null); }, [getToken]);

  useEffect(() => {
    AsyncStorage.getItem(STORE).then((raw) => {
      if (raw) {
        try { const s = JSON.parse(raw); setServices(s.services ?? []); setOnboarded(!!s.onboarded); setBioAsked(!!s.bioAsked); setCountry(s.country ?? "United States"); setDisplayName(s.displayName ?? ""); setGuest(!!s.guest); setDismissedNudges(cleanNudges(s.dismissedNudges)); setShortlist(s.shortlist ?? []); setDecisions(s.decisions ?? 0); setSeenIds(s.seenIds ?? []); } catch {}
      }
      setReady(true);
    });
  }, []);

  // Persist the shortlist / decisions / seen ids whenever they change (their setters don't
  // call persist()), so a shortlist survives an app restart instead of vanishing.
  useEffect(() => { if (ready) persist({}); }, [shortlist, decisions, seenIds, ready]);

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

  // Once really signed in, leave guest mode and close any sign-in overlay/gate.
  useEffect(() => {
    if (!isSignedIn) return;
    setSignInOverlay(false); setGate(null);
    if (guest) { setGuest(false); persist({ guest: false }); }
  }, [isSignedIn]);

  const enrollBio = async () => {
    try { await enroll({ reason: "Set up Face ID sign-in for next time" }); } catch { /* cancelled / unavailable */ }
    setBioAsked(true); setBioOffer(false); persist({ bioAsked: true });
  };
  const declineBio = () => { setBioAsked(true); setBioOffer(false); persist({ bioAsked: true }); };

  const persist = (next: { services?: string[]; onboarded?: boolean; bioAsked?: boolean; country?: string; displayName?: string; guest?: boolean; dismissedNudges?: Record<string, boolean>; shortlist?: Film[]; decisions?: number; seenIds?: string[] }) =>
    AsyncStorage.setItem(STORE, JSON.stringify({ services, onboarded, bioAsked, country, displayName, guest, dismissedNudges, shortlist, decisions, seenIds, ...next })).catch(() => {});
  const finishOnboarding = (svcs: string[], countryName: string, name: string) => {
    setServices(svcs); setCountry(countryName); setDisplayName(name); setOnboarded(true);
    persist({ services: svcs, country: countryName, displayName: name, onboarded: true });
  };
  const toggleService = (s: string) => { const n = services.includes(s) ? services.filter((x) => x !== s) : [...services, s]; setServices(n); persist({ services: n }); };
  const addToShortlist = (films: Film[]) => {
    setShortlist((prev) => { const ids = new Set(prev.map((f) => f.id)); return [...prev, ...films.filter((f) => !ids.has(f.id))]; });
  };
  // Remember a decided film so a fresh deal excludes it (most-recent-first, capped at 400).
  const markSeen = (id: string) => setSeenIds((prev) => (prev.includes(id) ? prev : [id, ...prev].slice(0, 400)));
  const onDecided = (filmId: string) => { setDecisions((d) => d + 1); markSeen(filmId); };
  // "Reset what we've learned" — clears local decisions/taste only; never signs out.
  const resetLearned = () => { setShortlist([]); setDecisions(0); setSeenIds([]); };
  const continueAsGuest = () => { setGuest(true); persist({ guest: true }); };
  const openSignIn = () => { setGate(null); setShowAccount(false); setSignInOverlay(true); };
  const dismissNudge = (kind: string) => { const next = { ...dismissedNudges, [kind]: true }; setDismissedNudges(next); persist({ dismissedNudges: next }); };
  const saveName = (name: string) => { setDisplayName(name); persist({ displayName: name }); void user?.update({ firstName: name })?.catch(() => {}); };
  const doExport = async () => {
    const payload = JSON.stringify(
      { app: "What Should We Watch", exportedAt: new Date().toISOString(), country, services, decisions, shortlist: shortlist.map((f) => ({ id: f.id, title: f.title, service: f.service })) },
      null, 2,
    );
    try { await Share.share({ message: payload, title: "Your What Should We Watch data" }); } catch { /* dismissed */ }
  };
  const deleteAccount = async () => {
    try {
      await user?.delete();
    } catch {
      // Server deletion failed — do NOT wipe or sign out, or it would look deleted while
      // the account is still alive. Keep the account screen open and tell the user.
      Alert.alert("Couldn’t delete your account", "Something went wrong on our side. Your account is unchanged — please try again in a moment.");
      return;
    }
    void signOut(); AsyncStorage.removeItem(STORE).catch(() => {});
    setShowAccount(false); setGuest(false); setStarted(false); setServices([]); setOnboarded(false); setShortlist([]); setDecisions(0); setSeenIds([]); setTab("tonight");
  };
  const logout = () => { void signOut(); setShowAccount(false); setStarted(false); setTab("tonight"); };

  if (!isLoaded || !ready)
    return <SafeAreaView style={[styles.root, styles.center]}><Text style={styles.loadingText}>…</Text></SafeAreaView>;
  const inApp = isSignedIn || guest;
  if (!inApp) {
    if (started) return <SignIn onCancel={() => setStarted(false)} />;
    return (
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <StatusBar barStyle="light-content" />
        <WelcomeScreen onGetStarted={() => setStarted(true)} onContinueAsGuest={continueAsGuest} />
      </SafeAreaView>
    );
  }
  // A guest who chose to sign in: full-screen SignIn until a session exists.
  if (signInOverlay && !isSignedIn) return <SignIn onCancel={() => setSignInOverlay(false)} />;
  // Account management (members only) takes over the screen.
  if (showAccount && isSignedIn)
    return (
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <StatusBar barStyle="light-content" />
        <AccountScreen
          name={displayName || user?.firstName || ""}
          email={email}
          provider={provider}
          appleConnected={appleConnected}
          googleConnected={googleConnected}
          memberSince={user?.createdAt ? user.createdAt.toLocaleDateString(undefined, { month: "long", year: "numeric" }) : undefined}
          decisionCount={decisions}
          onBack={() => setShowAccount(false)}
          onSaveName={saveName}
          onLogout={logout}
          onDelete={deleteAccount}
          onExport={doExport}
        />
      </SafeAreaView>
    );
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
                seenIds={seenIds}
                onKeep={addToShortlist}
                onDecided={onDecided}
                onOpenSettings={() => setTab("settings")}
                onOpenShortlist={() => setTab("shortlist")}
                onImmersive={setImmersive}
                firstTime={decisions === 0}
                userInitial={userInitial}
                userName={displayName || (user?.firstName ?? undefined)}
                country={country}
              />
            )}
            {tab === "shortlist" && (
              <ShortlistScreen
                films={shortlist}
                onRemove={(id) => setShortlist((p) => p.filter((f) => f.id !== id))}
                onWatch={(f) => f.link && Linking.openURL(f.link).catch(() => {})}
                showNudge={guest && !isSignedIn && shortlist.length >= 3 && !dismissedNudges.shortlist}
                onNudgeSignIn={openSignIn}
                onNudgeDismiss={() => dismissNudge("shortlist")}
              />
            )}
            {tab === "taste" && (
              <TasteScreen
                refreshKey={decisions}
                showNudge={guest && !isSignedIn && !dismissedNudges.taste}
                onNudgeSignIn={openSignIn}
                onNudgeDismiss={() => dismissNudge("taste")}
              />
            )}
            {tab === "settings" && (
              <SettingsScreen
                isGuest={guest && !isSignedIn}
                services={services}
                onToggleService={toggleService}
                onReset={resetLearned}
                onOpenAccount={() => setShowAccount(true)}
                onSignIn={openSignIn}
                onGate={setGate}
                onExport={doExport}
                onLogout={logout}
                onDelete={deleteAccount}
                onOpenTaste={() => setTab("taste")}
                themePref={themePref}
                onThemePref={onThemePref}
                provider={provider}
                email={email}
                displayName={displayName || user?.firstName || undefined}
                country={country}
              />
            )}
          </View>
          {immersive ? null : (
            <View style={styles.nav}>
              {([["tonight", "Tonight"], ["shortlist", `Shortlist${shortlist.length ? ` ${shortlist.length}` : ""}`], ["taste", "Taste"], ["settings", "Settings"]] as [Tab, string][]).map(
                ([key, label]) => (
                  <Pressable key={key} testID={`tab-${key}`} style={[styles.navItem, tab === key && styles.navItemOn]} onPress={() => setTab(key)}>
                    <Text style={[styles.navText, tab === key && styles.navTextOn]}>{label}</Text>
                  </Pressable>
                ),
              )}
            </View>
          )}
          <GateSheet feature={gate} onSignIn={openSignIn} onReset={resetLearned} onClose={() => setGate(null)} />
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
