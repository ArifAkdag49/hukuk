import { review, isDue, GRADE_QUALITY } from "../src/sm2";
import type { CardState } from "../src/types";

const DAY = 24 * 60 * 60 * 1000;
const t0 = new Date("2026-10-16T09:00:00.000Z");

function daysBetween(fromIso: string, to: Date) {
  return Math.round((new Date(fromIso).getTime() - to.getTime()) / DAY);
}

describe("SM-2", () => {
  test("not eşlemesi: again=0, hard=3, good=4, easy=5", () => {
    expect(GRADE_QUALITY).toEqual({ again: 0, hard: 3, good: 4, easy: 5 });
  });

  test("yeni kart, ilk 'bildim' → 1 gün sonra, başlangıç kolaylığı 2.5 korunur", () => {
    const s = review(null, "good", t0, "k1");
    expect(s.card_id).toBe("k1");
    expect(s.repetitions).toBe(1);
    expect(s.interval_days).toBe(1);
    expect(daysBetween(s.due_at, t0)).toBe(1);
    // q=4 → ease değişimi 0.1 - 1*(0.08+0.02) = 0
    expect(s.ease).toBeCloseTo(2.5, 5);
    expect(s.last_grade).toBe("good");
    expect(s.updated_at).toBe(t0.toISOString());
  });

  test("ikinci başarılı tekrar → 6 gün", () => {
    const s1 = review(null, "good", t0, "k1");
    const t1 = new Date(t0.getTime() + DAY);
    const s2 = review(s1, "good", t1);
    expect(s2.repetitions).toBe(2);
    expect(s2.interval_days).toBe(6);
    expect(daysBetween(s2.due_at, t1)).toBe(6);
  });

  test("üçüncü tekrar → önceki aralık × kolaylık", () => {
    const s1 = review(null, "good", t0, "k1");
    const s2 = review(s1, "good", t0);
    const s3 = review(s2, "good", t0);
    expect(s3.repetitions).toBe(3);
    expect(s3.interval_days).toBe(Math.round(6 * 2.5));
  });

  test("'çok kolay' kolaylığı artırır", () => {
    const s = review(null, "easy", t0, "k1");
    expect(s.ease).toBeCloseTo(2.6, 5);
  });

  test("'bilemedim' tekrar sayısını sıfırlar ve 1 gün sonraya koyar", () => {
    let s: CardState = review(null, "good", t0, "k1");
    s = review(s, "good", t0);
    s = review(s, "good", t0);
    const failed = review(s, "again", t0);
    expect(failed.repetitions).toBe(0);
    expect(failed.interval_days).toBe(1);
    expect(daysBetween(failed.due_at, t0)).toBe(1);
    expect(failed.last_grade).toBe("again");
  });

  test("kolaylık katsayısı hiçbir zaman 1.3'ün altına düşmez", () => {
    let s: CardState = review(null, "again", t0, "k1");
    for (let i = 0; i < 10; i++) s = review(s, "again", t0);
    expect(s.ease).toBeGreaterThanOrEqual(1.3);
    expect(s.ease).toBeCloseTo(1.3, 5);
    s = review(s, "hard", t0);
    expect(s.ease).toBeGreaterThanOrEqual(1.3);
  });

  test("'zorlandım' başarılı sayılır ama kolaylığı düşürür", () => {
    const s = review(null, "hard", t0, "k1");
    expect(s.repetitions).toBe(1);
    expect(s.interval_days).toBe(1);
    // q=3 → 0.1 - 2*(0.08+0.04) = -0.14
    expect(s.ease).toBeCloseTo(2.36, 5);
  });

  test("isDue: vadesi gelmiş kartı tanır", () => {
    const s = review(null, "good", t0, "k1");
    expect(isDue(s, t0)).toBe(false);
    expect(isDue(s, new Date(t0.getTime() + DAY))).toBe(true);
    expect(isDue(undefined, t0)).toBe(true); // hiç görülmemiş kart
  });
});
