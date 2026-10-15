import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { weakestTopics } from "../../src/analysis";
import { TopicRow } from "../../src/components/Course";
import { HeaderButton, Screen } from "../../src/components/Screen";
import { EmptyState, LoadingState } from "../../src/components/States";
import { SyncBanner } from "../../src/components/SyncBanner";
import { Button, Card, Gap, Icon, IconBubble, SectionTitle, T, type IconName } from "../../src/components/ui";
import { useApp } from "../../src/store/AppContext";
import { colors, courseColor, radius, shadow, space } from "../../src/theme";

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 6) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
}

export default function AnaSayfa() {
  const { kb, sync, syncNow, mastery, dueCards, lastTopicId, attempts } = useApp();

  const due = dueCards();
  const activeTopics = useMemo(() => {
    if (!kb) return [];
    const active = new Set(kb.courses.filter((c) => c.is_active).map((c) => c.id));
    return kb.topics.filter((t) => active.has(t.course_id));
  }, [kb]);
  const weak = useMemo(() => weakestTopics(mastery, activeTopics, 5), [mastery, activeTopics]);

  const todayCount = useMemo(() => {
    const d = new Date().toDateString();
    return attempts.filter((a) => new Date(a.created_at).toDateString() === d).length;
  }, [attempts]);

  const right = <HeaderButton icon="cog-outline" label="Ayarlar" onPress={() => router.push("/ayarlar")} />;

  if (!kb) {
    return (
      <Screen title={greeting()} right={right}>
        <SyncBanner />
        {sync.state === "syncing" ? (
          <LoadingState text="Bilgi bankası telefonuna indiriliyor. İlk seferde biraz sürebilir." />
        ) : (
          <EmptyState
            icon="cloud-download-outline"
            title="Bilgi bankası henüz inmedi"
            text="Konuları, soruları ve kartları indirmek için internete bağlıyken dokun."
            action="Şimdi indir"
            onAction={() => void syncNow()}
          />
        )}
      </Screen>
    );
  }

  const lastTopic = (lastTopicId && kb.topicById.get(lastTopicId)) || activeTopics[0] || null;
  const lastColor = courseColor(lastTopic?.course_id);
  const lastCourse = lastTopic ? kb.courseById.get(lastTopic.course_id) : null;

  return (
    <Screen title={greeting()} subtitle={todayCount > 0 ? `Bugün ${todayCount} soru çözdün` : "Bugün nereden başlayalım?"} right={right}>
      <SyncBanner />

      {/* Bugünkü kartlar */}
      <View style={styles.hero}>
        <View style={{ flex: 1, gap: 6 }}>
          <T v="smallStrong" color={colors.primaryTint}>
            Bugünkü tekrar
          </T>
          {due.length > 0 ? (
            <>
              <T v="display" color={colors.white}>
                {due.length} kart
              </T>
              <T v="body" color={colors.primaryTint}>
                Seni bekliyor. Birkaç dakikada bitirebilirsin.
              </T>
            </>
          ) : (
            <>
              <T v="title" color={colors.white}>
                Bugünlük kartlar bitti
              </T>
              <T v="body" color={colors.primaryTint}>
                Yarın yeni tekrarlar gelecek. İstersen kısa bir quiz çöz.
              </T>
            </>
          )}
          <Gap h={space.xs} />
          <Pressable
            onPress={() => router.push(due.length > 0 ? "/kartlar" : "/quiz")}
            accessibilityRole="button"
            style={({ pressed }) => [styles.heroBtn, pressed && { opacity: 0.85 }]}
          >
            <Icon name={due.length > 0 ? "cards-outline" : "help-circle-outline"} color={colors.primary} />
            <T v="bodyStrong" color={colors.primary}>
              {due.length > 0 ? "Kartlara başla" : "Quiz çöz"}
            </T>
          </Pressable>
        </View>
        <View style={styles.heroDeck} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.deckCard, { transform: [{ translateX: -10 }, { rotate: "-14deg" }], backgroundColor: courseColor("HUK2011").main }]} />
          <View style={[styles.deckCard, { transform: [{ translateX: 8 }, { rotate: "9deg" }], backgroundColor: courseColor("HUK2013").main }]} />
          <View style={[styles.deckCard, { backgroundColor: colors.white, alignItems: "center", justifyContent: "center" }]}>
            <Icon name="scale-balance" size={30} color={colors.primary} />
          </View>
        </View>
      </View>

      {/* Kaldığın yerden */}
      {lastTopic ? (
        <>
          <SectionTitle title={lastTopicId ? "Kaldığın yerden devam et" : "Buradan başlayabilirsin"} />
          <Card onPress={() => router.push(`/konu/${lastTopic.id}`)} accessibilityLabel={`Devam et: ${lastTopic.title}`} padded={false}>
            <View style={{ flexDirection: "row" }}>
              <View style={{ width: 8, backgroundColor: lastColor.main, borderTopLeftRadius: radius.lg, borderBottomLeftRadius: radius.lg }} />
              <View style={{ flex: 1, padding: space.lg, gap: 4 }}>
                <T v="small" color={lastColor.deep} numberOfLines={1}>
                  {lastCourse?.name}
                </T>
                <T v="subheading">{lastTopic.title}</T>
              </View>
              <View style={{ justifyContent: "center", paddingRight: space.lg }}>
                <IconBubble name="book-open-page-variant-outline" color={lastColor.deep} tint={lastColor.tint} />
              </View>
            </View>
          </Card>
        </>
      ) : null}

      {/* Zayıf konular */}
      <SectionTitle title="Şuna çalış" action={weak.length > 0 ? "Eksik analizi" : undefined} onAction={() => router.push("/analiz")} />
      {weak.length > 0 ? (
        <Card padded={false} style={{ paddingVertical: space.xs, paddingHorizontal: space.xs }}>
          {weak.map(({ topic, mastery: m }) => (
            <TopicRow
              key={topic.id}
              topic={topic}
              score={m.score}
              dataPoints={m.dataPoints}
              showCourse
              courseName={kb.courseById.get(topic.course_id)?.name}
              onPress={() => router.push(`/konu/${topic.id}`)}
            />
          ))}
        </Card>
      ) : (
        <Card>
          <T v="body" color={colors.inkSoft}>
            Bir konuda en az 3 soru çözünce ya da kart tekrar edince, en zayıf konuların burada sıralanır.
          </T>
          <Gap h={space.md} />
          <Button label="Karışık quiz çöz" icon="shuffle-variant" kind="secondary" onPress={() => router.push("/quiz?scope=mixed")} />
        </Card>
      )}

      {/* Hızlı erişim */}
      <SectionTitle title="Çalışma araçları" />
      <View style={styles.grid}>
        <Quick icon="help-circle-outline" title="Quiz" text="Ders, ünite ya da konu seç" color={courseColor("HUK3012")} onPress={() => router.push("/quiz")} />
        <Quick icon="gavel" title="Olay çözme" text="Cevabını yaz, puanını gör" color={courseColor("HUK2009")} onPress={() => router.push("/olaylar")} />
        <Quick icon="table-large" title="Karşılaştırma" text="Karıştırılan kavramlar" color={courseColor("HUK2013")} onPress={() => router.push("/tablolar")} />
        <Quick icon="chart-donut" title="Eksik analizi" text="Nerede zorlanıyorsun?" color={courseColor("HUK2003")} onPress={() => router.push("/analiz")} />
      </View>
    </Screen>
  );
}

function Quick({
  icon,
  title,
  text,
  color,
  onPress,
}: {
  icon: IconName;
  title: string;
  text: string;
  color: { main: string; tint: string; deep: string };
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${text}`}
      style={({ pressed }) => [styles.quick, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
    >
      <IconBubble name={icon} color={color.deep} tint={color.tint} size={48} />
      <T v="subheading">{title}</T>
      <T v="small" color={colors.muted}>
        {text}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: space.xl,
    gap: space.md,
    overflow: "hidden",
    ...shadow.raised,
  },
  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    minHeight: 48,
    alignSelf: "flex-start",
  },
  heroDeck: { width: 86, alignItems: "center", justifyContent: "center" },
  deckCard: {
    position: "absolute",
    width: 66,
    height: 88,
    borderRadius: 12,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  quick: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: 6,
    minHeight: 150,
    ...shadow.card,
  },
});
