// Orchestrates the Tonight loop with real data:
// Mood selector -> Thinking -> Deck (first-time tutorial layered on top) -> End, with empty/error states.
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { fetchDeck, fetchTaste, moment, recordDecision } from "../../api";
import type { Film } from "../../films";
import { serviceLabel } from "../../films";
import { countryCode, hueOf } from "../data";
import { currentGreeting } from "../greeting";
import type { MoodHue } from "../tokens";
import type { AvatarConfig } from "../DiscAvatar";
import { MoodScreen } from "./MoodScreen";
import { PredictedMoodScreen } from "./PredictedMoodScreen";
import { QuickRecsScreen } from "./QuickRecsScreen";
import { ThinkingScreen } from "./ThinkingScreen";
import { DeckScreen } from "./DeckScreen";
import { EndScreen } from "./EndScreen";
import { EmptyDeck, ApiDown } from "./EdgeStates";

const COMPANY: Record<string, string> = { me: "solo", two: "couple", group: "friends" };
// Show the predicted-mood fast path only once there's real signal to predict from — otherwise
// it's a guess dressed as confidence. Below this, returning users go straight to the picker
// (the design's cold-start gate).
const PREDICT_MIN_DECISIONS = 5;

type Phase = "predict" | "quick" | "mood" | "thinking" | "deck" | "end" | "empty" | "error";
type Prediction = { moods: string[]; films: Film[]; because?: string };

