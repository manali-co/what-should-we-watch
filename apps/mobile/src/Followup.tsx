import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { font, theme } from "./theme";

type Reaction = "loved" | "okay" | "disliked";

export function Followup({
  film, onAnswer,
}: {
  film: { title: string };
  onAnswer: (answer: "watched" | "no" | "started", reaction?: Reaction) => void;
}) {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.body}>
        <Text style={styles.kicker}>Since last time</Text>
        <Text style={styles.h1}>Did you watch{"\n"}{film.title}?</Text>

        {!showReactions && (
          <View style={styles.choices}>
            <Pressable style={styles.choice} onPress={() => setShowReactions(true)}>
              <Text style={styles.choiceText}>Yes, I watched it</Text>
            </Pressable>
            <Pressable style={styles.choice} onPress={() => onAnswer("no")}>
              <Text style={styles.choiceText}>Not yet</Text>
            </Pressable>
            <Pressable style={styles.choice} onPress={() => onAnswer("started")}>
              <Text style={styles.choiceText}>I started it</Text>
            </Pressable>
          </View>
        )}

        {showReactions && (
          <>
            <Text style={styles.section}>How was it?</Text>
            <View style={styles.reactions}>
              <Pressable style={[styles.reaction, { borderColor: theme.yes }]}
                onPress={() => onAnswer("watched", "loved")}>
                <Text style={[styles.reactionText, { color: theme.yes }]}>Loved it</Text>
              </Pressable>
              <Pressable style={[styles.reaction, { borderColor: theme.muted }]}
                onPress={() => onAnswer("watched", "okay")}>
                <Text style={[styles.reactionText, { color: theme.muted }]}>It was okay</Text>
              </Pressable>
              <Pressable style={[styles.reaction, { borderColor: theme.no }]}
                onPress={() => onAnswer("watched", "disliked")}>
                <Text style={[styles.reactionText, { color: theme.no }]}>Not for me</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  body: { flex: 1, paddingTop: 40, paddingHorizontal: 24, paddingBottom: 40, justifyContent: "center" },
  kicker: { color: theme.muted, fontFamily: font.bodyMed, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" },
  h1: { color: theme.ink, fontFamily: font.display, fontSize: 40, letterSpacing: -1.5, lineHeight: 44, marginTop: 10 },
  choices: { gap: 12, marginTop: 32 },
  choice: { backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.line, borderRadius: 999, paddingVertical: 17, alignItems: "center" },
  choiceText: { color: theme.ink, fontFamily: font.bodySemi, fontSize: 17 },
  section: { color: theme.ink, fontFamily: font.bodySemi, fontSize: 16, marginTop: 32, marginBottom: 12 },
  reactions: { gap: 12 },
  reaction: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 16, alignItems: "center" },
  reactionText: { fontFamily: font.bodySemi, fontSize: 16 },
});
