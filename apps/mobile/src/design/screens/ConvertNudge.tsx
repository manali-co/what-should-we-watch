// ConvertNudge — the guest → member conversion nudge, ported 1:1 from the design's Convert.jsx.
// A gentle, dismissible inline card shown at the moment signing in is actually worth it —
// never a blocker, never twice (App persists dismissedNudges), never for members.
import { Pressable, Text, View } from "react-native";
import { Button } from "../controls";
import { useTheme } from "../tokens";

export type NudgeKind = "shortlist" | "taste" | "group" | "sync";

const COPY: Record<NudgeKind, [string, string]> = {
  shortlist: ["Keep this shortlist if you switch phones", "It lives on this phone right now. Sign in and it — plus your taste — comes with you to a new one."],
  taste: ["This is only on this phone", "We’ve learned a fair bit about you. Sign in and it follows you, so a new phone starts where you left off."],
  group: ["Save what your group decides together", "Group nights keep best when everyone has an account — your shared taste is there for next time, not just tonight."],
  sync: ["Watch on your other devices too", "Sign in once and tonight’s picks and your shortlist show up everywhere you watch."],
};

export function ConvertNudge({ kind, visible, onSignIn, onDismiss }: {
  kind: NudgeKind;
  visible: boolean;
  onSignIn: () => void;
  onDismiss: () => void;
}) {
  const t = useTheme();
  if (!visible) return null;
  const [head, body] = COPY[kind];
  return (
    <View
      accessibilityRole="summary"
      style={{
        marginVertical: t.space[4], padding: 16, borderRadius: t.radius.md,
        backgroundColor: t.color.surface, borderWidth: 1, borderColor: t.color.hairline, gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[t.type.label, { color: t.color.ink }]}>{head}</Text>
          <Text style={[t.type.caption, { color: t.color.inkTertiary }]}>{body}</Text>
        </View>
        <Pressable accessibilityLabel="Dismiss" onPress={onDismiss} hitSlop={8}>
          <Text style={{ color: t.color.inkTertiary, fontSize: 18, lineHeight: 18 }}>×</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button size="sm" onPress={onSignIn}>Sign in</Button>
        <Button size="sm" variant="ghost" onPress={onDismiss}>Not now</Button>
      </View>
    </View>
  );
}
