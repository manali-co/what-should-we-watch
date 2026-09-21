// Orchestrates the Tonight loop with real data:
// Mood selector -> Thinking -> Deck (first-time tutorial layered on top) -> End, with empty/error states.
import { useEffect, useState } from "react";
import { fetchDeck, recordDecision } from "../../api";
import type { Film } from "../../films";
import { serviceLabel } from "../../films";
import { hueOf } from "../data";
import { currentGreeting } from "../greeting";
import type { MoodHue } from "../tokens";
import { MoodScreen } from "./MoodScreen";
import { ThinkingScreen } from "./ThinkingScreen";
import { DeckScreen } from "./DeckScreen";
import { EndScreen } from "./EndScreen";
import { EmptyDeck, ApiDown } from "./EdgeStates";

const COMPANY: Record<string, string> = { me: "solo", two: "couple", group: "friends" };

type Phase = "mood" | "thinking" | "deck" | "end" | "empty" | "error";

export function TonightFlow({
  services, onKeep, onDecided, onOpenSettings, onOpenShortlist, firstTime, userInitial, userName, onTutorialSeen,
}: {
  services: string[]; onKeep: (films: Film[]) => void; onDecided?: () => void; onOpenSettings: () => void;
  onOpenShortlist: () => void; firstTime?: boolean; userInitial?: string; userName?: string; onTutorialSeen?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("mood");
  const [moods, setMoods] = useState<string[]>([]);
  const [films, setFilms] = useState<Film[]>([]);
  const [kept, setKept] = useState<Film[]>([]);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [thinkingDone, setThinkingDone] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const hues: MoodHue[] = moods.map((w) => hueOf(w));
  const serviceNames = services.map(serviceLabel);

  const deal = async (picked: string[], who: string) => {
    setMoods(picked);
    setFilms([]);
    setFailed(false);
    setThinkingDone(false);
    setPending(true);
    setPhase("thinking");
    try {
      const deck = await fetchDeck({ services, moods: picked, company: COMPANY[who] ?? "solo" });
      setFilms(deck);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  // Advance once BOTH the thinking animation and the fetch have finished (no stale closures).
  useEffect(() => {
    if (phase !== "thinking" || !thinkingDone || pending) return;
    if (failed) setPhase("error");
    else if (!films.length) setPhase("empty");
    else { setShowTutorial(!!firstTime); setPhase("deck"); }
  }, [phase, thinkingDone, pending, failed, films, firstTime]);

  const onDecision = (film: Film, action: "like" | "dislike" | "maybe" | "watched", reaction?: "loved" | "okay" | "disliked") => {
    onDecided?.();
    if (action === "like" || action === "maybe") onKeep([film]); // land in the shortlist immediately
    void recordDecision({ titleId: film.id, title: film.title, action, reaction, moods });
  };

  if (phase === "mood")
    return (
      <MoodScreen
        onDeal={(picked, who) => deal(picked, who)}
        onOpenSettings={onOpenSettings}
        onOpenProfile={onOpenSettings}
        userInitial={userInitial}
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
    return <EndScreen kept={kept} onOpenShortlist={() => { onOpenShortlist(); setPhase("mood"); }} onAgain={() => setPhase("mood")} />;

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
