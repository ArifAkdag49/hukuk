import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, TextInput, View } from "react-native";
import { api, errorText } from "../../src/api";
import { Markdown } from "../../src/components/Markdown";
import { ProgressRing } from "../../src/components/ProgressRing";
import { Screen } from "../../src/components/Screen";
import { EmptyState, Notice } from "../../src/components/States";
import { Button, Card, Gap, Icon, Row, SectionTitle, T, type IconName } from "../../src/components/ui";
import { useApp } from "../../src/store/AppContext";
import { colors, courseColor, fonts, masteryColor, radius, space } from "../../src/theme";
import type { CaseGrade } from "../../src/types";

export default function OlayEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { kb, getDraft, setDraft, recordAttempt, attempts } = useApp();
  const q = kb?.questionById.get(String(id));
  const [answer, setAnswer] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<CaseGrade | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModel, setShowModel] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void getDraft(`case:${id}`).then((d) => {
      if (d) setAnswer(d);
      setDraftLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function onChange(t: string) {
    setAnswer(t);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void setDraft(`case:${id}`, t || null), 600);
  }

  if (!kb || !q) {
    return (
      <Screen back title="Olay">
        <EmptyState icon="gavel" title="Olay bulunamadı" />
      </Screen>
    );
  }

  const c = courseColor(q.course_id);
  const topic = q.topic_id ? kb.topicById.get(q.topic_id) : null;
  const prev = attempts.filter((a) => a.question_id === q.id && typeof a.score === "number");
  const prevScore = prev.length > 0 ? prev[prev.length - 1].score : null;

  async function submit() {
    if (answer.trim().length < 40) {
      setError("Cevabın çok kısa. Olaydaki sorunları, ilgili maddeleri ve sonucu yaz.");
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await setDraft(`case:${q!.id}`, answer);
    setGrading(true);
    setError(null);
    try {
      const r = await api.gradeCase(q!.id, answer);
      setResult(r);
      await recordAttempt({ question_id: q!.id, kind: "case", answer_text: answer, score: r.score, feedback: r });
      await setDraft(`case:${q!.id}`, null);
    } catch (e) {
      setError(`${errorText(e)} Cevabın taslak olarak saklandı.`);
    } finally {
      setGrading(false);
    }
  }

  // ---------------------------------------------------- Sonuç
  if (result) {
    const mc = masteryColor(result.score);
    return (
      <Screen back title="Olay sonucu" subtitle={topic?.title} accent={c.main}>
        <Card style={{ alignItems: "center", gap: space.sm }}>
          <ProgressRing score={result.score} color={mc.main} track={mc.tint} size={140} stroke={13} big />
          <T v="heading" color={mc.deep}>
            {result.score >= 70 ? "Güçlü bir cevap" : result.score >= 40 ? "Doğru yoldasın" : "Eksikler var"}
          </T>
          <T v="small" color={colors.muted}>
            100 üzerinden puanın
          </T>
        </Card>

        <ResultList title="Doğru tespitlerin" icon="check-circle" color={colors.success} deep={colors.successDeep} tint={colors.successTint} items={result.correct_points} empty="Doğru tespit bulunamadı." />
        <ResultList
          title="Atladığın maddeler"
          icon="close-circle"
          color={colors.danger}
          deep={colors.dangerDeep}
          tint={colors.dangerTint}
          items={result.missed.map((m) => (m.madde_ref ? `${m.point} (${m.madde_ref})` : m.point))}
          empty="Atladığın madde yok."
        />
        <ResultList title="Eksik tartışmalar" icon="alert" color={colors.warning} deep={colors.warningDeep} tint={colors.warningTint} items={result.missing_discussions} empty="Eksik tartışma yok." />

        {result.feedback_md ? (
          <>
            <SectionTitle title="Geri bildirim" />
            <Card>
              <Markdown accent={c.main}>{result.feedback_md}</Markdown>
            </Card>
          </>
        ) : null}

        <SectionTitle title="Örnek çözüm" />
        <Card>
          {showModel ? (
            <Markdown reading accent={c.main}>
              {result.model_answer_md || q.model_answer_md || "Örnek çözüm yok."}
            </Markdown>
          ) : (
            <Button label="Örnek çözümü göster" icon="eye-outline" kind="secondary" color={c.deep} onPress={() => setShowModel(true)} />
          )}
        </Card>

        <Gap h={space.lg} />
        <Button
          label="Yeniden çöz"
          icon="replay"
          kind="secondary"
          onPress={() => {
            setResult(null);
            setShowModel(false);
            setAnswer("");
          }}
        />
      </Screen>
    );
  }

  // ---------------------------------------------------- Cevap yazma
  return (
    <Screen
      back
      title="Olay çözme"
      subtitle={topic?.title}
      accent={c.main}
      footer={<Button label={grading ? "Puanlanıyor" : "Cevabı gönder"} icon="send-check-outline" size="lg" full loading={grading} color={c.deep} disabled={!draftLoaded} onPress={() => void submit()} />}
    >
      {prevScore !== null && prevScore !== undefined ? (
        <>
          <Notice tone="info" icon="history" text={`Bu olayı daha önce çözdün. Son puanın: ${prevScore}.`} />
          <Gap h={space.sm} />
        </>
      ) : null}
      <Card style={{ backgroundColor: c.tint }}>
        <Markdown reading accent={c.main}>
          {q.stem_md}
        </Markdown>
      </Card>

      <SectionTitle title="Cevabın" />
      <T v="small" color={colors.muted}>
        Sorunu tespit et, ilgili maddeyi göster, olaya uygula ve sonuca bağla. Klavyedeki mikrofonla sesle de yazabilirsin.
      </T>
      <Gap h={space.sm} />
      <TextInput
        value={answer}
        onChangeText={onChange}
        multiline
        textAlignVertical="top"
        placeholder="Cevabını buraya yaz…"
        placeholderTextColor={colors.muted}
        style={styles.input}
        accessibilityLabel="Olay cevabı"
        editable={!grading}
      />
      <Row style={{ justifyContent: "space-between", marginTop: 6 }}>
        <T v="tiny" color={colors.muted}>
          {answer.length} karakter
        </T>
        <T v="tiny" color={colors.muted}>
          Taslak otomatik saklanır
        </T>
      </Row>

      {grading ? (
        <View style={styles.wait} accessibilityLiveRegion="polite">
          <ActivityIndicator color={c.main} />
          <View style={{ flex: 1 }}>
            <T v="bodyStrong">Cevabın puanlanıyor</T>
            <T v="small" color={colors.inkSoft}>
              Puanlama ölçütüne göre inceleniyor. 20-60 saniye sürebilir, bu ekranda kal.
            </T>
          </View>
        </View>
      ) : null}
      {error ? (
        <>
          <Gap h={space.md} />
          <Notice tone="danger" text={error} />
        </>
      ) : null}
    </Screen>
  );
}

function ResultList({ title, icon, color, deep, tint, items, empty }: { title: string; icon: IconName; color: string; deep: string; tint: string; items: string[]; empty: string }) {
  return (
    <>
      <SectionTitle title={title} />
      <View style={[styles.list, { backgroundColor: tint }]}>
        {items.length === 0 ? (
          <T v="body" color={deep}>
            {empty}
          </T>
        ) : (
          items.map((it, i) => (
            <View key={i} style={styles.item} accessible accessibilityLabel={`${title}: ${it}`}>
              <Icon name={icon} size={24} color={color} />
              <T v="body" color={deep} style={{ flex: 1 }}>
                {it}
              </T>
            </View>
          ))
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 240,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: space.md,
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 26,
    color: colors.ink,
  },
  wait: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  list: { borderRadius: radius.lg, padding: space.md, gap: space.sm },
  item: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
});
