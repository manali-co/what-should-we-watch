import { useSSO } from "@clerk/clerk-expo";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { font, theme } from "./theme";

WebBrowser.maybeCompleteAuthSession();

export function SignIn() {
  const { startSSOFlow } = useSSO();
  const { signIn, setActive } = useSignIn();
  const { signUp } = useSignUp();
  const [mode, setMode] = useState<"choices" | "email" | "code">("choices");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);

  const oauth = async (strategy: "oauth_google" | "oauth_apple") => {
    setErr(null); setBusy(true);
    try {
      const { createdSessionId, setActive: setA } = await startSSOFlow({ strategy });
      if (createdSessionId && setA) await setA({ session: createdSessionId });
    } catch {
      setErr("That didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const sendCode = async () => {
    if (!signIn || !signUp) return;
    setErr(null); setBusy(true);
    try {
      try {
        await signIn.create({ identifier: email });
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: signIn.supportedFirstFactors!.find((f) => f.strategy === "email_code")!.emailAddressId });
      } catch {
        await signUp.create({ emailAddress: email });
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      }
      setMode("code");
    } catch {
      setErr("Couldn't send a code to that address.");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (!signIn || !signUp) return;
    setErr(null); setBusy(true);
    try {
      let sessionId: string | null = null;
      try {
        const r = await signIn.attemptFirstFactor({ strategy: "email_code", code });
        sessionId = r.createdSessionId;
      } catch {
        const r = await signUp.attemptEmailAddressVerification({ code });
        sessionId = r.createdSessionId;
      }
      if (sessionId && setActive) await setActive({ session: sessionId });
    } catch {
      setErr("That code didn't match. Check and retry.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.top}>
        <Text style={styles.kicker}>What Should We Watch</Text>
        <Text style={styles.h1}>{mode === "code" ? "Check your\nemail" : "Sign in\nto watch"}</Text>
        <Text style={styles.body}>
          {mode === "code" ? `We sent a 6-digit code to ${email}.` : "Your shortlist and taste sync across devices. Secured by Clerk."}
        </Text>
      </View>

      <View style={styles.bottom}>
        {mode === "choices" && (
          <>
            <Pressable style={styles.apple} onPress={() => oauth("oauth_apple")} disabled={busy}>
              <Text style={styles.appleText}> Continue with Apple</Text>
            </Pressable>
            <Pressable style={styles.google} onPress={() => oauth("oauth_google")} disabled={busy}>
              <Text style={styles.googleText}>Continue with Google</Text>
            </Pressable>
            <Pressable style={styles.emailBtn} onPress={() => setMode("email")} disabled={busy}>
              <Text style={styles.emailBtnText}>Continue with email</Text>
            </Pressable>
          </>
        )}
        {mode === "email" && (
          <>
            <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={theme.muted}
              autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <Pressable style={styles.apple} onPress={sendCode} disabled={busy || !email}>
              <Text style={styles.appleText}>Send me a code</Text>
            </Pressable>
            <Pressable onPress={() => setMode("choices")}><Text style={styles.back}>Other ways to sign in</Text></Pressable>
          </>
        )}
        {mode === "code" && (
          <>
            <TextInput style={styles.input} placeholder="123456" placeholderTextColor={theme.muted}
              keyboardType="number-pad" value={code} onChangeText={setCode} maxLength={6} />
            <Pressable style={styles.apple} onPress={verifyCode} disabled={busy || code.length < 6}>
              <Text style={styles.appleText}>Verify</Text>
            </Pressable>
            <Pressable onPress={() => setMode("email")}><Text style={styles.back}>Use a different email</Text></Pressable>
          </>
        )}
        {busy && <ActivityIndicator color={theme.muted} style={{ marginTop: 12 }} />}
        {err && <Text style={styles.err}>{err}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, justifyContent: "space-between" },
  top: { paddingTop: 40, paddingHorizontal: 24 },
  kicker: { color: theme.muted, fontFamily: font.bodyMed, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" },
  h1: { color: theme.ink, fontFamily: font.display, fontSize: 46, letterSpacing: -1.5, lineHeight: 48, marginTop: 10 },
  body: { color: theme.muted, fontFamily: font.body, fontSize: 16, lineHeight: 23, marginTop: 16 },
  bottom: { padding: 24, paddingBottom: 34, gap: 12 },
  apple: { backgroundColor: theme.ink, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  appleText: { color: theme.bg, fontFamily: font.bodySemi, fontSize: 16 },
  google: { backgroundColor: "#fff", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  googleText: { color: "#16171D", fontFamily: font.bodySemi, fontSize: 16 },
  emailBtn: { borderWidth: 1.5, borderColor: theme.line, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  emailBtnText: { color: theme.ink, fontFamily: font.bodySemi, fontSize: 16 },
  input: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line, borderRadius: 14, padding: 16, color: theme.ink, fontFamily: font.body, fontSize: 17 },
  back: { color: theme.muted, fontFamily: font.body, fontSize: 14, textAlign: "center", marginTop: 6 },
  err: { color: theme.no, fontFamily: font.body, fontSize: 13, textAlign: "center" },
});
