// ListRow + SectionLabel, ported 1:1 from the design's surfaces/ListRow.jsx.
import { ReactNode, useState } from "react";
import { Pressable, StyleProp, Text, View, ViewStyle } from "react-native";
import { useTheme } from "./tokens";

/** ListRow — settings/shortlist row. 56 min height, hairline below, optional leading/trailing/value/chevron. */
export function ListRow({
  title, subtitle, leading, trailing, value, chevron = false, onPress, destructive = false, last = false, style,
}: {
  title: string; subtitle?: string; leading?: ReactNode; trailing?: ReactNode; value?: string;
  chevron?: boolean; onPress?: () => void; destructive?: boolean; last?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => onPress && setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={!onPress}
      style={[
        {
          flexDirection: "row", alignItems: "center", gap: t.space[3], minHeight: 56, paddingVertical: 10,
          backgroundColor: pressed ? t.color.surfaceRaised : "transparent",
          borderBottomWidth: last ? 0 : 1, borderBottomColor: t.color.hairline,
        },
        style,
      ]}
    >
      {leading ? <View>{leading}</View> : null}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={1} style={[t.type.bodyL, { color: destructive ? t.color.danger : t.color.ink }]}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={[t.type.caption, { color: t.color.inkSecondary }]}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={[t.type.body, { color: t.color.inkSecondary }]}>{value}</Text> : null}
      {trailing ? <View>{trailing}</View> : null}
      {chevron ? <View style={{ width: 8, height: 8, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: t.color.inkTertiary, transform: [{ rotate: "45deg" }], marginRight: 4 }} /> : null}
    </Pressable>
  );
}

/** SectionLabel — micro caps label above a group of rows. */
export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[{ paddingTop: t.space[6], paddingBottom: t.space[2] }, style]}>
      <Text style={[t.type.micro, { color: t.color.inkTertiary }]}>{children}</Text>
    </View>
  );
}
