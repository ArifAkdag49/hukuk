import { Pressable, StyleSheet } from "react-native";
import { useApp } from "../store/AppContext";
import { colors, radius, space } from "../theme";
import { Icon, T } from "./ui";

/** Çevrimdışıyken veya senkronizasyon hatasında görünen ince şerit. Dokununca yeniden dener. */
export function SyncBanner() {
  const { sync, syncNow } = useApp();
  if (sync.state !== "offline" && sync.state !== "error") return null;
  const offline = sync.state === "offline";
  const text = offline
    ? `Çevrimdışısın. Okuma, quiz ve kartlar çalışır${sync.pending > 0 ? `; ${sync.pending} kayıt bağlantı gelince gönderilecek` : ""}.`
    : (sync.error ?? "Senkronizasyon tamamlanamadı.");
  return (
    <Pressable
      onPress={() => void syncNow()}
      accessibilityRole="button"
      accessibilityLabel={`${text} Yeniden denemek için dokun.`}
      style={[styles.bar, { backgroundColor: offline ? colors.warningTint : colors.dangerTint }]}
    >
      <Icon name={offline ? "wifi-off" : "sync-alert"} size={20} color={offline ? colors.warningDeep : colors.dangerDeep} />
      <T v="small" color={offline ? colors.warningDeep : colors.dangerDeep} style={{ flex: 1 }}>
        {text}
      </T>
      <Icon name="refresh" size={20} color={offline ? colors.warningDeep : colors.dangerDeep} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    padding: space.sm,
    borderRadius: radius.md,
    marginBottom: space.sm,
  },
});
