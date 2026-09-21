// Account — edit display name, email, connected providers, export, log out, delete account.
// Ported 1:1 from the design's Account.jsx. Logout and delete run real Clerk actions
// (delete is an App Store requirement for account-based apps). Export shares the local
// decision data; a full server-side export is a follow-up.
import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { Avatar, Body, Headline, Micro, Screen, TopRow } from "../primitives";
import { Button, Pill, PillRow } from "../controls";
import { ListRow, SectionLabel } from "../surfaces";
import { Sheet } from "../sheet";
import { useTheme } from "../tokens";

type Provider = "google" | "apple" | "email";

export function AccountScreen({
  name: initialName, email, provider, appleConnected, googleConnected, memberSince, decisionCount = 0,
  onBack, onSaveName, onLogout, onDelete, onExport,
}: {
  name: string; email?: string; provider: Provider; appleConnected?: boolean; googleConnected?: boolean; memberSince?: string; decisionCount?: number;
  onBack: () => void;
  onSaveName: (name: string) => void;
  onLogout: () => void;
  onDelete: () => void;
  onExport?: () => void;
}) {
  const t = useTheme();
  const [name, setName] = useState(initialName || "");
  const dirty = name.trim() !== (initialName || "");
  const [sheet, setSheet] = useState<null | "logout" | "delete" | "export">(null);
  const [deleteTyped, setDeleteTyped] = useState("");
  const [exportStep, setExportStep] = useState(0);
  const close = () => { setSheet(null); setExportStep(0); setDeleteTyped(""); };

  useEffect(() => {
    if (sheet !== "export" || exportStep !== 1) return;
    const id = setTimeout(() => setExportStep(2), 1800);
    return () => clearTimeout(id);
  }, [sheet, exportStep]);

  const checkmark = <Text style={[t.type.label, { color: t.color.ink }]}>✓</Text>;
  const displayEmail = email || "you@example.com";

  return (
    <Screen>
      <TopRow
        left={<Button variant="ghost" size="sm" onPress={onBack}>Settings</Button>}
        right={dirty ? <Button size="sm" onPress={() => onSaveName(name.trim())}>Save</Button> : undefined}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: t.space[9] }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: t.space[4], flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avatar person={{ name: name || "You", initial: (name || "Y")[0].toUpperCase() }} size={56} />
          <View style={{ flex: 1, gap: 4 }}>
            <Micro>Display name</Micro>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={24}
              placeholder="Your name"
              placeholderTextColor={t.color.inkTertiary}
              style={[t.type.displayM, { color: t.color.ink, borderBottomWidth: 1, borderBottomColor: t.color.hairlineStrong, paddingVertical: 6 }]}
            />
            <Body tone="tertiary" style={t.type.caption}>How friends see your picks in group mode.</Body>
          </View>
        </View>

        <SectionLabel>Email</SectionLabel>
        <ListRow title={displayEmail} subtitle="Used for codes and the export link" last />

        <SectionLabel>Connected</SectionLabel>
        <ListRow title="Apple" subtitle={appleConnected ? "Connected" : "Sign in with Apple"} trailing={appleConnected ? checkmark : <Text style={[t.type.caption, { color: t.color.inkTertiary }]}>Not connected</Text>} />
        <ListRow title="Google" subtitle={googleConnected ? "Connected" : "Not connected"} trailing={googleConnected ? checkmark : <Text style={[t.type.caption, { color: t.color.inkTertiary }]}>Not connected</Text>} />
        <ListRow title="Email code" subtitle={provider === "email" ? "Connected" : "Always available"} trailing={checkmark} last />

        <SectionLabel>Your data</SectionLabel>
        <ListRow title="Export my data" subtitle="Every decision as a file you own" chevron onPress={() => { setExportStep(0); setSheet("export"); }} />
        <ListRow title="Log out" subtitle="Your shortlist stays on this phone" onPress={() => setSheet("logout")} />
        <ListRow title="Delete account" destructive onPress={() => { setDeleteTyped(""); setSheet("delete"); }} last />

        {memberSince ? <Body tone="tertiary" style={[t.type.caption, { marginTop: t.space[6] }]}>Member since {memberSince} · {decisionCount} decision{decisionCount === 1 ? "" : "s"}</Body> : null}
      </ScrollView>

      {/* Log out */}
      <Sheet open={sheet === "logout"} title="Log out?" onClose={close}>
        <Body>Your shortlist and what we’ve learned stay on this phone. Sign back in any time and they merge with your account.</Body>
        <View style={{ gap: t.space[2], marginTop: t.space[4] }}>
          <Button variant="primary" size="lg" full onPress={() => { close(); onLogout(); }}>Log out</Button>
          <Button variant="ghost" full onPress={close}>Cancel</Button>
        </View>
      </Sheet>

      {/* Delete account (type DELETE) */}
      <Sheet open={sheet === "delete"} title="Delete your account?" onClose={close}>
        <Body>This removes your account, taste, shortlist and every decision from our servers. It can’t be undone. If you might come back, log out instead.</Body>
        <Body tone="tertiary" style={[t.type.caption, { marginTop: t.space[2] }]}>Type DELETE to confirm.</Body>
        <TextInput
          value={deleteTyped}
          onChangeText={setDeleteTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="DELETE"
          placeholderTextColor={t.color.inkTertiary}
          style={[t.type.title, { color: t.color.ink, borderBottomWidth: 1, borderBottomColor: t.color.hairlineStrong, paddingVertical: 8, marginTop: 4, letterSpacing: 2 }]}
        />
        <View style={{ gap: t.space[2], marginTop: t.space[4] }}>
          <Button variant="no" size="lg" full disabled={deleteTyped !== "DELETE"} onPress={() => { close(); onDelete(); }}>Delete everything</Button>
          <Button variant="ghost" full onPress={close}>Keep my account</Button>
        </View>
      </Sheet>

      {/* Export (confirm → progress → done) */}
      <Sheet open={sheet === "export"} title={exportStep === 2 ? "Your file is ready." : "Export my data"} onClose={close}>
        {exportStep === 0 ? (
          <>
            <Body>One file with every swipe, reaction, and mood you picked, with dates. No poster art (it isn’t ours to give).</Body>
            <PillRow style={{ marginTop: t.space[3] }}>
              <Pill size="sm" selected>{decisionCount} decisions</Pill>
              <Pill size="sm" selected>taste notes</Pill>
            </PillRow>
            <View style={{ gap: t.space[2], marginTop: t.space[4] }}>
              <Button variant="primary" size="lg" full onPress={() => setExportStep(1)}>Prepare file</Button>
              <Button variant="ghost" full onPress={close}>Cancel</Button>
            </View>
          </>
        ) : exportStep === 1 ? (
          <>
            <Body>Gathering everything… about ten seconds.</Body>
            <View style={{ height: 4, borderRadius: t.radius.full, backgroundColor: t.color.surfaceRaised, marginTop: t.space[4], overflow: "hidden" }}>
              <View style={{ height: "100%", width: "62%", borderRadius: t.radius.full, backgroundColor: t.color.ink }} />
            </View>
            <Button variant="ghost" full style={{ marginTop: t.space[4] }} onPress={close}>Cancel</Button>
          </>
        ) : (
          <>
            <Body>Your decisions are ready to save or share.</Body>
            <View style={{ gap: t.space[2], marginTop: t.space[4] }}>
              <Button variant="primary" size="lg" full onPress={() => { close(); onExport?.(); }}>Save or share</Button>
              <Button variant="ghost" full onPress={close}>Done</Button>
            </View>
          </>
        )}
      </Sheet>
    </Screen>
  );
}
