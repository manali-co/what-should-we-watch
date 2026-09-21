import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { serviceLabel } from "./films";
import { font, theme } from "./theme";

export const ALL_SERVICES = ["netflix", "prime", "disney", "hbo", "hulu", "apple", "paramount", "peacock"];

export function Onboarding({ onDone }: { onDone: (services: string[]) => void }) {
  const [step, setStep] = useState(0);
  const [services, setServices] = useState<string[]>(["netflix", "prime", "hbo"]);

  const toggle = (s: string) =>
    setServices((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <>
            <Text style={styles.kicker}>Welcome</Text>
            <Text style={styles.h1}>What Should{"\n"}We Watch</Text>
            <Text style={styles.body}>
              Pick your moods, get ten films that are actually streaming for you tonight, and swipe.
              It learns what you love as you go.
            </Text>
            <Text style={styles.body}>You're set to the United States. You can change that later.</Text>
          </>
        )}
        {step === 1 && (
          <>
            <Text style={styles.kicker}>Your services</Text>
            <Text style={styles.h1}>What do you{"\n"}pay for?</Text>
            <Text style={styles.body}>We only show films you can actually watch. Pick the ones you have.</Text>
            <View style={styles.grid}>
              {ALL_SERVICES.map((s) => {
                const on = services.includes(s);
                return (
                  <Pressable key={s} onPress={() => toggle(s)}
                    style={[styles.svc, { borderColor: on ? theme.lagoon : theme.line, backgroundColor: on ? theme.lagoon : "transparent" }]}>
                    <Text style={[styles.svcText, { color: on ? "#16171D" : theme.ink }]}>{serviceLabel(s)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
        {step === 2 && (
          <>
            <Text style={styles.kicker}>Almost there</Text>
            <Text style={styles.h1}>Sign in{"\n"}to save it</Text>
            <Text style={styles.body}>
              Your shortlist and taste sync across devices. Coming with the real accounts once
              Apple approves the developer program. For now, jump straight in.
            </Text>
            <View style={{ gap: 10, marginTop: 14 }}>
              <Pressable style={styles.signin}><Text style={styles.signinText}> Sign in with Apple</Text></Pressable>
              <Pressable style={[styles.signin, styles.google]}><Text style={[styles.signinText, { color: "#16171D" }]}>Continue with Google</Text></Pressable>
            </View>
          </>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => <View key={i} style={[styles.dot, i === step && styles.dotOn]} />)}
        </View>
        <Pressable style={styles.cta}
          onPress={() => (step < 2 ? setStep(step + 1) : onDone(services))}
          disabled={step === 1 && services.length === 0}>
          <Text style={styles.ctaText}>{step < 2 ? "Next" : "Start watching"}</Text>
        </Pressable>
        {step === 2 && (
          <Pressable onPress={() => onDone(services)}><Text style={styles.skip}>Skip for now</Text></Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scroll: { paddingTop: 40, paddingHorizontal: 24, paddingBottom: 40 },
  kicker: { color: theme.muted, fontFamily: font.bodyMed, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" },
  h1: { color: theme.ink, fontFamily: font.display, fontSize: 44, letterSpacing: -1.5, lineHeight: 46, marginTop: 10 },
  body: { color: theme.muted, fontFamily: font.body, fontSize: 17, lineHeight: 25, marginTop: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 22 },
  svc: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, minWidth: "46%" },
  svcText: { fontFamily: font.bodySemi, fontSize: 16 },
  signin: { backgroundColor: theme.ink, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  google: { backgroundColor: "#fff" },
  signinText: { color: theme.bg, fontFamily: font.bodySemi, fontSize: 16 },
  footer: { padding: 24, paddingBottom: 30, gap: 14 },
  dots: { flexDirection: "row", gap: 6, justifyContent: "center" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.line },
  dotOn: { backgroundColor: theme.ink, width: 20 },
  cta: { backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 17, alignItems: "center" },
  ctaText: { color: theme.bg, fontFamily: font.bodySemi, fontSize: 17 },
  skip: { color: theme.muted, fontFamily: font.body, fontSize: 14, textAlign: "center" },
});
