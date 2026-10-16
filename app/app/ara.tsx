import { router, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderButton } from "../src/components/Screen";
import { EmptyState, LoadingState } from "../src/components/States";
import { Chip, Gap, Icon, IconBubble, SectionTitle, T, type IconName } from "../src/components/ui";
import { buildSearchDocs, groupHits, searchKb, type DocKind, type SearchDoc, type SearchHit, type SearchGroup } from "../src/search";
import { useApp } from "../src/store/AppContext";
import { colors, courseColor, fonts, maxContentWidth, radius, shadow, space, type } from "../src/theme";

const RECENT_KEY = "recent_searches";
const MAX_RECENT = 8;

const KIND_LABEL: Record<DocKind, string> = {
  topic_title: "Konu",
  summary: "Özet",
  critical: "Kritik",
  content: "Anlatım",
  doctrine: "Doktrin",
  glossary: "Sözlük",
  question: "Soru",
  card: "Kart",
  note: "Notum",
  highlight: "Vurgum",
};

const GROUP_ICON: Record<SearchGroup, IconName> = {
  Konular: "book-open-variant",
  Kavramlar: "alphabetical-variant",
  Sorular: "help-circle-outline",
  Kartlar: "cards-outline",
  Notlarım: "notebook-edit-outline",
};

