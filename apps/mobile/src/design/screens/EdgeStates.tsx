// Edge and unhappy states, ported 1:1 from the design's Flow.jsx (deck edge states) and
// Screens.jsx (States wrapper). One small presentational component per state, each taking
// minimal callbacks. The full-page states use the source's shared `Empty` block —
// Blend(coral/lilac/lagoon) + optional Micro kicker + Headline l + Body l + optional primary
// Button; the deck variants (rate-limited banner, missing poster, no-trailer toast) are small
// note/banner components; the skeletons are pulsing loaders. Foundation tokens + primitives only.
import { ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Easing, ScrollView, Text, TextInput, View, ViewStyle } from "react-native";
import { Body, Headline, Micro, Screen, TopRow } from "../primitives";
import { Mascot, MascotState } from "../Mascot";
import { Button } from "../controls";
import { ListRow } from "../surfaces";
import { Poster } from "../poster";
import { useTheme } from "../tokens";
import { COUNTRIES } from "../data";

// Faded deck-strip tints, matching the deck's placeholder palette (DeckScreen/ThinkingScreen).
const TINTS = ["#3E6B6F", "#8A5A3C", "#5B3F3A", "#4F6A5A", "#6C4B6E", "#5C5A6E", "#3A4A5E", "#4A6B8A", "#7A5C48", "#8A7A4A"];

// ── Shared blocks (from Results.jsx: Empty / Offline) ───────────────────────────

/** Empty — centered block: Blend, optional kicker, headline, body, optional primary action. */
function Empty({ kicker, title, body, action, onAction, mascot = "empty" }: { kicker?: string; title: string; body: string; action?: string; onAction?: () => void; mascot?: MascotState }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: "center", gap: t.space[4], paddingBottom: 80 }}>
      <Mascot state={mascot} size={72} />
      {kicker ? <Micro>{kicker}</Micro> : null}
      <Headline size="l">{title}</Headline>
      <Body size="l">{body}</Body>
      {action ? (
        <View style={{ flexDirection: "row" }}>
          <Button variant="primary" onPress={onAction}>{action}</Button>
        </View>
      ) : null}
    </View>
  );
}

/** Inline banner — for states shown over the deck (rate-limited, no-trailer). */
function Banner({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 44,
        paddingVertical: t.space[2],
        paddingHorizontal: t.space[4],
        borderRadius: t.radius.full,
        backgroundColor: t.color.surfaceRaised,
      }}
    >
      <Text style={[t.type.label, { color: t.color.inkSecondary, flex: 1 }]}>{children}</Text>
    </View>
  );
}

/** Skel — one pulsing skeleton bar. */
function Skel({ w = "100%", h = 16, r, bg }: { w?: ViewStyle["width"]; h?: number; r?: number; bg?: string }) {
  const t = useTheme();
  const a = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  return <Animated.View style={{ width: w, height: h, borderRadius: r ?? t.radius.xs, backgroundColor: bg ?? t.color.surfaceRaised, opacity: a }} />;
}

// ── Deck edge states (Flow.jsx) ─────────────────────────────────────────────────

/** Passed on all ten. Faded deck strip, "Change the mood" / "Deal ten more anyway". */
export function PassedAll({ onAgain, onChangeMood }: { onAgain: () => void; onChangeMood?: () => void }) {
  const t = useTheme();
  return (
    <Screen>
      <TopRow left={<Micro>That{"’"}s ten</Micro>} />
      <View style={{ paddingTop: t.space[6], gap: t.space[3] }}>
        <Headline size="l">You passed on all ten.</Headline>
        <Body size="l">
          Fair. Either the mood was off, or tonight wants something we haven{"’"}t tried. Ten more of the same, or a
          different mood?
        </Body>
      </View>
      <View style={{ flexDirection: "row", gap: t.space[2], marginTop: t.space[6] }}>
        {TINTS.map((tint, i) => (
          <View key={i} style={{ opacity: 0.45 }}>
            <Poster title="" tint={tint} width={52} height={78} radius={t.radius.xs} />
          </View>
        ))}
      </View>
      <Body tone="tertiary" size="body" style={[t.type.caption, { marginTop: t.space[2] }]}>
        We{"’"}ll rest these for a few weeks. Changed your mind about one? Undo from the shortlist.
      </Body>
      <View style={{ marginTop: "auto", gap: t.space[2], paddingBottom: t.space[3] }}>
        <Button variant="primary" size="lg" full onPress={onChangeMood}>Change the mood</Button>
        <Button variant="secondary" size="lg" full onPress={onAgain}>Deal ten more anyway</Button>
      </View>
    </Screen>
  );
}

