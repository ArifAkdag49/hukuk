import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { TopicRow } from "../../src/components/Course";
import { ProgressRing } from "../../src/components/ProgressRing";
import { Screen } from "../../src/components/Screen";
import { EmptyState } from "../../src/components/States";
import { Button, Card, Gap, T } from "../../src/components/ui";
import { useApp } from "../../src/store/AppContext";
import { colors, courseColor, radius, space } from "../../src/theme";

export default function DersEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { kb, mastery, courseScore, dueCards } = useApp();
  const course = kb?.courseById.get(String(id));

  if (!kb || !course) {
    return (
      <Screen back title="Ders">
        <EmptyState icon="book-off-outline" title="Ders bulunamadı" text="Ders listesinden tekrar seç." action="Derslere dön" onAction={() => router.replace("/dersler")} />
      </Screen>
    );
  }

  const c = courseColor(course.id);
  const units = kb.unitsByCourse.get(course.id) ?? [];
  const topics = kb.topicsByCourse.get(course.id) ?? [];
  const score = courseScore(course.id);
  const studied = topics.filter((t) => (mastery.get(t.id)?.score ?? null) !== null).length;
  const due = dueCards((card) => card.course_id === course.id).length;

  return (
    <Screen back title={course.name} subtitle={`${course.code}, ${course.year}. sınıf`} accent={c.main}>
      <View style={[styles.summary, { backgroundColor: c.tint }]}>
        <ProgressRing score={score} color={c.main} track={colors.surface} size={92} stroke={10} label={score === null ? "–" : `%${score}`} />
        <View style={{ flex: 1, gap: 4 }}>
          <T v="subheading" color={c.deep}>
            {score === null ? "Henüz yeterli veri yok" : "Ders ustalığın"}
          </T>
          <T v="small" color={colors.inkSoft}>
            {topics.length} konunun {studied} tanesinde yeterli veri var. {due > 0 ? `Bu dersten ${due} kartın tekrar bekliyor.` : ""}
          </T>
        </View>
      </View>
      <Gap h={space.md} />
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Button label="Quiz çöz" icon="help-circle-outline" style={{ flex: 1 }} onPress={() => router.push(`/quiz?scope=course&id=${course.id}`)} />
        <Button label="Kartlar" icon="cards-outline" kind="secondary" style={{ flex: 1 }} onPress={() => router.push(`/kartlar?course=${course.id}`)} />
      </View>

      {units.length === 0 ? (
        <EmptyState icon="file-tree-outline" title="Bu derste henüz konu yok" text="İçerik üretildiğinde konular burada sıralanır." color={c.deep} tint={c.tint} />
      ) : null}

      {units.map((u, i) => {
        const ts = kb.topicsByUnit.get(u.id) ?? [];
        return (
          <View key={u.id} style={{ marginTop: space.xl }}>
            <View style={styles.unitHead}>
              <View style={[styles.unitNo, { backgroundColor: c.main }]}>
                <T v="smallStrong" color={colors.white}>
                  {i + 1}
                </T>
              </View>
              <T v="heading" style={{ flex: 1 }}>
                {u.title}
              </T>
            </View>
            <Card padded={false} style={{ padding: space.xs }}>
              {ts.map((t) => {
                const m = mastery.get(t.id);
                return (
                  <TopicRow key={t.id} topic={t} score={m?.score ?? null} dataPoints={m?.dataPoints ?? 0} onPress={() => router.push(`/konu/${t.id}`)} />
                );
              })}
              {ts.length === 0 ? (
                <T v="small" color={colors.muted} style={{ padding: space.md }}>
                  Bu ünitede konu yok.
                </T>
              ) : null}
            </Card>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center", gap: space.lg, padding: space.lg, borderRadius: radius.xl },
  unitHead: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.sm },
  unitNo: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
