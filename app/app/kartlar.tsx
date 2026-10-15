import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Markdown } from "../src/components/Markdown";
import { Screen } from "../src/components/Screen";
import { EmptyState } from "../src/components/States";
import { Bar, Button, Chip, Gap, Icon, T, type IconName } from "../src/components/ui";
import { formatDate } from "../src/format";
import { intervalLabel, review } from "../src/sm2";
import { useApp } from "../src/store/AppContext";
import { colors, courseColor, radius, shadow, space } from "../src/theme";
import type { Flashcard, Grade } from "../src/types";

const GRADES: { grade: Grade; label: string; icon: IconName; color: string; tint: string; deep: string }[] = [
  { grade: "again", label: "Bilemedim", icon: "close-circle-outline", color: colors.danger, tint: colors.dangerTint, deep: colors.dangerDeep },
  { grade: "hard", label: "Zorlandım", icon: "emoticon-confused-outline", color: colors.warning, tint: colors.warningTint, deep: colors.warningDeep },
  { grade: "good", label: "Bildim", icon: "check-circle-outline", color: colors.success, tint: colors.successTint, deep: colors.successDeep },
  { grade: "easy", label: "Çok kolay", icon: "star-circle-outline", color: colors.info, tint: colors.infoTint, deep: colors.infoDeep },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Kartlar() {
  const params = useLocalSearchParams<{ course?: string }>();
  const { kb, dueCards, cardStates, reviewCard } = useApp();
  const [filter, setFilter] = useState<string | null>(params.course ?? null);
  const [queue, setQueue] = useState<Flashcard[] | null>(null);
  const [pos, setPos] = useState(0);
  const [shown, setShown] = useState(false);
  const [counts, setCounts] = useState<Record<Grade, number>>({ again: 0, hard: 0, good: 0, easy: 0 });
  const requeued = useRef(new Set<string>());
  const flip = useRef(new Animated.Value(0)).current;

  const allDue = dueCards();
  const due = useMemo(() => allDue.filter((c) => !filter || c.course_id === filter), [allDue, filter]);
  const coursesWithDue = useMemo(() => {
    const ids = new Set(allDue.map((c) => c.course_id));
    return (kb?.courses ?? []).filter((c) => ids.has(c.id));
  }, [allDue, kb]);

  const nextDue = useMemo(() => {
    let min: string | null = null;
    for (const s of cardStates.values()) if (!min || s.due_at < min) min = s.due_at;
    return min;
  }, [cardStates]);

  if (!kb) {
    return (
      <Screen back title="Kartlar">
        <EmptyState icon="cloud-download-outline" title="Bilgi bankası henüz inmedi" />
      </Screen>
    );
  }

  // ---------------------------------------------------- Başlangıç
  if (queue === null) {
    return (
      <Screen
        back
        title="Tekrar kartları"
        subtitle={due.length > 0 ? `${due.length} kartın vadesi geldi` : "Bugün tekrar edilecek kart yok"}
        footer={
          due.length > 0 ? (
            <Button
              label={`${due.length} kartla başla`}
              icon="play"
              size="lg"
              full
              onPress={() => {
                setQueue(shuffle(due));
                setPos(0);
                setShown(false);
              }}
            />
          ) : null
        }
      >
        {coursesWithDue.length > 1 ? (
          <View style={styles.wrap}>
            <Chip label="Tümü" selected={!filter} onPress={() => setFilter(null)} />
            {coursesWithDue.map((c) => (
              <Chip key={c.id} label={c.name} color={courseColor(c.id).main} selected={filter === c.id} onPress={() => setFilter(c.id)} />
            ))}
          </View>
        ) : null}
        {due.length === 0 ? (
          <EmptyState
            icon="check-decagram-outline"
            title="Bugünlük kartlar bitti"
            text={nextDue ? `Bir sonraki tekrar ${formatDate(nextDue)} tarihinde. Bu arada bir quiz çözebilirsin.` : "Kart eklendiğinde burada görünür."}
            color={colors.successDeep}
            tint={colors.successTint}
            action="Quiz çöz"
            onAction={() => router.replace("/quiz")}
          />
        ) : (
          <View style={{ gap: space.sm, marginTop: space.md }}>
            <T v="body" color={colors.inkSoft}>
              Kartın ön yüzünü oku, cevabı aklından söyle, sonra çevir. Ne kadar bildiğini dürüstçe işaretle: bilemediklerin yarın, kolay olanlar daha ileri bir tarihte tekrar gelir.
            </T>
          </View>
        )}
      </Screen>
    );
  }

  // ---------------------------------------------------- Bitti
  if (pos >= queue.length) {
    const total = counts.again + counts.hard + counts.good + counts.easy;
    return (
      <Screen back title="Tebrikler">
        <EmptyState icon="party-popper" title={`${total} tekrar tamamlandı`} text="Bugünlük kartların bitti. Yarın yeni tekrarlar gelecek." color={colors.successDeep} tint={colors.successTint} />
        <View style={styles.stats}>
          {GRADES.map((g) => (
            <View key={g.grade} style={[styles.stat, { backgroundColor: g.tint }]}>
              <T v="title" color={g.deep}>
                {counts[g.grade]}
              </T>
              <T v="small" color={g.deep}>
                {g.label}
              </T>
            </View>
          ))}
        </View>
        <Gap h={space.lg} />
        <Button label="Ana sayfaya dön" icon="home-variant-outline" kind="secondary" onPress={() => router.replace("/")} />
      </Screen>
    );
  }

  // ---------------------------------------------------- Kart
  const card = queue[pos];
  const c = courseColor(card.course_id);
  const topic = card.topic_id ? kb.topicById.get(card.topic_id) : null;
  const state = cardStates.get(card.id) ?? null;
  const now = new Date();

  function reveal() {
    setShown(true);
    Animated.spring(flip, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
  }

  async function grade(g: Grade) {
    await reviewCard(card.id, g);
    setCounts((x) => ({ ...x, [g]: x[g] + 1 }));
    // "Bilemedim" denen kart oturum sonunda bir kez daha gelir
    if (g === "again" && !requeued.current.has(card.id)) {
      requeued.current.add(card.id);
      setQueue((q) => (q ? [...q, card] : q));
    }
    flip.setValue(0);
    setShown(false);
    setPos((p) => p + 1);
  }

  const scale = flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.97, 1] });

  return (
    <Screen back title={`Kart ${pos + 1} / ${queue.length}`} subtitle={topic?.title}>
      <Bar value={(pos / queue.length) * 100} color={c.main} track={c.tint} height={10} />
      <Gap h={space.lg} />
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable onPress={shown ? undefined : reveal} accessibilityRole="button" accessibilityLabel={shown ? "Kartın arka yüzü" : "Cevabı göstermek için dokun"} style={[styles.card, { borderTopColor: c.main }]}>
          <T v="smallStrong" color={c.deep}>
            {kb.courseById.get(card.course_id)?.name}
            {card.origin === "note" ? ", notundan" : ""}
          </T>
          <Gap h={space.sm} />
          <Markdown reading accent={c.main}>
            {card.front_md}
          </Markdown>
          {shown ? (
            <>
              <View style={[styles.divider, { backgroundColor: c.tint }]} />
              <Markdown reading accent={c.main}>
                {card.back_md}
              </Markdown>
            </>
          ) : (
            <View style={styles.tapHint}>
              <Icon name="gesture-tap" color={colors.muted} />
              <T v="small" color={colors.muted}>
                Cevabı görmek için dokun
              </T>
            </View>
          )}
        </Pressable>
      </Animated.View>
      <Gap h={space.lg} />
      {shown ? (
        <View style={styles.grades}>
          {GRADES.map((g) => {
            const next = review(state, g.grade, now, card.id);
            return (
              <Pressable
                key={g.grade}
                onPress={() => void grade(g.grade)}
                accessibilityRole="button"
                accessibilityLabel={`${g.label}, tekrar ${intervalLabel(next.interval_days)}`}
                style={({ pressed }) => [styles.grade, { backgroundColor: g.tint, borderColor: g.color }, pressed && { opacity: 0.8 }]}
              >
                <Icon name={g.icon} size={28} color={g.deep} />
                <T v="smallStrong" color={g.deep}>
                  {g.label}
                </T>
                <T v="tiny" color={g.deep}>
                  {intervalLabel(next.interval_days)}
                </T>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Button label="Cevabı göster" icon="rotate-3d-variant" size="lg" full color={c.deep} onPress={reveal} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginBottom: space.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.xl,
    minHeight: 280,
    borderTopWidth: 8,
    ...shadow.raised,
  },
  divider: { height: 3, borderRadius: 2, marginVertical: space.md },
  tapHint: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: "auto", paddingTop: space.lg, justifyContent: "center" },
  grades: { flexDirection: "row", gap: space.xs },
  grade: { flex: 1, alignItems: "center", gap: 4, paddingVertical: space.md, paddingHorizontal: 4, borderRadius: radius.lg, borderWidth: 2, minHeight: 104 },
  stats: { flexDirection: "row", gap: space.xs, flexWrap: "wrap" },
  stat: { flexGrow: 1, flexBasis: "22%", alignItems: "center", padding: space.md, borderRadius: radius.lg },
});
