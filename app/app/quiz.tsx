import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { api, errorText } from "../src/api";
import { weakestTopics } from "../src/analysis";
import { Markdown } from "../src/components/Markdown";
import { ProgressRing } from "../src/components/ProgressRing";
import { Screen } from "../src/components/Screen";
import { EmptyState, LoadingState } from "../src/components/States";
import { Bar, Button, Card, Chip, Gap, Icon, Row, SectionTitle, T, type IconName } from "../src/components/ui";
import { useApp, type Kb } from "../src/store/AppContext";
import { colors, courseColor, radius, space } from "../src/theme";
import type { Question, TopicArticle } from "../src/types";
import { lawAbbrev, plain } from "../src/format";

type Scope = "course" | "unit" | "topic" | "mixed" | "weak" | "note";
const SCOPES: { key: Exclude<Scope, "note">; label: string; icon: IconName }[] = [
  { key: "course", label: "Ders", icon: "bookshelf" },
  { key: "unit", label: "Ünite", icon: "file-tree-outline" },
  { key: "topic", label: "Konu", icon: "book-open-variant" },
  { key: "mixed", label: "Karışık", icon: "shuffle-variant" },
  { key: "weak", label: "Zayıf konularım", icon: "target" },
];
const COUNTS = [5, 10, 20];
const LETTERS = ["A", "B", "C", "D", "E", "F"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function poolFor(kb: Kb, scope: Scope, id: string | null, weakIds: string[]): Question[] {
  const active = new Set(kb.courses.filter((c) => c.is_active).map((c) => c.id));
  const mcq = kb.questions.filter((q) => q.kind === "mcq" && q.options && q.correct_option !== null);
  switch (scope) {
    case "course":
      return mcq.filter((q) => q.course_id === id);
    case "unit": {
      const ts = new Set((kb.topicsByUnit.get(id ?? "") ?? []).map((t) => t.id));
      return mcq.filter((q) => q.topic_id && ts.has(q.topic_id));
    }
    case "topic":
      return mcq.filter((q) => q.topic_id === id);
    case "weak": {
      const ws = new Set(weakIds);
      return mcq.filter((q) => q.topic_id && ws.has(q.topic_id));
    }
    case "note":
      return mcq.filter((q) => q.note_id === id);
    default:
      return mcq.filter((q) => active.has(q.course_id));
  }
}

export default function Quiz() {
  const params = useLocalSearchParams<{ scope?: string; id?: string }>();
  const { kb, mastery } = useApp();
  const preset = params.scope as Scope | undefined;

  const [scope, setScope] = useState<Scope>(preset ?? "course");
  const [courseId, setCourseId] = useState<string | null>(preset === "course" ? (params.id ?? null) : null);
  const [selId, setSelId] = useState<string | null>(preset && preset !== "course" ? (params.id ?? null) : null);
  const [count, setCount] = useState(10);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loadingNote, setLoadingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const activeCourses = useMemo(() => kb?.courses.filter((c) => c.is_active) ?? [], [kb]);
  const weakIds = useMemo(() => {
    if (!kb) return [];
    const act = new Set(activeCourses.map((c) => c.id));
    return weakestTopics(mastery, kb.topics.filter((t) => act.has(t.course_id)), 5).map((w) => w.topic.id);
  }, [kb, mastery, activeCourses]);

  useEffect(() => {
    if (courseId || !kb) return;
    // Gelinen sayfanın dersiyle başla (konu/ünite/ders), yoksa ilk aktif ders.
    const pid = params.id ?? "";
    const fromParam =
      kb.courseById.get(pid)?.id ?? kb.topicById.get(pid)?.course_id ?? kb.units.find((u) => u.id === pid)?.course_id ?? null;
    setCourseId(fromParam ?? activeCourses[0]?.id ?? null);
  }, [kb, activeCourses, courseId, params.id]);

  const effectiveId = scope === "course" ? courseId : selId;
  const pool = useMemo(() => (kb ? poolFor(kb, scope, effectiveId, weakIds) : []), [kb, scope, effectiveId, weakIds]);

  // Konu/not sayfasından gelindiyse doğrudan başla
  useEffect(() => {
    if (!kb || questions || !preset || preset === "mixed" || preset === "weak") return;
    if (preset === "note" && pool.length === 0 && params.id) {
      setLoadingNote(true);
      api
        .getNote(params.id)
        .then((n) => {
          const qs = n.questions.filter((q) => q.kind === "mcq" && q.options);
          setQuestions(shuffle(qs).slice(0, 20));
        })
        .catch((e) => setNoteError(errorText(e)))
        .finally(() => setLoadingNote(false));
      return;
    }
    if (pool.length > 0) setQuestions(shuffle(pool).slice(0, count));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kb]);

  if (!kb) {
    return (
      <Screen back title="Quiz">
        <EmptyState icon="cloud-download-outline" title="Bilgi bankası henüz inmedi" text="Ana sayfadan indirip tekrar dene." />
      </Screen>
    );
  }
  if (loadingNote) {
    return (
      <Screen back title="Quiz">
        <LoadingState text="Notunun soruları getiriliyor…" />
      </Screen>
    );
  }
  if (noteError) {
    return (
      <Screen back title="Quiz">
        <EmptyState icon="wifi-off" title="Not soruları alınamadı" text={noteError} />
      </Screen>
    );
  }

  if (questions) {
    return (
      <QuizRun
        kb={kb}
        questions={questions}
        onRestart={(qs) => setQuestions(qs ? shuffle(qs) : null)}
      />
    );
  }

  // ---------------------------------------------------------- Kurulum
  const course = courseId ? kb.courseById.get(courseId) : null;
  const units = courseId ? (kb.unitsByCourse.get(courseId) ?? []) : [];
  const topics = courseId ? (kb.topicsByCourse.get(courseId) ?? []) : [];
  const cc = courseColor(courseId);
  const needsCourse = scope === "course" || scope === "unit" || scope === "topic";

  return (
    <Screen
      back
      title="Quiz"
      subtitle="Kapsamı ve soru sayısını seç"
      footer={
        <Button
          label={pool.length === 0 ? "Bu kapsamda soru yok" : `${Math.min(count, pool.length)} soruyla başla`}
          icon="play"
          size="lg"
          full
          disabled={pool.length === 0}
                    onPress={() => setQuestions(shuffle(pool).slice(0, count))}
        />
      }
    >
      <SectionTitle title="Kapsam" />
      <View style={styles.wrap}>
        {SCOPES.map((s) => (
          <Chip
            key={s.key}
            label={s.label}
            icon={s.icon}
            selected={scope === s.key}
            onPress={() => {
              setScope(s.key);
              setSelId(null);
            }}
          />
        ))}
      </View>

      {needsCourse ? (
        <>
          <SectionTitle title="Ders" />
          <View style={styles.wrap}>
            {activeCourses.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                color={courseColor(c.id).main}
                selected={courseId === c.id}
                onPress={() => {
                  setCourseId(c.id);
                  setSelId(null);
                }}
              />
            ))}
          </View>
        </>
      ) : null}

      {scope === "unit" && course ? (
        <>
          <SectionTitle title="Ünite" />
          <Card padded={false} style={{ padding: space.xs }}>
            {units.map((u) => (
              <SelectRow key={u.id} label={u.title} selected={selId === u.id} color={cc.main} onPress={() => setSelId(u.id)} />
            ))}
          </Card>
        </>
      ) : null}

      {scope === "topic" && course ? (
        <>
          <SectionTitle title="Konu" />
          <Card padded={false} style={{ padding: space.xs }}>
            {topics.map((t) => (
              <SelectRow key={t.id} label={t.title} selected={selId === t.id} color={cc.main} onPress={() => setSelId(t.id)} />
            ))}
          </Card>
        </>
      ) : null}

      {scope === "weak" ? (
        <Card style={{ marginTop: space.md }}>
          {weakIds.length === 0 ? (
            <T v="body" color={colors.inkSoft}>
              Henüz zayıf konu belirlenmedi. Bir konuda en az 3 soru çözünce burada kullanılabilir.
            </T>
          ) : (
            <>
              <T v="smallStrong" color={colors.inkSoft}>
                Şu konulardan sorulacak:
              </T>
              <Gap h={space.xs} />
              {weakIds.map((tid) => (
                <Row key={tid} gap={space.xs}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: courseColor(kb.topicById.get(tid)?.course_id).main }} />
                  <T v="body">{kb.topicById.get(tid)?.title}</T>
                </Row>
              ))}
            </>
          )}
        </Card>
      ) : null}

      <SectionTitle title="Soru sayısı" />
      <View style={styles.wrap}>
        {COUNTS.map((n) => (
          <Chip key={n} label={`${n} soru`} selected={count === n} onPress={() => setCount(n)} />
        ))}
      </View>
      <Gap h={space.sm} />
      <T v="small" color={colors.muted}>
        Bu kapsamda {pool.length} soru var.
      </T>
    </Screen>
  );
}

