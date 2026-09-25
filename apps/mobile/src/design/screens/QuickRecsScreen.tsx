// Quick recs preview — the ready picks as scannable rows with the "why", before committing to
// the deck. Ported 1:1 from the design's Tonight.jsx (QuickRecs): Back + "Ready now", the mood
// pills with a "change" escape, poster rows with why + Watch now, and "See all ten as a deck".
import { ScrollView, Text, View } from "react-native";
import { Body, Headline, Micro, Screen, TopRow } from "../primitives";
import { Button, Pill, PillRow } from "../controls";
import { Poster } from "../poster";
import { useTheme } from "../tokens";
import type { MoodHue } from "../tokens";
import { hueOf } from "../data";
import type { Film } from "../../films";
import { formatRuntime, serviceLabel } from "../../films";

const TINTS = ["#3E6B6F", "#8A5A3C", "#5B3F3A", "#4F6A5A", "#6C4B6E", "#5C5A6E", "#3A4A5E", "#4A6B8A", "#7A5C48", "#8A7A4A"];
const tintFor = (id: string) => TINTS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

export function QuickRecsScreen({
  films, moods, onBack, onSeeDeck, onPickMyself, onWatch,
}: {
  films: Film[];
  moods: string[];
  onBack: () => void;
  onSeeDeck: () => void;
  onPickMyself: () => void;
  onWatch: (f: Film) => void;
}) {
  const t = useTheme();
  const hues: MoodHue[] = moods.map((w) => hueOf(w));

  return (
    <Screen>
      <TopRow left={<Button variant="ghost" size="sm" onPress={onBack}>Back</Button>} right={<Micro>Ready now</Micro>} />

      <View style={{ paddingTop: t.space[4], gap: t.space[3] }}>
        <Headline size="l">Three we’re fairly sure about.</Headline>
        <PillRow>
          {moods.map((w, i) => <Pill key={w} hue={hues[i]} size="sm" selected>{w}</Pill>)}
          <Pill size="sm" onPress={onPickMyself} style={{ borderStyle: "dashed" }}>change</Pill>
        </PillRow>
      </View>

      <ScrollView style={{ flex: 1, marginTop: t.space[3] }} contentContainerStyle={{ paddingBottom: t.space[4] }} showsVerticalScrollIndicator={false}>
        {films.map((f, i) => (
          <View key={f.id} style={{ flexDirection: "row", gap: 14, paddingVertical: 14, borderBottomWidth: i < films.length - 1 ? 1 : 0, borderBottomColor: t.color.hairline }}>
            <Poster title={f.title} tint={tintFor(f.id)} posterUrl={f.posterUrl} width={72} height={108} radius={t.radius.sm} />
            <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
              <Text style={[t.type.title, { color: t.color.ink }]} numberOfLines={2}>{f.title}</Text>
              <Text style={[t.type.caption, { color: t.color.inkSecondary }]}>
                {[f.year, formatRuntime(f.runtimeMin), serviceLabel(f.service)].filter(Boolean).join(" · ")}
                {f.leavingInDays ? ` · leaves in ${f.leavingInDays} days` : ""}
              </Text>
              {f.why ? <Text numberOfLines={3} style={[t.type.body, { color: t.color.ink }]}>{f.why}</Text> : null}
              <View style={{ flexDirection: "row", marginTop: 4 }}>
                <Button variant={i === 0 ? "primary" : "secondary"} size="sm" onPress={() => onWatch(f)}>Watch now</Button>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={{ gap: t.space[2], paddingTop: t.space[3], paddingBottom: t.space[8] }}>
        <Button variant="primary" size="lg" full onPress={onSeeDeck}>See all ten as a deck</Button>
        <Button variant="ghost" full onPress={onPickMyself}>Not quite — pick moods myself</Button>
      </View>
    </Screen>
  );
}
