// FeedbackSheet — "Send feedback / Report a bug", ported 1:1 from the design's Account.jsx
// FeedbackSheet. A bottom sheet in Disco's first-person voice: the intelligence layer passing
// a note to the team. Opened from Settings › Send feedback and from "Report this" on our-fault
// error states. Works for guests and members; the app version + device attach automatically.
import { useRef, useState } from "react";
import { Platform, TextInput, View } from "react-native";
import { Sheet } from "../sheet";
import { Button, Segmented } from "../controls";
import { Mascot } from "../Mascot";
import { Body, Headline } from "../primitives";
import { useTheme } from "../tokens";
import { APP_VERSION, submitFeedback } from "../../api";

type FeedbackType = "bug" | "idea" | "other";
type Status = "idle" | "sending" | "sent" | "error";

const TYPES: { value: string; label: string }[] = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "other", label: "Other" },
];

const META = `WSWW ${APP_VERSION} · ${Platform.OS === "ios" ? "iOS" : "Android"} ${String(Platform.Version)}`;

export function FeedbackSheet({ open, onClose, signedIn = false }: { open: boolean; onClose: () => void; signedIn?: boolean }) {
  const t = useTheme();
  // The component stays mounted across open/close (Sheet toggles a Modal), so state persists
  // on its own — which is exactly what "Keep it for later" needs. We only clear on a deliberate
  // discard (Cancel / Done). `reqId` guards against a request from an earlier sheet session
  // settling after the user has closed or reopened: a stale result is ignored.
  const [type, setType] = useState<FeedbackType>("bug");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const reqId = useRef(0);

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && status !== "sending";

  // Close the sheet. `keep` preserves the draft (a failed note the user chose to keep, or an
  // accidental scrim-dismiss of one); otherwise the next open starts fresh. Either way, any
  // in-flight request is invalidated so it can't flip state after we've closed.
  const finish = (keep: boolean) => {
    reqId.current += 1;
    if (!keep) { setType("bug"); setText(""); }
    setStatus("idle");
    onClose();
  };

  const send = async () => {
    if (!canSend) return;
    const id = (reqId.current += 1);
    setStatus("sending");
    try {
      await submitFeedback({ type, message: trimmed });
      if (reqId.current === id) setStatus("sent");
    } catch {
      if (reqId.current === id) setStatus("error"); // the note is kept so they can retry
    }
  };

  const title = status === "sent" ? null : status === "error" ? "Couldn’t send." : "Tell me what happened.";
  // Only promise an email follow-up to members — a guest gave us no email to reach them at.
  const willEmail = signedIn && type === "bug";

  return (
    <Sheet open={open} title={title} onClose={() => finish(status === "error")}>
      {status === "sent" ? (
        <View style={{ alignItems: "center", gap: t.space[3], paddingTop: t.space[2] }}>
          <Mascot state="celebrate" size={88} />
          <Headline size="m" style={{ textAlign: "center" }}>Thanks — we got it.</Headline>
          <Body style={{ textAlign: "center" }}>
            I’ve passed it straight to the team.{willEmail ? " If we need more, we’ll ask by email." : ""}
          </Body>
          <Button variant="primary" size="lg" full onPress={() => finish(false)} style={{ marginTop: t.space[3] }}>Done</Button>
        </View>
      ) : (
        <View style={{ gap: t.space[4] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: t.space[3] }}>
            <Mascot state={status === "error" ? "error" : trimmed ? "thinking" : "idle"} size={44} />
            <Body style={{ flex: 1 }}>
              {status === "error"
                ? "That didn’t go through — my side, not yours. Your note is still here."
                : "I’ll pass this straight to the team. Bug, idea or anything else."}
            </Body>
          </View>

          <Segmented
            variant="bar"
            options={TYPES}
            value={type}
            onChange={(v) => { setType(v as FeedbackType); if (status === "error") setStatus("idle"); }}
          />

          <TextInput
            value={text}
            onChangeText={(v) => { setText(v.slice(0, 1000)); if (status === "error") setStatus("idle"); }}
            editable={status !== "sending"}
            multiline
            textAlignVertical="top"
            placeholder={type === "idea" ? "What would make it better?" : "What happened? The more detail, the better."}
            placeholderTextColor={t.color.inkTertiary}
            style={{
              minHeight: 108, padding: 14, borderRadius: t.radius.md,
              borderWidth: 1, borderColor: status === "error" ? t.color.danger : t.color.hairlineStrong,
              backgroundColor: t.color.surfaceRaised, color: t.color.ink,
              fontFamily: t.fontFamily.body, fontSize: 16, lineHeight: 23,
              opacity: status === "sending" ? 0.6 : 1,
            }}
          />

          <Body tone="tertiary" style={[t.type.caption]}>
            I’ll attach the app version and device for you ({META}). No name, email or watch history.
          </Body>

          <View style={{ gap: t.space[2] }}>
            <Button variant="primary" size="lg" full disabled={!canSend} loading={status === "sending"} onPress={send}>
              {status === "sending" ? "Sending…" : status === "error" ? "Try again" : "Send"}
            </Button>
            <Button variant="ghost" full onPress={() => finish(status === "error")}>{status === "error" ? "Keep it for later" : "Cancel"}</Button>
          </View>
        </View>
      )}
    </Sheet>
  );
}
