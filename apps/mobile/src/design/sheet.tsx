// Sheet — bottom sheet used by the guest gate and the confirm flows (log out / delete / export).
// Ported from the design's <Sheet>: dim backdrop, rounded top, slide-up, grab handle, tap-out to close.
import { ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Headline } from "./primitives";
import { useTheme } from "./tokens";

const useDriver = Platform.OS !== "web"; // RN-web has no native driver

export function Sheet({ open, title, onClose, children }: {
  open: boolean; title?: string | null; onClose: () => void; children: ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current; // 0 closed → 1 open
  // Stay mounted through the close animation: the Modal hides on `visible`, so if we drove it
  // straight off `open` the slide-down would run after it vanished.
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
    Animated.spring(anim, {
      toValue: open ? 1 : 0, useNativeDriver: useDriver, damping: 24, stiffness: 240, mass: 0.9,
    }).start(({ finished }) => { if (finished && !open) setMounted(false); });
  }, [open, anim]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [560, 0] });

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={{ ...StyleSheetAbsolute, backgroundColor: t.color.scrim, opacity: anim }}>
          <Pressable accessibilityLabel="Dismiss" style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={{
            backgroundColor: t.color.bg,
            borderTopLeftRadius: t.radius.sheet, borderTopRightRadius: t.radius.sheet,
            paddingHorizontal: t.space[5], paddingTop: t.space[3],
            paddingBottom: insets.bottom + t.space[5],
            transform: [{ translateY }],
          }}
        >
          <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: t.radius.full, backgroundColor: t.color.surfaceRaised, marginBottom: t.space[4] }} />
          {title ? <Headline size="m" style={{ marginBottom: t.space[3] }}>{title}</Headline> : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const StyleSheetAbsolute = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };
