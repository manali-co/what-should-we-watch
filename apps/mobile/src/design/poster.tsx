// Poster, ServiceMark, Stamp and PosterCard, ported 1:1 from the design's deck components.
import { ReactNode } from "react";
import { ImageBackground, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "./tokens";
import { Mascot } from "./Mascot";

export type CardFilm = {
  title: string; year?: number | string; runtime?: string; service: string;
  leavingInDays?: number | null; why?: string; posterUrl?: string; tint?: string; posterMissing?: boolean; noTrailer?: boolean;
};

/** Poster — 2:3 artwork slot. Real image when posterUrl is given, else a toned placeholder
 *  carrying the title in faint display type. Used in lists (End of deck, Shortlist, Taste). */
export function Poster({ title, tint = "#3E6B6F", posterUrl, missing = false, width, height, radius }: { title: string; tint?: string; posterUrl?: string; missing?: boolean; width?: number; height?: number; radius?: number }) {
  const t = useTheme();
  const r = radius ?? t.radius.xs;
  // No artwork = explicitly `missing` OR simply no URL. Callers pass posterUrl and needn't also
  // pass `missing` — a film with no poster is the no-poster case, everywhere Poster is used.
  const noArt = missing || !posterUrl;
  const box: ViewStyle = { width, height, borderRadius: r, overflow: "hidden", backgroundColor: noArt ? t.color.surfaceRaised : tint };
  if (!noArt) return <ImageBackground source={{ uri: posterUrl }} style={box} imageStyle={{ borderRadius: r }} />;
  // No-poster treatment (#49/#87), 1:1 with the design's NoPoster(compact): on the raised
  // surface, Disco in its sheepish `noposter` pose plus a "No poster yet" micro when there's
  // room (≥64px). The title is carried by the list row/caption, not repeated here.
  const w = width ?? 44;
  return (
    <View style={[box, { alignItems: "center", justifyContent: "center", padding: w * 0.06, gap: Math.max(4, w * 0.04) }]}>
      <Mascot state="noposter" size={w * 0.7} />
      {w >= 64 ? <Text style={[t.type.micro, { color: t.color.inkTertiary, textAlign: "center" }]}>No poster yet</Text> : null}
    </View>
  );
}

/** ServiceMark — placeholder tile with the service initial + name. Swap for licensed logos later. */
export function ServiceMark({ name, size = 20, showName = true, color }: { name: string; size?: number; showName?: boolean; color?: string }) {
  const t = useTheme();
  const c = color ?? "rgba(242,241,238,0.85)";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), backgroundColor: c, opacity: 0.18, alignItems: "center", justifyContent: "center" }} />
      <Text style={{ position: "absolute", left: 0, width: size, textAlign: "center", fontFamily: t.fontFamily.bodySemiBold, fontSize: Math.round(size * 0.55), color: c }}>{name[0]}</Text>
      {showName ? <Text style={[t.type.label, { color: c }]}>{name}</Text> : null}
    </View>
  );
}

type StampKind = "like" | "nope" | "maybe" | "watched";

/** Stamp — mid-swipe verdict. Fades in from 32px of drag, opaque at 96px. Tilted against the drag. */
export function Stamp({ kind, opacity }: { kind: StampKind; opacity: number }) {
  const t = useTheme();
  const cfg = {
    like: { label: "Like", color: t.color.yes, rotate: "-12deg", pos: { left: 24 } },
    nope: { label: "Pass", color: t.color.no, rotate: "12deg", pos: { right: 24 } },
    maybe: { label: "Maybe", color: t.color.ink, rotate: "0deg", pos: { alignSelf: "center" as const } },
    watched: { label: "Seen it", color: t.color.ink, rotate: "0deg", pos: { alignSelf: "center" as const } },
  }[kind];
  return (
    <View
      pointerEvents="none"
      style={[
        { position: "absolute", top: 28, opacity, paddingHorizontal: 16, paddingVertical: 8, borderRadius: t.radius.sm, borderWidth: 3, borderColor: cfg.color, backgroundColor: "rgba(16,17,20,0.35)", transform: [{ rotate: cfg.rotate }] },
        cfg.pos,
      ]}
    >
      <Text style={{ fontFamily: t.fontFamily.display, fontSize: 28, lineHeight: 30, color: cfg.color, textTransform: "uppercase", letterSpacing: -0.3 }}>{cfg.label}</Text>
    </View>
  );
}

