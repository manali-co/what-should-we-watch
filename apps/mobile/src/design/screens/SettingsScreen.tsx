// Settings — country + streaming services, accounts, appearance, follow-up, your data.
// Ported 1:1 from the design's Screens.jsx (Settings). Appearance/reduce-motion/accounts/
// follow-up are local UI state here; the parent wires the real ones.
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Body, Headline, Screen, TopRow } from "../primitives";
import { Segmented, Switch } from "../controls";
import { ListRow, SectionLabel } from "../surfaces";
import { useTheme } from "../tokens";
import { SERVICES } from "../data";

export function SettingsScreen({ services, onToggleService, onReset, onLogout, country = "United States", faceId, onToggleFaceId, bioLabel = "Face ID", provider, appleConnected, googleConnected, email }: {
  services: string[]; onToggleService: (id: string) => void; onReset: () => void; onLogout?: () => void; country?: string;
  faceId?: boolean; onToggleFaceId?: (v: boolean) => void; bioLabel?: string; provider?: "google" | "apple" | "email";
  appleConnected?: boolean; googleConnected?: boolean; email?: string;
}) {
  const t = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [themePref, setThemePref] = useState("system");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [followUp, setFollowUp] = useState(true);
  const selectedNames = SERVICES.filter((s) => services.includes(s.id)).map((s) => s.name);

  return (
    <Screen>
      <TopRow left={<Headline size="m">Settings</Headline>} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: t.space[9] }} showsVerticalScrollIndicator={false}>
        <SectionLabel>Where and what</SectionLabel>
        <ListRow title="Country" value={country} chevron onPress={() => {}} />
        <ListRow
          title="Streaming services"
          subtitle={selectedNames.join(", ") || "None yet"}
          value={String(selectedNames.length)}
          chevron
          onPress={() => setExpanded((x) => !x)}
          last={!expanded}
        />
        {expanded
          ? SERVICES.map((s, i) => (
              <ListRow
                key={s.id}
                title={s.name}
                subtitle={s.detected ? "Detected on this phone" : undefined}
                trailing={<Switch checked={services.includes(s.id)} onChange={() => onToggleService(s.id)} />}
                last={i === SERVICES.length - 1}
              />
            ))
          : null}

        <SectionLabel>Accounts</SectionLabel>
        {email ? <ListRow title="Signed in as" subtitle={email} value={provider === "google" ? "Google" : provider === "apple" ? "Apple" : "Email"} /> : null}
        <ListRow title="Apple" value={appleConnected ? "Connected" : undefined} trailing={appleConnected ? null : <Text style={[t.type.caption, { color: t.color.inkTertiary }]}>Not connected</Text>} />
        <ListRow title="Google" value={googleConnected ? "Connected" : undefined} trailing={googleConnected ? null : <Text style={[t.type.caption, { color: t.color.inkTertiary }]}>Not connected</Text>} last />

        <SectionLabel>Appearance</SectionLabel>
        <View style={{ paddingTop: 6, paddingBottom: 14 }}>
          <Segmented
            options={[{ value: "system", label: "System" }, { value: "dark", label: "Dark" }, { value: "light", label: "Light" }]}
            value={themePref}
            onChange={setThemePref}
          />
        </View>
        <ListRow title="Reduce motion" subtitle="Follows the system setting; override here" trailing={<Switch checked={reducedMotion} onChange={setReducedMotion} />} last />

        {onToggleFaceId ? (
          <>
            <SectionLabel>Security</SectionLabel>
            <ListRow title={`Unlock with ${bioLabel}`} subtitle="Ask for it each time you open the app" trailing={<Switch checked={!!faceId} onChange={onToggleFaceId} />} last />
          </>
        ) : null}

        <SectionLabel>Follow-up</SectionLabel>
        <ListRow title="Ask how it went" subtitle="The morning after you tap Watch now" trailing={<Switch checked={followUp} onChange={setFollowUp} />} />
        <ListRow title="Around" value="10:00" chevron onPress={() => {}} last />

        <SectionLabel>Your data</SectionLabel>
        <ListRow title="Taste" subtitle="What we’ve learned, in plain words" chevron onPress={() => {}} />
        <ListRow title="Export my data" subtitle="Every decision as a file you own" chevron onPress={() => {}} />
        <ListRow title="Reset what we’ve learned" onPress={onReset} />
        {onLogout ? <ListRow title="Log out" onPress={onLogout} /> : null}
        <ListRow title="Delete account" destructive onPress={() => {}} last />

        <Body tone="tertiary" style={[t.type.caption, { marginTop: t.space[6] }]}>What Should We Watch 0.1.0 · Availability data is checked nightly for your country.</Body>
      </ScrollView>
    </Screen>
  );
}
