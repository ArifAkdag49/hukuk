import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Switch, TextInput, View } from "react-native";
import { api, errorText } from "../src/api";
import { confirm } from "../src/confirm";
import { Screen } from "../src/components/Screen";
import { Notice } from "../src/components/States";
import { Bar, Button, Card, Chip, Gap, Icon, Row, SectionTitle, T } from "../src/components/ui";
import { API_URL, USE_FIXTURE } from "../src/config";
import { formatDateTime, timeAgo } from "../src/format";
import { useApp } from "../src/store/AppContext";
import { colors, courseColor, fonts, radius, space } from "../src/theme";
import type { Usage } from "../src/types";

const FEATURE_NAMES: Record<string, string> = {
  assistant: "Asistan",
  asistan: "Asistan",
  assistant_deep: "Derin cevap",
  cases: "Olay puanlama",
  olay_puanlama: "Olay puanlama",
  notes: "Notlar",
  notlar: "Notlar",
};

export default function Ayarlar() {
  const { kb, sync, syncNow, logout, setCourseActive, addCourse } = useApp();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [busyCourse, setBusyCourse] = useState<string | null>(null);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [year, setYear] = useState(3);
  const [adding, setAdding] = useState(false);

  const loadUsage = useCallback(async () => {
    try {
      setUsage(await api.getUsage());
      setUsageError(null);
    } catch (e) {
      setUsageError(errorText(e));
    }
  }, []);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  async function toggle(id: string, v: boolean) {
    setBusyCourse(id);
    setCourseError(null);
    try {
      await setCourseActive(id, v);
    } catch (e) {
      setCourseError(errorText(e));
    } finally {
      setBusyCourse(null);
    }
  }

  async function add() {
    const c = code.trim().toUpperCase();
    if (!/^[A-ZÇĞİÖŞÜ]{2,5}\d{3,4}$/.test(c) || !name.trim()) {
      setCourseError("Ders kodunu (ör. HUK3018) ve ders adını yaz.");
      return;
    }
    setAdding(true);
    setCourseError(null);
    try {
      await addCourse({ code: c, name: name.trim(), year });
      setCode("");
      setName("");
    } catch (e) {
      setCourseError(errorText(e));
    } finally {
      setAdding(false);
    }
  }

  async function doLogout() {
    const warn = sync.pending > 0 ? ` Gönderilmemiş ${sync.pending} kayıt telefonda kalır, tekrar giriş yapınca gönderilir.` : "";
    if (await confirm("Çıkış yapılsın mı?", `Bir sonraki girişte şifren istenecek.${warn}`, "Çıkış yap")) {
      await logout();
      router.replace("/giris");
    }
  }

  const pct = usage ? Math.min(100, (usage.cost_usd / Math.max(usage.cap_usd, 0.01)) * 100) : 0;
  const barColor = pct >= 90 ? colors.danger : pct >= 70 ? colors.warning : colors.success;

  return (
    <Screen back title="Ayarlar">
      <SectionTitle title="Bu ayın harcaması" />
      <Card>
        {usage ? (
          <>
            <T v="title">
              Bu ay: ${usage.cost_usd.toFixed(2)} / ${usage.cap_usd.toFixed(2)}
            </T>
            <Gap h={space.sm} />
            <Bar value={pct} color={barColor} height={12} />
            <Gap h={space.sm} />
            <T v="small" color={colors.inkSoft}>
              {pct >= 100
                ? "Bu ayın API limiti doldu. Okuma, quiz ve kartlar çalışmaya devam ediyor."
                : `Tavana ${Math.max(0, usage.cap_usd - usage.cost_usd).toFixed(2)} $ kaldı. Konu okuma, quiz ve kartlar harcama yapmaz.`}
            </T>
            {Object.keys(usage.by_feature).length > 0 ? (
              <View style={{ marginTop: space.md, gap: 6 }}>
                {Object.entries(usage.by_feature).map(([k, v]) => (
                  <Row key={k} style={{ justifyContent: "space-between" }}>
                    <T v="body" color={colors.inkSoft}>
                      {FEATURE_NAMES[k] ?? k}
                    </T>
                    <T v="bodyStrong">${v.toFixed(2)}</T>
                  </Row>
                ))}
              </View>
            ) : null}
            {typeof usage.pipeline_cost_usd === "number" ? (
              <T v="small" color={colors.muted} style={{ marginTop: space.md }}>
                İçerik üretimi (tek seferlik): ${usage.pipeline_cost_usd.toFixed(2)}. Tavana sayılmaz.
              </T>
            ) : null}
          </>
        ) : usageError ? (
          <>
            <Notice tone="warning" text={usageError} />
            <Gap h={space.sm} />
            <Button label="Tekrar dene" icon="refresh" kind="secondary" size="sm" onPress={() => void loadUsage()} />
          </>
        ) : (
          <T v="body" color={colors.muted}>
            Yükleniyor…
          </T>
        )}
      </Card>

      <SectionTitle title="Senkronizasyon" />
      <Card>
        <Row>
          <Icon
            name={sync.state === "syncing" ? "sync" : sync.state === "offline" ? "wifi-off" : sync.state === "error" ? "sync-alert" : "check-circle-outline"}
            color={sync.state === "error" ? colors.danger : sync.state === "offline" ? colors.warning : colors.success}
          />
          <View style={{ flex: 1 }}>
            <T v="bodyStrong">
              {sync.state === "syncing" ? "Senkronize ediliyor…" : sync.state === "offline" ? "Çevrimdışı" : sync.state === "error" ? "Son deneme başarısız" : "Güncel"}
            </T>
            <T v="small" color={colors.muted}>
              Son senkronizasyon: {sync.lastSyncAt ? `${timeAgo(sync.lastSyncAt)} (${formatDateTime(sync.lastSyncAt)})` : "henüz yok"}
            </T>
          </View>
        </Row>
        <Gap h={space.sm} />
        <T v="small" color={colors.inkSoft}>
          Gönderilmeyi bekleyen kayıt: {sync.pending}. Bilgi bankası sürümü: {kb?.version ?? "yok"}.
        </T>
        {sync.error && sync.state !== "idle" ? (
          <>
            <Gap h={space.sm} />
            <Notice tone="warning" text={sync.error} />
          </>
        ) : null}
        <Gap h={space.md} />
        <Button label="Şimdi senkronize et" icon="sync" kind="secondary" loading={sync.state === "syncing"} onPress={() => void syncNow()} />
      </Card>

      <SectionTitle title="Dersler" />
      <Card padded={false}>
        {(kb?.courses ?? []).map((c, i) => {
          const cc = courseColor(c.id);
          return (
            <View key={c.id} style={[styles.courseRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
              <View style={[styles.swatch, { backgroundColor: cc.main }]} />
              <View style={{ flex: 1 }}>
                <T v="bodyStrong" color={c.is_active ? colors.ink : colors.muted}>
                  {c.name}
                </T>
                <T v="small" color={colors.muted}>
                  {c.code}, {c.year}. sınıf
                </T>
              </View>
              <Switch
                value={c.is_active}
                disabled={busyCourse === c.id}
                onValueChange={(v) => void toggle(c.id, v)}
                trackColor={{ true: cc.main, false: colors.lineStrong }}
                thumbColor={colors.white}
                accessibilityLabel={`${c.name} ${c.is_active ? "açık" : "kapalı"}`}
              />
            </View>
          );
        })}
      </Card>
      <Gap h={space.sm} />
      <T v="small" color={colors.muted}>
        Kapalı dersler listelerde, quizlerde ve kartlarda görünmez. Değişiklik için internet gerekir.
      </T>

      <SectionTitle title="Ders ekle" />
      <Card>
        <TextInput value={code} onChangeText={setCode} placeholder="Ders kodu (ör. HUK3018)" autoCapitalize="characters" placeholderTextColor={colors.muted} style={styles.input} accessibilityLabel="Ders kodu" />
        <Gap h={space.sm} />
        <TextInput value={name} onChangeText={setName} placeholder="Ders adı" placeholderTextColor={colors.muted} style={styles.input} accessibilityLabel="Ders adı" />
        <Gap h={space.sm} />
        <Row gap={space.xs} style={{ flexWrap: "wrap" }}>
          {[1, 2, 3, 4].map((y) => (
            <Chip key={y} label={`${y}. sınıf`} selected={year === y} onPress={() => setYear(y)} />
          ))}
        </Row>
        <Gap h={space.md} />
        <Button label="Dersi ekle" icon="plus" loading={adding} onPress={() => void add()} />
        <Gap h={space.sm} />
        <T v="small" color={colors.muted}>
          Yeni dersin konuları içerik hattı çalıştırıldığında hazırlanır.
        </T>
      </Card>
      {courseError ? (
        <>
          <Gap h={space.sm} />
          <Notice tone="danger" text={courseError} />
        </>
      ) : null}

      <SectionTitle title="Hakkında" />
      <Card>
        <T v="body" color={colors.inkSoft}>
          Bu uygulama ders çalışmak içindir, hukuki danışmanlık değildir. Madde ve karar metinlerini resmî kaynaktan teyit et.
        </T>
        <Gap h={space.sm} />
        <T v="small" color={colors.muted}>
          Sunucu: {USE_FIXTURE ? "geliştirme verisi (sunucu kullanılmıyor)" : API_URL}
        </T>
      </Card>

      <Gap h={space.xl} />
      <Button label="Çıkış yap" icon="logout" kind="danger" onPress={() => void doLogout()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  courseRow: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm, minHeight: 64 },
  swatch: { width: 10, height: 36, borderRadius: 4 },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
  },
});
