import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { findInsights, weakestTopics } from "../src/analysis";
import { TopicRow } from "../src/components/Course";
import { ProgressRing } from "../src/components/ProgressRing";
import { Screen } from "../src/components/Screen";
import { EmptyState } from "../src/components/States";
import { Card, Chip, Gap, Icon, Row, SectionTitle, T, type IconName } from "../src/components/ui";
import { useApp } from "../src/store/AppContext";
import { colors, courseColor, masteryColor, radius, space } from "../src/theme";

export default function Analiz() {
  const { kb, mastery, attempts, reviews, courseScore } = useApp();
  const [courseId, setCourseId] = useState<string | null>(null);

  const active = useMemo(() => kb?.courses.filter((c) => c.is_active) ?? [], [kb]);
  const insights = useMemo(() => (kb ? findInsights({ ...kb, courses: active }, attempts, reviews, mastery, new Date()) : []), [kb, active, attempts, reviews, mastery]);

  if (!kb) return <Screen back title="Eksik analizi"><EmptyState icon="cloud-download-outline" title="Bilgi bankası henüz inmedi" /></Screen>;

  const courses = courseId ? active.filter((c) => c.id === courseId) : active;
  const topicsInScope = kb.topics.filter((t) => courses.some((c) => c.id === t.course_id));
  const weak = weakestTopics(mastery, topicsInScope, 5);
  const shownInsights = insights.filter((i) => !courseId || i.course_id === courseId);

  const mcq = attempts.filter((a) => a.kind === "mcq" && (!courseId || kb.questionById.get(a.question_id)?.course_id === courseId));
  const correct = mcq.filter((a) => a.correct).length;
  const cardCount = reviews.filter((r) => !courseId || kb.cardById.get(r.card_id)?.course_id === courseId).length;

  return (
    <Screen back title="Eksik analizi" subtitle="Nerede güçlüsün, nerede zorlanıyorsun?">
      <View style={styles.wrap}>
        <Chip label="Tüm dersler" selected={!courseId} onPress={() => setCourseId(null)} />
        {active.map((c) => (
          <Chip key={c.id} label={c.name} color={courseColor(c.id).main} selected={courseId === c.id} onPress={() => setCourseId(c.id)} />
        ))}
      </View>

      <Gap h={space.md} />
      <Row gap={space.sm}>
        <Stat value={`${mcq.length}`} label="soru çözdün" />
        <Stat value={mcq.length ? `%${Math.round((correct / mcq.length) * 100)}` : "–"} label="doğru oranı" />
        <Stat value={`${cardCount}`} label="kart tekrarı" />
      </Row>

      <SectionTitle title="Tespitler" />
      {shownInsights.length === 0 ? (
        <Card>
          <T v="body" color={colors.inkSoft}>
            Soru çözdükçe ve kart tekrar ettikçe burada sana özel tespitler çıkar. Örneğin bir konuda üst üste yanlış yaparsan seni uyarırız.
          </T>
        </Card>
      ) : (
        <View style={{ gap: space.sm }}>
          {shownInsights.map((ins) => {
            const tone: { c: string; t: string; i: IconName } =
              ins.tone === "danger"
                ? { c: colors.dangerDeep, t: colors.dangerTint, i: "alert-circle" }
                : ins.tone === "warning"
                  ? { c: colors.warningDeep, t: colors.warningTint, i: "alert" }
                  : { c: colors.infoDeep, t: colors.infoTint, i: "lightbulb-on-outline" };
            const go = () =>
              ins.topic_id ? router.push(`/konu/${ins.topic_id}`) : ins.course_id ? router.push(`/quiz?scope=course&id=${ins.course_id}`) : undefined;
            return (
              <Pressable key={ins.id} onPress={go} accessibilityRole="button" style={({ pressed }) => [styles.insight, { backgroundColor: tone.t }, pressed && { opacity: 0.85 }]}>
                <Icon name={tone.i} size={26} color={tone.c} />
                <T v="body" color={tone.c} style={{ flex: 1 }}>
                  {ins.text}
                </T>
                <Icon name="chevron-right" color={tone.c} />
              </Pressable>
            );
          })}
        </View>
      )}

      <SectionTitle title="Konu haritası" />
      <View style={styles.legend}>
        <Legend color={colors.danger} label="40 altı" />
        <Legend color={colors.warning} label="40-69" />
        <Legend color={colors.success} label="70 ve üstü" />
        <Legend color={colors.lineStrong} label="Yetersiz veri" />
      </View>
      <Gap h={space.sm} />
      {courses.map((course) => {
        const c = courseColor(course.id);
        const ts = kb.topicsByCourse.get(course.id) ?? [];
        const score = courseScore(course.id);
        return (
          <Card key={course.id} style={{ marginBottom: space.sm }}>
            <Row>
              <ProgressRing score={score} color={c.main} track={c.tint} size={52} stroke={6} />
              <View style={{ flex: 1 }}>
                <T v="subheading">{course.name}</T>
                <T v="small" color={colors.muted}>
                  {score === null ? "Ders puanı için yeterli veri yok" : `Ders puanın %${score}`}
                </T>
              </View>
            </Row>
            <Gap h={space.md} />
            <View style={styles.heat}>
              {ts.map((t) => {
                const m = mastery.get(t.id);
                const mc = masteryColor(m?.score ?? null);
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => router.push(`/konu/${t.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.title}: ${m?.score == null ? "yetersiz veri" : `yüzde ${m.score}`}`}
                    style={({ pressed }) => [styles.cell, { backgroundColor: mc.tint, borderColor: mc.main }, pressed && { opacity: 0.8 }]}
                  >
                    <T v="tiny" color={colors.ink} numberOfLines={3}>
                      {t.title}
                    </T>
                    <T v="smallStrong" color={mc.deep}>
                      {m?.score == null ? "–" : `%${m.score}`}
                    </T>
                  </Pressable>
                );
              })}
              {ts.length === 0 ? (
                <T v="small" color={colors.muted}>
                  Bu derste konu yok.
                </T>
              ) : null}
            </View>
          </Card>
        );
      })}

      <SectionTitle title="En zayıf konuların" />
      {weak.length === 0 ? (
        <Card>
          <T v="body" color={colors.inkSoft}>
            Bir konuda en az 3 veri (soru ya da kart) olunca zayıf konular sıralanır.
          </T>
        </Card>
      ) : (
        <Card padded={false} style={{ padding: space.xs }}>
          {weak.map(({ topic, mastery: m }) => (
            <TopicRow key={topic.id} topic={topic} score={m.score} dataPoints={m.dataPoints} showCourse courseName={kb.courseById.get(topic.course_id)?.name} onPress={() => router.push(`/konu/${topic.id}`)} />
          ))}
        </Card>
      )}
      {weak.length > 0 ? (
        <Pressable onPress={() => router.push("/quiz?scope=weak")} accessibilityRole="button" style={styles.weakBtn}>
          <Icon name="target" color={colors.primary} />
          <T v="bodyStrong" color={colors.primary}>
            Zayıf konularımdan quiz çöz
          </T>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card style={{ flex: 1, alignItems: "center", paddingHorizontal: space.xs }}>
      <T v="title">{value}</T>
      <T v="small" color={colors.muted} style={{ textAlign: "center" }}>
        {label}
      </T>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Row gap={6}>
      <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: color }} />
      <T v="small" color={colors.inkSoft}>
        {label}
      </T>
    </Row>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  insight: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md, borderRadius: radius.lg },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  heat: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cell: { width: "31.5%", minHeight: 84, borderRadius: radius.md, borderWidth: 2, padding: 8, justifyContent: "space-between" },
  weakBtn: { flexDirection: "row", gap: space.xs, alignItems: "center", justifyContent: "center", minHeight: 52, marginTop: space.sm },
});
