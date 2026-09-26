import {
  BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, useFonts,
} from "@expo-google-fonts/figtree";
import { ClerkProvider, useAuth, useBiometricCredentials, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Platform, Pressable, Share, StatusBar, StyleSheet, Text, useColorScheme, View } from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { setAuthTokenGetter } from "./src/api";
import { publishableKey } from "./src/clerk";
import { Film } from "./src/films";
import { SignIn } from "./src/SignIn";

import { ThemeProvider } from "./src/design/ThemeProvider";
import { darkColors, fontFamily, lightColors, useTheme, type ThemeColors } from "./src/design/tokens";
import { TonightFlow } from "./src/design/screens/TonightFlow";
import { WelcomeScreen } from "./src/design/screens/WelcomeScreen";
import { OnboardingScreen } from "./src/design/screens/OnboardingScreen";
import { ShortlistScreen } from "./src/design/screens/ShortlistScreen";
import { TasteScreen } from "./src/design/screens/TasteScreen";
import { SettingsScreen } from "./src/design/screens/SettingsScreen";
import { AccountScreen } from "./src/design/screens/AccountScreen";
import { AvatarPickerScreen } from "./src/design/screens/AvatarPickerScreen";
import type { AvatarConfig } from "./src/design/DiscAvatar";
import { GateSheet, GateFeature } from "./src/design/screens/GateSheet";
import { FeedbackSheet } from "./src/design/screens/FeedbackSheet";

type Tab = "tonight" | "shortlist" | "taste" | "settings";
// Per-tab glyphs, 1:1 with the design's TabBar (Account.jsx). Glyph placeholders → the design
// notes these map to SF Symbols in a native build; the marks read the same in the meantime.
const TAB_GLYPH: Record<Tab, string> = { tonight: "◐", shortlist: "≡", taste: "◎", settings: "⋯" };
const STORE = "wsww:v1";
// The tutorial/coach-mark version the app currently ships. We persist the highest version a
// viewer has completed; the first-run tutorial shows whenever theirs is lower — so it appears
// once for new users AND re-appears (once) after we bump this to introduce new-feature coaching.
const TUTORIAL_VERSION = 1;

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
  if (!loaded) {
    // Pre-ThemeProvider (fonts still loading): derive the ground from the chosen theme.
    const c = themeName === "light" ? lightColors : darkColors;
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg }}>
        <Text style={{ color: c.inkSecondary, fontFamily: fontFamily.body }}>…</Text>
      </View>
    );
  }
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider><ThemeProvider name={themeName}><Root themePref={themePref} onThemePref={setTheme} /></ThemeProvider></SafeAreaProvider>
    </ClerkProvider>
  );
}

