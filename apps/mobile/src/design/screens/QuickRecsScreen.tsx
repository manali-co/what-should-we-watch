// Quick recs preview (cold-start 1c). "Three we're fairly sure about" — a few ready picks
// as poster rows with a why-line and Watch now, plus an escape to the full deck or to
// picking moods yourself. Presentational only. (DesignSync source was unavailable this
// session — copy/layout follow the design brief + the foundation's voice; see report.)
import { Fragment } from "react";
import { ScrollView, Text, View } from "react-native";
import { Body, Headline, Micro, Screen, TopRow } from "../primitives";
import { Button } from "../controls";
import { Poster, ServiceMark } from "../poster";
import { useTheme } from "../tokens";
import type { MoodHue } from "../tokens";
import { hueOf } from "../data";
import type { Film } from "../../films";
import { formatRuntime, serviceLabel } from "../../films";


export function QuickRecsScreen({
  films,
  moods,
  onSeeDeck,
  onPickMyself,
  onWatch,
}: {
  films: Film[];
  moods: string[];
  onSeeDeck: () => void;
  onPickMyself: () => void;
  onWatch: (f: Film) => void;
}) {
  const t = useTheme();
  const hues: MoodHue[] = moods.map((w, i) => hueOf(w, i));

  return (
    <Screen>
      <TopRow left={<Micro>Tonight</Micro>} />

      <View style={{ paddingTop: t.space[5], gap: t.space[3] }}>
        <Headline size="l">Three we’re fairly sure about</Headline>
        {moods.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space[2] }}>
            <Body>Because tonight feels </Body>
            {moods.map((w, i) => (
              <Fragment key={w}>
                {i > 0 ? (
                  <Body>{i === moods.length - 1 ? "and " : ", "}</Body>
                ) : null}
                <Body style={{ color: t.color.mood[hues[i]].ink }}>{w}</Body>
              </Fragment>
            ))}
            <Body>.</Body>
          </View>
        ) : (
          <Body>Ready to press play — no swiping needed.</Body>
        )}
      </View>

      <ScrollView
        style={{ flex: 1, marginTop: t.space[5] }}
        contentContainerStyle={{ gap: t.space[3], paddingBottom: t.space[4] }}
        showsVerticalScrollIndicator={false}
      >
        {films.map((f) => (
          <RecRow key={f.id} film={f} onWatch={() => onWatch(f)} />
        ))}
      </ScrollView>

      <View style={{ gap: t.space[2], paddingTop: t.space[3], paddingBottom: t.space[8] }}>
        <Button variant="secondary" size="lg" full onPress={onSeeDeck}>
          See all ten as a deck
        </Button>
        <Button variant="ghost" full onPress={onPickMyself}>
          Not quite — pick moods myself
        </Button>
      </View>
    </Screen>
  );
}

function RecRow({ film, onWatch }: { film: Film; onWatch: () => void }) {
  const t = useTheme();
  const meta = [film.year, formatRuntime(film.runtimeMin)].filter(Boolean).join(" · ");
  return (
    <View
      style={{
        flexDirection: "row",
        gap: t.space[4],
        padding: t.space[3],
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: t.color.hairline,
        backgroundColor: t.color.surface,
      }}
    >
      <Poster title={film.title} posterUrl={film.posterUrl} width={84} height={126} radius={t.radius.sm} />
      <View style={{ flex: 1, gap: t.space[1], justifyContent: "space-between" }}>
        <View style={{ gap: t.space[1] }}>
          <ServiceMark name={serviceLabel(film.service)} color={t.color.inkSecondary} />
          <Text style={[t.type.title, { color: t.color.ink }]} numberOfLines={2}>
            {film.title}
          </Text>
          {meta ? <Text style={[t.type.caption, { color: t.color.inkTertiary }]}>{meta}</Text> : null}
          <Text style={[t.type.body, { color: t.color.inkSecondary }]} numberOfLines={3}>
            {film.why}
          </Text>
        </View>
        <View style={{ flexDirection: "row" }}>
          <Button variant="primary" size="sm" onPress={onWatch}>
            Watch now
          </Button>
        </View>
      </View>
    </View>
  );
}
