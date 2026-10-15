import { StyleSheet, View } from "react-native";
import { useApp } from "../store/AppContext";
import { colors, radius, shadow, space } from "../theme";
import { Button, IconBubble, T } from "./ui";

/** İlk açılışta bir kez gösterilen kısa hukuki uyarı. */
export function Disclaimer() {
  const { acceptDisclaimer } = useApp();
  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <View style={styles.sheet}>
        <IconBubble name="scale-balance" color={colors.primary} tint={colors.primaryTint} size={64} />
        <T v="title">Başlamadan önce</T>
        <T v="body" color={colors.inkSoft}>
          Bu uygulama ders çalışman için hazırlandı, <T v="bodyStrong">hukuki danışmanlık değildir</T>. Madde ve karar
          metinleri resmî kaynaklarla doğrulanmaya çalışılır, yine de sınavdan veya bir işlemden önce resmî kaynaktan
          teyit et.
        </T>
        <Button label="Anladım, başla" icon="check" size="lg" full onPress={() => void acceptDisclaimer()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.xl,
    paddingBottom: space.xxl,
    gap: space.md,
    ...shadow.raised,
  },
});
