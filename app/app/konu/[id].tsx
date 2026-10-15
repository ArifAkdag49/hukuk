import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { VerificationBadge } from "../../src/components/Course";
import { Markdown, openLink } from "../../src/components/Markdown";
import { Screen } from "../../src/components/Screen";
import { EmptyState, LoadingState } from "../../src/components/States";
import { Button, Card, Gap, Icon, Pill, Row, T, type IconName } from "../../src/components/ui";
import { useApp } from "../../src/store/AppContext";
import { colors, courseColor, radius, space, type CourseColor } from "../../src/theme";
import type { Topic } from "../../src/types";
import { formatDate, lawAbbrev } from "../../src/format";

type Tab = "ozet" | "anlatim" | "kritik" | "maddeler" | "kararlar" | "sozluk";
const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: "ozet", label: "Özet", icon: "text-short" },
  { key: "anlatim", label: "Anlatım", icon: "book-open-variant" },
  { key: "kritik", label: "Kritik", icon: "star-four-points-outline" },
  { key: "maddeler", label: "Maddeler", icon: "scale-balance" },
  { key: "kararlar", label: "Kararlar", icon: "gavel" },
  { key: "sozluk", label: "Sözlük", icon: "alphabetical-variant" },
];

export default function KonuEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { kb, getTopic, setLastTopic, mastery } = useApp();
  const [topic, setTopic] = useState<Topic | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("ozet");

  useEffect(() => {
    let alive = true;
    void getTopic(String(id)).then((t) => {
      if (!alive) return;
      setTopic(t);
      if (t) void setLastTopic(t.id);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (topic === undefined) {
    return (
      <Screen back>
        <LoadingState />
      </Screen>
    );
  }
  if (topic === null) {
    return (
      <Screen back title="Konu">
        <EmptyState icon="file-question-outline" title="Konu bulunamadı" text="Bilgi bankası güncellenmiş olabilir. Ders listesinden tekrar seç." action="Derslere dön" onAction={() => router.replace("/dersler")} />
      </Screen>
    );
  }

  const c = courseColor(topic.course_id);
  const course = kb?.courseById.get(topic.course_id);
  const unit = kb?.units.find((u) => u.id === topic.unit_id);
  const m = mastery.get(topic.id);
  const questionCount = kb?.questionsByTopic.get(topic.id)?.filter((q) => q.kind === "mcq").length ?? 0;

  const footer = (
    <View style={{ flexDirection: "row", gap: space.sm, width: "100%", maxWidth: 720, alignSelf: "center" }}>
      <Button
        label="Bu konudan quiz çöz"
        icon="help-circle-outline"
        color={c.deep}
        style={{ flex: 1.4 }}
        disabled={questionCount === 0}
        onPress={() => router.push(`/quiz?scope=topic&id=${topic.id}`)}
      />
      <Button label="Asistana sor" icon="chat-question-outline" kind="secondary" color={c.deep} style={{ flex: 1 }} onPress={() => router.push(`/sohbet/yeni?topic=${topic.id}`)} />
    </View>
  );

  return (
    <Screen back title={topic.title} subtitle={[course?.name, unit?.title].filter(Boolean).join(" / ")} accent={c.main} footer={footer}>
      <Row style={{ flexWrap: "wrap" }} gap={space.xs}>
        <VerificationBadge status={topic.verification_status} />
        {m?.score != null ? <Pill label={`Ustalık %${m.score}`} icon="chart-arc" color={c.deep} tint={c.tint} /> : null}
        {topic.generated_at ? <Pill label={`Hazırlanma: ${formatDate(topic.generated_at)}`} icon="calendar-outline" color={colors.inkSoft} tint={colors.surfaceAlt} /> : null}
      </Row>
      <Gap h={space.md} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs, paddingRight: space.lg }} accessibilityRole="tablist">
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.tab, on ? { backgroundColor: c.main, borderColor: c.main } : null]}
            >
              <Icon name={t.icon} size={18} color={on ? colors.white : colors.inkSoft} />
              <T v="smallStrong" color={on ? colors.white : colors.inkSoft}>
                {t.label}
              </T>
            </Pressable>
          );
        })}
      </ScrollView>
      <Gap h={space.md} />

      {tab === "ozet" ? <TextPanel md={topic.summary_md} c={c} empty="Bu konunun özeti henüz hazır değil." /> : null}
      {tab === "anlatim" ? (
        <>
          <TextPanel md={topic.content_md} c={c} empty="Bu konunun anlatımı henüz hazır değil." />
          {topic.doctrine_md ? (
            <>
              <Gap h={space.md} />
              <Card style={{ backgroundColor: c.tint }}>
                <Row>
                  <Icon name="account-group-outline" color={c.deep} />
                  <T v="subheading" color={c.deep}>
                    Doktrindeki görüşler
                  </T>
                </Row>
                <Gap h={space.xs} />
                <Markdown reading accent={c.main}>
                  {topic.doctrine_md}
                </Markdown>
              </Card>
            </>
          ) : null}
        </>
      ) : null}
      {tab === "kritik" ? (
        topic.critical_md ? (
          <Card style={{ borderWidth: 2, borderColor: colors.warning }}>
            <Row>
              <Icon name="star-four-points" color={colors.warningDeep} />
              <T v="subheading" color={colors.warningDeep}>
                Sınavda dikkat
              </T>
            </Row>
            <Gap h={space.xs} />
            <Markdown accent={colors.warning}>{topic.critical_md}</Markdown>
          </Card>
        ) : (
          <EmptyState icon="star-off-outline" title="Kritik notlar henüz yok" />
        )
      ) : null}
      {tab === "maddeler" ? <Articles topic={topic} c={c} /> : null}
      {tab === "kararlar" ? <Cases topic={topic} c={c} /> : null}
      {tab === "sozluk" ? <Glossary topic={topic} c={c} /> : null}
    </Screen>
  );
}

