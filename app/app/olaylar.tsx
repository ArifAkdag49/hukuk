import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Screen } from "../src/components/Screen";
import { EmptyState, Notice } from "../src/components/States";
import { Icon, Pill, SectionTitle, T } from "../src/components/ui";
import { plain } from "../src/format";
import { useApp } from "../src/store/AppContext";
import { colors, courseColor, masteryColor, radius, shadow, space } from "../src/theme";

export default function Olaylar() {
  const { kb, attempts } = useApp();

  const lastScore = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of attempts) if (a.kind === "case" && typeof a.score === "number") m.set(a.question_id, a.score);
    return m;
  }, [attempts]);

  if (!kb) return <Screen back title="Olay çözme"><EmptyState icon="cloud-download-outline" title="Bilgi bankası henüz inmedi" /></Screen>;

  const active = kb.courses.filter((c) => c.is_active);
  const cases = kb.questions.filter((q) => q.kind === "case");

  return (
    <Screen back title="Olay çözme" subtitle={`${cases.length} olay sorusu`}>
      <Notice tone="info" icon="wifi" text="Cevabın sunucuda puanlanır, internet gerekir. Yazdıkların gönderene kadar telefonunda taslak olarak saklanır." />
      {cases.length === 0 ? <EmptyState icon="gavel" title="Henüz olay sorusu yok" text="İçerik üretildiğinde olay soruları burada görünür." /> : null}
      {active.map((course) => {
        const list = cases.filter((q) => q.course_id === course.id);
        if (list.length === 0) return null;
        const c = courseColor(course.id);
        return (
          <View key={course.id}>
            <SectionTitle title={course.name} />
            <View style={{ gap: space.sm }}>
              {list.map((q) => {
                const topic = q.topic_id ? kb.topicById.get(q.topic_id) : null;
                const s = lastScore.get(q.id);
                const mc = masteryColor(s ?? null);
                return (
                  <Pressable key={q.id} onPress={() => router.push(`/olay/${q.id}`)} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && { opacity: 0.88 }]}>
                    <View style={[styles.spine, { backgroundColor: c.main }]} />
                    <View style={{ flex: 1, gap: 6, paddingVertical: space.md }}>
                      {topic ? (
                        <T v="smallStrong" color={c.deep}>
                          {topic.title}
                        </T>
                      ) : null}
                      <T v="body" color={colors.inkSoft} numberOfLines={3}>
                        {plain(q.stem_md.replace(/^\s*\*\*Olay:\*\*\s*/i, ""), 180)}
                      </T>
                      {s !== undefined ? <Pill label={`Son puanın: ${s}`} color={mc.deep} tint={mc.tint} /> : <Pill label="Henüz çözmedin" color={colors.inkSoft} tint={colors.surfaceAlt} />}
                    </View>
                    <Icon name="chevron-right" color={colors.muted} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, paddingRight: space.md, overflow: "hidden", ...shadow.card },
  spine: { width: 8, alignSelf: "stretch" },
});
