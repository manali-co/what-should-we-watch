// Taste — the learned taste profile, from real data. The engine's plain-words summary,
// the moods you keep saying yes to, behavioural signals derived from WHEN you watch
// (time of day / weekend / season), and honest decision tallies. Layout follows the
// design's Screens.jsx (Taste); the data is real, with a truthful cold-start for new
// viewers — nothing invented (no more "With Jo"). The mascot embodies what we know.
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { fetchTaste, type TasteProfile } from "../../api";
import { Body, Headline, Micro, Screen, TopRow } from "../primitives";
import { Pill, PillRow } from "../controls";
import { ListRow, SectionLabel } from "../surfaces";
import { Poster } from "../poster";
import { Mascot } from "../Mascot";
import { ConvertNudge } from "./ConvertNudge";
import { useTheme } from "../tokens";
import { hueOf } from "../data";

const TINTS = ["#3E6B6F", "#8A5A3C", "#5B3F3A", "#4F6A5A", "#6C4B6E", "#5C5A6E", "#3A4A5E", "#4A6B8A", "#7A5C48", "#8A7A4A"];
const tintFor = (s: string) => TINTS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

export function TasteScreen({ showNudge = false, onNudgeSignIn, onNudgeDismiss, refreshKey = 0 }: {
  showNudge?: boolean; onNudgeSignIn?: () => void; onNudgeDismiss?: () => void; refreshKey?: number;
}) {
  const t = useTheme();
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    fetchTaste()
      .then((p) => { if (alive) { setProfile(p); setStatus("ok"); } })
      .catch(() => { if (alive) setStatus("error"); });
    return () => { alive = false; };
  }, [refreshKey]);

  const cold = !profile || profile.total === 0;
  const told: [string, number, "yes" | "no" | null][] = profile
    ? [["Yes", profile.actions.like, "yes"], ["Maybe", profile.actions.maybe, null],
       ["No", profile.actions.dislike, "no"], ["Seen it", profile.actions.watched, null]]
    : [];

  return (
    <Screen>
      <TopRow left={<Headline size="m">Taste</Headline>} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: t.space[9] }} showsVerticalScrollIndicator={false}>
        <ConvertNudge kind="taste" visible={showNudge} onSignIn={onNudgeSignIn ?? (() => {})} onDismiss={onNudgeDismiss ?? (() => {})} />

        {status === "loading" ? (
          <View style={{ paddingTop: t.space[8], alignItems: "center", gap: t.space[4] }}>
            <Mascot state="thinking" size={72} />
            <Body tone="tertiary">Gathering what we know…</Body>
          </View>
        ) : status === "error" ? (
          <View style={{ paddingTop: t.space[7], gap: t.space[4], alignItems: "flex-start" }}>
            <Mascot state="error" size={72} />
            <Headline size="l">We couldn’t load your taste just now.</Headline>
            <Body size="l">Not you, us. It’s all still saved — reopen this tab in a moment.</Body>
          </View>
        ) : cold ? (
          // Honest cold-start: we haven't learned anything yet, so we say so.
          <View style={{ paddingTop: t.space[6], gap: t.space[4], alignItems: "flex-start" }}>
            <Mascot state="idle" size={72} />
            <Headline size="l">We’re still learning your taste.</Headline>
            <Body size="l">
              Swipe through a few decks and this fills in — what you say yes to, and what you reach for late at night, on weekends, or in a given season. Nothing here is made up; it all comes from your swipes.
            </Body>
          </View>
        ) : (
          <>
            <View style={{ paddingTop: t.space[5], gap: t.space[4] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: t.space[3] }}>
                <Mascot state="found" size={56} />
                <Headline size="l" style={{ flex: 1 }}>Here’s your taste, so far.</Headline>
              </View>
              {profile!.notes ? <Body size="l">{profile!.notes}</Body> : null}
              {profile!.topMoods.length ? (
                <View style={{ gap: 8 }}>
                  <Text style={[t.type.caption, { color: t.color.inkTertiary }]}>You keep saying yes to</Text>
                  <PillRow>{profile!.topMoods.map((m) => <Pill key={m} hue={hueOf(m)} size="sm" selected>{m}</Pill>)}</PillRow>
                </View>
              ) : null}
            </View>

            {profile!.patterns.length > 0 ? (
              <>
                <SectionLabel>What we’ve noticed</SectionLabel>
                <Body style={[t.type.caption, { color: t.color.inkTertiary, marginTop: -2, marginBottom: 6 }]}>
                  Learned from when you watch — time of day, day of week, season. Not settings; they shift as you do.
                </Body>
                {profile!.patterns.map((n, i) => (
                  <View key={n.signal} style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 12, borderBottomWidth: i < profile!.patterns.length - 1 ? 1 : 0, borderBottomColor: t.color.hairline }}>
                    {n.sampleTitle ? <Poster title={n.sampleTitle} tint={tintFor(n.sampleTitle)} width={40} height={60} radius={6} /> : null}
                    <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                      <Micro>{n.signal}</Micro>
                      <Text style={[t.type.bodyL, { color: t.color.ink }]}>You reach for {n.moods.join(" and ")}.</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Pill hue={hueOf(n.moods[0])} size="sm" selected>{n.moods[0]}</Pill>
                        {n.sampleTitle ? <Text numberOfLines={1} style={[t.type.caption, { color: t.color.inkTertiary, flex: 1 }]}>e.g. {n.sampleTitle}</Text> : null}
                      </View>
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <>
                <SectionLabel>What we’ve noticed</SectionLabel>
                <Body style={[t.type.caption, { color: t.color.inkTertiary }]}>
                  Still learning your patterns — they show up here once you’ve watched across a few different nights and seasons.
                </Body>
              </>
            )}

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

            <Body tone="tertiary" style={[t.type.caption, { marginTop: t.space[4] }]}>
              Every swipe and every follow-up answer is in here. What we’ve noticed comes from when you watch, not from anything you set; it feeds tonight’s ten quietly. Wrong about something? Change a decision from your shortlist, or reset it all in Settings.
            </Body>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
