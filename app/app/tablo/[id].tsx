import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Screen } from "../../src/components/Screen";
import { EmptyState } from "../../src/components/States";
import { Card, Chip, Gap, Icon, SectionTitle, T } from "../../src/components/ui";
import { useApp } from "../../src/store/AppContext";
import { colors, courseColor, radius, space } from "../../src/theme";

export default function TabloEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { kb } = useApp();
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<"kart" | "tablo">(width < 640 ? "kart" : "tablo");
  const t = kb?.tables.find((x) => x.id === id);

  if (!kb || !t) return <Screen back title="Tablo"><EmptyState icon="table-off" title="Tablo bulunamadı" /></Screen>;

  const c = courseColor(t.course_id);
  // İlk sütun başlığı boşsa satır etiketi sütunudur
  const hasRowLabel = !t.columns[0]?.trim();
  const dataCols = hasRowLabel ? t.columns.slice(1) : t.columns;

  return (
    <Screen back title={t.title} subtitle={kb.courseById.get(t.course_id)?.name} accent={c.main}>
      <View style={{ flexDirection: "row", gap: space.xs }}>
        <Chip label="Kart görünümü" icon="view-agenda-outline" selected={mode === "kart"} color={c.deep} onPress={() => setMode("kart")} />
        <Chip label="Tablo" icon="table" selected={mode === "tablo"} color={c.deep} onPress={() => setMode("tablo")} />
      </View>
      <Gap h={space.md} />

      {mode === "kart" ? (
        <View style={{ gap: space.sm }}>
          {dataCols.map((col, ci) => (
            <Card key={col} padded={false} style={{ overflow: "hidden" }}>
              <View style={[styles.cardHead, { backgroundColor: c.main }]}>
                <T v="subheading" color={colors.white}>
                  {col}
                </T>
              </View>
              {t.rows.map((r, ri) => (
                <View key={ri} style={[styles.kv, ri > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
                  {hasRowLabel ? (
                    <T v="smallStrong" color={c.deep}>
                      {r[0]}
                    </T>
                  ) : null}
                  <T v="body">{r[hasRowLabel ? ci + 1 : ci] || "—"}</T>
                </View>
              ))}
            </Card>
          ))}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingBottom: space.sm }}>
          <View style={styles.table}>
            <View style={[styles.tr, { backgroundColor: c.main }]}>
              {t.columns.map((col, i) => (
                <View key={i} style={[styles.cell, i === 0 && hasRowLabel ? styles.first : null]}>
                  <T v="smallStrong" color={colors.white}>
                    {col}
                  </T>
                </View>
              ))}
            </View>
            {t.rows.map((r, ri) => (
              <View key={ri} style={[styles.tr, { backgroundColor: ri % 2 ? c.tint : colors.surface }]}>
                {t.columns.map((_, i) => (
                  <View key={i} style={[styles.cell, i === 0 && hasRowLabel ? styles.first : null]}>
                    <T v={i === 0 && hasRowLabel ? "smallStrong" : "small"} color={i === 0 && hasRowLabel ? c.deep : colors.ink}>
                      {r[i] ?? ""}
                    </T>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {t.related_topic_ids.length > 0 ? (
        <>
          <SectionTitle title="İlgili konular" />
          <Card padded={false} style={{ padding: space.xs }}>
            {t.related_topic_ids.map((tid) => {
              const tp = kb.topicById.get(tid);
              if (!tp) return null;
              return (
                <Pressable key={tid} onPress={() => router.push(`/konu/${tid}`)} accessibilityRole="button" style={({ pressed }) => [styles.link, pressed && { opacity: 0.8 }]}>
                  <Icon name="book-open-variant" color={c.deep} />
                  <T v="bodyStrong" style={{ flex: 1 }}>
                    {tp.title}
                  </T>
                  <Icon name="chevron-right" color={colors.muted} />
                </Pressable>
              );
            })}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardHead: { paddingHorizontal: space.lg, paddingVertical: space.sm },
  kv: { paddingHorizontal: space.lg, paddingVertical: space.sm, gap: 2 },
  table: { borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: colors.line },
  tr: { flexDirection: "row" },
  cell: { width: 200, padding: space.sm, borderRightWidth: 1, borderRightColor: colors.line },
  first: { width: 150 },
  link: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.sm, minHeight: 52, borderRadius: radius.md },
});