function Root({ themePref, onThemePref }: { themePref: ThemePref; onThemePref: (p: ThemePref) => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const sh = useMemo(() => makeShellStyles(t.color), [t.color]);
  const barStyle = t.name === "light" ? "dark-content" : "light-content";
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
  // Highest tutorial version this viewer has completed (persisted); < TUTORIAL_VERSION shows it.
  const [seenTutorial, setSeenTutorial] = useState(0);
  // Guest mode: the full core loop works signed-out on this phone. Account-only
  // features (sync, group, account, export, delete) open a sign-in Gate instead.
  const [guest, setGuest] = useState(false);
  const [dismissedNudges, setDismissedNudges] = useState<Record<string, boolean>>({});
  const [showAccount, setShowAccount] = useState(false);
  // The user's "Disco" avatar (mood hue + blob shape + face). Local + persisted; null = the
  // initial-letter fallback until they pick one.
  const [avatar, setAvatar] = useState<AvatarConfig | null>(null);
  const [showAvatar, setShowAvatar] = useState(false);
  const [gate, setGate] = useState<GateFeature | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
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
        try { const s = JSON.parse(raw); setServices(s.services ?? []); setOnboarded(!!s.onboarded); setBioAsked(!!s.bioAsked); setCountry(s.country ?? "United States"); setDisplayName(s.displayName ?? ""); setGuest(!!s.guest); setDismissedNudges(cleanNudges(s.dismissedNudges)); setShortlist(s.shortlist ?? []); setDecisions(s.decisions ?? 0); setSeenIds(s.seenIds ?? []); setAvatar(s.avatar ?? null); setSeenTutorial(typeof s.tutorialVersion === "number" ? s.tutorialVersion : 0); } catch {}
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

  const persist = (next: { services?: string[]; onboarded?: boolean; bioAsked?: boolean; country?: string; displayName?: string; guest?: boolean; dismissedNudges?: Record<string, boolean>; shortlist?: Film[]; decisions?: number; seenIds?: string[]; avatar?: AvatarConfig | null; tutorialVersion?: number }) =>
    AsyncStorage.setItem(STORE, JSON.stringify({ services, onboarded, bioAsked, country, displayName, guest, dismissedNudges, shortlist, decisions, seenIds, avatar, tutorialVersion: seenTutorial, ...next })).catch(() => {});
  const saveAvatar = (a: AvatarConfig) => { setAvatar(a); persist({ avatar: a }); setShowAvatar(false); };
  const finishOnboarding = (svcs: string[], countryName: string, name: string, chosenAvatar: AvatarConfig | null) => {
    setServices(svcs); setCountry(countryName); setDisplayName(name); setOnboarded(true);
    if (chosenAvatar) setAvatar(chosenAvatar);
    persist({ services: svcs, country: countryName, displayName: name, onboarded: true, ...(chosenAvatar ? { avatar: chosenAvatar } : {}) });
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
    setShowAccount(false); setGuest(false); setStarted(false); setServices([]); setOnboarded(false); setShortlist([]); setDecisions(0); setSeenIds([]); setSeenTutorial(0); setAvatar(null); setTab("tonight");
  };
  const logout = () => { void signOut(); setShowAccount(false); setStarted(false); setTab("tonight"); };

  if (!isLoaded || !ready)
    return <SafeAreaView style={[sh.root, sh.center]}><Text style={sh.loadingText}>…</Text></SafeAreaView>;
  const inApp = isSignedIn || guest;
  if (!inApp) {
    if (started) return <SignIn onCancel={() => setStarted(false)} />;
    return (
      <SafeAreaView style={sh.root} edges={["top", "bottom"]}>
        <StatusBar barStyle={barStyle} />
        <WelcomeScreen onGetStarted={() => setStarted(true)} onContinueAsGuest={continueAsGuest} />
      </SafeAreaView>
    );
  }
  // A guest who chose to sign in: full-screen SignIn until a session exists.
  if (signInOverlay && !isSignedIn) return <SignIn onCancel={() => setSignInOverlay(false)} />;
  // The Disco avatar picker (reached from Account or the mood header) takes over the screen.
  // Available to guests too — the avatar is local state and needs no account.
  if (showAvatar)
    return (
      <SafeAreaView style={sh.root} edges={["top", "bottom"]}>
        <StatusBar barStyle={barStyle} />
        <AvatarPickerScreen avatar={avatar} onSave={saveAvatar} onBack={() => setShowAvatar(false)} />
      </SafeAreaView>
    );
  // Account management (members only) takes over the screen.
  if (showAccount && isSignedIn)
    return (
      <SafeAreaView style={sh.root} edges={["top", "bottom"]}>
        <StatusBar barStyle={barStyle} />
        <AccountScreen
          name={displayName || user?.firstName || ""}
          email={email}
          provider={provider}
          appleConnected={appleConnected}
          googleConnected={googleConnected}
          memberSince={user?.createdAt ? user.createdAt.toLocaleDateString(undefined, { month: "long", year: "numeric" }) : undefined}
          decisionCount={decisions}
          avatar={avatar}
          onOpenAvatar={() => setShowAvatar(true)}
          onBack={() => setShowAccount(false)}
          onSaveName={saveName}
          onLogout={logout}
          onDelete={deleteAccount}
          onExport={doExport}
        />
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={sh.root} edges={["top", "bottom"]}>
      <StatusBar barStyle={barStyle} />
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
                tutorialUnseen={seenTutorial < TUTORIAL_VERSION}
                onTutorialSeen={() => { setSeenTutorial(TUTORIAL_VERSION); persist({ tutorialVersion: TUTORIAL_VERSION }); }}
                userInitial={userInitial}
                userName={displayName || (user?.firstName ?? undefined)}
                avatar={avatar}
                onOpenAvatar={() => setShowAvatar(true)}
                country={country}
                onSendFeedback={() => setShowFeedback(true)}
              />
            )}
            {tab === "shortlist" && (
              <ShortlistScreen
                films={shortlist}
                onRemove={(id) => setShortlist((p) => p.filter((f) => f.id !== id))}
                onWatch={(f) => f.link && Linking.openURL(f.link).catch(() => {})}
                onBrowse={() => setTab("tonight")}
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
                onSendFeedback={() => setShowFeedback(true)}
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
            <View style={[sh.nav, { paddingBottom: insets.bottom + 6, marginBottom: -insets.bottom }]} testID="tab-bar">
              {([["tonight", "Tonight"], ["shortlist", `Shortlist${shortlist.length ? ` ${shortlist.length}` : ""}`], ["taste", "Taste"], ["settings", "Settings"]] as [Tab, string][]).map(
                ([key, label]) => (
                  <Pressable key={key} testID={`tab-${key}`} style={[sh.navItem, tab === key && sh.navItemOn]} onPress={() => setTab(key)}>
                    <Text style={[sh.navGlyph, tab === key && sh.navGlyphOn]}>{TAB_GLYPH[key]}</Text>
                    <Text style={[sh.navText, tab === key && sh.navTextOn]}>{label}</Text>
                  </Pressable>
                ),
              )}
            </View>
          )}
          <GateSheet feature={gate} onSignIn={openSignIn} onReset={resetLearned} onClose={() => setGate(null)} />
          <FeedbackSheet open={showFeedback} onClose={() => setShowFeedback(false)} />
        </>
      )}
    </SafeAreaView>
  );
}

