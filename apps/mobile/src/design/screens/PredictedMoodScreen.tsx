// Predicted mood (cold-start 1b: "Tonight · predicted mood"). A confident opening guess —
// "We think you're in the mood for X tonight" — with one tap to accept, one to steer.
// Presentational only. Copy/layout follow the design brief + the foundation's voice
// (DesignSync source was unavailable this session — see report).
import { Fragment } from "react";
import { View } from "react-native";
import { Blend, Body, Headline, Micro, Screen, TopRow } from "../primitives";
import { Button } from "../controls";
import { useTheme } from "../tokens";
import type { MoodHue } from "../tokens";
import { hueOf } from "../data";

export function PredictedMoodScreen({
  moods,
  onAccept,
  onPickMyself,
}: {
  moods: string[];
  onAccept: () => void;
  onPickMyself: () => void;
}) {
  const t = useTheme();
  const hues: MoodHue[] = moods.map((w, i) => hueOf(w, i));

  return (
    <Screen>
      <TopRow left={<Micro>Tonight</Micro>} />

      <View style={{ paddingTop: t.space[7], gap: t.space[5] }}>
        <Headline size="l">
          {"We think you’re in the mood for "}
          {moods.length === 0 ? (
            <Headline size="l" style={{ color: t.color.inkTertiary }}>
              something easy
            </Headline>
          ) : (
            moods.map((w, i) => (
              <Fragment key={w}>
                {i > 0 ? (
                  <Headline size="l" style={{ color: t.color.ink }}>
                    {i === moods.length - 1 ? " and " : ", "}
                  </Headline>
                ) : null}
                <Headline size="l" style={{ color: t.color.mood[hues[i]].ink }}>
                  {w}
                </Headline>
              </Fragment>
            ))
          )}
          {" tonight."}
        </Headline>

        {moods.length ? <Blend hues={hues} size={28} /> : null}

        <Body size="l">
          A hunch from your last few nights and the time of day. We can start
          there — or you can steer.
        </Body>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ gap: t.space[2], paddingBottom: t.space[8] }}>
        <Button variant="primary" size="lg" full onPress={onAccept}>
          Sounds right
        </Button>
        <Button variant="ghost" full onPress={onPickMyself}>
          Not quite — I’ll pick myself
        </Button>
      </View>
    </Screen>
  );
}
