// Predicted mood — the returning-user fast path, ported 1:1 from the design's Tonight.jsx.
// A confident opening guess ("We think tonight feels like X, maybe Y."), a real "because"
// line, and a fanned preview of the ready picks (tap to preview). Accept deals them, or steer
// to the mood picker. Presentational; the prediction is supplied by the caller (from /taste).
import { Fragment } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Body, Headline, Micro, Screen, TopRow } from "../primitives";
import { Avatar } from "../primitives";
import { Mascot } from "../Mascot";
import { Button } from "../controls";
import { Poster } from "../poster";
import { useTheme } from "../tokens";
import type { MoodHue } from "../tokens";
import type { AvatarConfig } from "../DiscAvatar";
import type { Film } from "../../films";
import { hueOf } from "../data";
import { formatRuntime, serviceLabel } from "../../films";

const TINTS = ["#3E6B6F", "#8A5A3C", "#5B3F3A", "#4F6A5A", "#6C4B6E", "#5C5A6E", "#3A4A5E", "#4A6B8A", "#7A5C48", "#8A7A4A"];
const tintFor = (id: string) => TINTS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

export function PredictedMoodScreen({
  moods, because, films, context, avatar, onAccept, onPreview, onPickMyself, onOpenAvatar, onOpenSettings, userInitial,
}: {
  moods: string[];
  because?: string;
  films: Film[];
  context?: string;
  avatar?: AvatarConfig | null;
  onAccept: () => void;
  onPreview: () => void;
  onPickMyself: () => void;
  onOpenAvatar?: () => void;
  onOpenSettings?: () => void;
  userInitial?: string;
}) {
  const t = useTheme();
  const hues: MoodHue[] = moods.map((w) => hueOf(w));
  const preview = films.slice(0, 3);

  return (
    <Screen>
      <TopRow
        left={
          <Pressable onPress={onOpenAvatar} hitSlop={8} accessibilityLabel="Change your Disco">
            {avatar || userInitial ? <Avatar person={{ name: "You", initial: userInitial || "Y", avatar }} ring={hues[0] ?? null} /> : <View style={{ width: 32, height: 32, borderRadius: 999, borderWidth: 1, borderColor: t.color.hairlineStrong }} />}
          </Pressable>
        }
        right={
          <Pressable onPress={onOpenSettings} hitSlop={8} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: t.color.inkSecondary, fontSize: 22 }}>{"⋯"}</Text>
          </Pressable>
        }
      />

      {/* Scrollable so the actions below stay reachable on short screens / large text. */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: t.space[5], paddingBottom: t.space[4] }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: t.space[3] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Mascot state="found" size={56} />
            {context ? <Micro>{context}</Micro> : null}
          </View>
          <Headline size="l">
            We think tonight feels like{" "}
            <Headline size="l" style={{ color: t.color.mood[hues[0]].ink }}>{moods[0]}</Headline>
            {moods[1] ? (
              <Fragment>
                , maybe <Headline size="l" style={{ color: t.color.mood[hues[1]].ink }}>{moods[1]}</Headline>
              </Fragment>
            ) : null}
            .
          </Headline>
          {because ? <Body>{because}</Body> : null}
        </View>

        {/* Fanned preview of the ready picks — tap to preview the quick-recs. */}
        <Pressable onPress={onPreview} accessibilityLabel="Preview the ready picks" style={{ marginTop: t.space[5] }}>
          <View style={{ height: 262, marginTop: 12 }}>
            {preview.map((f, i) => {
              const n = preview.length;
              const k = i - (n - 1) / 2;
              return (
                <View
                  key={f.id}
                  style={{
                    position: "absolute", left: "50%", top: 0, width: 164, height: 246, marginLeft: -82,
                    transform: [{ translateX: k * 66 }, { rotate: `${k * 6}deg` }, { translateY: Math.abs(k) * 10 }],
                    zIndex: n - Math.abs(k) * 2 + (k > 0 ? 1 : 0),
                    borderRadius: t.radius.md, ...t.elevation.card,
                  }}
                >
                  <Poster title={f.title} tint={tintFor(f.id)} posterUrl={f.posterUrl} width={164} height={246} radius={t.radius.md} />
                  <View style={{ position: "absolute", left: 12, right: 12, bottom: 12, gap: 2 }}>
                    <Text numberOfLines={2} style={{ color: "#F2F1EE", fontFamily: t.fontFamily.display, fontSize: 15, letterSpacing: -0.15 }}>{f.title}</Text>
                    <Text style={{ color: "rgba(242,241,238,0.7)", fontFamily: t.fontFamily.body, fontSize: 12 }}>{serviceLabel(f.service)} · {formatRuntime(f.runtimeMin)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
          <Body tone="tertiary" style={[t.type.caption, { textAlign: "center", marginTop: 8 }]}>
            {preview.length} ready now{films.length > preview.length ? `, ${films.length - preview.length} more in the deck` : ""}. Tap to preview.
          </Body>
        </Pressable>
      </ScrollView>

      <View style={{ gap: t.space[2], paddingTop: t.space[3], paddingBottom: t.space[3] }}>
        <Button variant="primary" size="lg" full onPress={onAccept}>Sounds right, deal them</Button>
        <Button variant="ghost" full onPress={onPickMyself}>Not quite — pick moods myself</Button>
      </View>
    </Screen>
  );
}