// One-time offer, after sign-in, to enroll Clerk's biometric sign-in for next time.
function EnableFaceIdCard({ onEnable, onSkip }: { onEnable: () => void; onSkip: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28, gap: 14 }}>
      <Text style={{ color: t.color.ink, fontFamily: fontFamily.display, fontSize: 30, letterSpacing: -0.8 }}>Sign in faster with Face ID?</Text>
      <Text style={{ color: t.color.inkSecondary, fontFamily: fontFamily.body, fontSize: 16, lineHeight: 23 }}>
        Next time, use Face ID to sign in instead of Google or an email code. You can turn it off anytime.
      </Text>
      <View style={{ gap: 10, marginTop: 8 }}>
        <Pressable onPress={onEnable} style={{ backgroundColor: t.color.accent, borderRadius: 999, paddingVertical: 16, alignItems: "center" }}>
          <Text style={{ color: t.color.onAccent, fontFamily: fontFamily.bodySemiBold, fontSize: 16 }}>Set up Face ID</Text>
        </Pressable>
        <Pressable onPress={onSkip} style={{ paddingVertical: 14, alignItems: "center" }}>
          <Text style={{ color: t.color.inkSecondary, fontFamily: fontFamily.bodyMedium, fontSize: 15 }}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

// The app shell (nav, backgrounds, loading) follows the active theme, exactly like the
// screens do — so Light/System render correctly and aren't dark chrome under light content.
const makeShellStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  center: { alignItems: "center", justifyContent: "center", gap: 16 },
  lockTitle: { color: c.ink, fontFamily: fontFamily.display, fontSize: 32 },
  unlock: { backgroundColor: c.accent, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 24 },
  unlockText: { color: c.onAccent, fontFamily: fontFamily.bodySemiBold, fontSize: 16 },
  // paddingBottom + marginBottom are set dynamically from the safe-area inset so the bar fills
  // to the screen edge (its background covers the home-indicator area) instead of leaving a gap.
  nav: { flexDirection: "row", gap: 4, paddingHorizontal: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.hairline, backgroundColor: c.bg },
  navItem: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 999, gap: 2 },
  navItemOn: { backgroundColor: c.surfaceRaised },
  navGlyph: { color: c.inkTertiary, fontFamily: fontFamily.body, fontSize: 18, lineHeight: 20 },
  navGlyphOn: { color: c.ink },
  navText: { color: c.inkTertiary, fontFamily: fontFamily.bodyMedium, fontSize: 11, letterSpacing: 0.88, textTransform: "uppercase" },
  navTextOn: { color: c.ink, fontFamily: fontFamily.bodySemiBold },
  loadingText: { color: c.inkSecondary, fontFamily: fontFamily.body },
});
