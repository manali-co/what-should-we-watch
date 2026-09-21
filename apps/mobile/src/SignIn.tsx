import { FontAwesome } from "@expo/vector-icons";
import { useBiometricCredentials, useSignIn, useSignUp, useSSO } from "@clerk/expo";
import { useSignInWithApple } from "@clerk/expo/apple";
import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { font, theme } from "./theme";

const noNavigate = () => {}; // state-based app; finalize activates the session, the gate re-renders

export function SignIn() {
  const { startSSOFlow } = useSSO();
  const { signIn, fetchStatus: siFetching } = useSignIn();
  const { signUp } = useSignUp();
  const { getAvailability, signIn: bioSignIn } = useBiometricCredentials();
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const [bioAvail, setBioAvail] = useState(false);
  // True only where the native module is linked and Apple sign-in is usable — a real
  // iOS build. False in Expo Go and on web, so the button never leads to an unsupported flow.
  const [appleAvail, setAppleAvail] = useState(false);
  useEffect(() => { getAvailability().then((a) => setBioAvail(a.isAvailable)).catch(() => setBioAvail(false)); }, []);
  useEffect(() => { AppleAuthentication.isAvailableAsync().then(setAppleAvail).catch(() => setAppleAvail(false)); }, []);
  const [mode, setMode] = useState<"choices" | "email" | "code">("choices");
  const [path, setPath] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const oauth = async (strategy: "oauth_google" | "oauth_apple") => {
    setErr(null); setBusy(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({ strategy });
      if (createdSessionId && setActive) await setActive({ session: createdSessionId });
      // no session + no throw = user cancelled; don't show an error
    } catch {
      setErr("That didn't go through. Try again.");
    } finally { setBusy(false); }
  };

  const sendCode = async () => {
    if (!signIn || !signUp) return;
    setErr(null); setBusy(true);
    try {
      const { error } = await signIn.emailCode.sendCode({ emailAddress: email });
      if (!error) { setPath("in"); setMode("code"); return; }
      // new user: create a sign-up and send the code there
      const up = await signUp.create({ emailAddress: email });
      if (up.error) { setErr("Couldn't start sign-up for that email."); return; }
      await signUp.verifications.sendEmailCode();
      setPath("up"); setMode("code");
    } catch {
      setErr("Couldn't send a code to that address.");
    } finally { setBusy(false); }
  };

  const verify = async () => {
    if (!signIn || !signUp) return;
    setErr(null); setBusy(true);
    try {
      if (path === "in") {
        const { error } = await signIn.emailCode.verifyCode({ code });
        if (error) { setErr("That code didn't match."); return; }
        if (signIn.status === "complete") await signIn.finalize({ navigate: noNavigate });
      } else {
        const { error } = await signUp.verifications.verifyEmailCode({ code });
        if (error) { setErr("That code didn't match."); return; }
        if (signUp.status === "complete") await signUp.finalize({ navigate: noNavigate });
        else setErr("Almost there — a bit more is needed to finish sign-up.");
      }
    } catch {
      setErr("Couldn't verify that code.");
    } finally { setBusy(false); }
  };

  const doApple = async () => {
    setErr(null); setBusy(true);
    try {
      const { createdSessionId, setActive } = await startAppleAuthenticationFlow();
      if (createdSessionId && setActive) await setActive({ session: createdSessionId });
      // no session + no throw = user cancelled; don't show an error
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "ERR_REQUEST_CANCELED") return; // user tapped Cancel
      setErr("Apple sign-in didn't go through. Try again.");
    } finally { setBusy(false); }
  };

  const doBiometric = async () => {
    setErr(null); setBusy(true);
    try {
      const res = await bioSignIn({ reason: "Sign in to What Should We Watch" });
      if (res.createdSessionId && res.setActive) await res.setActive({ session: res.createdSessionId });
      else if (res.status !== "complete") setErr("Couldn't finish Face ID sign-in.");
    } catch {
      setErr("Face ID sign-in didn't work. Try another way.");
    } finally { setBusy(false); }
  };

  const loading = busy || siFetching === "fetching";

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.top}>
        <Text style={styles.kicker}>What Should We Watch</Text>
        <Text style={styles.h1}>{mode === "code" ? "Check your\nemail" : "The right film,\nfor right now"}</Text>
        <Text style={styles.body}>
          {mode === "code"
            ? `Enter the 6-digit code we sent to ${email}.`
            : "Sign in and your shortlist, taste, and picks follow you everywhere."}
        </Text>
      </View>

      <View style={styles.bottom}>
        {mode === "choices" && (
          <>
            {bioAvail && (
              <Pressable style={styles.google} onPress={doBiometric} disabled={loading}>
                <FontAwesome name="user-secret" size={17} color="#16171D" />
                <Text style={styles.googleText}>Sign in with Face ID</Text>
              </Pressable>
            )}
            {appleAvail && (
              <Pressable style={styles.appleBtn} onPress={doApple} disabled={loading}>
                <FontAwesome name="apple" size={19} color={theme.bg} />
                <Text style={styles.appleText}>Continue with Apple</Text>
              </Pressable>
            )}
            <Pressable style={styles.google} onPress={() => oauth("oauth_google")} disabled={loading}>
              <FontAwesome name="google" size={17} color="#16171D" />
              <Text style={styles.googleText}>Continue with Google</Text>
            </Pressable>
            <Pressable style={styles.emailBtn} onPress={() => setMode("email")} disabled={loading}>
              <Text style={styles.emailBtnText}>Continue with email</Text>
            </Pressable>
          </>
        )}
        {mode === "email" && (
          <>
            <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={theme.muted}
              autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <Pressable style={styles.apple} onPress={sendCode} disabled={loading || !email}>
              <Text style={styles.appleText}>Send me a code</Text>
            </Pressable>
            <Pressable onPress={() => setMode("choices")}><Text style={styles.back}>Other ways to sign in</Text></Pressable>
          </>
        )}
        {mode === "code" && (
          <>
            <TextInput style={styles.input} placeholder="123456" placeholderTextColor={theme.muted}
              keyboardType="number-pad" value={code} onChangeText={setCode} maxLength={6} />
            <Pressable style={styles.apple} onPress={verify} disabled={loading || code.length < 6}>
              <Text style={styles.appleText}>Verify and continue</Text>
            </Pressable>
            <Pressable onPress={() => { setMode("email"); setCode(""); }}><Text style={styles.back}>Use a different email</Text></Pressable>
          </>
        )}
        {loading && <ActivityIndicator color={theme.muted} style={{ marginTop: 12 }} />}
        {err && <Text style={styles.err}>{err}</Text>}
        <View nativeID="clerk-captcha" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, justifyContent: "space-between" },
  top: { paddingTop: 40, paddingHorizontal: 24 },
  kicker: { color: theme.muted, fontFamily: font.bodyMed, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" },
  h1: { color: theme.ink, fontFamily: font.display, fontSize: 42, letterSpacing: -1.5, lineHeight: 44, marginTop: 10 },
  body: { color: theme.muted, fontFamily: font.body, fontSize: 16, lineHeight: 23, marginTop: 16 },
  bottom: { padding: 24, paddingBottom: 34, gap: 12 },
  apple: { backgroundColor: theme.ink, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  appleText: { color: theme.bg, fontFamily: font.bodySemi, fontSize: 16 },
  appleBtn: { backgroundColor: theme.ink, borderRadius: 14, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10 },
  google: { backgroundColor: "#fff", borderRadius: 14, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10 },
  googleText: { color: "#16171D", fontFamily: font.bodySemi, fontSize: 16 },
  emailBtn: { borderWidth: 1.5, borderColor: theme.line, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  emailBtnText: { color: theme.ink, fontFamily: font.bodySemi, fontSize: 16 },
  input: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line, borderRadius: 14, padding: 16, color: theme.ink, fontFamily: font.body, fontSize: 17 },
  back: { color: theme.muted, fontFamily: font.body, fontSize: 14, textAlign: "center", marginTop: 6 },
  err: { color: theme.no, fontFamily: font.body, fontSize: 13, textAlign: "center" },
});
