import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors, space } from "../theme";
import { Button, IconBubble, T, type IconName } from "./ui";

/** Boş durum: ne olduğunu ve ne yapılacağını söyler. */
export function EmptyState({
  icon,
  title,
  text,
  action,
  onAction,
  color = colors.primary,
  tint = colors.primaryTint,
}: {
  icon: IconName;
  title: string;
  text?: string;
  action?: string;
  onAction?: () => void;
  color?: string;
  tint?: string;
}) {
  return (
    <View style={styles.box}>
      <IconBubble name={icon} color={color} tint={tint} size={64} />
      <T v="subheading" style={styles.center}>
        {title}
      </T>
      {text ? (
        <T v="body" color={colors.inkSoft} style={styles.center}>
          {text}
        </T>
      ) : null}
      {action && onAction ? <Button label={action} onPress={onAction} color={color} style={{ marginTop: space.xs }} /> : null}
    </View>
  );
}

export function LoadingState({ text = "Yükleniyor…" }: { text?: string }) {
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.primary} />
      <T v="body" color={colors.inkSoft} style={styles.center}>
        {text}
      </T>
    </View>
  );
}

export function ErrorState({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <IconBubble name="alert-circle-outline" color={colors.danger} tint={colors.dangerTint} size={64} />
      <T v="body" color={colors.inkSoft} style={styles.center}>
        {text}
      </T>
      {onRetry ? <Button label="Tekrar dene" icon="refresh" kind="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

/** Satır içi uyarı kutusu (ör. internet gerekli, limit doldu). */
export function Notice({
  tone = "info",
  icon,
  text,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  icon?: IconName;
  text: string;
}) {
  const map = {
    info: { c: colors.infoDeep, t: colors.infoTint, i: "information-outline" as IconName },
    warning: { c: colors.warningDeep, t: colors.warningTint, i: "alert-outline" as IconName },
    danger: { c: colors.dangerDeep, t: colors.dangerTint, i: "alert-circle-outline" as IconName },
    success: { c: colors.successDeep, t: colors.successTint, i: "check-circle-outline" as IconName },
  }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: map.t }]} accessibilityRole="alert">
      <IconBubble name={icon ?? map.i} color={map.c} tint={colors.surface} size={36} />
      <T v="small" color={map.c} style={{ flex: 1 }}>
        {text}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", gap: space.sm, paddingVertical: space.xxl, paddingHorizontal: space.lg },
  center: { textAlign: "center", maxWidth: 420 },
  notice: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.sm, borderRadius: 14 },
});
