import { useEffect, useState } from "react";
import { BackHandler, Modal, Pressable, StyleSheet, View } from "react-native";
import { colors, radius, shadow, space } from "../theme";
import { Button, IconBubble, T, type IconName } from "./ui";

export type DialogRequest = {
  title: string;
  message: string;
  okLabel: string;
  /** Yoksa yalnızca "Tamam" düğmesi gösterilir (bilgi penceresi). */
  cancelLabel?: string;
  destructive?: boolean;
  icon?: IconName;
  resolve: (ok: boolean) => void;
};

let show: ((r: DialogRequest) => void) | null = null;

/** Kök düzende bir kez yer alır; confirm()/notify() pencerelerini uygulamanın kendi görünümüyle çizer. */
export function dialogHost(): ((r: DialogRequest) => void) | null {
  return show;
}

export function ConfirmHost() {
  const [req, setReq] = useState<DialogRequest | null>(null);

  useEffect(() => {
    show = (r) =>
      setReq((cur) => {
        cur?.resolve(false);
        return r;
      });
    return () => {
      show = null;
    };
  }, []);

  function close(ok: boolean) {
    req?.resolve(ok);
    setReq(null);
  }

  // Android geri tuşu "Vazgeç" sayılır
  useEffect(() => {
    if (!req) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      close(false);
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  const tone = req?.destructive ? { main: colors.danger, tint: colors.dangerTint } : { main: colors.primary, tint: colors.primaryTint };
  const icon: IconName = req?.icon ?? (req?.destructive ? "trash-can-outline" : req?.cancelLabel ? "help-circle-outline" : "information-outline");

  return (
    <Modal visible={!!req} transparent animationType="fade" statusBarTranslucent onRequestClose={() => close(false)}>
      <Pressable style={styles.overlay} onPress={() => close(false)} accessibilityLabel="Kapat">
        {req ? (
          <Pressable style={styles.card} onPress={() => undefined} accessibilityViewIsModal accessibilityRole="alert">
            <View style={[styles.stripe, { backgroundColor: tone.main }]} />
            <IconBubble name={icon} color={tone.main} tint={tone.tint} size={56} />
            <T v="subheading" style={styles.center}>
              {req.title}
            </T>
            {req.message ? (
              <T v="body" color={colors.inkSoft} style={styles.center}>
                {req.message}
              </T>
            ) : null}
            <View style={styles.actions}>
              {req.cancelLabel ? (
                <View style={{ flex: 1 }}>
                  <Button label={req.cancelLabel} kind="secondary" full onPress={() => close(false)} />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <Button
                  label={req.okLabel}
                  kind={req.destructive ? "danger" : "primary"}
                  icon={req.destructive ? "trash-can-outline" : undefined}
                  full
                  onPress={() => close(true)}
                />
              </View>
            </View>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: space.lg },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.lg,
    gap: space.sm,
    alignItems: "center",
    overflow: "hidden",
    ...shadow.raised,
  },
  stripe: { position: "absolute", top: 0, left: 0, right: 0, height: 5 },
  center: { textAlign: "center" },
  actions: { flexDirection: "row", gap: space.sm, alignSelf: "stretch", marginTop: space.sm },
});
