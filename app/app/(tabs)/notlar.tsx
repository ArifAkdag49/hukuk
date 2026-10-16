import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { api, errorText } from "../../src/api";
import { HeaderButton, Screen } from "../../src/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "../../src/components/States";
import { NoteStatusPill } from "../../src/components/NoteStatus";
import { Button, Gap, Icon, T } from "../../src/components/ui";
import { formatDate } from "../../src/format";
import { useApp } from "../../src/store/AppContext";
import { colors, courseColor, radius, shadow, space } from "../../src/theme";
import type { NoteSummary } from "../../src/types";

export default function Notlarim() {
  const { kb } = useApp();
  const [notes, setNotes] = useState<NoteSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await api.listNotes();
      setNotes(list);
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

  // İşlenen not varken 5 saniyede bir yenile
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (notes?.some((n) => n.status === "processing")) timer.current = setTimeout(() => void load(), 5000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [notes, load]);

  const right = <HeaderButton icon="plus" label="Not yükle" onPress={() => router.push("/not-yukle")} color={colors.primary} />;

  let body;
  if (notes === null && !error) body = <LoadingState text="Notların getiriliyor…" />;
  else if (notes === null && error)
    body = <ErrorState text={`${error} Notlar sunucuda tutulduğu için internet gerekir.`} onRetry={() => void load()} />;
  else if (notes && notes.length === 0)
    body = (
      <EmptyState
        icon="notebook-plus-outline"
        title="Henüz not yüklemedin"
        text="Ders notunun PDF'ini ya da fotoğrafını yükle. Özetini çıkarır, bilgi bankasıyla karşılaştırır ve sana sorular hazırlarız."
        action="İlk notunu yükle"
        onAction={() => router.push("/not-yukle")}
      />
    );
  else
    body = (
      <View style={{ gap: space.sm }}>
        {notes!.map((n) => {
          const c = courseColor(n.course_id);
          return (
            <Pressable
              key={n.id}
              onPress={() => router.push(`/not/${n.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${n.title}, ${n.status === "ready" ? "hazır" : n.status === "failed" ? "okunamadı" : "işleniyor"}`}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.88 }]}
            >
              <View style={[styles.icon, { backgroundColor: c.tint }]}>
                {n.status === "processing" ? <ActivityIndicator color={c.deep} /> : <Icon name="file-document-outline" color={c.deep} size={26} />}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <T v="bodyStrong" numberOfLines={2}>
                  {n.title}
                </T>
                <T v="small" color={c.deep} numberOfLines={1}>
                  {kb?.courseById.get(n.course_id)?.name ?? n.course_id}
                </T>
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <NoteStatusPill status={n.status} />
                  <T v="tiny" color={colors.muted}>
                    {formatDate(n.created_at)}
                  </T>
                </View>
              </View>
              <Icon name="chevron-right" color={colors.muted} />
            </Pressable>
          );
        })}
        {error ? <T v="small" color={colors.dangerDeep}>{error}</T> : null}
      </View>
    );

  return (
    <Screen
      title="Notlarım"
      subtitle="Yüklediğin ders notları"
      right={right}
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
      {body}
      {notes && notes.length > 0 ? (
        <>
          <Gap h={space.lg} />
          <Button label="Yeni not yükle" icon="upload" kind="secondary" onPress={() => router.push("/not-yukle")} />
        </>
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
  icon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
