// Mood selector — "The Pour" concept, ported 1:1 from the design's Mood.jsx (MoodPour).
// Presentational + local UI state; emits onDeal(moods, who, hours) and onOpenSettings.
import { Fragment, useEffect, useRef, useState } from "react";
import { LayoutAnimation, Platform, Pressable, ScrollView, Text, TextInput, UIManager, View } from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const growAnim = () => LayoutAnimation.configureNext(LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.scaleXY));
import { Avatar, Blend, Headline, Micro, Screen, TopRow } from "../primitives";
import { Button, Pill } from "../controls";
import { useTheme } from "../tokens";
import type { MoodHue } from "../tokens";
import { MOODS, hueOf } from "../data";

export type Custom = { text: string; hue: MoodHue };
const HUES: MoodHue[] = ["coral", "lilac", "lagoon", "butter", "moss", "sky"];
const WHO = [{ value: "me", label: "just me" }, { value: "two", label: "the two of us" }, { value: "group", label: "a few of us" }];
const HOURS = [{ value: "90", label: "about 90 minutes" }, { value: "120", label: "about 2 hours" }, { value: "180", label: "the whole evening" }, { value: "any", label: "however long" }];
const CUSTOM_LIMIT = 80;
const CUSTOM_EXAMPLES = ["something to fall asleep to", "movies like Arrival but lighter", "a film my dad would love", "ninety minutes, no thinking"];

type Greeting = { text: string; size: "xl" | "l" | "m"; label?: string };
export function MoodScreen({ onDeal, onOpenSettings, onOpenProfile, userInitial, greeting = { text: "Tonight feels like…", size: "xl" } }: { onDeal: (moods: string[], who: string, hours: string) => void; onOpenSettings: () => void; onOpenProfile?: () => void; userInitial?: string; greeting?: Greeting }) {
  const t = useTheme();
  const [selected, setSelected] = useState<string[]>([]);
  const [customs, setCustoms] = useState<Custom[]>([]);
  const [who, setWho] = useState("me");
  const [hours, setHours] = useState("120");

  const hueForWord = (w: string): MoodHue => customs.find((c) => c.text === w)?.hue ?? hueOf(w);
  const words = selected;
  const hues = words.map(hueForWord);

  const toggle = (w: string) => { growAnim(); setSelected((s) => (s.includes(w) ? s.filter((x) => x !== w) : [...s, w])); };

  return (
    <Screen style={{ paddingBottom: 116 }}>
      {/* Header row: group avatars + settings */}
      <TopRow
        left={
          <Pressable onPress={onOpenProfile ?? onOpenSettings} hitSlop={8}>
            {userInitial ? <Avatar person={{ name: "You", initial: userInitial }} ring={hues.length ? hues[0] : null} /> : <View style={{ width: 32, height: 32, borderRadius: 999, borderWidth: 1, borderColor: t.color.hairlineStrong }} />}
          </Pressable>
        }
        right={
          <Pressable onPress={onOpenSettings} hitSlop={8} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: t.color.inkSecondary, fontSize: 22 }}>{"⋯"}</Text>
          </Pressable>
        }
      />

      {/* Headline + picked words + sentence */}
      <View style={{ paddingTop: t.space[5], gap: t.space[3] }}>
        {greeting.label ? <Micro>{greeting.label}</Micro> : null}
        <Headline size={greeting.size}>{greeting.text}</Headline>
        <View style={{ minHeight: 32, flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
          {words.length === 0 ? (
            <Text style={[t.type.displayM, { color: t.color.inkTertiary }]}>anything, really</Text>
          ) : (
            words.map((w, i) => (
              <Fragment key={w}>
                {i > 0 ? <Text style={[t.type.title, { color: t.color.inkTertiary }]}>{i === words.length - 1 ? " and " : ", "}</Text> : null}
                <Text style={[t.type.displayM, { color: t.color.mood[hues[i]].ink }]}>{w}</Text>
              </Fragment>
            ))
          )}
          {words.length > 0 ? <Blend hues={hues} size={22} style={{ marginLeft: 8 }} /> : null}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline" }}>
          <Text style={[t.type.bodyL, { color: t.color.inkSecondary }]}>for </Text>
          <Cycle options={WHO} value={who} onChange={setWho} />
          <Text style={[t.type.bodyL, { color: t.color.inkSecondary }]}>, with </Text>
          <Cycle options={HOURS} value={hours} onChange={setHours} />
        </View>
      </View>

      {/* Pour field */}
      <ScrollView style={{ flex: 1, marginTop: 12 }} contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: 10, paddingTop: 8, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <CustomMood customs={customs} setCustoms={setCustoms} selected={selected} setSelected={setSelected} />
        {MOODS.map((m) => {
          const on = selected.includes(m.w);
          const baseSize = m.weight === 3 ? "lg" : m.weight === 2 ? "md" : "sm";
          // Selected chips grow one size up; LayoutAnimation reflows the rest smoothly.
          const size = on ? (baseSize === "sm" ? "md" : "lg") : baseSize;
          const baseFont = m.weight === 3 ? 20 : m.weight === 2 ? 16 : 13;
          const fontSize = on ? baseFont + 6 : baseFont;
          return (
            <Pill
              key={m.w}
              hue={m.hue}
              size={size}
              selected={on}
              onPress={() => toggle(m.w)}
              // line-height must follow the overridden fontSize, or the taller display glyphs
              // get clipped by the Pill text's base line-height (the "text gets cut" bug).
              textStyle={{ fontFamily: t.fontFamily.display, fontSize, lineHeight: Math.round(fontSize * 1.2), letterSpacing: -0.2 }}
            >
              {m.w}
            </Pill>
          );
        })}
      </ScrollView>

      {/* Deal bar */}
      <View style={{ position: "absolute", left: t.space.pageInset, right: t.space.pageInset, bottom: 34 }}>
        <Button variant="primary" size="lg" full onPress={() => onDeal(selected, who, hours)}>
          {words.length ? "Deal ten" : "Surprise us"}
        </Button>
      </View>
    </Screen>
  );
}

