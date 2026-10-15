import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { MAX_UPLOAD_BYTES, api, errorText, type UploadFile } from "../src/api";
import { Screen } from "../src/components/Screen";
import { Notice } from "../src/components/States";
import { Button, Card, Chip, Gap, Icon, IconBubble, SectionTitle, T, type IconName } from "../src/components/ui";
import { useApp } from "../src/store/AppContext";
import { colors, courseColor, fonts, radius, space } from "../src/theme";

function sizeLabel(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NotYukle() {
  const { kb } = useApp();
  const courses = kb?.courses.filter((c) => c.is_active) ?? [];
  const [file, setFile] = useState<UploadFile | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId && courses[0]) setCourseId(courses[0].id);
  }, [courses, courseId]);

  function accept(f: UploadFile) {
    setFile(f);
    setError(f.size && f.size > MAX_UPLOAD_BYTES ? "Dosya çok büyük (en fazla 20 MB / 50 sayfa). Dosyayı bölüp parça parça yükle." : null);
    if (!title) setTitle(f.name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " "));
  }

  async function pickDocument() {
    const r = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true, multiple: false });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    accept({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? "application/pdf", size: a.size ?? null, webFile: a.file ?? null });
  }

  async function pickImage(camera: boolean) {
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setError("Kamera izni verilmedi. Ayarlardan izin verip tekrar dene ya da galeriden seç.");
        return;
      }
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.85 };
    const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    const name = a.fileName ?? `not-${new Date().toISOString().slice(0, 10)}.jpg`;
    accept({ uri: a.uri, name, mimeType: a.mimeType ?? "image/jpeg", size: a.fileSize ?? null, webFile: a.file ?? null });
  }

  async function upload() {
    if (!file || !courseId) return;
    if (!title.trim()) {
      setError("Nota bir başlık ver; listede bu adla görünecek.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await api.uploadNote(file, courseId, title.trim());
      router.replace(`/not/${r.id}`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const tooBig = !!file?.size && file.size > MAX_UPLOAD_BYTES;
  const sources: { icon: IconName; label: string; text: string; onPress: () => void; hidden?: boolean }[] = [
    { icon: "file-pdf-box", label: "Dosya seç", text: "PDF ya da görsel", onPress: () => void pickDocument() },
    { icon: "camera-outline", label: "Fotoğraf çek", text: "Defterini çek", onPress: () => void pickImage(true), hidden: Platform.OS === "web" },
    { icon: "image-multiple-outline", label: "Galeriden seç", text: "Kayıtlı fotoğraf", onPress: () => void pickImage(false) },
  ];

  return (
    <Screen
      back
      title="Not yükle"
      subtitle="İnternet gerekir"
      footer={<Button label={busy ? "Yükleniyor" : "Yükle ve işle"} icon="upload" size="lg" full loading={busy} disabled={!file || !courseId || tooBig} onPress={() => void upload()} />}
    >
      <SectionTitle title="1. Notunu seç" />
      <View style={styles.sources}>
        {sources
          .filter((s) => !s.hidden)
          .map((s) => (
            <Pressable key={s.label} onPress={s.onPress} accessibilityRole="button" accessibilityLabel={s.label} style={({ pressed }) => [styles.source, pressed && { opacity: 0.85 }]}>
              <IconBubble name={s.icon} color={colors.primary} tint={colors.primaryTint} size={52} />
              <T v="bodyStrong">{s.label}</T>
              <T v="tiny" color={colors.muted}>
                {s.text}
              </T>
            </Pressable>
          ))}
      </View>
      {file ? (
        <>
          <Gap h={space.sm} />
          <Card style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <Icon name={file.mimeType.includes("pdf") ? "file-pdf-box" : "file-image-outline"} size={32} color={tooBig ? colors.danger : colors.primary} />
            <View style={{ flex: 1 }}>
              <T v="bodyStrong" numberOfLines={1}>
                {file.name}
              </T>
              <T v="small" color={tooBig ? colors.dangerDeep : colors.muted}>
                {sizeLabel(file.size)}
              </T>
            </View>
            <Pressable onPress={() => setFile(null)} accessibilityRole="button" accessibilityLabel="Dosyayı kaldır" hitSlop={10}>
              <Icon name="close" color={colors.muted} />
            </Pressable>
          </Card>
        </>
      ) : null}

      <SectionTitle title="2. Ders" />
      <View style={styles.wrap}>
        {courses.map((c) => (
          <Chip key={c.id} label={c.name} color={courseColor(c.id).main} selected={courseId === c.id} onPress={() => setCourseId(c.id)} />
        ))}
      </View>

      <SectionTitle title="3. Başlık" />
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Ör. 3. hafta irade bozuklukları"
        placeholderTextColor={colors.muted}
        style={styles.input}
        accessibilityLabel="Not başlığı"
      />

      <Gap h={space.lg} />
      {error ? <Notice tone="danger" text={error} /> : <Notice tone="info" text="En fazla 20 MB ve 50 sayfa. 10 sayfalık bir not genelde 2 dakikadan kısa sürede hazır olur." />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sources: { flexDirection: "row", gap: space.sm, flexWrap: "wrap" },
  source: {
    flexGrow: 1,
    flexBasis: "30%",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: "dashed",
    paddingVertical: space.lg,
    paddingHorizontal: space.sm,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  input: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.ink,
  },
});
