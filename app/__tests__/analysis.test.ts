import { buildMastery, weakestTopics, findInsights, type KbLookup } from "../src/analysis";
import type { Attempt, CardReview, Question, Flashcard, TopicLite, Course } from "../src/types";

const now = new Date("2026-10-16T12:00:00.000Z");
const iso = (minAgo: number) => new Date(now.getTime() - minAgo * 60_000).toISOString();

const courses: Course[] = [
  { id: "HUK2011", code: "HUK2011", name: "Borçlar Genel", year: 2, sort_order: 1, is_active: true },
  { id: "HUK2013", code: "HUK2013", name: "Ceza Genel", year: 2, sort_order: 2, is_active: true },
];
const topics: TopicLite[] = [
  { id: "t1", unit_id: "u1", course_id: "HUK2011", title: "Sözleşmenin kurulması", sort_order: 1, verification_status: "verified" },
  { id: "t2", unit_id: "u1", course_id: "HUK2011", title: "İrade bozuklukları", sort_order: 2, verification_status: "verified" },
  { id: "t3", unit_id: "u2", course_id: "HUK2013", title: "Kast ve taksir", sort_order: 1, verification_status: "partial" },
];
const q = (id: string, topic_id: string, kind: "mcq" | "case" = "mcq"): Question => ({
  id, topic_id, course_id: topic_id === "t3" ? "HUK2013" : "HUK2011", kind, stem_md: "?", options: ["a", "b"],
  correct_option: 0, explanation_md: null, rubric: null, model_answer_md: null, origin: "bank", note_id: null,
});
const questions: Question[] = [
  q("q1", "t1"), q("q2", "t1"), q("q3", "t1"), q("q4", "t1"), q("q5", "t1"),
  q("q6", "t2"), q("q7", "t2"), q("q8", "t2"), q("o1", "t2", "case"),
];
const cards: Flashcard[] = [
  { id: "k1", topic_id: "t2", course_id: "HUK2011", front_md: "", back_md: "", origin: "bank", note_id: null },
];

const kb: KbLookup = {
  courses,
  topics,
  questionById: new Map(questions.map((x) => [x.id, x])),
  cardById: new Map(cards.map((x) => [x.id, x])),
};

let n = 0;
const att = (question_id: string, correct: boolean, minAgo: number): Attempt => ({
  id: `a${++n}`, question_id, kind: "mcq", selected_option: correct ? 0 : 1, correct, created_at: iso(minAgo),
});

describe("buildMastery / weakestTopics", () => {
  test("denemeleri ve kart tekrarlarını konulara dağıtır", () => {
    const attempts: Attempt[] = [att("q1", true, 5), att("q2", true, 4), att("q3", false, 3)];
    const reviews: CardReview[] = [];
    const m = buildMastery(kb, attempts, reviews, now);
    expect(m.get("t1")).toEqual({ score: 67, dataPoints: 3 });
    expect(m.get("t2")).toEqual({ score: null, dataPoints: 0 });
  });

  test("zayıf konu sıralamasına yalnızca yeterli verili konular girer, en düşük önce", () => {
    const attempts: Attempt[] = [
      att("q1", true, 9), att("q2", true, 8), att("q3", true, 7),
      att("q6", false, 6), att("q7", false, 5), att("q8", true, 4),
    ];
    const m = buildMastery(kb, attempts, [], now);
    const weak = weakestTopics(m, topics, 5);
    expect(weak.map((w) => w.topic.id)).toEqual(["t2", "t1"]);
  });
});

describe("findInsights", () => {
  test("son 4 sorunun 3'ü yanlışsa tespit üretir", () => {
    const attempts: Attempt[] = [
      att("q1", true, 50),
      att("q2", false, 40), att("q3", true, 30), att("q4", false, 20), att("q5", false, 10),
    ];
    const m = buildMastery(kb, attempts, [], now);
    const ins = findInsights(kb, attempts, [], m, now);
    expect(ins.map((i) => i.text)).toContain(
      "Sözleşmenin kurulması konusunda son 4 sorunun 3'ünü yanlış yaptın.",
    );
  });

  test("kartlarda tekrar tekrar 'bilemedim' dendiyse tespit üretir", () => {
    const reviews: CardReview[] = [
      { id: "r1", card_id: "k1", grade: "again", reviewed_at: iso(30) },
      { id: "r2", card_id: "k1", grade: "again", reviewed_at: iso(20) },
      { id: "r3", card_id: "k1", grade: "again", reviewed_at: iso(10) },
    ];
    const m = buildMastery(kb, [], reviews, now);
    const ins = findInsights(kb, [], reviews, m, now);
    expect(ins.some((i) => i.topic_id === "t2" && i.text.includes("bilemedim"))).toBe(true);
  });

  test("hiç çalışılmamış ders için yönlendirici tespit", () => {
    const attempts: Attempt[] = [att("q1", true, 5)];
    const m = buildMastery(kb, attempts, [], now);
    const ins = findInsights(kb, attempts, [], m, now);
    expect(ins.some((i) => i.course_id === "HUK2013" && i.text.includes("henüz"))).toBe(true);
  });

  test("olay sorularında düşük ortalama tespiti", () => {
    const attempts: Attempt[] = [
      { id: "c1", question_id: "o1", kind: "case", score: 30, answer_text: "x", created_at: iso(20) },
      { id: "c2", question_id: "o1", kind: "case", score: 40, answer_text: "y", created_at: iso(10) },
    ];
    const m = buildMastery(kb, attempts, [], now);
    const ins = findInsights(kb, attempts, [], m, now);
    expect(ins.some((i) => i.topic_id === "t2" && i.text.includes("olay"))).toBe(true);
  });
});
