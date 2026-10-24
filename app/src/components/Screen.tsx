import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View, type RefreshControlProps, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, maxContentWidth, space } from "../theme";
import { Icon, T, type IconName } from "./ui";

/** Sayfa iskeleti: üst başlık + kaydırılabilir, ortalanmış içerik. */
export function Screen({
  title,
  subtitle,
  back,
  right,
  children,
  scroll = true,
  accent,
  refreshControl,
  contentStyle,
  footer,
  titleLines = 2,
  subtitleLines = 1,
  titleSize = "title",
}: {
  title?: string;
  /** Başlığın en fazla kaç satıra kırılacağı (uzun konu başlıkları için artır) */
  titleLines?: number;
  subtitleLines?: number;
  /** Uzun başlıklarda bir küçük boy */
  titleSize?: "title" | "heading";
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  /** Başlığın altında ders rengiyle ince şerit */
  accent?: string;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Ekranın altına sabitlenen alan (ör. "Gönder" düğmesi) */
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const header =
    title || back || right ? (
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.headerInner}>
          {back ? <HeaderButton icon="arrow-left" label="Geri" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} /> : null}
          <View style={{ flex: 1 }}>
            {title ? (
              <T v={titleSize} numberOfLines={titleLines} accessibilityRole="header">
                {title}
              </T>
            ) : null}
            {subtitle ? (
              <T v="small" color={colors.muted} numberOfLines={subtitleLines}>
                {subtitle}
              </T>
            ) : null}
          </View>
          {right}
        </View>
        {accent ? <View style={[styles.accent, { backgroundColor: accent }]} /> : null}
      </View>
    ) : (
      <View style={{ height: insets.top }} />
    );

  const inner = <View style={[styles.content, contentStyle]}>{children}</View>;

  return (
    <View style={styles.root}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: footer ? space.xl : space.xxxl }}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{inner}</View>
      )}
      {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + space.sm }]}>{footer}</View> : null}
    </View>
  );
}

export function HeaderButton({ icon, label, onPress, color = colors.ink }: { icon: IconName; label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.hbtn, pressed && { opacity: 0.6 }]}
    >
      <Icon name={icon} size={24} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.bg, paddingHorizontal: space.lg, paddingBottom: space.sm },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    width: "100%",
    maxWidth: maxContentWidth,
    alignSelf: "center",
  },
  accent: { height: 4, borderRadius: 4, marginTop: space.sm, width: 56, alignSelf: "flex-start" },
  content: { paddingHorizontal: space.lg, paddingTop: space.xs, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" },
  hbtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