/** Empty deck — nothing on the user's services matches tonight. Copy interpolates services/moods/country. */
export function EmptyDeck({
  onBroaden,
  onChangeMoods,
  onAddService,
  moods,
  services,
  country,
}: {
  onBroaden: () => void;
  onChangeMoods: () => void;
  onAddService?: () => void;
  moods?: string[];
  services?: string[];
  country?: string;
}) {
  const t = useTheme();
  const words = moods ?? [];
  const headerLabel = words.length ? words.join(" · ") : "cozy · big laughs";
  const moodPhrase = words.length ? words.join(", ") : "cozy, funny";
  const svc = services ?? ["Netflix", "Hulu", "Max"];
  const list = svc.length > 3 ? `${svc.slice(0, 3).join(", ")} and ${svc.length - 3} more` : svc.join(", ");
  const where = country ?? "the United States";
  return (
    <Screen>
      <TopRow
        left={
          <View style={{ gap: 2 }}>
            <Micro>Tonight</Micro>
            <Text style={[t.type.title, { color: t.color.ink }]}>{headerLabel}</Text>
          </View>
        }
      />
      <Empty
        title="Nothing on your services feels like that tonight."
        body={`${list} don${"’"}t have a ${moodPhrase} film in ${where} we haven${"’"}t already shown you.`}
      />
      <View style={{ position: "absolute", left: t.space.pageInset, right: t.space.pageInset, bottom: t.space[3], gap: t.space[2] }}>
        <Button variant="primary" size="lg" full onPress={onChangeMoods}>Change the moods</Button>
        <Button variant="secondary" size="lg" full onPress={onAddService}>Add a service</Button>
        <Button variant="ghost" full onPress={onBroaden}>Drop one mood and try again</Button>
      </View>
    </Screen>
  );
}

/** API down — our side, not yours. Deck couldn't be built; shortlist still available. */
export function ApiDown({ onRetry, onOpenShortlist }: { onRetry: () => void; onOpenShortlist?: () => void }) {
  const t = useTheme();
  return (
    <Screen>
      <TopRow left={<Micro>Tonight</Micro>} />
      <Empty
        mascot="error"
        kicker="Our side, not yours"
        title="We couldn’t build tonight’s ten."
        body="The catalog service didn’t answer. It usually comes back in a minute; your shortlist is still here."
        action="Try again"
        onAction={onRetry}
      />
      <View style={{ position: "absolute", left: t.space.pageInset, right: t.space.pageInset, bottom: t.space[3] }}>
        <Button variant="secondary" full onPress={onOpenShortlist}>Open shortlist</Button>
      </View>
    </Screen>
  );
}

/** Offline — the deck can't be refreshed without a connection. */
export function Offline({ onRetry, onOpenShortlist }: { onRetry: () => void; onOpenShortlist?: () => void }) {
  const t = useTheme();
  return (
    <Screen>
      <TopRow left={<Micro>Tonight</Micro>} />
      <Empty
        mascot="error"
        kicker="You’re offline"
        title="We can’t refresh tonight’s deck."
        body="We need a connection to check what’s on your services right now. Your shortlist works offline."
        action="Try again"
        onAction={onRetry}
      />
      <View style={{ position: "absolute", left: t.space.pageInset, right: t.space.pageInset, bottom: t.space[3] }}>
        <Button variant="secondary" full onPress={onOpenShortlist}>Open shortlist</Button>
      </View>
    </Screen>
  );
}

/** Rate-limited — cached results shown over the deck as a banner. */
export function RateLimited() {
  return <Banner>Catalog is busy. Showing last night{"’"}s list; availability may have changed.</Banner>;
}

/** Missing poster — the toned placeholder tile with the service's note. */
export function MissingPosterNote() {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: t.space[3], alignItems: "center" }}>
      <Poster title="" missing width={84} height={126} radius={t.radius.sm} />
      <Text style={[t.type.body, { color: t.color.inkSecondary, flex: 1 }]}>
        No artwork from the service yet. The film is real; the poster will follow.
      </Text>
    </View>
  );
}

/** Trailer unavailable — a neutral toast over the deck. */
export function TrailerUnavailable() {
  return <Banner>No trailer for this one yet.</Banner>;
}

/** Session expired — Blend, "Signed out" kicker, sign in or fall back to the shortlist. */
export function SessionExpired({ onSignIn, onOpenShortlist }: { onSignIn: () => void; onOpenShortlist?: () => void }) {
  const t = useTheme();
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: t.space[4], paddingBottom: 80 }}>
        <Mascot state="empty" size={72} />
        <Micro>Signed out</Micro>
        <Headline size="l">Your session expired.</Headline>
        <Body size="l">
          Nothing is lost. Sign in again and the shortlist, taste and tonight{"’"}s deck are where you left them.
        </Body>
      </View>
      <View style={{ gap: t.space[2], paddingBottom: t.space[3] }}>
        <Button variant="primary" size="lg" full onPress={onSignIn}>Sign in</Button>
        <Button variant="ghost" full onPress={onOpenShortlist}>Just show my shortlist</Button>
      </View>
    </Screen>
  );
}

