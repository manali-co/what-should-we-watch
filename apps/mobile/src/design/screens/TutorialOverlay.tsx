// Tutorial coach-marks — a NON-BLOCKING first-deck overlay. The scrim and cues are
// pointerEvents:none so the real deck underneath stays swipeable; only "Got it" is tappable,
// and the parent also dismisses it on the first swipe.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Micro } from "../primitives";
import { PosterCard, CardFilm } from "../poster";
import { useTheme } from "../tokens";

type Kind = "like" | "nope" | "maybe" | "watched";
const TUT: { kind: Kind | null; x: number; y: number; title: string; body: string }[] = [
  { kind: "nope", x: -140, y: 0, title: "Swipe left to pass", body: "Not tonight. We won’t show it again for a while." },
  { kind: "like", x: 140, y: 0, title: "Swipe right to like", body: "Goes to your shortlist as a strong yes." },
  { kind: "maybe", x: 0, y: -120, title: "Swipe up for maybe", body: "Keep it around without committing." },
  { kind: "watched", x: 0, y: 120, title: "Swipe down if you’ve seen it", body: "Then tell us if it was any good." },
  { kind: null, x: 0, y: 0, title: "Tap the poster for the trailer", body: "Plays inline. Swipe any time to decide." },
];

const DEMO: CardFilm = { title: "Tonight’s pick", year: 2016, runtime: "1 h 56 m", service: "Netflix", tint: "#3E6B6F" };

export function TutorialOverlay({ onDismiss, film = DEMO }: { onDismiss: () => void; film?: CardFilm }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [out, setOut] = useState(false);
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = setInterval(() => {
      setOut(true);
      Animated.timing(p, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
        p.setValue(0);
        setOut(false);
        setStep((s) => (s + 1) % TUT.length);
      });
    }, 1900);
    return () => clearInterval(id);
  }, [p]);

  const cur = TUT[step];
  const angle = Math.max(-12, Math.min(12, cur.x * 0.06));
  const translateX = p.interpolate({ inputRange: [0, 1], outputRange: [0, cur.x] });
  const translateY = p.interpolate({ inputRange: [0, 1], outputRange: [0, cur.y] });
  const rotate = p.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${angle}deg`] });

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Dim + animated ghost card — purely visual, never intercepts touches. */}
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(16,17,20,0.5)" }}>
        <View style={{ position: "absolute", left: t.space.pageInset, right: t.space.pageInset, top: insets.top + 60, height: t.size.cardHeight * 0.5 }}>
          <Animated.View style={{ position: "absolute", left: 0, right: 0, top: 0, height: t.size.cardHeight * 0.5, transform: [{ translateX }, { translateY }, { rotate }] }}>
            <PosterCard film={film} stamp={cur.kind ?? undefined} stampOpacity={out ? 1 : 0} compact />
          </Animated.View>
        </View>
      </View>

      {/* Bottom panel — the only tappable part. */}
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
        <View style={{ paddingTop: 18, paddingHorizontal: t.space.pageInset, paddingBottom: insets.bottom + 14, backgroundColor: t.color.bgDeep, gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {TUT.map((_, i) => (
              <View key={i} style={{ height: 3, flex: 1, borderRadius: 999, backgroundColor: i <= step ? t.color.ink : t.color.hairlineStrong }} />
            ))}
          </View>
          <View style={{ gap: 4 }}>
            <Text style={[t.type.displayM, { color: t.color.ink }]}>{cur.title}</Text>
            <Text style={[t.type.bodyL, { color: t.color.inkSecondary }]}>{cur.body}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Micro>Swipe the card, or</Micro>
            <Pressable onPress={onDismiss} style={{ backgroundColor: t.color.ink, height: 40, paddingHorizontal: 20, borderRadius: 999, alignItems: "center", justifyContent: "center" }}>
              <Text style={[t.type.label, { color: t.color.inkInverse }]}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
