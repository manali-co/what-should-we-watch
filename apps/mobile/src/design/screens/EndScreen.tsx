// End of deck — the mascot IS the intelligence here. It thinks over what you kept, then
// hands you the call: a verdict ("Tonight, Paddington 2.") with the reason, then the rest
// ranked by fit. Layout follows the design's Results.jsx (EndOfDeck); the order + verdict
// come from POST /catalog/results (LLM-ranked), not from swipe order. Falls back gracefully
// to the kept order if the engine is unusable, so the screen always resolves.
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Body, Headline, Micro, Screen, TopRow } from "../primitives";
import { Button } from "../controls";
import { ListRow } from "../surfaces";
import { Poster } from "../poster";
import { Mascot, type MascotState } from "../Mascot";
import { useTheme } from "../tokens";
import { fetchResults, type Participant } from "../../api";
import type { Film } from "../../films";
import { formatRuntime, serviceLabel } from "../../films";

const TINTS = ["#3E6B6F", "#8A5A3C", "#5B3F3A", "#4F6A5A", "#6C4B6E", "#5C5A6E", "#3A4A5E", "#4A6B8A", "#7A5C48", "#8A7A4A"];
const tintFor = (id: string) => TINTS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];
const subtitleOf = (f: Film) =>
  `${serviceLabel(f.service)} · ${formatRuntime(f.runtimeMin)}${f.leavingInDays ? ` · leaves in ${f.leavingInDays} days` : ""}`;

export function EndScreen({ kept, moods, company, participants, onOpenShortlist, onAgain }: {
  kept: Film[]; moods: string[]; company?: string; participants?: Participant[];
  onOpenShortlist: () => void; onAgain: () => void;
}) {
  const t = useTheme();
  const empty = kept.length === 0;
  const [films, setFilms] = useState<Film[]>(kept);
  const [verdict, setVerdict] = useState("");
  const [phase, setPhase] = useState<"ranking" | "done">(empty ? "done" : "ranking");
  const [celebrate, setCelebrate] = useState(false);

  // Ask the engine to rank what was kept. The mascot stays "thinking" until it lands.
  useEffect(() => {
    if (empty) return;
    let alive = true;
    fetchResults({ kept, moods, company, participants })
      .then((r) => { if (!alive) return; setFilms(r.films?.length ? r.films : kept); setVerdict(r.verdict || ""); })
      .catch(() => { if (alive) setFilms(kept); })
      .finally(() => { if (alive) setPhase("done"); });
    return () => { alive = false; };
  }, []);

  // A beat after the verdict lands, the mascot celebrates the #1.
  useEffect(() => {
    if (phase !== "done" || empty) return;
    const id = setTimeout(() => setCelebrate(true), 900);
    return () => clearTimeout(id);
  }, [phase, empty]);

  const mascot: MascotState = empty ? "empty" : phase === "ranking" ? "thinking" : celebrate ? "celebrate" : "found";
  const top = films[0];
  const headline = empty ? "Nothing landed." : phase === "ranking" ? "Thinking it over…" : verdict || `${films.length} for tonight.`;
  const sub = empty
    ? "That happens. Ten more, or a different mood?"
    : phase === "ranking"
      ? "Weighing what you kept against your taste tonight."
      : top?.why || "Ranked for tonight — tap one to watch, or keep going.";

  return (
    <Screen>
      <TopRow left={<Micro>That’s ten</Micro>} right={<Button variant="ghost" size="sm" onPress={onOpenShortlist}>Shortlist</Button>} />

      <View style={{ paddingTop: t.space[6], gap: t.space[3] }}>
        <Mascot state={mascot} size={72} />
        <Headline size="l">{headline}</Headline>
        <Body size="l">{sub}</Body>
      </View>

      <ScrollView style={{ flex: 1, marginTop: t.space[4] }} showsVerticalScrollIndicator={false}>
        {films.map((f, i) => (
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
            trailing={<View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: i === 0 ? t.color.yes : t.color.inkTertiary }} />}
            last={i === films.length - 1}
          />
        ))}
      </ScrollView>

      <View style={{ gap: t.space[2], paddingTop: t.space[4], paddingBottom: t.space[6] }}>
        <Button variant="primary" size="lg" full onPress={onAgain}>Deal ten more</Button>
        <Button variant="secondary" size="lg" full onPress={onAgain}>Change the mood</Button>
      </View>
    </Screen>
  );
}
