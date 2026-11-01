import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../api";
import { colors, radius, space } from "../theme";
import { Icon } from "./ui";

/** Sunucudaki fotoğraflar yetki istediği için adresle değil, veri olarak alınır; aynı oturumda yeniden indirilmez. */
const cache = new Map<string, string>();

async function loadImage(id: string): Promise<string> {
  const hit = cache.get(id);
  if (hit) return hit;
  const r = await api.getChatImage(id);
  const uri = `data:${r.media_type};base64,${r.data}`;
  cache.set(id, uri);
  return uri;
}

/** Sohbetteki fotoğraf: `uri` varsa yerel dosya, yoksa `id` ile sunucudan. Dokununca tam ekran açılır. */
export function ChatImage({ id, uri, small }: { id?: string; uri?: string; small?: boolean }) {
  const insets = useSafeAreaInsets();
  const [src, setSrc] = useState<string | null>(uri ?? (id ? cache.get(id) ?? null : null));
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const thumb = [styles.thumb, small && styles.small];

  useEffect(() => {
    if (src || !id) return;
    let alive = true;
    loadImage(id)
      .then((u) => alive && setSrc(u))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [id, src]);

  if (failed) {
    return (
      <View style={thumb} accessibilityLabel="Fotoğraf yüklenemedi">
        <Icon name="image-broken-variant" color={colors.muted} />
      </View>
    );
  }
  if (!src) {
    return (
      <View style={thumb}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="imagebutton" accessibilityLabel="Fotoğrafı büyüt">
        <Image source={{ uri: src }} style={thumb} resizeMode="cover" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={styles.full}>
          <Image source={{ uri: src }} style={styles.fullImage} resizeMode="contain" accessibilityLabel="Gönderilen fotoğraf" />
          <Pressable
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Kapat"
            style={[styles.close, { top: insets.top + space.sm }]}
          >
            <Icon name="close" color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 180, height: 180, maxWidth: "100%", borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
  small: { width: 92, height: 92 },
  full: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.92)", alignItems: "center", justifyContent: "center" },
  fullImage: { width: "100%", height: "100%" },
  close: { position: "absolute", right: space.md, width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255, 255, 255, 0.18)", alignItems: "center", justifyContent: "center" },
});