// A word in the "for X, with Y" sentence that cycles options on tap.
function Cycle({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  const t = useTheme();
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <Pressable onPress={() => onChange(options[(i + 1) % options.length].value)} style={{ minHeight: 32, justifyContent: "center" }}>
      <Text style={[t.type.bodyL, { color: t.color.ink, textDecorationLine: "underline", textDecorationColor: t.color.inkTertiary }]}>{options[i].label}</Text>
    </Pressable>
  );
}

// Custom natural-language mood: dashed chip → inline input (live counter, 80 max) → filled hue chip.
function CustomMood({ customs, setCustoms, selected, setSelected }: { customs: Custom[]; setCustoms: (f: (c: Custom[]) => Custom[]) => void; selected: string[]; setSelected: (f: (s: string[]) => string[]) => void }) {
  const t = useTheme();
  const [edit, setEdit] = useState<{ index: number; text: string } | null>(null);
  const [ph, setPh] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!edit || edit.text) return;
    const id = setInterval(() => setPh((p) => (p + 1) % CUSTOM_EXAMPLES.length), 2400);
    return () => clearInterval(id);
  }, [edit?.text === ""]);
  useEffect(() => { if (edit) inputRef.current?.focus(); }, [edit !== null]);

  const remaining = edit ? CUSTOM_LIMIT - edit.text.length : CUSTOM_LIMIT;
  const over = remaining < 0;
  const canSubmit = !!edit && edit.text.trim().length > 0 && !over;

  const submit = () => {
    if (!canSubmit || !edit) return;
    const text = edit.text.trim();
    if (edit.index >= 0) {
      const old = customs[edit.index].text;
      setCustoms((cs) => cs.map((c, i) => (i === edit.index ? { ...c, text } : c)));
      setSelected((s) => s.map((w) => (w === old ? text : w)));
    } else {
      const used = customs.map((c) => c.hue);
      const hue = HUES.find((h) => !used.includes(h)) ?? HUES[customs.length % HUES.length];
      setCustoms((cs) => [...cs, { text, hue }]);
      setSelected((s) => [...s, text]);
    }
    setEdit(null);
  };
  const remove = (i: number) => {
    const old = customs[i].text;
    setCustoms((cs) => cs.filter((_, k) => k !== i));
    setSelected((s) => s.filter((w) => w !== old));
    setEdit(null);
  };

  return (
    <>
      {customs.map((c, i) => (
        <View key={c.text} style={{ position: "relative" }}>
          <Pill hue={c.hue} selected onPress={() => setEdit({ index: i, text: c.text })} textStyle={{ fontFamily: t.fontFamily.display, fontSize: 16, letterSpacing: -0.2 }} style={{ paddingRight: 34, maxWidth: 320 }}>
            {c.text}
          </Pill>
          <Pressable onPress={() => remove(i)} hitSlop={6} style={{ position: "absolute", right: 6, top: 8, width: 24, height: 24, borderRadius: 999, backgroundColor: "rgba(23,24,27,0.18)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: t.color.mood.onFill, fontSize: 13 }}>{"×"}</Text>
          </Pressable>
        </View>
      ))}
      {edit ? (
        <View style={{ width: "100%", gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48, paddingLeft: 16, paddingRight: 4, borderRadius: t.radius.full, borderWidth: 1.5, borderColor: over ? t.color.no : t.color.ink, backgroundColor: t.color.surface }}>
            <TextInput
              ref={inputRef}
              value={edit.text}
              onChangeText={(text) => setEdit({ ...edit, text })}
              onSubmitEditing={submit}
              placeholder={CUSTOM_EXAMPLES[ph]}
              placeholderTextColor={t.color.inkTertiary}
              maxLength={CUSTOM_LIMIT + 20}
              style={{ flex: 1, color: t.color.ink, fontFamily: t.fontFamily.display, fontSize: 16, letterSpacing: -0.2, paddingVertical: 0 }}
            />
            <Text style={[t.type.caption, { color: over ? t.color.no : remaining <= 10 ? t.color.ink : t.color.inkTertiary }]}>{remaining}</Text>
            <Pressable onPress={submit} disabled={!canSubmit} style={{ height: 38, paddingHorizontal: 14, borderRadius: 999, backgroundColor: t.color.ink, alignItems: "center", justifyContent: "center", opacity: canSubmit ? 1 : 0.35 }}>
              <Text style={[t.type.label, { color: t.color.inkInverse }]}>{edit.index >= 0 ? "Save" : "Add"}</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 6 }}>
            <Text style={[t.type.caption, { color: over ? t.color.no : t.color.inkTertiary, flex: 1 }]}>
              {over ? `${-remaining} over — keep it under ${CUSTOM_LIMIT} characters` : "In your own words. We’ll read it like a mood."}
            </Text>
            <Pressable onPress={() => setEdit(null)} hitSlop={6} style={{ height: 32, justifyContent: "center", paddingHorizontal: 6 }}>
              <Text style={[t.type.label, { color: t.color.inkSecondary }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setEdit({ index: -1, text: "" })} style={{ height: 40, paddingHorizontal: 16, borderRadius: t.radius.full, borderWidth: 1.5, borderStyle: "dashed", borderColor: t.color.inkTertiary, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: t.color.inkSecondary, fontSize: 18 }}>+</Text>
          <Text style={{ color: t.color.ink, fontFamily: t.fontFamily.display, fontSize: 16, letterSpacing: -0.2 }}>Describe it yourself</Text>
        </Pressable>
      )}
    </>
  );
}