function SelectRow({ label, selected, color, onPress }: { label: string; selected: boolean; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.selRow, selected && { backgroundColor: colors.surfaceAlt }, pressed && { opacity: 0.8 }]}
    >
      <Icon name={selected ? "radiobox-marked" : "radiobox-blank"} color={selected ? color : colors.muted} />
      <T v="body" style={{ flex: 1 }}>
        {label}
      </T>
    </Pressable>
  );
}

// ------------------------------------------------------------ Soru çözme

function QuizRun({ kb, questions, onRestart }: { kb: Kb; questions: Question[]; onRestart: (qs: Question[] | null) => void }) {
  const { recordAttempt, getTopic } = useApp();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<{ q: Question; correct: boolean }[]>([]);
  const [articles, setArticles] = useState<TopicArticle[]>([]);

  const q = questions[i];
  const done = i >= questions.length;

  useEffect(() => {
    setArticles([]);
    if (!q?.topic_id) return;
    let alive = true;
    void getTopic(q.topic_id).then((t) => alive && setArticles(t?.articles ?? []));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.id]);

  if (done) {
    const correct = results.filter((r) => r.correct).length;
    const pct = Math.round((correct / Math.max(1, results.length)) * 100);
    const wrong = results.filter((r) => !r.correct).map((r) => r.q);
    const tone = pct >= 70 ? colors.success : pct >= 40 ? colors.warning : colors.danger;
    return (
      <Screen back title="Quiz bitti">
        <Card style={{ alignItems: "center", gap: space.sm }}>
          <ProgressRing score={pct} color={tone} size={132} stroke={12} big label={`%${pct}`} />
          <T v="title">
            {correct} / {results.length} doğru
          </T>
          <T v="body" color={colors.inkSoft} style={{ textAlign: "center" }}>
            {pct >= 70 ? "Çok iyi gidiyorsun. Bu konuları kartlarla pekiştir." : pct >= 40 ? "Fena değil. Yanlış yaptığın soruları bir kez daha çöz." : "Bu konulara tekrar bakmanda fayda var. Önce özetleri oku."}
          </T>
        </Card>
        {wrong.length > 0 ? (
          <>
            <SectionTitle title="Yanlış yaptıkların" />
            <Card padded={false} style={{ padding: space.xs }}>
              {wrong.map((w) => {
                const t = w.topic_id ? kb.topicById.get(w.topic_id) : null;
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => t && router.push(`/konu/${t.id}`)}
                    style={({ pressed }) => [styles.selRow, pressed && { opacity: 0.8 }]}
                    accessibilityRole="button"
                  >
                    <Icon name="close-circle" color={colors.danger} />
                    <View style={{ flex: 1 }}>
                      <T v="body" numberOfLines={2}>
                        {plain(w.stem_md)}
                      </T>
                      {t ? (
                        <T v="small" color={courseColor(t.course_id).deep}>
                          {t.title}
                        </T>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          </>
        ) : null}
        <Gap h={space.lg} />
        <View style={{ gap: space.sm }}>
          {wrong.length > 0 ? <Button label="Yanlışları tekrar çöz" icon="replay" onPress={() => { setI(0); setResults([]); setPicked(null); onRestart(wrong); }} /> : null}
          <Button label="Yeni quiz" icon="plus" kind="secondary" onPress={() => onRestart(null)} />
          <Button label="Eksik analizine git" icon="chart-donut" kind="ghost" onPress={() => router.replace("/analiz")} />
        </View>
      </Screen>
    );
  }

  const c = courseColor(q.course_id);
  const topic = q.topic_id ? kb.topicById.get(q.topic_id) : null;
  const answered = picked !== null;
  const isCorrect = answered && picked === q.correct_option;
  const related = pickArticle(articles, q.explanation_md);

  async function choose(idx: number) {
    if (answered) return;
    setPicked(idx);
    const ok = idx === q.correct_option;
    setResults((r) => [...r, { q, correct: ok }]);
    await recordAttempt({ question_id: q.id, kind: "mcq", selected_option: idx, correct: ok });
  }

  return (
    <Screen
      back
      title={`Soru ${i + 1} / ${questions.length}`}
      subtitle={topic?.title}
      footer={
        answered ? (
          <Button
            label={i + 1 < questions.length ? "Sonraki soru" : "Sonucu gör"}
            icon={i + 1 < questions.length ? "arrow-right" : "flag-checkered"}
            size="lg"
            full
            onPress={() => {
              setPicked(null);
              setI(i + 1);
            }}
          />
        ) : null
      }
    >
      <Bar value={((i + (answered ? 1 : 0)) / questions.length) * 100} color={c.main} track={c.tint} height={10} />
      <Gap h={space.lg} />
      <Card>
        <Markdown reading accent={c.main}>
          {q.stem_md}
        </Markdown>
      </Card>
      <Gap h={space.md} />
      <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
        {(q.options ?? []).map((opt, idx) => {
          const isRight = idx === q.correct_option;
          const isPicked = idx === picked;
          let bg: string = colors.surface;
          let border: string = colors.line;
          let fg: string = colors.ink;
          let icon: IconName | null = null;
          if (answered && isRight) {
            bg = colors.successTint;
            border = colors.success;
            fg = colors.successDeep;
            icon = "check-circle";
          } else if (answered && isPicked) {
            bg = colors.dangerTint;
            border = colors.danger;
            fg = colors.dangerDeep;
            icon = "close-circle";
          }
          return (
            <Pressable
              key={idx}
              onPress={() => void choose(idx)}
              disabled={answered}
              accessibilityRole="radio"
              accessibilityState={{ checked: isPicked, disabled: answered }}
              accessibilityLabel={`${LETTERS[idx]} şıkkı: ${opt}${answered && isRight ? ", doğru cevap" : ""}${answered && isPicked && !isRight ? ", senin cevabın, yanlış" : ""}`}
              style={({ pressed }) => [styles.option, { backgroundColor: bg, borderColor: border }, pressed && !answered && { borderColor: c.main }, answered && !isRight && !isPicked && { opacity: 0.6 }]}
            >
              <View style={[styles.letter, { backgroundColor: answered && (isRight || isPicked) ? border : c.tint }]}>
                <T v="smallStrong" color={answered && (isRight || isPicked) ? colors.white : c.deep}>
                  {LETTERS[idx]}
                </T>
              </View>
              <T v="body" color={fg} style={{ flex: 1 }}>
                {opt}
              </T>
              {icon ? <Icon name={icon} size={26} color={border} /> : null}
            </Pressable>
          );
        })}
      </View>

      {answered ? (
        <>
          <Gap h={space.lg} />
          <View style={[styles.verdict, { backgroundColor: isCorrect ? colors.successTint : colors.dangerTint }]} accessibilityLiveRegion="polite">
            <Icon name={isCorrect ? "check-circle" : "close-circle"} size={32} color={isCorrect ? colors.success : colors.danger} />
            <View style={{ flex: 1 }}>
              <T v="heading" color={isCorrect ? colors.successDeep : colors.dangerDeep}>
                {isCorrect ? "Doğru!" : "Yanlış"}
              </T>
              {!isCorrect && q.correct_option !== null ? (
                <T v="body" color={colors.dangerDeep}>
                  Doğru cevap: {LETTERS[q.correct_option]}) {q.options?.[q.correct_option]}
                </T>
              ) : null}
            </View>
          </View>
          {q.explanation_md ? (
            <>
              <Gap h={space.sm} />
              <Card>
                <Row>
                  <Icon name="lightbulb-on-outline" color={c.deep} />
                  <T v="subheading" color={c.deep}>
                    Açıklama
                  </T>
                </Row>
                <Gap h={space.xs} />
                <Markdown accent={c.main}>{q.explanation_md}</Markdown>
              </Card>
            </>
          ) : null}
          {related ? (
            <>
              <Gap h={space.sm} />
              <Card style={{ backgroundColor: c.tint }}>
                <Row>
                  <Icon name="scale-balance" color={c.deep} />
                  <T v="subheading" color={c.deep}>
                    İlgili madde: {lawAbbrev(related.law_name)} m. {related.article_no}
                  </T>
                </Row>
                <Gap h={space.xs} />
                <T v="reading">{related.official_text}</T>
              </Card>
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

/** Açıklamada geçen madde numarasına göre ilgili maddeyi seçer; yoksa ilk maddeyi. */
function pickArticle(articles: TopicArticle[], explanation: string | null): TopicArticle | null {
  if (articles.length === 0) return null;
  const nums = [...(explanation ?? "").matchAll(/m\.\s*(\d+)/g)].map((m) => m[1]);
  for (const n of nums) {
    const a = articles.find((x) => x.article_no === n);
    if (a) return a;
  }
  return nums.length > 0 ? null : articles[0];
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  selRow: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.sm, borderRadius: radius.md, minHeight: 52 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    minHeight: 64,
  },
  letter: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  verdict: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.lg, borderRadius: radius.lg },
});
