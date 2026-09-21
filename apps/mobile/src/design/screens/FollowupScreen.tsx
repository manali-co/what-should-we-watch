// Follow-up — the morning after "Watch now". Two taps: did you watch it → how was it.
// Ported 1:1 from the design's Results.jsx (FollowUp).
import { useState } from "react";
import { View } from "react-native";
import { Body, Headline, Micro, Screen, TopRow } from "../primitives";
import { Button, Pill, PillRow } from "../controls";
import { Poster } from "../poster";
import { useTheme } from "../tokens";
import type { Film } from "../../films";

const TINTS = ["#3E6B6F", "#8A5A3C", "#5B3F3A", "#4F6A5A", "#6C4B6E", "#5C5A6E", "#3A4A5E", "#4A6B8A", "#7A5C48", "#8A7A4A"];
const tintFor = (id: string) => TINTS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

export function FollowupScreen({ film, onReaction, onDismiss }: { film: Film; onReaction: (r: "loved" | "okay" | "disliked") => void; onDismiss: () => void }) {
  const t = useTheme();
  const [step, setStep] = useState<0 | 1 | 2>(0); // 0 watched?, 1 reaction, 2 done
  const [answer, setAnswer] = useState<"yes" | "started" | null>(null);
  const finish = (r: "loved" | "okay" | "disliked") => { onReaction(r); setStep(2); };

  return (
    <Screen>
      <TopRow left={<Micro>Last night</Micro>} right={<Button variant="ghost" size="sm" onPress={onDismiss}>Later</Button>} />

      <View style={{ flex: 1, justifyContent: "center", gap: t.space[6], paddingBottom: 60 }}>
        <Poster title={film.title} tint={tintFor(film.id)} posterUrl={film.posterUrl} width={120} height={180} radius={t.radius.md} />

        {step === 0 ? (
          <>
            <Headline>Did you watch {film.title} last night?</Headline>
            <View style={{ gap: t.space[2] }}>
              <Button variant="primary" size="lg" full onPress={() => { setAnswer("yes"); setStep(1); }}>Yes</Button>
              <View style={{ flexDirection: "row", gap: t.space[2] }}>
                <Button variant="secondary" size="lg" full onPress={() => { setAnswer("started"); setStep(1); }}>Started it</Button>
                <Button variant="secondary" size="lg" full onPress={onDismiss}>No</Button>
              </View>
            </View>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Headline>{answer === "started" ? "Fair enough. How far did it get you?" : "And?"}</Headline>
            <PillRow>
              <Pill tone="yes" leading size="lg" onPress={() => finish("loved")}>Liked it</Pill>
              <Pill tone="watched" size="lg" onPress={() => finish("okay")}>It was okay</Pill>
              <Pill tone="no" leading size="lg" onPress={() => finish("disliked")}>Not for me</Pill>
            </PillRow>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Headline>Noted. Thanks.</Headline>
            <Body size="l">That’s one more thing we know about your nights.</Body>
          </>
        ) : null}
      </View>
    </Screen>
  );
}
