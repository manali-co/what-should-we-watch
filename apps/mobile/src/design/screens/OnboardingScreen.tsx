// Onboarding — first run after sign-in, ported 1:1 from the design's Onboarding.jsx.
// Three steps (Dots n=3): country confirm, services (min 1 of 20), optional name + primer.
// Presentational only; emits onDone(services, country, name) once step 3's CTA is pressed.
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Body, Dots, Headline, Micro, Screen, TopRow } from "../primitives";
import { Button, Switch } from "../controls";
import { ListRow } from "../surfaces";
import { useTheme } from "../tokens";
import type { AvatarConfig } from "../DiscAvatar";
import { AvatarPickerScreen } from "./AvatarPickerScreen";
import { COUNTRIES, SERVICES } from "../data";

const DETECTED = SERVICES.filter((s) => s.detected).map((s) => s.name);
const AVATAR_PREVIEW: AvatarConfig = { hue: "coral", shape: "round", face: "smile", duo: null };

export function OnboardingScreen({ onDone }: { onDone: (services: string[], country: string, name: string, avatar: AvatarConfig | null) => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState(COUNTRIES[0]); // "United States"
  const [countryManual, setCountryManual] = useState(false);
  const [picking, setPicking] = useState(false);
  const [services, setServices] = useState<Record<string, boolean>>(
    () => Object.fromEntries(SERVICES.filter((s) => s.detected).map((s) => [s.id, true])),
  );
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<AvatarConfig | null>(null);
  // The Disco picker opens as a LOCAL overlay so onboarding `step` survives the round-trip
  // (the design reaches it via a global route; here we keep the screen mounted instead).
  const [showPicker, setShowPicker] = useState(false);

  const count = Object.values(services).filter(Boolean).length;
  const check = <Text style={[t.type.label, { color: t.color.ink }]}>✓</Text>;

  const next = () => {
    if (step < 2) setStep(step + 1);
    else onDone(SERVICES.filter((s) => services[s.id]).map((s) => s.id), country, name.trim(), avatar);
  };

  if (showPicker)
    return (
      <AvatarPickerScreen
        mode="onboarding"
        avatar={avatar}
        onSave={(a) => { setAvatar(a); setShowPicker(false); }}
        onBack={() => setShowPicker(false)}
      />
    );

  const cta =
    step === 0 ? "That’s right"
      : step === 1 ? (count === 0 ? "Pick at least one" : `Continue with ${count} service${count === 1 ? "" : "s"}`)
      : name ? `Let’s go, ${name}` : "Skip for now";

  return (
    <Screen>
      <TopRow
        left={<Dots n={3} i={step} />}
        right={step > 0 ? <Button variant="ghost" size="sm" onPress={() => setStep(step - 1)}>Back</Button> : undefined}
      />

      <View style={{ flex: 1, gap: t.space[4], paddingTop: t.space[7], minHeight: 0 }}>
        {step === 0 ? (
          <>
            <Micro>Step 1 of 3</Micro>
            <Headline>You’re watching from {country}.</Headline>
            <Body size="l">We only show films you can actually play tonight, so the country matters.</Body>
            {picking ? (
              <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                {COUNTRIES.map((c, i) => (
                  <ListRow
                    key={c}
                    title={c}
                    trailing={c === country ? check : undefined}
                    onPress={() => { setCountry(c); setCountryManual(true); setPicking(false); }}
                    last={i === COUNTRIES.length - 1}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={{ marginTop: t.space[4] }}>
                <ListRow title={country} subtitle={countryManual ? "Chosen by you" : "From your device region"} trailing={check} />
                <ListRow title="Somewhere else" chevron onPress={() => setPicking(true)} last />
              </View>
            )}
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Micro>Step 2 of 3</Micro>
            <Headline>
              {DETECTED.length ? `We spotted ${DETECTED.slice(0, -1).join(", ")} and ${DETECTED[DETECTED.length - 1]}.` : "Which services do you have?"}
            </Headline>
            <Body size="l">Turn on anything we missed. You need at least one.</Body>
            <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ paddingTop: t.space[2], paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {SERVICES.map((s, i) => (
                <ListRow
                  key={s.id}
                  title={s.name}
                  subtitle={s.detected ? "On this phone" : undefined}
                  trailing={<Switch checked={!!services[s.id]} onChange={(v) => setServices((prev) => ({ ...prev, [s.id]: v }))} />}
                  last={i === SERVICES.length - 1}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Micro>Step 3 of 3</Micro>
            <Headline>What should we call you?</Headline>
            <Body size="l">Optional. It’s how friends will see your picks when you decide together.</Body>
            <Pressable
              onPress={() => setShowPicker(true)}
              accessibilityLabel="Choose your Disco"
              style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: t.color.surface, borderRadius: t.radius.md, paddingVertical: 12, paddingHorizontal: 14 }}
            >
              <Avatar person={{ name: name || "You", initial: (name || "Y")[0].toUpperCase(), avatar: avatar || AVATAR_PREVIEW }} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[t.type.label, { color: t.color.ink }]}>Your Disco</Text>
                <Text style={[t.type.caption, { color: t.color.inkSecondary }]}>{avatar ? `${avatar.hue} · ${avatar.shape} · ${avatar.face}` : "Pick a colour, shape and face"}</Text>
              </View>
              <Text style={[t.type.label, { color: t.color.inkSecondary }]}>{avatar ? "Change" : "Choose"}</Text>
            </Pressable>
            <View style={{ borderBottomWidth: 1, borderBottomColor: t.color.hairlineStrong, paddingTop: 8, paddingBottom: 12 }}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={t.color.inkTertiary}
                maxLength={40}
                returnKeyType="done"
                style={{ color: t.color.ink, fontFamily: t.fontFamily.display, fontSize: t.type.displayM.fontSize, letterSpacing: t.type.displayM.letterSpacing, padding: 0 }}
              />
            </View>
            <View style={{ marginTop: "auto", paddingBottom: t.space[4], gap: t.space[3] }}>
              <Micro>How it works</Micro>
              <Body tone="ink" size="l">
                Pick a mood or two, we deal ten films that are on {count} service{count === 1 ? "" : "s"} in {country} tonight, and you swipe: right to like, left to pass.
              </Body>
            </View>
          </>
        ) : null}
      </View>

      <View style={{ paddingBottom: insets.bottom + 12 }}>
        <Button variant="primary" size="lg" full disabled={step === 1 && count === 0} onPress={next}>{cta}</Button>
      </View>
    </Screen>
  );
}
