// Welcome — first-run explainer, ported 1:1 from the design's Flow.jsx (Welcome).
// Three-disc Blend, the "Tonight feels like…" promise, three numbered steps, "Get started".
// Presentational only; emits onGetStarted.
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Body, Headline, Screen } from "../primitives";
import { Mascot } from "../Mascot";
import { Button } from "../controls";
import { useTheme } from "../tokens";

const STEPS: [string, string][] = [
  ["Pick a mood or two.", "Mix them. Bring friends."],
  ["We deal ten films.", "Only ones actually streaming on your services, in your country, tonight."],
  ["Swipe to decide.", "Right to like, left to pass. Every swipe teaches us what you’d say yes to."],
];

export function WelcomeScreen({ onGetStarted }: { onGetStarted: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Screen padded={false}>
      <View style={{ position: "absolute", left: t.space.pageInset, right: t.space.pageInset, top: 96 }}>
        <Mascot state="idle" size={72} />
      </View>

      <View style={{ position: "absolute", left: t.space.pageInset, right: t.space.pageInset, top: 178, gap: t.space[5] }}>
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

      <View style={{ position: "absolute", left: t.space.pageInset, right: t.space.pageInset, bottom: insets.bottom + 12, gap: t.space[3] }}>
        <Button variant="primary" size="lg" full onPress={onGetStarted}>Get started</Button>
        <Body tone="tertiary" style={[t.type.caption, { textAlign: "center" }]}>Free. No card. Your taste stays yours.</Body>
      </View>
    </Screen>
  );
}
