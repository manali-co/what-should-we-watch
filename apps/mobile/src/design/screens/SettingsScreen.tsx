// Settings — reachable as a guest; account-only rows open the sign-in Gate instead of acting.
// Ported 1:1 from the design's Settings (Screens.jsx). The gated Sync / Group / Face-ID
// switches and the guest banner are the gentle guest→member conversion surface.
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Avatar, Body, Headline, Screen, TopRow } from "../primitives";
import { Button, Segmented, Switch } from "../controls";
import { ListRow, SectionLabel } from "../surfaces";
import { useTheme } from "../tokens";
import { SERVICES } from "../data";
import type { GateFeature } from "./GateSheet";

type Provider = "google" | "apple" | "email";

export function SettingsScreen({
  isGuest = false,
  services, onToggleService, onReset,
  onOpenAccount, onSignIn, onGate, onExport, onLogout, onReplayTutorial,
  country = "United States", provider, email, displayName,
}: {
  isGuest?: boolean;
  services: string[]; onToggleService: (id: string) => void; onReset: () => void;
  onOpenAccount: () => void; onSignIn: () => void; onGate: (f: GateFeature) => void;
  onExport?: () => void; onLogout?: () => void; onReplayTutorial?: () => void;
  country?: string; provider?: Provider; email?: string; displayName?: string;
}) {
  const t = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [themePref, setThemePref] = useState("system");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [followUp, setFollowUp] = useState(true);
  const [sync, setSync] = useState(true);
  const [group, setGroup] = useState(false);
  const [faceId, setFaceId] = useState(false);
  const selectedNames = SERVICES.filter((s) => services.includes(s.id)).map((s) => s.name);

  // A member acts; a guest is nudged to the Gate. Never blocks the core loop.
  const member = !isGuest;
  const gateOr = (f: GateFeature, act: () => void) => () => (member ? act() : onGate(f));
  const initial = (displayName || "Y")[0]?.toUpperCase() ?? "Y";

  return (
    <Screen>
      <TopRow
        left={<Headline size="m">Settings</Headline>}
        right={isGuest ? <Button size="sm" onPress={onSignIn}>Sign in</Button> : undefined}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: t.space[9] }} showsVerticalScrollIndicator={false}>
        {isGuest ? (
          <View style={{ marginTop: t.space[4], padding: 16, borderRadius: t.radius.md, backgroundColor: t.color.surface, gap: 6 }}>
            <Text style={[t.type.label, { color: t.color.ink }]}>You’re a guest.</Text>
            <Body style={t.type.caption}>Everything works on this phone. Sign in to decide with friends, keep your taste on a new phone, or export it.</Body>
          </View>
        ) : null}

        <SectionLabel>Account</SectionLabel>
        <ListRow
          title={member && displayName ? displayName : "Account"}
          subtitle={member ? `${email || "you@example.com"}${provider === "google" ? " · Google" : provider === "apple" ? " · Apple" : ""}` : "Name, email, connected services"}
          leading={member ? <Avatar person={{ name: displayName || "You", initial }} size={36} /> : undefined}
          chevron
          onPress={gateOr("account", onOpenAccount)}
        />
        <ListRow title="Sync across devices" subtitle={member ? "On · your taste follows you" : "Sign in to turn on"} trailing={<Switch checked={member && sync} onChange={(v) => (member ? setSync(v) : onGate("sync"))} />} />
        <ListRow title="Group mode" subtitle="Decide with up to six people" trailing={<Switch checked={member && group} onChange={(v) => (member ? setGroup(v) : onGate("group"))} />} />
        <ListRow title="Lock with Face ID" subtitle="Ask for Face ID when the app opens" trailing={<Switch checked={member && faceId} onChange={(v) => (member ? setFaceId(v) : onGate("faceid"))} />} last />

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

        <SectionLabel>Appearance</SectionLabel>
        <View style={{ paddingTop: 6, paddingBottom: 14 }}>
          <Segmented
            options={[{ value: "system", label: "System" }, { value: "dark", label: "Dark" }, { value: "light", label: "Light" }]}
            value={themePref}
            onChange={setThemePref}
          />
        </View>
        <ListRow title="Reduce motion" subtitle="Follows the system setting; override here" trailing={<Switch checked={reducedMotion} onChange={setReducedMotion} />} last />

        <SectionLabel>Follow-up</SectionLabel>
        <ListRow title="Ask how it went" subtitle="The morning after you tap Watch now" trailing={<Switch checked={followUp} onChange={setFollowUp} />} />
        <ListRow title="Around" value="10:00" chevron onPress={() => {}} last />

        {onReplayTutorial ? (
          <>
            <SectionLabel>Help</SectionLabel>
            <ListRow title="How swiping works" subtitle="Replay the four swipes and tap-for-trailer" chevron onPress={onReplayTutorial} last />
          </>
        ) : null}

        <SectionLabel>Your data</SectionLabel>
        <ListRow title="Taste" subtitle="What we’ve learned, in plain words" chevron onPress={() => {}} />
        <ListRow title="Export my data" subtitle="Every decision as a file you own" chevron onPress={gateOr("export", () => onExport?.())} />
        <ListRow title="Reset what we’ve learned" subtitle="Clears decisions and taste on this phone" onPress={onReset} />
        {member && onLogout ? <ListRow title="Log out" onPress={onLogout} /> : null}
        <ListRow title="Delete account" destructive onPress={gateOr("delete", onOpenAccount)} last />

        <Body tone="tertiary" style={[t.type.caption, { marginTop: t.space[6] }]}>What Should We Watch 0.1.0 · Availability data is checked nightly for your country.</Body>
      </ScrollView>
    </Screen>
  );
}
