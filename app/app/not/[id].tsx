import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { api, errorText } from "../../src/api";
import { confirm } from "../../src/confirm";
import { Markdown } from "../../src/components/Markdown";
import { NoteStatusPill } from "../../src/components/NoteStatus";
import { HeaderButton, Screen } from "../../src/components/Screen";
import { EmptyState, ErrorState, LoadingState, Notice } from "../../src/components/States";
import { Bar, Button, Card, Gap, Icon, Row, SectionTitle, T } from "../../src/components/ui";
import { formatDate } from "../../src/format";
import { useApp } from "../../src/store/AppContext";
import { colors, courseColor, radius, space } from "../../src/theme";
import type { NoteDetail } from "../../src/types";

export default function NotDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { kb, syncNow } = useApp();
  const [note, setNote] = useState<NoteDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const n = await api.getNote(String(id));
      setNote((prev) => {
        // İşlem yeni bittiyse bilgi bankasını yenile (nottan üretilen sorular/kartlar gelsin)
        if (prev?.status === "processing" && n.status === "ready") void syncNow();
        return n;
      });
      setError(null);
    } catch (e) {
      setError(errorText(e));
    }
  }, [id, syncNow]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (note?.status !== "processing") return;
    const t = setTimeout(() => void load(), 4000);
    return () => clearTimeout(t);
  }, [note, load]);

  async function remove() {
    if (!note) return;
    const ok = await confirm("Not silinsin mi?", `"${note.title}" ve ondan üretilen sorular ile kartlar silinecek.`, "Sil", true);
    if (!ok) return;
    setDeleting(true);
    try {
      await api.deleteNote(note.id);
      void syncNow();
      router.back();
    } catch (e) {
      setError(errorText(e));
      setDeleting(false);
    }
  }

  if (!note) {
    return (
      <Screen back title="Not">
        {error ? <ErrorState text={error} onRetry={() => void load()} /> : <LoadingState text="Not getiriliyor…" />}
      </Screen>
    );
  }

  const c = courseColor(note.course_id);
  const course = kb?.courseById.get(note.course_id);
  const right = <HeaderButton icon="trash-can-outline" label="Notu sil" color={colors.danger} onPress={() => void remove()} />;

  return (
    <Screen
      back
      title={note.title}
      subtitle={[course?.name, formatDate(note.created_at)].filter(Boolean).join(", ")}
      accent={c.main}
      right={right}
      footer={
        note.status === "ready" && note.questions.length > 0 ? (
          <Button label="Bu nottan quiz çöz" icon="help-circle-outline" size="lg" full onPress={() => router.push(`/quiz?scope=note&id=${note.id}`)} />
        ) : null
      }
    >
      <NoteStatusPill status={note.status} />
      <Gap h={space.md} />
      {deleting ? <LoadingState text="Siliniyor…" /> : null}
      {error ? <Notice tone="danger" text={error} /> : null}

      {note.status === "processing" ? (
        <Card style={{ alignItems: "center", gap: space.sm, paddingVertical: space.xxl }}>
          <ActivityIndicator size="large" color={c.main} />
          <T v="subheading">Notun işleniyor</T>
          <T v="body" color={colors.inkSoft} style={{ textAlign: "center" }}>
            Metni okuyup özetliyoruz, bilgi bankasıyla karşılaştırıyor ve sorular hazırlıyoruz. 10 sayfalık bir not genelde 2 dakikadan kısa sürer. Bu sayfadan çıkabilirsin.
          </T>
        </Card>
      ) : null}

      {note.status === "failed" ? (
        <>
          <Notice tone="danger" text={note.error ?? "Not okunamadı."} />
          <Gap h={space.md} />
          <Button label="Yeniden yükle" icon="upload" onPress={() => router.replace("/not-yukle")} />
        </>
      ) : null}

      {note.status === "ready" ? (
        <>
          <Card>
            <Row>
              <Icon name="text-short" color={c.deep} />
              <T v="subheading" color={c.deep}>
                Özet
              </T>
            </Row>
            <Gap h={space.xs} />
            {note.summary_md ? <Markdown reading accent={c.main}>{note.summary_md}</Markdown> : <T v="body" color={colors.muted}>Özet yok.</T>}
          </Card>

          <SectionTitle title="Çelişki uyarıları" />
          {note.contradictions.length === 0 ? (
            <Notice tone="success" text="Notunda bilgi bankasıyla çelişen bir ifade bulunmadı." />
          ) : (
            <View style={{ gap: space.sm }}>
              {note.contradictions.map((k, i) => (
                <View key={i} style={styles.contra}>
                  <Row>
                    <Icon name="alert" color={colors.warningDeep} />
                    <T v="subheading" color={colors.warningDeep}>
                      Kontrol et
                    </T>
                  </Row>
                  <View style={styles.quote}>
                    <T v="reading" color={colors.inkSoft}>
                      “{k.quote}”
                    </T>
                  </View>
                  <T v="body">{k.problem}</T>
                  <View style={styles.suggest}>
                    <Icon name="lightbulb-on-outline" size={20} color={colors.successDeep} />
                    <T v="body" color={colors.successDeep} style={{ flex: 1 }}>
                      {k.suggestion}
                    </T>
                  </View>
                </View>
              ))}
            </View>
          )}

          <SectionTitle title="Eşleşen konular" />
          {note.topics.length === 0 ? (
            <EmptyState icon="link-variant-off" title="Eşleşen konu bulunamadı" color={c.deep} tint={c.tint} />
          ) : (
            <Card padded={false} style={{ padding: space.xs }}>
              {note.topics.map((t) => {
                const pct = Math.round(t.confidence * 100);
                return (
                  <Pressable key={t.topic_id} onPress={() => router.push(`/konu/${t.topic_id}`)} accessibilityRole="button" style={({ pressed }) => [styles.topic, pressed && { opacity: 0.8 }]}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <T v="bodyStrong">{t.title}</T>
                      <Bar value={pct} color={c.main} track={c.tint} />
                    </View>
                    <T v="smallStrong" color={c.deep}>
                      %{pct}
                    </T>
                    <Icon name="chevron-right" color={colors.muted} />
                  </Pressable>
                );
              })}
            </Card>
          )}

          <SectionTitle title="Nottan üretilenler" />
          <Row gap={space.sm}>
            <Card style={{ flex: 1, alignItems: "center" }}>
              <T v="title" color={c.deep}>
                {note.questions.length}
              </T>
              <T v="small" color={colors.muted}>
                soru
              </T>
            </Card>
            <Card style={{ flex: 1, alignItems: "center" }}>
              <T v="title" color={c.deep}>
                {note.flashcards.length}
              </T>
              <T v="small" color={colors.muted}>
                kart
              </T>
            </Card>
          </Row>
          <Gap h={space.sm} />
          <T v="small" color={colors.muted}>
            Bu sorular ve kartlar normal quiz ve kart akışına da katılır.
          </T>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  contra: { backgroundColor: colors.warningTint, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  quote: { borderLeftWidth: 4, borderLeftColor: colors.warning, paddingLeft: space.md },
  suggest: { flexDirection: "row", gap: space.xs, backgroundColor: colors.surface, borderRadius: radius.md, padding: space.sm, alignItems: "flex-start" },
  topic: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.sm, minHeight: 60, borderRadius: radius.md },
});