export function TonightFlow({
  services, seenIds, onKeep, onDecided, onOpenSettings, onOpenShortlist, onImmersive, firstTime, tutorialUnseen, userInitial, userName, avatar, onOpenAvatar, onTutorialSeen, country,
}: {
  services: string[]; seenIds?: string[]; onKeep: (films: Film[]) => void; onDecided?: (filmId: string) => void; onOpenSettings: () => void;
  onOpenShortlist: () => void; onImmersive?: (immersive: boolean) => void; firstTime?: boolean; tutorialUnseen?: boolean; userInitial?: string; userName?: string; avatar?: AvatarConfig | null; onOpenAvatar?: () => void; onTutorialSeen?: () => void; country?: string;
}) {
  // Returning users open on a prediction (fetched below); first-timers go straight to the picker.
  const [phase, setPhase] = useState<Phase>(firstTime ? "mood" : "predict");
  const [moods, setMoods] = useState<string[]>([]);
  const [company, setCompany] = useState("solo");
  const [films, setFilms] = useState<Film[]>([]);
  const [kept, setKept] = useState<Film[]>([]);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [thinkingDone, setThinkingDone] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);

  const hues: MoodHue[] = moods.map((w) => hueOf(w));
  const serviceNames = services.map(serviceLabel);

  // The deck + thinking screens are immersive (full-screen, no tab bar) like the design;
  // the mood/end/edge screens are not. Tell the shell so it can hide/show the tab bar.
  useEffect(() => {
    onImmersive?.(phase === "thinking" || phase === "deck");
    return () => onImmersive?.(false);
  }, [phase, onImmersive]);

  const deal = async (picked: string[], who: string) => {
    setMoods(picked);
    setCompany(COMPANY[who] ?? "solo");
    setFilms([]);
    setFailed(false);
    setThinkingDone(false);
    setPending(true);
    setPhase("thinking");
    try {
      const deck = await fetchDeck({ services, moods: picked, company: COMPANY[who] ?? "solo", country: countryCode(country) });
      // Never re-show a film already decided on (belt-and-braces over server-side exclusion).
      const seen = new Set(seenIds ?? []);
      setFilms(deck.filter((f) => !seen.has(f.id)));
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  // Deal a deck we've ALREADY fetched (from the prediction) — reuse it instead of re-fetching,
  // so accepting a prediction still shows the thinking beat but doesn't hit the API twice.
  const dealWithDeck = (picked: string[], deck: Film[]) => {
    setMoods(picked);
    setCompany("solo");
    setFailed(false);
    setThinkingDone(false);
    const seen = new Set(seenIds ?? []);
    setFilms(deck.filter((f) => !seen.has(f.id)));
    setPending(false);
    setPhase("thinking");
  };

  // Predicted-mood fast path: on entering "predict", read the viewer's real taste and, if
  // there's enough signal, open on a guess with ready picks. Uses existing endpoints only
  // (/taste top moods + a normal deck fetch) — no new/changed intelligence. Any thin signal,
  // error, or timeout falls back to the mood picker, so it never degrades the experience.
  useEffect(() => {
    if (phase !== "predict" || prediction) return;
    let alive = true;
    (async () => {
      try {
        const taste = await fetchTaste();
        const picks = taste.topMoods.slice(0, 2);
        if (!alive) return;
        if (taste.total < PREDICT_MIN_DECISIONS || picks.length === 0) { setPhase("mood"); return; }
        const deck = await fetchDeck({ services, moods: picks, company: "solo", country: countryCode(country) });
        if (!alive) return;
        const seen = new Set(seenIds ?? []);
        const fresh = deck.filter((f) => !seen.has(f.id));
        if (fresh.length < 3) { setPhase("mood"); return; } // not enough to feel confident
        const p = taste.patterns[0];
        const because = p
          ? `${p.signal} — you lean ${p.moods.slice(0, 2).join(" and ")}.`
          : `You've been saying yes to ${picks.join(" and ")} lately.`;
        setPrediction({ moods: picks, films: fresh, because });
      } catch {
        if (alive) setPhase("mood");
      }
    })();
    return () => { alive = false; };
  }, [phase, prediction, services, country, seenIds]);

  // Advance once BOTH the thinking animation and the fetch have finished (no stale closures).
  useEffect(() => {
    if (phase !== "thinking" || !thinkingDone || pending) return;
    if (failed) setPhase("error");
    else if (!films.length) setPhase("empty");
    else { setShowTutorial(!!tutorialUnseen); setPhase("deck"); }
  }, [phase, thinkingDone, pending, failed, films, tutorialUnseen]);

  const onDecision = (film: Film, action: "like" | "dislike" | "maybe" | "watched", reaction?: "loved" | "okay" | "disliked") => {
    onDecided?.(film.id);
    if (action === "like" || action === "maybe") onKeep([film]); // land in the shortlist immediately
    void recordDecision({ titleId: film.id, title: film.title, action, reaction, moods });
  };

  if (phase === "predict")
    return prediction ? (
      <PredictedMoodScreen
        moods={prediction.moods}
        because={prediction.because}
        films={prediction.films}
        context={`${moment().weekday} · ${moment().season}`}
        avatar={avatar}
        userInitial={userInitial}
        onOpenAvatar={onOpenAvatar}
        onOpenSettings={onOpenSettings}
        onAccept={() => dealWithDeck(prediction.moods, prediction.films)}
        onPreview={() => setPhase("quick")}
        onPickMyself={() => setPhase("mood")}
      />
    ) : (
      <View style={styles.loading}><ActivityIndicator color="#8A8A8E" /></View>
    );

  if (phase === "quick" && prediction)
    return (
      <QuickRecsScreen
        films={prediction.films.slice(0, 3)}
        moods={prediction.moods}
        onBack={() => setPhase("predict")}
        onSeeDeck={() => dealWithDeck(prediction.moods, prediction.films)}
        onPickMyself={() => setPhase("mood")}
        onWatch={(f) => { onKeep([f]); onOpenShortlist(); }}
      />
    );

  if (phase === "mood")
    return (
      <MoodScreen
        onDeal={(picked, who) => deal(picked, who)}
        onOpenSettings={onOpenSettings}
        onOpenProfile={onOpenAvatar ?? onOpenSettings}
        userInitial={userInitial}
        avatar={avatar}
        greeting={currentGreeting(userName, !!firstTime)}
      />
    );

  if (phase === "thinking")
    return <ThinkingScreen words={moods} hues={hues} services={serviceNames} films={films} onCancel={() => setPhase("mood")} onDone={() => setThinkingDone(true)} />;

  if (phase === "empty")
    return <EmptyDeck moods={moods} services={serviceNames} onChangeMoods={() => setPhase("mood")} onBroaden={onOpenSettings} />;

  if (phase === "error")
    return <ApiDown onRetry={() => deal(moods, "me")} onOpenShortlist={onOpenShortlist} />;

  if (phase === "end")
    return <EndScreen kept={kept} moods={moods} company={company} onOpenShortlist={() => { onOpenShortlist(); setPhase("mood"); }} onAgain={() => setPhase("mood")} />;

  return (
    <DeckScreen
      films={films}
      moods={moods}
      onDecision={onDecision}
      onDone={(k) => { setKept(k); onKeep(k); setPhase("end"); }}
      onBack={() => setPhase("mood")}
      firstTime={showTutorial}
      onSeenTutorial={() => { setShowTutorial(false); onTutorialSeen?.(); }}
    />
  );
}

// Transparent so the shell's themed background shows through while the prediction loads.
const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
