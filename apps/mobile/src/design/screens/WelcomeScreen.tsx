// Welcome — first-run explainer, ported 1:1 from the design's Flow.jsx (Welcome).
// Three-disc Blend, the "Tonight feels like…" promise, three numbered steps, "Get started".
// Presentational only; emits onGetStarted.
import { Text, View } from "react-native";
import { Body, Headline, Screen } from "../primitives";
import { Mascot } from "../Mascot";
import { Button } from "../controls";
import { useTheme } from "../tokens";

const STEPS: [string, string][] = [
  ["Pick a mood or two.", "Mix them. Bring friends."],
  ["We deal ten films.", "Only ones actually streaming on your services, in your country, tonight."],
  ["Swipe to decide.", "Right to like, left to pass. Every swipe teaches us what you’d say yes to."],
];

export function WelcomeScreen({ onGetStarted, onContinueAsGuest }: { onGetStarted: () => void; onContinueAsGuest?: () => void }) {
  const t = useTheme();
  return (
    // Flex column so it adapts to any phone height (the old fixed top/bottom offsets left a
    // gap mid-screen on tall phones and overlapped on short ones).
    <Screen>
      <View style={{ marginTop: t.space[7], alignItems: "flex-start" }}>
        <Mascot state="idle" size={72} />
      </View>

      <View style={{ marginTop: t.space[7], gap: t.space[5] }}>
        <Headline>
          Tonight feels like{"… "}
          <Headline style={{ color: t.color.mood.coral.ink }}>cozy</Headline>. Or{" "}
          <Headline style={{ color: t.color.mood.lilac.ink }}>a mind-bender</Headline>. Or both.
        </Headline>
        <View style={{ gap: 14 }}>
          {STEPS.map(([h, b], i) => (
            <View key={i} style={{ flexDirection: "row", gap: 10 }}>
              <Text style={[t.type.title, { color: t.color.inkTertiary, width: 24 }]}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[t.type.title, { color: t.color.ink }]}>{h}</Text>
                <Body>{b}</Body>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ gap: t.space[3], paddingBottom: t.space[3] }}>
        <Button variant="primary" size="lg" full onPress={onGetStarted}>Get started</Button>
        {onContinueAsGuest ? <Button variant="ghost" size="lg" full onPress={onContinueAsGuest}>Continue as guest</Button> : null}
        <Body tone="tertiary" style={[t.type.caption, { textAlign: "center" }]}>Free. No card. Guests get the full loop on this phone; sign in later to decide with friends.</Body>
      </View>
    </Screen>
  );
}
