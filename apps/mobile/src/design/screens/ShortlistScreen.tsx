// Shortlist — poster thumbs + "Watch now". Ported 1:1 from the design's Results.jsx (Shortlist),
// including the "Opening …" toast and the Empty pattern.
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Blend, Body, Headline, Screen, TopRow } from "../primitives";
import { Button, IconButton } from "../controls";
import { ListRow, SectionLabel } from "../surfaces";
import { Poster } from "../poster";
import { useTheme } from "../tokens";
import type { MoodHue } from "../tokens";
import type { Film } from "../../films";
import { formatRuntime, serviceLabel } from "../../films";

const TINTS = ["#3E6B6F", "#8A5A3C", "#5B3F3A", "#4F6A5A", "#6C4B6E", "#5C5A6E", "#3A4A5E", "#4A6B8A", "#7A5C48", "#8A7A4A"];
const tintFor = (id: string) => TINTS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];
const subtitleOf = (f: Film) =>
  `${serviceLabel(f.service)} · ${formatRuntime(f.runtimeMin)}${f.leavingInDays ? ` · leaves in ${f.leavingInDays} days` : ""}`;

export function ShortlistScreen({ films, onRemove, onWatch }: { films: Film[]; onRemove: (id: string) => void; onWatch: (f: Film) => void }) {
  const t = useTheme();
  const [opening, setOpening] = useState<Film | null>(null);
  const empty = films.length === 0;

  const row = (f: Film, i: number, arr: Film[]) => (
    <ListRow
      key={f.id}
      title={f.title}
      subtitle={subtitleOf(f)}
      leading={<Poster title={f.title} tint={tintFor(f.id)} posterUrl={f.posterUrl} width={44} height={66} radius={6} />}
      trailing={
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <IconButton size={36} onPress={() => onRemove(f.id)}>
            <Text style={{ color: t.color.inkTertiary, fontSize: 18 }}>{"×"}</Text>
          </IconButton>
          <Button size="sm" variant={i === 0 ? "primary" : "secondary"} onPress={() => { setOpening(f); onWatch(f); }}>Watch now</Button>
        </View>
      }
      last={i === arr.length - 1}
    />
  );

  return (
    <Screen>
      <TopRow left={<Headline size="m">Shortlist</Headline>} />

      {empty ? (
        <View style={{ flex: 1, justifyContent: "center", gap: t.space[4], paddingBottom: 80 }}>
          <Blend hues={["coral", "lilac", "lagoon"] as MoodHue[]} size={28} style={{ opacity: 0.9 }} />
          <Headline size="l">Nothing shortlisted yet.</Headline>
          <Body size="l">Swipe right on anything in the deck and it lands here, sorted by how sure you were.</Body>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: t.space[8] }} showsVerticalScrollIndicator={false}>
          <SectionLabel>Strong yes</SectionLabel>
          {films.map((f, i) => row(f, i, films))}
          <Body tone="tertiary" style={[t.type.caption, { marginTop: t.space[6] }]}>Watch now opens the film in the streaming app. Tomorrow we’ll ask how it went.</Body>
        </ScrollView>
      )}

      {opening ? (
        <View style={[{ position: "absolute", left: t.space.pageInset, right: t.space.pageInset, bottom: 24, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingHorizontal: 18, borderRadius: t.radius.full, backgroundColor: t.color.ink }, t.elevation.toast]}>
          <Text style={[t.type.body, { color: t.color.inkInverse, flex: 1 }]}>Opening {serviceLabel(opening.service)}…</Text>
          <Pressable onPress={() => setOpening(null)} hitSlop={8}>
            <Text style={[t.type.label, { color: t.color.inkInverse, textDecorationLine: "underline" }]}>Skip to tomorrow</Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}
