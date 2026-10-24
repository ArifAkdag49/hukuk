import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { VerificationBadge } from "../../src/components/Course";
import { HighlightableMarkdown } from "../../src/components/HighlightableMarkdown";
import { Markdown, openLink } from "../../src/components/Markdown";
import { Screen } from "../../src/components/Screen";
import { EmptyState, LoadingState } from "../../src/components/States";
import { Button, Card, Gap, Icon, Pill, Row, T, type IconName } from "../../src/components/ui";
import { blockHash, splitBlocks } from "../../src/highlights";
import { useApp } from "../../src/store/AppContext";
import { colors, courseColor, fonts, radius, space, type CourseColor } from "../../src/theme";
import type { Highlight, HighlightSection, Topic } from "../../src/types";
import { formatDate, formatDateTime, lawAbbrev } from "../../src/format";

type Tab = "ozet" | "anlatim" | "kritik" | "maddeler" | "kararlar" | "sozluk" | "notum";
const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: "ozet", label: "Özet", icon: "text-short" },
  { key: "anlatim", label: "Anlatım", icon: "book-open-variant" },
  { key: "kritik", label: "Kritik", icon: "star-four-points-outline" },
  { key: "maddeler", label: "Maddeler", icon: "scale-balance" },
  { key: "kararlar", label: "Kararlar", icon: "gavel" },
  { key: "sozluk", label: "Sözlük", icon: "alphabetical-variant" },
  { key: "notum", label: "Notum", icon: "notebook-edit-outline" },
];

const SECTION_TAB: Record<HighlightSection, Tab> = { summary: "ozet", content: "anlatim", critical: "kritik", doctrine: "anlatim" };
const SECTION_LABEL: Record<HighlightSection, string> = { summary: "Özet", content: "Anlatım", critical: "Kritik", doctrine: "Doktrin" };
const HINT_KEY = "hint_highlight_seen";

function isTab(x: unknown): x is Tab {
  return typeof x === "string" && TABS.some((t) => t.key === x);
}

