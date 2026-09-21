import { ScrollView, StyleSheet, Text, View } from "react-native";
import { theme } from "./theme";

export function Taste({ decisions }: { decisions: number }) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.kicker}>What Should We Watch</Text>
      <Text style={styles.h1}>Your taste</Text>
      <View style={styles.note}>
        <Text style={styles.noteText}>
          {decisions < 5
            ? "After a few decks, this fills in with what the app has worked out about you, in plain sentences."
            : "You lean toward warm, funny films on weeknights, and reach for slower, heavier ones at the weekend. You keep about half of what you're shown."}
        </Text>
      </View>
      <Text style={styles.h2}>Patterns</Text>
      <Text style={styles.body}>
        {decisions < 5
          ? "Patterns by time of day, weekday and season show up here once you've made a few choices."
          : `${decisions} decisions so far. Evenings skew comfort; weekends skew ambition.`}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 20, paddingHorizontal: 22, paddingBottom: 120 },
  kicker: { color: theme.muted, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" },
  h1: { color: theme.ink, fontSize: 44, fontWeight: "800", letterSpacing: -1, marginTop: 8, marginBottom: 12 },
  note: { borderLeftWidth: 3, borderLeftColor: theme.moodHues[0], paddingLeft: 14, paddingVertical: 4 },
  noteText: { color: theme.ink, fontSize: 16, lineHeight: 23 },
  h2: { color: theme.ink, fontSize: 20, fontWeight: "700", marginTop: 28, marginBottom: 8 },
  body: { color: theme.muted, fontSize: 15, lineHeight: 22 },
});
