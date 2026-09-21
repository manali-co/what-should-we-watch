// Thinking — deck is being built. Anticipation, not a spinner: mood discs drift and merge,
// the lines of what the app is doing tick in, and ten small poster slots fill as recs are found.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, ImageBackground, Pressable, Text, View, useWindowDimensions } from "react-native";
import { Headline, Micro, Screen, TopRow } from "../primitives";
import { useTheme } from "../tokens";
import type { MoodHue } from "../tokens";
import { thinkingLines } from "../data";
import { Mascot } from "../Mascot";
import type { Film } from "../../films";

const TINTS = ["#3E6B6F", "#8A5A3C", "#5B3F3A", "#4F6A5A", "#6C4B6E", "#5C5A6E", "#3A4A5E", "#4A6B8A", "#7A5C48", "#8A7A4A"];

export function ThinkingScreen({
  words, hues, services, films = [], country = "the US", onCancel, onDone,
}: {
  words: string[]; hues: MoodHue[]; services: string[]; films?: Film[]; country?: string; onCancel: () => void; onDone: () => void;
}) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const lines = thinkingLines(services, words, country);
  const [tick, setTick] = useState(0);
  const found = Math.max(0, Math.min(10, tick - lines.length));

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 360);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (found >= 10) {
      const id = setTimeout(onDone, 650);
      return () => clearTimeout(id);
    }
  }, [found]);

  const cols = 5;
  const gap = 10;
  const slotW = Math.min(72, (Math.min(width, 460) - t.space.pageInset * 2 - gap * (cols - 1)) / cols);
  const slotH = slotW * 1.5;

  return (
    <Screen>
      <TopRow
        left={<Micro>Building tonight{"’"}s ten</Micro>}
        right={
          <Pressable onPress={onCancel} hitSlop={8} style={{ height: 44, paddingHorizontal: 8, justifyContent: "center" }}>
            <Text style={[t.type.label, { color: t.color.inkSecondary }]}>Cancel</Text>
          </Pressable>
        }
      />
      <View style={{ paddingTop: t.space[7], gap: t.space[5] }}>
        <View style={{ height: 96, justifyContent: "center" }}>
          <Mascot state="thinking" size={96} />
        </View>
        <Headline size="l">
          {words.length ? (
            <>
              Looking for <Text style={{ color: t.color.mood[hues[0]].ink }}>{words[0]}</Text>
              {words.length > 1 ? (
                <>
                  {" and "}
                  <Text style={{ color: t.color.mood[hues[1]].ink }}>{words[1]}</Text>
                </>
              ) : null}
              .
            </>
          ) : (
            "Looking for tonight."
          )}
        </Headline>
        <View style={{ gap: 10 }}>
          {lines.map((l, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 10, opacity: i <= tick ? 1 : 0 }}>
              <Text style={[t.type.caption, { color: t.color.inkTertiary, width: 16 }]}>{i < tick ? "✓" : i === tick ? "…" : ""}</Text>
              <Text style={[t.type.bodyL, { color: i < tick ? t.color.ink : t.color.inkTertiary, flex: 1 }]}>{l}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Ten poster slots, filling as each rec is found. */}
      <View style={{ marginTop: t.space[8], gap: t.space[4] }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
          <Text style={[t.type.displayXl, { color: t.color.ink }]}>{found}</Text>
          <Text style={[t.type.displayM, { color: t.color.inkTertiary, marginBottom: 4 }]}>/ 10 found</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Slot key={i} film={films[i]} tint={TINTS[i % TINTS.length]} filled={i < found} w={slotW} h={slotH} />
          ))}
        </View>
      </View>
    </Screen>
  );
}

function Slot({ film, tint, filled, w, h }: { film?: Film; tint: string; filled: boolean; w: number; h: number }) {
  const t = useTheme();
  const a = useRef(new Animated.Value(filled ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: filled ? 1 : 0, duration: t.motion.duration.base, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
  }, [filled]);
  if (!filled) {
    return <View style={{ width: w, height: h, borderRadius: 8, borderWidth: 1, borderColor: t.color.hairline, backgroundColor: t.color.surface }} />;
  }
  return (
    <Animated.View style={{ width: w, height: h, borderRadius: 8, overflow: "hidden", backgroundColor: film?.posterUrl ? t.color.surfaceRaised : tint, transform: [{ scale: a }] }}>
      {film?.posterUrl ? <ImageBackground source={{ uri: film.posterUrl }} style={{ flex: 1 }} resizeMode="cover" /> : null}
    </Animated.View>
  );
}
