import { topicMastery, cardValue, type DataPoint, type Mastery } from "./mastery";
import type { Attempt, CardReview, Course, Flashcard, Question, TopicLite } from "./types";

/** Eksik analizi: ustalık haritası, zayıf konular ve kural tabanlı tespitler. */

export interface KbLookup {
  courses: Course[];
  topics: TopicLite[];
  questionById: Map<string, Question>;
  cardById: Map<string, Flashcard>;
}

export interface Insight {
  id: string;
  tone: "danger" | "warning" | "info";
  text: string;
  topic_id?: string;
  course_id?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 3'ünde, 4'ünde, 5'inde (yalnızca küçük sayılar için yeterli). */
function locative(n: number): string {
  return n === 5 ? "'inde" : "'ünde";
}

/** Bir denemenin 0-100 değeri; değerlendirilemiyorsa null. */
export function attemptValue(a: Attempt): number | null {
  if (a.kind === "mcq") return a.correct == null ? null : a.correct ? 100 : 0;
  return typeof a.score === "number" ? a.score : null;
}

/** Konu başına veri noktaları. Nottan gelen ve konusu olmayan sorular ustalığa girmez. */
export function topicPoints(kb: KbLookup, attempts: Attempt[], reviews: CardReview[]): Map<string, DataPoint[]> {
  const out = new Map<string, DataPoint[]>();
  const push = (topicId: string | null | undefined, p: DataPoint) => {
    if (!topicId) return;
    const arr = out.get(topicId);
    if (arr) arr.push(p);
    else out.set(topicId, [p]);
  };
  for (const a of attempts) {
    const q = kb.questionById.get(a.question_id);
    const v = attemptValue(a);
    if (!q || v === null) continue;
    push(q.topic_id, { kind: a.kind, value: v, at: new Date(a.created_at) });
  }
  for (const r of reviews) {
    const c = kb.cardById.get(r.card_id);
    if (!c) continue;
    push(c.topic_id, { kind: "card", value: cardValue(r.grade), at: new Date(r.reviewed_at) });
  }
  return out;
}

export function buildMastery(kb: KbLookup, attempts: Attempt[], reviews: CardReview[], now: Date): Map<string, Mastery> {
  const pts = topicPoints(kb, attempts, reviews);
  const m = new Map<string, Mastery>();
  for (const t of kb.topics) m.set(t.id, topicMastery(pts.get(t.id) ?? [], now));
  return m;
}

export function weakestTopics(mastery: Map<string, Mastery>, topics: TopicLite[], n = 5) {
  return topics
    .map((topic) => ({ topic, mastery: mastery.get(topic.id) ?? { score: null, dataPoints: 0 } }))
    .filter((x): x is { topic: TopicLite; mastery: { score: number; dataPoints: number } } => x.mastery.score !== null)
    .sort((a, b) => a.mastery.score - b.mastery.score)
    .slice(0, n);
}

export function findInsights(
  kb: KbLookup,
  attempts: Attempt[],
  reviews: CardReview[],
  mastery: Map<string, Mastery>,
  now: Date,
): Insight[] {
  const insights: Insight[] = [];
  const topicById = new Map(kb.topics.map((t) => [t.id, t]));

  // Konu başına denemeler (yeniden eskiye)
  const byTopic = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const tId = kb.questionById.get(a.question_id)?.topic_id;
    if (!tId) continue;
    const arr = byTopic.get(tId) ?? [];
    arr.push(a);
    byTopic.set(tId, arr);
  }
  for (const arr of byTopic.values()) arr.sort((x, y) => y.created_at.localeCompare(x.created_at));

  for (const [tId, arr] of byTopic) {
    const topic = topicById.get(tId);
    if (!topic) continue;

    // 1) Son 4 sorunun en az 3'ü yanlış (olayda 50 altı yanlış sayılır)
    const last = arr.slice(0, 4);
    if (last.length === 4) {
      const wrong = last.filter((a) => {
        const v = attemptValue(a);
        return v !== null && v < 50;
      }).length;
      if (wrong >= 3) {
        insights.push({
          id: `wrong-${tId}`,
          tone: "danger",
          text: `${topic.title} konusunda son 4 sorunun ${wrong}'ünü yanlış yaptın.`,
          topic_id: tId,
          course_id: topic.course_id,
        });
      }
    }

    // 2) Olay sorularında düşük ortalama
    const cases = arr.filter((a) => a.kind === "case" && typeof a.score === "number");
    if (cases.length >= 2) {
      const avg = Math.round(cases.reduce((s, a) => s + (a.score as number), 0) / cases.length);
      if (avg < 50) {
        insights.push({
          id: `case-${tId}`,
          tone: "warning",
          text: `${topic.title} olay sorularında ortalaman ${avg}. Örnek çözümlerdeki madde sırasına bak.`,
          topic_id: tId,
          course_id: topic.course_id,
        });
      }
    }
  }

  // 3) Kartlarda tekrar tekrar "bilemedim"
  const reviewsByTopic = new Map<string, CardReview[]>();
  for (const r of reviews) {
    const tId = kb.cardById.get(r.card_id)?.topic_id;
    if (!tId) continue;
    const arr = reviewsByTopic.get(tId) ?? [];
    arr.push(r);
    reviewsByTopic.set(tId, arr);
  }
  for (const [tId, arr] of reviewsByTopic) {
    const topic = topicById.get(tId);
    if (!topic) continue;
    const last = [...arr].sort((x, y) => y.reviewed_at.localeCompare(x.reviewed_at)).slice(0, 5);
    const again = last.filter((r) => r.grade === "again").length;
    if (again >= 3) {
      insights.push({
        id: `cards-${tId}`,
        tone: "warning",
        text: `${topic.title} kartlarında son ${last.length} tekrarın ${again}${locative(again)} "bilemedim" dedin. Konu özetini yeniden oku.`,
        topic_id: tId,
        course_id: topic.course_id,
      });
    }
  }

  // 4) Uzun süredir bakılmayan, puanı düşük konu
  for (const [tId, arr] of byTopic) {
    const topic = topicById.get(tId);
    const m = mastery.get(tId);
    if (!topic || !m || m.score === null || m.score >= 60) continue;
    const lastAt = new Date(arr[0].created_at).getTime();
    const days = Math.floor((now.getTime() - lastAt) / DAY_MS);
    if (days >= 14) {
      insights.push({
        id: `stale-${tId}`,
        tone: "info",
        text: `${topic.title} konusuna ${days} gündür bakmadın. Puanın ${m.score}, kısa bir quiz iyi gelir.`,
        topic_id: tId,
        course_id: topic.course_id,
      });
    }
  }

  // 5) Hiç çalışılmamış aktif dersler
  const studiedCourses = new Set<string>();
  for (const [tId, m] of mastery) {
    if (m.dataPoints > 0) {
      const c = topicById.get(tId)?.course_id;
      if (c) studiedCourses.add(c);
    }
  }
  for (const c of kb.courses) {
    if (!c.is_active || studiedCourses.has(c.id)) continue;
    if (!kb.topics.some((t) => t.course_id === c.id)) continue;
    insights.push({
      id: `empty-${c.id}`,
      tone: "info",
      text: `${c.name} dersinde henüz soru çözmedin. Bir quizle başlarsan eksiklerini görebiliriz.`,
      course_id: c.id,
    });
  }

  const order = { danger: 0, warning: 1, info: 2 } as const;
  return insights.sort((a, b) => order[a.tone] - order[b.tone]);
}
