import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Screen } from "../src/components/Screen";
import { EmptyState } from "../src/components/States";
import { Icon, IconBubble, SectionTitle, T } from "../src/components/ui";
import { useApp } from "../src/store/AppContext";
import { colors, courseColor, radius, shadow, space } from "../src/theme";

export default function Tablolar() {
  const { kb } = useApp();
  if (!kb) return <Screen back title="Karşılaştırma tabloları"><EmptyState icon="cloud-download-outline" title="Bilgi bankası henüz inmedi" /></Screen>;
  const active = kb.courses.filter((c) => c.is_active);
  const any = kb.tables.some((t) => active.some((c) => c.id === t.course_id));

  return (
    <Screen back title="Karşılaştırma tabloları" subtitle="Sık karıştırılan kavramlar yan yana">
      {!any ? <EmptyState icon="table-large" title="Henüz tablo yok" text="İçerik üretildiğinde her ders için karşılaştırma tabloları burada listelenir." /> : null}
      {active.map((course) => {
        const list = kb.tables.filter((t) => t.course_id === course.id);
        if (list.length === 0) return null;
        const c = courseColor(course.id);
        return (
          <View key={course.id}>
            <SectionTitle title={course.name} />
            <View style={{ gap: space.sm }}>
              {list.map((t) => {
                const items = t.columns.filter((x) => x.trim()).slice(0, 4);
                return (
                  <Pressable key={t.id} onPress={() => router.push(`/tablo/${t.id}`)} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && { opacity: 0.88 }]}>
                    <IconBubble name="table-large" color={c.deep} tint={c.tint} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <T v="bodyStrong">{t.title}</T>
                      <View style={styles.tags}>
                        {items.map((it) => (
                          <View key={it} style={[styles.tag, { backgroundColor: c.tint }]}>
                            <T v="tiny" color={c.deep}>
                              {it}
                            </T>
                          </View>
                        ))}
                      </View>
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
  row: { flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, ...shadow.card },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
});
