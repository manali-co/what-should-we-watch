// End of deck — the night's ten are done. Ranked summary of what was kept, handoff to the
// shortlist. Ported 1:1 from the design's Results.jsx (EndOfDeck).
import { ScrollView, Text, View } from "react-native";
import { Body, Headline, Micro, Screen, TopRow } from "../primitives";
import { Button } from "../controls";
import { ListRow } from "../surfaces";
import { Poster } from "../poster";
import { useTheme } from "../tokens";
import type { Film } from "../../films";
import { serviceLabel } from "../../films";

// Each film gets a stable tint from its id (real Film has no tint field; the design assigned one).
const TINTS = ["#3E6B6F", "#8A5A3C", "#5B3F3A", "#4F6A5A", "#6C4B6E", "#5C5A6E", "#3A4A5E", "#4A6B8A", "#7A5C48", "#8A7A4A"];
const tintFor = (id: string) => TINTS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];
const runtimeStr = (m?: number | null) => (m ? `${Math.floor(m / 60)} h ${m % 60} m` : "");
const subtitleOf = (f: Film) =>
  `${serviceLabel(f.service)} · ${runtimeStr(f.runtimeMin)}${f.leavingInDays ? ` · leaves in ${f.leavingInDays} days` : ""}`;

export function EndScreen({ kept, onOpenShortlist, onAgain }: { kept: Film[]; onOpenShortlist: () => void; onAgain: () => void }) {
  const t = useTheme();
  // Props carry only the night's likes; treat them as the ranked "yes" list (no maybe split available here).
  const yes = kept;
  const maybe: Film[] = [];
  const all = [...yes, ...maybe];
  return (
    <Screen>
      <TopRow left={<Micro>That’s ten</Micro>} right={<Button variant="ghost" size="sm" onPress={onOpenShortlist}>Shortlist</Button>} />

      <View style={{ paddingTop: t.space[6], gap: t.space[3] }}>
        <Headline size="l">{all.length ? `${yes.length} yes${maybe.length ? `, ${maybe.length} maybe` : ""}.` : "Nothing landed."}</Headline>
        <Body size="l">{all.length ? "Ranked by how sure you seemed. Tap one to watch, or keep going." : "That happens. Ten more, or a different mood?"}</Body>
      </View>

      <ScrollView style={{ flex: 1, marginTop: t.space[4] }} showsVerticalScrollIndicator={false}>
        {all.map((f, i) => (
          <ListRow
            key={f.id}
            title={f.title}
            subtitle={subtitleOf(f)}
            onPress={onOpenShortlist}
            leading={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={[t.type.caption, { width: 18, color: t.color.inkTertiary, fontVariant: ["tabular-nums"] }]}>{i + 1}</Text>
                <Poster title={f.title} tint={tintFor(f.id)} posterUrl={f.posterUrl} width={40} height={60} radius={6} />
              </View>
            }
            trailing={<View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: i < yes.length ? t.color.yes : t.color.inkTertiary }} />}
            last={i === all.length - 1}
          />
        ))}
      </ScrollView>

      <View style={{ gap: t.space[2], paddingTop: t.space[4], paddingBottom: t.space[6] }}>
        <Button variant="primary" size="lg" full onPress={onAgain}>Deal ten more</Button>
        {/* Design routes this to the mood screen; only onAgain is available here, which restarts the loop. */}
        <Button variant="secondary" size="lg" full onPress={onAgain}>Change the mood</Button>
      </View>
    </Screen>
  );
}
