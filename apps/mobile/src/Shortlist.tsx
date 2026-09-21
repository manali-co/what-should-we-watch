import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Film } from "./films";
import { theme } from "./theme";

export function Shortlist({ films, onRemove }: { films: Film[]; onRemove: (id: string) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.kicker}>What Should We Watch</Text>
      <Text style={styles.h1}>Shortlist</Text>
      {films.length === 0 ? (
        <Text style={styles.empty}>Nothing here yet. Swipe right or up on a film and it lands here.</Text>
      ) : (
        films.map((f) => (
          <View key={f.id} style={styles.card}>
            <Text style={styles.title}>
              {f.title} <Text style={styles.year}>({f.year})</Text>
            </Text>
            <Text style={styles.meta}>{f.runtimeMin} min · on {f.service}</Text>
            <Text style={styles.why}>{f.why}</Text>
            <View style={styles.row}>
              <Pressable style={styles.watch}>
                <Text style={styles.watchText}>Watch now on {f.service}</Text>
              </Pressable>
              <Pressable style={styles.remove} onPress={() => onRemove(f.id)}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 20, paddingHorizontal: 22, paddingBottom: 120 },
  kicker: { color: theme.muted, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" },
  h1: { color: theme.ink, fontSize: 44, fontWeight: "800", letterSpacing: -1, marginTop: 8, marginBottom: 12 },
  empty: { color: theme.muted, fontSize: 16, marginTop: 20, lineHeight: 22 },
  card: { backgroundColor: theme.surface, borderRadius: 18, padding: 16, marginTop: 12 },
  title: { color: theme.ink, fontSize: 19, fontWeight: "700" },
  year: { color: theme.muted, fontWeight: "400" },
  meta: { color: theme.muted, fontSize: 13, marginTop: 4 },
  why: { color: theme.ink, fontSize: 14, marginTop: 8, lineHeight: 20, opacity: 0.9 },
  row: { flexDirection: "row", gap: 8, marginTop: 14, alignItems: "center" },
  watch: { backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 16 },
  watchText: { color: theme.bg, fontWeight: "700", fontSize: 14 },
  remove: { borderWidth: 1, borderColor: theme.line, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 16 },
  removeText: { color: theme.muted, fontSize: 14 },
});