export default function KonuEkrani() {
  const { id, sekme } = useLocalSearchParams<{ id: string; sekme?: string }>();
  const { kb, getTopic, setLastTopic, mastery, listHighlights, toggleHighlight, getMeta, setMeta } = useApp();
  const [topic, setTopic] = useState<Topic | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>(isTab(sekme) ? sekme : "ozet");
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    let alive = true;
    void getTopic(String(id)).then((t) => {
      if (!alive) return;
      setTopic(t);
      if (t) void setLastTopic(t.id);
    });
    void listHighlights(String(id)).then((h) => alive && setHighlights(h));
    void getMeta(HINT_KEY).then((v) => alive && setShowHint(v !== "1"));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Aramadan farklı bir sekmeyle gelinirse
  useEffect(() => {
    if (isTab(sekme)) setTab(sekme);
  }, [sekme]);

  const hashesBySection = useMemo(() => {
    const m: Record<HighlightSection, Set<string>> = { summary: new Set(), content: new Set(), critical: new Set(), doctrine: new Set() };
    for (const h of highlights) m[h.section]?.add(h.block_hash);
    return m;
  }, [highlights]);

  const toggle = useCallback(
    async (section: HighlightSection, text: string) => {
      if (!topic) return;
      setHighlights(await toggleHighlight(topic.id, section, text));
      if (showHint) {
        setShowHint(false);
        void setMeta(HINT_KEY, "1");
      }
    },
    [topic, toggleHighlight, showHint, setMeta],
  );

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
  const readable = tab === "ozet" || tab === "anlatim" || tab === "kritik";

  const footer = (
    <View style={{ flexDirection: "row", gap: space.sm, width: "100%", maxWidth: 720, alignSelf: "center" }}>
      <Button
        label="Quiz çöz"
        icon="help-circle-outline"
        style={styles.footerBtn}
        disabled={questionCount === 0}
        onPress={() => router.push(`/quiz?scope=topic&id=${topic.id}`)}
      />
      <Button label="Asistana sor" icon="chat-question-outline" kind="secondary" style={styles.footerBtn} onPress={() => router.push(`/sohbet/yeni?topic=${topic.id}`)} />
    </View>
  );

  return (
    <Screen
      back
      title={topic.title}
      titleLines={4}
      titleSize={topic.title.length > 48 ? "heading" : "title"}
      subtitle={[course?.name, unit?.title].filter(Boolean).join(" / ")}
      subtitleLines={2}
      accent={c.main}
      footer={footer}
    >
      <Row style={{ flexWrap: "wrap" }} gap={space.xs}>
        <VerificationBadge status={topic.verification_status} />
        {m?.score != null ? <Pill label={`Ustalık %${m.score}`} icon="chart-arc" color={c.deep} tint={c.tint} /> : null}
        {highlights.length > 0 ? <Pill label={`${highlights.length} vurgu`} icon="marker" color={colors.highlightInk} tint={colors.highlight} /> : null}
        {topic.generated_at ? <Pill label={`Hazırlanma: ${formatDate(topic.generated_at)}`} icon="calendar-outline" color={colors.inkSoft} tint={colors.surfaceAlt} /> : null}
      </Row>
      <Gap h={space.md} />

      <View style={styles.tabs} accessibilityRole="tablist">
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
      </View>
      <Gap h={space.md} />

      {readable && showHint ? (
        <View style={styles.hint} accessibilityLiveRegion="polite">
          <Icon name="gesture-tap-hold" color={colors.highlightInk} />
          <T v="small" color={colors.highlightInk} style={{ flex: 1 }}>
            Bir paragrafı vurgulamak için uzun bas. Vurguların Notum sekmesinde toplanır.
          </T>
          <Pressable
            onPress={() => {
              setShowHint(false);
              void setMeta(HINT_KEY, "1");
            }}
            accessibilityRole="button"
            accessibilityLabel="İpucunu kapat"
            hitSlop={10}
          >
            <Icon name="close" size={20} color={colors.highlightInk} />
          </Pressable>
        </View>
      ) : null}

      {tab === "ozet" ? (
        <TextPanel md={topic.summary_md} c={c} empty="Bu konunun özeti henüz hazır değil." highlighted={hashesBySection.summary} onToggle={(t) => void toggle("summary", t)} />
      ) : null}
      {tab === "anlatim" ? (
        <>
          <TextPanel md={topic.content_md} c={c} empty="Bu konunun anlatımı henüz hazır değil." highlighted={hashesBySection.content} onToggle={(t) => void toggle("content", t)} />
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
                <HighlightableMarkdown md={topic.doctrine_md} accent={c.main} highlighted={hashesBySection.doctrine} onToggle={(t) => void toggle("doctrine", t)} />
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
            <HighlightableMarkdown md={topic.critical_md} reading={false} accent={colors.warning} highlighted={hashesBySection.critical} onToggle={(t) => void toggle("critical", t)} />
          </Card>
        ) : (
          <EmptyState icon="star-off-outline" title="Kritik notlar henüz yok" />
        )
      ) : null}
      {tab === "maddeler" ? <Articles topic={topic} c={c} /> : null}
      {tab === "kararlar" ? <Cases topic={topic} c={c} /> : null}
      {tab === "sozluk" ? <Glossary topic={topic} c={c} /> : null}
      {tab === "notum" ? (
        <MyNote
          topic={topic}
          c={c}
          highlights={highlights}
          onOpen={(h) => setTab(SECTION_TAB[h.section])}
          onRemoved={() => void listHighlights(topic.id).then(setHighlights)}
        />
      ) : null}
    </Screen>
  );
}

function TextPanel({
  md,
  c,
  empty,
  highlighted,
  onToggle,
}: {
  md: string;
  c: CourseColor;
  empty: string;
  highlighted: Set<string>;
  onToggle: (text: string) => void;
}) {
  if (!md) return <EmptyState icon="text-box-remove-outline" title={empty} color={c.deep} tint={c.tint} />;
  return (
    <Card>
      <HighlightableMarkdown md={md} accent={c.main} highlighted={highlighted} onToggle={onToggle} />
    </Card>
  );
}

// ------------------------------------------------------------ Notum

function sectionText(topic: Topic, s: HighlightSection): string {
  return s === "summary" ? topic.summary_md : s === "content" ? topic.content_md : s === "critical" ? topic.critical_md : topic.doctrine_md;
}

