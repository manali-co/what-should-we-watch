// Gate — "Sign in to keep this". Shown when a guest taps an account-only feature.
// Ported 1:1 from the design's Gate. Gentle, dismissible; never blocks the core loop.
import { View } from "react-native";
import { Body, Headline, Micro } from "../primitives";
import { Button } from "../controls";
import { Sheet } from "../sheet";
import { useTheme } from "../tokens";

export type GateFeature = "group" | "sync" | "account" | "faceid" | "export" | "delete";

const GATE_COPY: Record<GateFeature, [string, string]> = {
  group: ["Deciding together needs an account.", "Friends join through a link tied to you. Your picks so far stay on this phone either way."],
  sync: ["Keep your taste on every phone.", "Sign in and what you’ve taught the app comes with you to a new device."],
  account: ["Your account lives behind a sign-in.", "Name, email and connected services need somewhere to live."],
  faceid: ["Face ID lock needs an account.", "Locking the app protects an account. As a guest there’s nothing to sign back into."],
  export: ["Sign in to export.", "The export includes everything you’ve decided. We tie it to an account so only you can download it."],
  delete: ["Nothing to delete yet.", "You’re a guest. To clear this phone, use Reset what we’ve learned in Settings."],
};

export function GateSheet({ feature, onSignIn, onReset, onClose }: {
  feature: GateFeature | null;
  onSignIn: (feature: GateFeature) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const f = feature ?? "account";
  const [head, body] = GATE_COPY[f];
  return (
    <Sheet open={!!feature} title={null} onClose={onClose}>
      <View style={{ gap: t.space[3] }}>
        <Micro>Sign in to keep this</Micro>
        <Headline size="m">{head}</Headline>
        <Body>{body}</Body>
        {f !== "delete" ? <Body tone="tertiary" style={t.type.caption}>Your shortlist and taste so far merge into the account. Nothing is lost.</Body> : null}
        <View style={{ gap: t.space[2], marginTop: t.space[2] }}>
          {f === "delete" ? (
            <Button variant="secondary" size="lg" full onPress={() => { onReset(); onClose(); }}>Reset what we’ve learned</Button>
          ) : (
            <Button variant="primary" size="lg" full onPress={() => onSignIn(f)}>Sign in</Button>
          )}
          <Button variant="ghost" full onPress={onClose}>Not now</Button>
        </View>
      </View>
    </Sheet>
  );
}