/** PosterCard — the deck card. Full-bleed poster, metadata over a bottom scrim. Drag/stamps composed by the deck. */
export function PosterCard({ film, stamp, stampOpacity = 0, compact = false, style }: { film: CardFilm; stamp?: StampKind; stampOpacity?: number; compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const { title, year, runtime, service, leavingInDays, why, tint, posterUrl, posterMissing, noTrailer } = film;
  const onPoster = posterMissing ? t.color.ink : "#F2F1EE";
  const inner = (
    <>
      {posterMissing ? (
        <LinearGradient colors={["transparent", t.color.surface]} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
      ) : (
        <LinearGradient colors={["rgba(16,17,20,0)", "rgba(16,17,20,0.35)", "rgba(16,17,20,0.94)"]} locations={[0.3, 0.62, 1]} style={StyleSheet.absoluteFill} />
      )}
      {stamp ? <Stamp kind={stamp} opacity={stampOpacity} /> : null}
      <View style={{ position: "absolute", left: 22, right: 22, bottom: 22, gap: compact ? 6 : 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <ServiceMark name={service} color={onPoster === t.color.ink ? t.color.inkSecondary : "rgba(242,241,238,0.85)"} />
          {leavingInDays != null ? (
            <>
              <Text style={{ color: "rgba(242,241,238,0.45)" }}>·</Text>
              <Text style={[t.type.label, { color: "#F2F1EE", fontFamily: t.fontFamily.bodySemiBold }]}>Leaves in {leavingInDays} day{leavingInDays === 1 ? "" : "s"}</Text>
            </>
          ) : null}
        </View>
        <Text style={[compact ? t.type.displayM : t.type.displayL, { color: onPoster }]}>{title}</Text>
        <Text style={[t.type.body, { color: onPoster === t.color.ink ? t.color.inkSecondary : "rgba(242,241,238,0.72)" }]}>
          {[year, runtime].filter(Boolean).join(" · ")}
        </Text>
        {!compact && why ? <Text style={[t.type.body, { color: onPoster === t.color.ink ? t.color.ink : "rgba(242,241,238,0.92)", paddingTop: 2 }]}>{why}</Text> : null}
      </View>
    </>
  );
  return (
    <View style={[{ width: "100%", height: "100%", borderRadius: t.radius.card, overflow: "hidden", backgroundColor: posterMissing ? t.color.surfaceRaised : tint || t.color.surface }, t.elevation.card, style]}>
      {posterUrl && !posterMissing ? (
        <ImageBackground source={{ uri: posterUrl }} style={{ flex: 1 }} resizeMode="cover">{inner}</ImageBackground>
      ) : (
        <View style={{ flex: 1 }}>
          {posterMissing ? <MissingArt noTrailer={noTrailer} /> : <PlaceholderArt title={title} />}
          {inner}
        </View>
      )}
    </View>
  );
}

// Full-bleed no-artwork mark for the deck card (#49/#87): Disco in its `noposter` pose, a short
// line, and — since every card is tappable to a trailer — the "Tap for the trailer" cue. Sits
// above the bottom metadata (which carries the display-L title). 1:1 with the design's NoPoster,
// minus the centered title the design repeats: the card already shows it below, so repeating it
// reads as a bug in RN's fixed (non container-query) layout.
function MissingArt({ line = "Couldn’t find a poster for this one.", noTrailer = false }: { line?: string; noTrailer?: boolean }) {
  const t = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill as ViewStyle, { alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 34, paddingBottom: 150 }]}>
      <Mascot state="noposter" size={132} />
      <Text style={[t.type.body, { color: t.color.inkSecondary, textAlign: "center", maxWidth: 260 }]}>{line}</Text>
      {!noTrailer ? <TrailerCue /> : null}
    </View>
  );
}

// The "Tap for the trailer" cue — a hairline pill with a small play triangle. 1:1 with the
// design's NoPoster cue; shown on no-poster cards, where there's no art to invite the tap.
function TrailerCue() {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 34, paddingLeft: 12, paddingRight: 14, borderRadius: 999, borderWidth: 1, borderColor: t.color.hairlineStrong, marginTop: 4 }}>
      <View style={{ width: 0, height: 0, borderTopWidth: 5, borderBottomWidth: 5, borderLeftWidth: 8, borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftColor: t.color.ink }} />
      <Text style={[t.type.label, { color: t.color.ink }]}>Tap for the trailer</Text>
    </View>
  );
}

function PlaceholderArt({ title }: { title: string }) {
  const t = useTheme();
  return (
    <View style={StyleSheet.absoluteFill as ViewStyle}>
      <Text style={{ position: "absolute", left: "7%", top: "16%", right: "7%", fontFamily: t.fontFamily.display, fontSize: 52, lineHeight: 50, color: "rgba(255,255,255,0.2)", letterSpacing: -1.5 }}>{title}</Text>
    </View>
  );
}
