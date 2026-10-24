import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Screen } from "../src/components/Screen";
import { EmptyState } from "../src/components/States";
import { Button, Card, Chip, Icon, T } from "../src/components/ui";
import { plain } from "../src/format";
import { useApp } from "../src/store/AppContext";
import { colors, courseColor, radius, space } from "../src/theme";
import type { Question } from "../src/types";

type Sekme = "wrong" | "starred";

/** Yanlışlarım defteri: son cevabı yanlış olan sorular ve yıldızlananlar; buradan ayrı quiz kurulur. */
export default function Yanlislar() {
  const params = useLocalSearchParams<{ sekme?: string }>();
  const { kb, wrongIds, starred, toggleStar } = useApp();
  const [sekme, setSekme] = useState<Sekme>(params.sekme === "starred" ? "starred" : "wrong");

  const lists = useMemo(() => {
    if (!kb) return { wrong: [] as Question[], starred: [] as Question[] };
    const byId = kb.questionById;
    return {
      wrong: wrongIds.map((id) => byId.get(id)).filter((q): q is Question => !!q && q.kind === "mcq"),
      starred: kb.questions.filter((q) => q.kind === "mcq" && starred.has(q.id)),
    };
  }, [kb, wrongIds, starred]);

  const list = lists[sekme];

  return (
    <Screen
      back
      title="Yanlışlarım"
      subtitle="Tekrar bakman gereken sorular"
      footer={
        list.length > 0 ? (
          <Button
            label={`${Math.min(20, list.length)} soruyu çöz`}
            icon="play"
            size="lg"
            full
            onPress={() => router.push(`/quiz?scope=${sekme}`)}
          />
        ) : null
      }
    >
      <View style={styles.wrap}>
        <Chip label={`Yanlışlarım (${lists.wrong.length})`} icon="close-circle-outline" selected={sekme === "wrong"} onPress={() => setSekme("wrong")} />
        <Chip label={`Yıldızlılar (${lists.starred.length})`} icon="star-outline" selected={sekme === "starred"} onPress={() => setSekme("starred")} />
      </View>

      {list.length === 0 ? (
        <EmptyState
          icon={sekme === "wrong" ? "check-decagram-outline" : "star-outline"}
          title={sekme === "wrong" ? "Defterin boş" : "Yıldızlı soru yok"}
          text={
            sekme === "wrong"
              ? "Bir soruyu yanlış cevaplayınca buraya düşer. Sonra doğru cevaplayınca kendiliğinden çıkar."
              : "Soru çözerken sağ üstteki yıldıza dokun; tekrar bakmak istediğin sorular burada toplanır."
          }
          action="Quiz çöz"
          onAction={() => router.push("/quiz")}
        />
      ) : (
        <Card padded={false} style={{ padding: space.xs, marginTop: space.md }}>
          {list.map((q) => {
            const t = q.topic_id ? kb?.topicById.get(q.topic_id) : null;
            const c = courseColor(q.course_id);
            const on = starred.has(q.id);
            return (
              <View key={q.id} style={styles.row}>
                <Pressable
                  onPress={() => t && router.push(`/konu/${t.id}`)}
                  accessibilityRole="button"
                  accessibilityHint="Konuya gider"
                  style={({ pressed }) => [{ flex: 1, gap: 2 }, pressed && { opacity: 0.8 }]}
                >
                  <T v="body" numberOfLines={3}>
                    {plain(q.stem_md)}
                  </T>
                  {t ? (
                    <T v="small" color={c.deep} numberOfLines={1}>
                      {t.title}
                    </T>
                  ) : null}
                </Pressable>
                <Pressable
                  onPress={() => void toggleStar(q.id)}
                  accessibilityRole="button"
                  accessibilityLabel={on ? "Yıldızı kaldır" : "Yıldızla"}
                  hitSlop={8}
                  style={styles.star}
                >
                  <Icon name={on ? "star" : "star-outline"} color={on ? colors.warning : colors.muted} />
                </Pressable>
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.sm, borderRadius: radius.md, minHeight: 60 },
  star: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
