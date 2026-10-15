import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { api, errorText } from "../../src/api";
import { Screen } from "../../src/components/Screen";
import { EmptyState, ErrorState, LoadingState, Notice } from "../../src/components/States";
import { Button, Gap, Icon, IconBubble, SectionTitle, T } from "../../src/components/ui";
import { timeAgo } from "../../src/format";
import { useApp } from "../../src/store/AppContext";
import { colors, courseColor, radius, shadow, space } from "../../src/theme";
import type { Thread } from "../../src/types";

export default function Asistan() {
  const { kb } = useApp();
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setThreads(await api.listThreads());
      setError(null);
    } catch (e) {
      setError(errorText(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen
      title="Asistan"
      subtitle="Anlamadığın yeri sor, kaynağıyla cevaplasın"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      <Notice tone="info" icon="scale-balance" text="Asistanın cevapları hukuki danışmanlık değildir. Önemli bir bilgiyi resmî kaynaktan teyit et." />
      <Gap h={space.md} />
      <Button label="Yeni sohbet başlat" icon="chat-plus-outline" size="lg" full onPress={() => router.push("/sohbet/yeni")} />

      <SectionTitle title="Sohbetlerin" />
      {threads === null && !error ? <LoadingState text="Sohbetler getiriliyor…" /> : null}
      {threads === null && error ? <ErrorState text={`${error} Asistan için internet gerekir.`} onRetry={() => void load()} /> : null}
      {threads && threads.length === 0 ? (
        <EmptyState
          icon="chat-question-outline"
          title="Henüz sohbet yok"
          text="Bir konu sayfasındaki “Asistana sor” düğmesiyle başlarsan, asistan o konuyu bağlam olarak alır."
        />
      ) : null}
      {threads && threads.length > 0 ? (
        <View style={{ gap: space.sm }}>
          {threads.map((t) => {
            const topic = t.topic_id ? kb?.topicById.get(t.topic_id) : null;
            const c = courseColor(topic?.course_id);
            return (
              <Pressable
                key={t.id}
                onPress={() => router.push(`/sohbet/${t.id}`)}
                accessibilityRole="button"
                accessibilityLabel={t.title}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.88 }]}
              >
                <IconBubble name={topic ? "book-open-variant" : "chat-outline"} color={topic ? c.deep : colors.primary} tint={topic ? c.tint : colors.primaryTint} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="bodyStrong" numberOfLines={2}>
                    {t.title}
                  </T>
                  <T v="small" color={topic ? c.deep : colors.muted} numberOfLines={1}>
                    {topic ? topic.title : "Genel soru"}, {timeAgo(t.created_at)}
                  </T>
                </View>
                <Icon name="chevron-right" color={colors.muted} />
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow.card,
  },
});