function MyNote({
  topic,
  c,
  highlights,
  onOpen,
  onRemoved,
}: {
  topic: Topic;
  c: CourseColor;
  highlights: Highlight[];
  onOpen: (h: Highlight) => void;
  onRemoved: () => void;
}) {
  const { getTopicNote, saveTopicNote, removeHighlight } = useApp();
  const [body, setBody] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingBody = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    void getTopicNote(topic.id).then((n) => {
      if (!alive) return;
      setBody(n?.body_md ?? "");
      setSavedAt(n?.updated_at ?? null);
    });
    return () => {
      alive = false;
      // ekrandan çıkarken bekleyen kaydı bırakma
      if (timer.current) clearTimeout(timer.current);
      if (pendingBody.current !== null) void saveTopicNote(topic.id, pendingBody.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic.id]);

  function onChange(t: string) {
    setBody(t);
    setSaving(true);
    pendingBody.current = t;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      pendingBody.current = null;
      void saveTopicNote(topic.id, t).then(() => {
        setSaving(false);
        setSavedAt(new Date().toISOString());
      });
    }, 800);
  }

  // Bölüm metinlerinin güncel blok özetleri: metin değişmişse vurgu "eşleşmiyor"
  const liveHashes = useMemo(() => {
    const m: Record<HighlightSection, Set<string>> = { summary: new Set(), content: new Set(), critical: new Set(), doctrine: new Set() };
    (Object.keys(m) as HighlightSection[]).forEach((s) => splitBlocks(sectionText(topic, s)).forEach((b) => m[s].add(blockHash(b))));
    return m;
  }, [topic]);

  if (body === null) return <LoadingState />;

  return (
    <View style={{ gap: space.md }}>
      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Row gap={space.xs}>
            <Icon name="notebook-edit-outline" color={c.deep} />
            <T v="subheading" color={c.deep}>
              Kendi notum
            </T>
          </Row>
          <T v="tiny" color={colors.muted}>
            {saving ? "Kaydediliyor…" : savedAt ? `Kaydedildi, ${formatDateTime(savedAt)}` : "Otomatik kaydedilir"}
          </T>
        </Row>
        <Gap h={space.sm} />
        <TextInput
          value={body}
          onChangeText={onChange}
          multiline
          textAlignVertical="top"
          placeholder="Bu konuda aklında kalmasını istediklerini, hocanın vurguladıklarını ya da kendi örneklerini yaz…"
          placeholderTextColor={colors.muted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.noteInput, focused && { borderColor: c.main }]}
          accessibilityLabel="Konu notum"
        />
      </Card>

      <View>
        <T v="heading">Vurgularım</T>
        <Gap h={space.sm} />
        {highlights.length === 0 ? (
          <Card>
            <T v="body" color={colors.inkSoft}>
              Özet, Anlatım ya da Kritik sekmesinde bir paragrafa uzun basınca burada listelenir.
            </T>
          </Card>
        ) : (
          <View style={{ gap: space.sm }}>
            {[...highlights]
              .sort((a, b) => {
                const sa = liveHashes[a.section]?.has(a.block_hash) ? 0 : 1;
                const sb = liveHashes[b.section]?.has(b.block_hash) ? 0 : 1;
                return sa - sb || b.updated_at.localeCompare(a.updated_at);
              })
              .map((h) => {
              const stale = !liveHashes[h.section]?.has(h.block_hash);
              return (
                <View key={h.id} style={[styles.hl, stale && styles.hlStale]}>
                  <Pressable
                    onPress={() => onOpen(h)}
                    accessibilityRole="button"
                    accessibilityLabel={`${SECTION_LABEL[h.section]} bölümündeki vurguya git`}
                    style={({ pressed }) => [{ flex: 1, gap: 4 }, pressed && { opacity: 0.75 }]}
                  >
                    <Row gap={6} style={{ flexWrap: "wrap" }}>
                      <Pill label={SECTION_LABEL[h.section]} color={c.deep} tint={c.tint} />
                      {stale ? <Pill label="Metin değişti" icon="file-alert-outline" color={colors.muted} tint={colors.surfaceAlt} /> : null}
                    </Row>
                    <T v="reading" color={stale ? colors.muted : colors.ink} numberOfLines={4}>
                      {h.excerpt}
                    </T>
                  </Pressable>
                  <Pressable
                    onPress={() => void removeHighlight(h).then(onRemoved)}
                    accessibilityRole="button"
                    accessibilityLabel="Vurguyu kaldır"
                    hitSlop={8}
                    style={({ pressed }) => [styles.remove, pressed && { opacity: 0.6 }]}
                  >
                    <Icon name="close" size={20} color={colors.inkSoft} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
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
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  footerBtn: { flex: 1, paddingHorizontal: space.sm },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: space.sm + 2,
    minHeight: 42,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  quote: { borderLeftWidth: 4, paddingLeft: space.md, paddingVertical: 2 },
  link: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.md, minHeight: 32 },
  term: { padding: space.lg, gap: 4 },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    backgroundColor: colors.highlight,
    borderRadius: radius.md,
    padding: space.sm,
    marginBottom: space.md,
  },
  noteInput: {
    minHeight: 220,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    padding: space.md,
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 26,
    color: colors.ink,
  },
  hl: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
    backgroundColor: colors.highlight,
    borderLeftWidth: 4,
    borderLeftColor: colors.highlightEdge,
    borderRadius: radius.md,
    padding: space.md,
  },
  hlStale: { backgroundColor: colors.surfaceAlt, borderLeftColor: colors.lineStrong, opacity: 0.8 },
  remove: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
});