export default function Ara() {
  const { kb, topicTexts, listTopicNotes, listHighlights, getMeta, setMeta } = useApp();
  const insets = useSafeAreaInsets();
  const [docs, setDocs] = useState<SearchDoc[] | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const active = useMemo(() => kb?.courses.filter((c) => c.is_active) ?? [], [kb]);

  // Arama dizini: ekran açılınca bir kez
  useEffect(() => {
    if (!kb) return;
    let alive = true;
    void (async () => {
      const [topics, notes, highlights] = await Promise.all([topicTexts(), listTopicNotes(), listHighlights()]);
      const activeIds = new Set(active.map((c) => c.id));
      const all = buildSearchDocs({ topics, questions: kb.questions, flashcards: kb.flashcards, notes, highlights });
      if (alive) setDocs(all.filter((d) => !d.course_id || activeIds.has(d.course_id)));
    })();
    void getMeta(RECENT_KEY).then((v) => {
      try {
        if (alive && v) setRecent(JSON.parse(v));
      } catch {
        // bozuk kayıt
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kb]);

  // Yazarken 200 ms gecikmeli arama
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const groups = useMemo(() => {
    if (!docs || debounced.trim().length < 2) return null;
    return groupHits(searchKb(docs, debounced, { courseId }));
  }, [docs, debounced, courseId]);
  const total = groups?.reduce((n, g) => n + g.hits.length, 0) ?? 0;

  async function remember(q: string) {
    const v = q.trim();
    if (v.length < 2) return;
    const next = [v, ...recent.filter((r) => r.toLocaleLowerCase("tr") !== v.toLocaleLowerCase("tr"))].slice(0, MAX_RECENT);
    setRecent(next);
    await setMeta(RECENT_KEY, JSON.stringify(next));
  }

  function open(h: SearchHit) {
    void remember(query);
    const t = h.doc.target;
    router.push((t.params ? { pathname: t.pathname, params: t.params } : t.pathname) as Href);
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.headerInner}>
          <HeaderButton icon="arrow-left" label="Geri" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
          <View style={[styles.inputBox, focused && { borderColor: colors.primary }]}>
            <Icon name="magnify" color={colors.muted} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => void remember(query)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Konu, kavram, madde ara…"
              placeholderTextColor={colors.muted}
              autoFocus
              returnKeyType="search"
              autoCorrect={false}
              style={styles.input}
              accessibilityLabel="Arama"
            />
            {query ? (
              <Pressable
                onPress={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                accessibilityRole="button"
                accessibilityLabel="Aramayı temizle"
                hitSlop={10}
              >
                <Icon name="close-circle" color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>
        {active.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipRow}>
            <Chip label="Tüm dersler" selected={!courseId} onPress={() => setCourseId(null)} />
            {active.map((c) => (
              <Chip key={c.id} label={c.name} color={courseColor(c.id).main} selected={courseId === c.id} onPress={() => setCourseId(courseId === c.id ? null : c.id)} />
            ))}
          </ScrollView>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {!kb ? (
          <EmptyState icon="cloud-download-outline" title="Bilgi bankası henüz inmedi" text="Ana sayfadan indirince burada arama yapabilirsin." />
        ) : docs === null ? (
          <LoadingState text="Arama hazırlanıyor…" />
        ) : !groups ? (
          <>
            {recent.length > 0 ? (
              <>
                <SectionTitle
                  title="Son aramalar"
                  action="Temizle"
                  onAction={() => {
                    setRecent([]);
                    void setMeta(RECENT_KEY, null);
                  }}
                />
                <View style={styles.recent}>
                  {recent.map((r) => (
                    <Pressable key={r} onPress={() => setQuery(r)} accessibilityRole="button" style={({ pressed }) => [styles.recentItem, pressed && { opacity: 0.8 }]}>
                      <Icon name="history" size={18} color={colors.muted} />
                      <T v="body">{r}</T>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
            <EmptyState
              icon="text-search"
              title="Ne arıyorsun?"
              text="Konu başlıklarında, sözlükte, anlatımlarda, sorularda, kartlarda ve kendi notlarında arar. İnternet gerekmez."
            />
          </>
        ) : total === 0 ? (
          <EmptyState
            icon="file-search-outline"
            title={`“${debounced.trim()}” için sonuç yok`}
            text={courseId ? "Ders filtresini kaldırmayı ya da daha kısa bir sözcük denemeyi dene." : "Daha kısa ya da farklı bir sözcük dene. Büyük/küçük harf ve ı/i farkı önemli değil."}
          />
        ) : (
          <>
            <T v="small" color={colors.muted}>
              {total} sonuç
            </T>
            {groups.map((g) => (
              <View key={g.group}>
                <SectionTitle title={`${g.group} (${g.hits.length})`} />
                <View style={{ gap: space.sm }}>
                  {g.hits.slice(0, g.group === "Konular" ? 30 : 15).map((h) => (
                    <ResultRow key={h.doc.key} hit={h} group={g.group} courseName={kb.courseById.get(h.doc.course_id)?.name} onPress={() => open(h)} />
                  ))}
                </View>
              </View>
            ))}
            <Gap h={space.xl} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ResultRow({ hit, group, courseName, onPress }: { hit: SearchHit; group: SearchGroup; courseName?: string; onPress: () => void }) {
  const c = courseColor(hit.doc.course_id || null);
  const personal = group === "Notlarım";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${hit.doc.title}, ${KIND_LABEL[hit.doc.kind]}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.88 }]}
    >
      <IconBubble name={GROUP_ICON[group]} color={personal ? colors.highlightInk : c.deep} tint={personal ? colors.highlight : c.tint} size={40} />
      <View style={{ flex: 1, gap: 4 }}>
        <T v="bodyStrong" numberOfLines={2}>
          {hit.doc.title}
        </T>
        <T v="tiny" color={c.deep} numberOfLines={1}>
          {[KIND_LABEL[hit.doc.kind], courseName].filter(Boolean).join(", ")}
        </T>
        {hit.doc.kind !== "topic_title" ? (
          <Text style={styles.snippet} numberOfLines={3}>
            {hit.snippet.start ? "… " : ""}
            {hit.snippet.parts.map((p, i) =>
              p.match ? (
                <Text key={i} style={styles.mark}>
                  {p.text}
                </Text>
              ) : (
                <Text key={i}>{p.text}</Text>
              ),
            )}
            {hit.snippet.end ? " …" : ""}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-right" color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: space.lg, paddingBottom: space.sm, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.line },
  headerInner: { flexDirection: "row", alignItems: "center", gap: space.sm, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" },
  inputBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: space.sm,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.ink,
    paddingVertical: 10,
    // web: odak göstergesi kutunun kenarında (mavi), tarayıcının iç çerçevesi yerine
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
  chipRow: { marginTop: space.sm, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" },
  chips: { gap: space.xs, paddingRight: space.lg },
  body: { padding: space.lg, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" },
  recent: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: space.md,
    minHeight: 40,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, ...shadow.card },
  snippet: { ...type.small, color: colors.inkSoft },
  mark: { fontFamily: fonts.semibold, color: colors.ink, backgroundColor: colors.highlight },
});