/** Sign-in cancelled / failed. */
export function SignInFailed({ onRetry, onUseEmail, onSkip }: { onRetry: () => void; onUseEmail?: () => void; onSkip?: () => void }) {
  const t = useTheme();
  return (
    <Screen>
      <TopRow left={<Micro>Sign in</Micro>} />
      <View style={{ flex: 1, gap: t.space[4], paddingTop: t.space[7] }}>
        <Headline>Sign-in didn’t finish.</Headline>
        <Body size="l">No harm done. Nothing was saved. Try again, or use email instead.</Body>
        <View style={{ marginTop: "auto", gap: t.space[2], paddingBottom: t.space[4] }}>
          <Button variant="primary" size="lg" full onPress={onRetry}>Try again</Button>
          <Button variant="secondary" size="lg" full onPress={onUseEmail}>Use email instead</Button>
          <Button variant="ghost" full onPress={onSkip}>Continue without an account</Button>
        </View>
      </View>
    </Screen>
  );
}

/** Country not detected — search + country rows. */
export function CountryNotDetected({ onPick }: { onPick: (country: string) => void }) {
  const t = useTheme();
  const [q, setQ] = useState("");
  const list = COUNTRIES.filter((c) => c.toLowerCase().includes(q.toLowerCase()));
  return (
    <Screen>
      <TopRow left={<Micro>Where are you?</Micro>} />
      <View style={{ paddingTop: t.space[6], gap: t.space[3] }}>
        <Headline size="l">We couldn’t tell where you’re watching from.</Headline>
        <Body size="l">Your device didn’t say. Pick a country so we only show films that actually play there.</Body>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search countries"
          placeholderTextColor={t.color.inkTertiary}
          style={[t.type.bodyL, { color: t.color.ink, backgroundColor: t.color.surface, paddingVertical: 12, paddingHorizontal: 16, borderRadius: t.radius.md, marginTop: t.space[2] }]}
        />
      </View>
      <ScrollView style={{ flex: 1, marginTop: t.space[2] }} showsVerticalScrollIndicator={false}>
        {list.map((c, i) => (
          <ListRow key={c} title={c} onPress={() => onPick(c)} last={i === list.length - 1} />
        ))}
        {list.length === 0 ? (
          <Body tone="tertiary" style={{ paddingVertical: t.space[4] }}>
            No match. We currently support 18 countries; more are coming.
          </Body>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

// ── Skeletons (Flow.jsx: Skeletons) ─────────────────────────────────────────────

/** Deck skeleton — pulsing card silhouette with the loading affordances. */
export function DeckSkeleton() {
  const t = useTheme();
  return (
    <Screen>
      <TopRow
        left={
          <View style={{ gap: 6 }}>
            <Skel w={48} h={10} />
            <Skel w={150} h={20} />
          </View>
        }
        right={<Skel w={44} h={44} r={t.radius.full} />}
      />
      <View style={{ marginTop: t.space[5], height: t.size.cardHeight }}>
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: t.size.cardHeight,
            transform: [{ translateY: 14 }, { scale: 0.94 }],
            borderRadius: t.radius.card,
            backgroundColor: t.color.surface,
          }}
        />
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: t.size.cardHeight,
            borderRadius: t.radius.card,
            backgroundColor: t.color.surfaceRaised,
            overflow: "hidden",
          }}
        >
          <View style={{ position: "absolute", left: 22, right: 22, bottom: 22, gap: 10 }}>
            <Skel w={90} h={14} bg={t.color.surfacePressed} />
            <Skel w="70%" h={30} bg={t.color.surfacePressed} />
            <Skel w={120} h={14} bg={t.color.surfacePressed} />
            <Skel w="90%" h={14} bg={t.color.surfacePressed} />
          </View>
        </View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: t.space[6] }}>
        <Skel w={130} h={32} r={t.radius.full} />
        <Skel w={100} h={32} r={t.radius.full} />
        <Skel w={96} h={32} r={t.radius.full} />
      </View>
      <Micro style={{ textAlign: "center", marginTop: t.space[4] }}>Slow connection · still loading tonight{"’"}s ten</Micro>
    </Screen>
  );
}

/** Shortlist skeleton — pulsing section labels and rows. */
export function ShortlistSkeleton() {
  const t = useTheme();
  const row = (last: boolean, i: number) => (
    <View
      key={i}
      style={{
        flexDirection: "row",
        gap: t.space[3],
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.color.hairline,
      }}
    >
      <Skel w={44} h={66} />
      <View style={{ flex: 1, gap: t.space[2] }}>
        <Skel w="60%" h={16} />
        <Skel w="40%" h={12} />
      </View>
      <Skel w={92} h={36} r={t.radius.full} />
    </View>
  );
  return (
    <Screen>
      <TopRow
        left={
          <View style={{ gap: 6 }}>
            <Skel w={48} h={10} />
            <Skel w={150} h={20} />
          </View>
        }
        right={<Skel w={44} h={44} r={t.radius.full} />}
      />
      <View style={{ marginTop: t.space[6] }}>
        <Skel w={70} h={10} />
        <View style={{ marginTop: t.space[3] }}>{[0, 1, 2].map((i) => row(false, i))}</View>
        <View style={{ marginTop: t.space[6] }}>
          <Skel w={50} h={10} />
          <View style={{ marginTop: t.space[3] }}>{[0, 1].map((i) => row(i === 1, i))}</View>
        </View>
      </View>
    </Screen>
  );
}
