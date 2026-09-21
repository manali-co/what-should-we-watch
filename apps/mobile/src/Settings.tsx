import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ALL_SERVICES } from "./Onboarding";
import { serviceLabel } from "./films";
import { font, theme } from "./theme";

export function Settings({
  services, onToggleService, onReset,
}: { services: string[]; onToggleService: (s: string) => void; onReset: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.kicker}>What Should We Watch</Text>
      <Text style={styles.h1}>Settings</Text>

      <Text style={styles.section}>Country</Text>
      <View style={styles.row}><Text style={styles.rowText}>United States</Text></View>

      <Text style={styles.section}>Your services</Text>
      <View style={styles.grid}>
        {ALL_SERVICES.map((s) => {
          const on = services.includes(s);
          return (
            <Pressable key={s} onPress={() => onToggleService(s)}
              style={[styles.svc, { borderColor: on ? theme.lagoon : theme.line, backgroundColor: on ? theme.lagoon : "transparent" }]}>
              <Text style={[styles.svcText, { color: on ? "#16171D" : theme.ink }]}>{serviceLabel(s)}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>Account</Text>
      <View style={styles.row}><Text style={styles.rowMuted}>Sign-in arrives with the real Apple and Google accounts.</Text></View>

      <Text style={styles.section}>Data</Text>
      <Pressable style={styles.danger} onPress={onReset}>
        <Text style={styles.dangerText}>Reset this device</Text>
      </Pressable>
      <Text style={styles.attribution}>Streaming data by JustWatch. Not endorsed by any streaming service.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 20, paddingHorizontal: 22, paddingBottom: 120 },
  kicker: { color: theme.muted, fontFamily: font.bodyMed, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" },
  h1: { color: theme.ink, fontFamily: font.display, fontSize: 44, letterSpacing: -1, marginTop: 8, marginBottom: 8 },
  section: { color: theme.ink, fontFamily: font.bodySemi, fontSize: 16, marginTop: 26, marginBottom: 10 },
  row: { backgroundColor: theme.surface, borderRadius: 14, padding: 16 },
  rowText: { color: theme.ink, fontFamily: font.bodyMed, fontSize: 16 },
  rowMuted: { color: theme.muted, fontFamily: font.body, fontSize: 14, lineHeight: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  svc: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 15 },
  svcText: { fontFamily: font.bodyMed, fontSize: 14.5 },
  danger: { borderWidth: 1.5, borderColor: theme.no, borderRadius: 14, padding: 16, alignItems: "center" },
  dangerText: { color: theme.no, fontFamily: font.bodySemi, fontSize: 15 },
  attribution: { color: theme.muted, fontFamily: font.body, fontSize: 12, marginTop: 28, lineHeight: 18 },
});
