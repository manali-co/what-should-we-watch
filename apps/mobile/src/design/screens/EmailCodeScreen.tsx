// Email code — the 6-digit entry from the design's Flow.jsx (SignIn, 'code' mode). VISUAL only (no Clerk).
// Six cells over a custom 3-column numeric keypad with ⌫; Continue gated at 6.
// Emits onSubmit(code) / onResend / onBack; renders `error` when passed. Auth is wired by the parent.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Body, Headline, Micro, Screen, TopRow } from "../primitives";
import { Button } from "../controls";
import { useTheme } from "../tokens";

const LEN = 6;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export function EmailCodeScreen({ email, onSubmit, onResend, onBack, error }: {
  email: string; onSubmit: (code: string) => void; onResend: () => void; onBack: () => void; error?: string;
}) {
  const t = useTheme();
  const [code, setCode] = useState("");
  const complete = code.length === LEN;

  const press = (k: string) => {
    if (!k) return;
    setCode((c) => (k === "⌫" ? c.slice(0, -1) : (c + k).slice(0, LEN)));
  };

  return (
    <Screen>
      <TopRow left={<Button variant="ghost" size="sm" onPress={onBack}>Back</Button>} />

      <View style={{ flex: 1, gap: t.space[4], paddingTop: t.space[7] }}>
        <Headline size="l">Enter the code we sent to {email}.</Headline>

        {/* Six cells — the cell at the caret carries an ink ring (danger ring on error). */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: t.space[2] }}>
          {Array.from({ length: LEN }).map((_, i) => {
            const active = i === code.length;
            const border = active ? (error ? t.color.no : t.color.ink) : "transparent";
            return (
              <View key={i} style={{ flex: 1, height: 56, borderRadius: t.radius.sm, backgroundColor: t.color.surface, borderWidth: 1.5, borderColor: border, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: t.color.ink, fontFamily: t.fontFamily.display, fontSize: t.type.displayM.fontSize }}>{code[i] || ""}</Text>
              </View>
            );
          })}
        </View>

        {/* Custom numeric keypad */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: t.space[3], marginHorizontal: -3 }}>
          {KEYS.map((k, i) => (
            <View key={i} style={{ width: "33.333%", padding: 3 }}>
              <Pressable
                disabled={!k}
                onPress={() => press(k)}
                style={({ pressed }) => ({ height: 48, borderRadius: t.radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: pressed && k ? t.color.surfaceRaised : "transparent" })}
              >
                <Text style={[t.type.title, { color: t.color.ink }]}>{k}</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {error ? <Micro style={{ color: t.color.no }}>{error}</Micro> : null}

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: "auto", gap: 8 }}>
          <Button variant="ghost" size="sm" onPress={() => { setCode(""); onResend(); }}>Resend code</Button>
          <Button variant="primary" size="lg" disabled={!complete} onPress={() => onSubmit(code)}>Continue</Button>
        </View>
        <Body tone="tertiary" style={t.type.caption}>Codes expire in 10 minutes.</Body>
      </View>
    </Screen>
  );
}
