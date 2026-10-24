import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { colors, radius, shadow, space, type } from "../theme";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

// ---------------------------------------------------------------- Metin

type Variant = keyof typeof type;

export function T({
  v = "body",
  color = colors.ink,
  style,
  children,
  ...rest
}: TextProps & { v?: Variant; color?: string; style?: StyleProp<TextStyle>; children?: ReactNode }) {
  return (
    <Text {...rest} style={[type[v], { color }, style]}>
      {children}
    </Text>
  );
}

export function Icon({ name, size = 22, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

// ---------------------------------------------------------------- Kart

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  padded?: boolean;
}) {
  const base = [styles.card, padded && styles.cardPad, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

// ---------------------------------------------------------------- Düğme

type ButtonKind = "primary" | "secondary" | "ghost" | "danger" | "success";

export function Button({
  label,
  onPress,
  kind = "primary",
  icon,
  loading,
  disabled,
  color,
  size = "md",
  style,
  full,
}: {
  label: string;
  onPress?: () => void;
  kind?: ButtonKind;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** primary düğmeye ders rengi vermek için */
  color?: string;
  size?: "md" | "lg" | "sm";
  style?: StyleProp<ViewStyle>;
  full?: boolean;
}) {
  const bg =
    kind === "primary" ? (color ?? colors.primary)
    : kind === "danger" ? colors.danger
    : kind === "success" ? colors.success
    : kind === "secondary" ? colors.surface
    : colors.transparent;
  const fg = kind === "secondary" || kind === "ghost" ? (color ?? colors.primary) : colors.onPrimary;
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.btn,
        size === "lg" && styles.btnLg,
        size === "sm" && styles.btnSm,
        { backgroundColor: bg },
        kind === "secondary" && { borderWidth: 1.5, borderColor: colors.line },
        full && { alignSelf: "stretch" },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === "sm" ? 18 : 22} color={fg} /> : null}
          <T v={size === "sm" ? "smallStrong" : "bodyStrong"} color={fg} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ flexShrink: 1 }}>
            {label}
          </T>
        </>
      )}
    </Pressable>
  );
}

/** Daire içinde ikon (liste satırları, hızlı eylemler). */
export function IconBubble({
  name,
  color,
  tint,
  size = 44,
}: {
  name: IconName;
  color: string;
  tint: string;
  size?: number;
}) {
  return (
    <View style={[styles.bubble, { width: size, height: size, borderRadius: size / 2.6, backgroundColor: tint }]}>
      <Icon name={name} size={size * 0.52} color={color} />
    </View>
  );
}

/** Küçük renkli etiket. */
export function Pill({
  label,
  color,
  tint,
  icon,
  style,
}: {
  label: string;
  color: string;
  tint: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: tint }, style]}>
      {icon ? <Icon name={icon} size={14} color={color} /> : null}
      <T v="tiny" color={color}>
        {label}
      </T>
    </View>
  );
}

/** Seçilebilir çip (kapsam, soru sayısı, ders seçimi). */
export function Chip({
  label,
  selected,
  onPress,
  color = colors.primary,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  icon?: IconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        styles.chip,
        selected ? { backgroundColor: color, borderColor: color } : { backgroundColor: colors.surface, borderColor: colors.line },
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Icon name={icon} size={18} color={selected ? colors.onPrimary : colors.inkSoft} /> : null}
      <T v="smallStrong" color={selected ? colors.onPrimary : colors.inkSoft}>
        {label}
      </T>
    </Pressable>
  );
}

export function Row({ children, style, gap = space.sm }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap }, style]}>{children}</View>;
}

export function Gap({ h = space.md }: { h?: number }) {
  return <View style={{ height: h }} />;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <T v="heading">{title}</T>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={10}>
          <T v="smallStrong" color={colors.primary}>
            {action}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Basit çubuk ilerleme göstergesi. */
export function Bar({ value, color, track = colors.surfaceAlt, height = 8 }: { value: number; color: string; track?: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: "hidden" }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  cardPad: { padding: space.lg },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
  btn: {
    minHeight: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },
  btnLg: { minHeight: 58, borderRadius: radius.lg },
  btnSm: { minHeight: 40, paddingHorizontal: space.md, borderRadius: radius.sm },
  bubble: { alignItems: "center", justifyContent: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: space.md,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  section: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: space.xl,
    marginBottom: space.sm,
  },
});
