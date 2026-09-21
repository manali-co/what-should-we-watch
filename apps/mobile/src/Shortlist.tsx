import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Film, serviceLabel } from "./films";
import { font, theme } from "./theme";

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
            {f.posterUrl ? <Image source={{ uri: f.posterUrl }} style={styles.poster} /> : <View style={styles.poster} />}
            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={1}>{f.title}</Text>
              <Text style={styles.meta}>
                {[f.year, f.runtimeMin ? `${f.runtimeMin} min` : null, `on ${serviceLabel(f.service)}`].filter(Boolean).join(" · ")}
              </Text>
              <View style={styles.row}>
                <Pressable style={styles.watch} onPress={() => f.link && Linking.openURL(f.link)}>
                  <Text style={styles.watchText}>Watch now</Text>
                </Pressable>
                <Pressable style={styles.remove} onPress={() => onRemove(f.id)}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 20, paddingHorizontal: 22, paddingBottom: 120 },
  kicker: { color: theme.muted, fontFamily: font.bodyMed, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" },
  h1: { color: theme.ink, fontFamily: font.display, fontSize: 44, letterSpacing: -1, marginTop: 8, marginBottom: 12 },
  empty: { color: theme.muted, fontFamily: font.body, fontSize: 16, marginTop: 20, lineHeight: 22 },
  card: { flexDirection: "row", backgroundColor: theme.surface, borderRadius: 16, padding: 12, marginTop: 12, gap: 12 },
  poster: { width: 66, height: 96, borderRadius: 10, backgroundColor: theme.surface2 },
  body: { flex: 1, justifyContent: "center" },
  title: { color: theme.ink, fontFamily: font.bodySemi, fontSize: 17 },
  meta: { color: theme.muted, fontFamily: font.body, fontSize: 13, marginTop: 4 },
  row: { flexDirection: "row", gap: 8, marginTop: 12 },
  watch: { backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 15 },
  watchText: { color: theme.bg, fontFamily: font.bodySemi, fontSize: 13 },
  remove: { borderWidth: 1, borderColor: theme.line, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 15 },
  removeText: { color: theme.muted, fontFamily: font.body, fontSize: 13 },
});
