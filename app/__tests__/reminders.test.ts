import { planReminders } from "../src/reminders";
import type { CardState, Flashcard } from "../src/types";

const card = (id: string, course_id = "HUK2011"): Flashcard => ({
  id, topic_id: "t", course_id, front_md: "", back_md: "", origin: "bank", note_id: null,
});
const state = (card_id: string, due: Date): CardState => ({
  card_id, ease: 2.5, interval_days: 1, repetitions: 1, due_at: due.toISOString(), last_grade: "good", updated_at: due.toISOString(),
});
// Yerel saatle kur: test ortamının saat diliminden bağımsız
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min, 0, 0);

describe("planReminders", () => {
  const now = at(2026, 10, 16, 9, 0);

  test("her gün için o saatte vadesi gelmiş kart sayısı; yeni kartlar da sayılır", () => {
    const cards = [card("yeni"), card("bugun"), card("yarin"), card("ucgun")];
    const states = new Map<string, CardState>([
      ["bugun", state("bugun", at(2026, 10, 16, 8))],
      ["yarin", state("yarin", at(2026, 10, 17, 12))],
      ["ucgun", state("ucgun", at(2026, 10, 19, 23))],
    ]);
    const plan = planReminders({ cards, cardStates: states, activeCourseIds: ["HUK2011"], now, hour: 20, minute: 0, days: 4 });
    expect(plan.map((p) => [p.date.getDate(), p.date.getHours(), p.count])).toEqual([
      [16, 20, 2], // yeni + bugun
      [17, 20, 3], // + yarin
      [18, 20, 3],
      [19, 20, 3], // ucgun 23:00'te vadeli, 20:00'de değil
    ]);
  });

  test("saati geçmiş bugün atlanır", () => {
    const plan = planReminders({ cards: [card("yeni")], cardStates: new Map(), activeCourseIds: ["HUK2011"], now: at(2026, 10, 16, 21), hour: 20, minute: 0, days: 2 });
    expect(plan.map((p) => p.date.getDate())).toEqual([17]);
  });

  test("sayısı 0 olan günler atlanır, kapalı derslerin kartları sayılmaz", () => {
    const cards = [card("a", "HUK2013"), card("b")];
    const states = new Map<string, CardState>([["b", state("b", at(2026, 10, 18, 10))]]);
    const plan = planReminders({ cards, cardStates: states, activeCourseIds: ["HUK2011"], now, hour: 20, minute: 30, days: 4 });
    expect(plan.map((p) => [p.date.getDate(), p.date.getMinutes(), p.count])).toEqual([
      [18, 30, 1],
      [19, 30, 1],
    ]);
  });

  test("varsayılan 7 gün", () => {
    const plan = planReminders({ cards: [card("yeni")], cardStates: new Map(), activeCourseIds: ["HUK2011"], now, hour: 20, minute: 0 });
    expect(plan).toHaveLength(7);
  });
});
