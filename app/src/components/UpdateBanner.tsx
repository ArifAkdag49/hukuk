import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../store/AppContext";
import { colors, radius, shadow, space } from "../theme";
import { applyUpdate } from "../updates";
import { Icon, T } from "./ui";

/** Yeni sürüm indirildiğinde ekranın altında görünen sade bant. */
export function UpdateBanner() {
  const { updateReady } = useApp();
  const insets = useSafeAreaInsets();
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!updateReady || hidden) return null;
  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 84 }]} pointerEvents="box-none">
      <View style={styles.bar} accessibilityLiveRegion="polite">
        <Icon name="rocket-launch-outline" color={colors.white} />
        <T v="bodyStrong" color={colors.white} style={{ flex: 1 }}>
          Yeni sürüm hazır
        </T>
        <Pressable
          onPress={() => {
            setBusy(true);
            void applyUpdate().catch(() => setBusy(false));
          }}
          accessibilityRole="button"
          accessibilityLabel="Yeniden başlat"
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
        >
          {busy ? <ActivityIndicator color={colors.primary} /> : <T v="smallStrong" color={colors.primary}>Yeniden başlat</T>}
        </Pressable>
        <Pressable onPress={() => setHidden(true)} accessibilityRole="button" accessibilityLabel="Sonra" hitSlop={10}>
          <Icon name="close" size={20} color={colors.primaryTint} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center", paddingHorizontal: space.lg },
  bar: {
    width: "100%",
    maxWidth: 560,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    ...shadow.raised,
  },
  btn: { backgroundColor: colors.white, borderRadius: radius.sm, paddingHorizontal: space.md, minHeight: 40, justifyContent: "center" },
});
