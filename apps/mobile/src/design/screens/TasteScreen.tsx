// Taste — the learned taste profile: plain-words summary, Patterns, the read-only
// "What we've noticed" contextual signals, and "What you've told us". Ported 1:1 from the
// design's Screens.jsx (Taste). Illustrative copy/figures are the design's, display-only.
import { ScrollView, Text, View } from "react-native";
import { Body, Headline, Micro, Screen, TopRow } from "../primitives";
import { Pill, PillRow } from "../controls";
import { ListRow, SectionLabel } from "../surfaces";
import { Poster } from "../poster";
import { ConvertNudge } from "./ConvertNudge";
import { useTheme } from "../tokens";
import { hueOf } from "../data";

const TINTS = ["#3E6B6F", "#8A5A3C", "#5B3F3A", "#4F6A5A", "#6C4B6E", "#5C5A6E", "#3A4A5E", "#4A6B8A", "#7A5C48", "#8A7A4A"];
const tintFor = (id: string) => TINTS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

const PATTERNS: { k: string; moods: string[]; note: string }[] = [
  { k: "Weeknights", moods: ["brain off", "big laughs"], note: "and nothing over two hours" },
  { k: "Weekends", moods: ["slow burn", "a proper epic"], note: "you have the room for long ones" },
  { k: "Late, after 10", moods: ["properly scary", "mind-bender"], note: "you skip anything cozy" },
  { k: "Autumn", moods: ["spooky not scary", "comfort rewatch"], note: "the rewatches start in October" },
  { k: "With Jo", moods: ["heist energy", "whodunit"], note: "you both say yes to twists" },
];

// Contextual signals: captured automatically from when you watch, never set by the user.
// Read-only, phrased as observations. Each carries a poster that typifies the pattern.
const NOTICED: { signal: string; text: string; mood: string; title: string; id: string }[] = [
  { signal: "Sunday nights", text: "Comfort rewatches on Sunday nights.", mood: "comfort rewatch", title: "The Grand Budapest Hotel", id: "budapest" },
  { signal: "Weeknights", text: "Shorter films on weeknights — nothing over two hours since spring.", mood: "brain off", title: "Paddington 2", id: "paddington2" },
  { signal: "Late, after 10", text: "The later it gets, the stranger you go.", mood: "mind-bender", title: "Arrival", id: "arrival" },
  { signal: "Autumn", text: "Darker, slower picks in autumn.", mood: "dark and twisty", title: "The Thing", id: "thething" },
  { signal: "Late December", text: "Feel-good around the holidays, and you don’t mind having seen it before.", mood: "feel-good", title: "Moonstruck", id: "moonstruck" },
  { signal: "Saturdays", text: "Saturdays are for the long ones, ideally with someone.", mood: "a proper epic", title: "Heat", id: "heat" },
  { signal: "Summer", text: "Summer evenings lean bright and a little chaotic.", mood: "chaotic", title: "Ocean’s Eleven", id: "oceans" },
];

export function TasteScreen({ decisions, showNudge = false, onNudgeSignIn, onNudgeDismiss }: {
  decisions: number; showNudge?: boolean; onNudgeSignIn?: () => void; onNudgeDismiss?: () => void;
}) {
  const t = useTheme();
  // Illustrative tallies from the design; the session's decision count folds into the yes bucket.
  const told: [string, number, "yes" | "no" | null][] = [
    ["Yes", 38 + decisions, "yes"],
    ["Maybe", 12, null],
    ["No", 21, "no"],
    ["Seen it", 14, null],
  ];

  return (
    <Screen>
      <TopRow left={<Headline size="m">Taste</Headline>} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: t.space[9] }} showsVerticalScrollIndicator={false}>
        <ConvertNudge kind="taste" visible={showNudge} onSignIn={onNudgeSignIn ?? (() => {})} onDismiss={onNudgeDismiss ?? (() => {})} />
        <View style={{ paddingTop: t.space[5], gap: t.space[4] }}>
          <Headline size="l">You like films that take their time, as long as they’re under two hours.</Headline>
          <Body size="l">
            You say yes to <Text style={{ color: t.color.mood.lagoon.ink }}>slow burns</Text> and <Text style={{ color: t.color.mood.coral.ink }}>quiet, tender</Text> ones more than anything else. You almost never finish a film that starts after 11. Funny beats clever on a Tuesday. You’ve marked 14 as seen, and liked 11 of them, so we trust your past.
          </Body>
        </View>

        <SectionLabel>Patterns</SectionLabel>
        {PATTERNS.map((p, i) => (
          <View key={p.k} style={{ gap: 8, paddingVertical: 14, borderBottomWidth: i < PATTERNS.length - 1 ? 1 : 0, borderBottomColor: t.color.hairline }}>
            <View style={{ gap: 2 }}>
              <Text style={[t.type.bodyL, { color: t.color.ink }]}>{p.k}</Text>
              <Text style={[t.type.caption, { color: t.color.inkTertiary }]}>{p.note}</Text>
            </View>
            <PillRow>{p.moods.map((m) => <Pill key={m} hue={hueOf(m)} size="sm" selected>{m}</Pill>)}</PillRow>
          </View>
        ))}

        <SectionLabel>What we’ve noticed</SectionLabel>
        <Body style={[t.type.caption, { color: t.color.inkTertiary, marginTop: -2, marginBottom: 6 }]}>Learned from when you watch — time of day, day of week, season, holidays. Not settings; they shift as you do.</Body>
        {NOTICED.map((n, i) => (
          <View key={n.signal} style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 12, borderBottomWidth: i < NOTICED.length - 1 ? 1 : 0, borderBottomColor: t.color.hairline }}>
            <Poster title={n.title} tint={tintFor(n.id)} width={40} height={60} radius={6} />
            <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <Micro>{n.signal}</Micro>
              <Text style={[t.type.bodyL, { color: t.color.ink }]}>{n.text}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pill hue={hueOf(n.mood)} size="sm" selected>{n.mood}</Pill>
                <Text numberOfLines={1} style={[t.type.caption, { color: t.color.inkTertiary, flex: 1 }]}>e.g. {n.title}</Text>
              </View>
            </View>
          </View>
        ))}

        <SectionLabel>What you’ve told us</SectionLabel>
        {told.map(([k, v, tone], i) => (
          <ListRow
            key={k}
            title={k}
            value={String(v)}
            leading={<View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: tone === "yes" ? t.color.yes : tone === "no" ? t.color.no : t.color.inkTertiary }} />}
            last={i === told.length - 1}
          />
        ))}

        <Body tone="tertiary" style={[t.type.caption, { marginTop: t.space[4] }]}>Every swipe and every follow-up answer is in here. What we’ve noticed comes from when you watch, not from anything you set; it feeds tonight’s ten quietly. Wrong about something? Change a decision from your shortlist, or reset it all in Settings.</Body>
      </ScrollView>
    </Screen>
  );
}