function TextPanel({ md, c, empty }: { md: string; c: CourseColor; empty: string }) {
  if (!md) return <EmptyState icon="text-box-remove-outline" title={empty} color={c.deep} tint={c.tint} />;
  return (
    <Card>
      <Markdown reading accent={c.main}>
        {md}
      </Markdown>
    </Card>
  );
}

function Articles({ topic, c }: { topic: Topic; c: CourseColor }) {
  if (topic.articles.length === 0)
    return <EmptyState icon="scale-balance" title="Bu konuya bağlı madde yok" color={c.deep} tint={c.tint} />;
  return (
    <View style={{ gap: space.sm }}>
      {topic.articles.map((a, i) => (
        <Card key={`${a.law_no}-${a.article_no}-${i}`}>
          <Row style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <T v="subheading" color={c.deep}>
                {lawAbbrev(a.law_name)} m. {a.article_no}
              </T>
              <T v="small" color={colors.muted}>
                {a.law_name}
                {a.law_no ? ` (${a.law_no} sayılı)` : ""}
              </T>
            </View>
            {a.verified ? (
              <Pill label="Resmî metin" icon="check-decagram" color={colors.successDeep} tint={colors.successTint} />
            ) : (
              <Pill label="Doğrulanamadı" icon="alert-decagram-outline" color={colors.warningDeep} tint={colors.warningTint} />
            )}
          </Row>
          <Gap h={space.sm} />
          <View style={[styles.quote, { borderLeftColor: c.main }]}>
            <T v="reading">{a.official_text}</T>
          </View>
          {a.source_url ? (
            <Pressable onPress={() => openLink(a.source_url!)} accessibilityRole="link" style={styles.link} hitSlop={6}>
              <Icon name="open-in-new" size={18} color={colors.primary} />
              <T v="smallStrong" color={colors.primary}>
                Mevzuat Bilgi Sistemi'nde aç
              </T>
            </Pressable>
          ) : null}
        </Card>
      ))}
    </View>
  );
}

function Cases({ topic, c }: { topic: Topic; c: CourseColor }) {
  if (topic.cases.length === 0)
    return (
      <EmptyState
        icon="gavel"
        title="Bu konu için karar eklenmedi"
        text="Kararlar yalnızca resmî kaynaktan doğrulanabildiğinde eklenir. Asistana sorarak güncel kararları aratabilirsin."
        color={c.deep}
        tint={c.tint}
      />
    );
  return (
    <View style={{ gap: space.sm }}>
      {topic.cases.map((k, i) => {
        const kunye = [k.chamber, k.esas_no ? `E. ${k.esas_no}` : null, k.karar_no ? `K. ${k.karar_no}` : null, formatDate(k.decision_date)]
          .filter(Boolean)
          .join(", ");
        return (
          <Card key={i}>
            <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <T v="subheading">{k.court}</T>
                {kunye ? (
                  <T v="small" color={colors.muted}>
                    {kunye}
                  </T>
                ) : null}
              </View>
              {k.verified ? (
                <Pill label="Doğrulandı" icon="check-decagram" color={colors.successDeep} tint={colors.successTint} />
              ) : (
                <Pill label="Doğrulanmadı" icon="alert-decagram-outline" color={colors.warningDeep} tint={colors.warningTint} />
              )}
            </Row>
            <Gap h={space.sm} />
            <Markdown reading accent={c.main}>
              {k.summary_md}
            </Markdown>
            {k.source_url ? (
              <Pressable onPress={() => openLink(k.source_url!)} accessibilityRole="link" style={styles.link} hitSlop={6}>
                <Icon name="open-in-new" size={18} color={colors.primary} />
                <T v="smallStrong" color={colors.primary}>
                  Karar kaynağını aç
                </T>
              </Pressable>
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}

function Glossary({ topic, c }: { topic: Topic; c: CourseColor }) {
  if (topic.glossary.length === 0) return <EmptyState icon="alphabetical-variant" title="Sözlük boş" color={c.deep} tint={c.tint} />;
  return (
    <Card padded={false}>
      {topic.glossary.map((g, i) => (
        <View key={g.term} style={[styles.term, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
          <T v="subheading" color={c.deep}>
            {g.term}
          </T>
          <T v="body" color={colors.inkSoft}>
            {g.definition}
          </T>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: space.md,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  quote: { borderLeftWidth: 4, paddingLeft: space.md, paddingVertical: 2 },
  link: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.md, minHeight: 32 },
  term: { padding: space.lg, gap: 4 },
});
