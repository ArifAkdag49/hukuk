import { formatDate } from "../src/format";
import { countdownText, daysUntil, examCap, isDueForExam, parseDateTr, upcomingExams, type ExamDates } from "../src/exams";
import type { CardState } from "../src/types";

const at = (y: number, m: number, d: number, h = 0) => new Date(y, m - 1, d, h, 0, 0, 0);
const state = (due: Date, updated: Date): CardState => ({
  card_id: "k", ease: 2.5, interval_days: 30, repetitions: 3, due_at: due.toISOString(), last_grade: "good", updated_at: updated.toISOString(),
});

describe("tarih ayrıştırma", () => {
  test("gg.aa.yyyy ve gg/aa/yyyy kabul edilir, geçersiz günler reddedilir", () => {
    expect(parseDateTr("12.01.2027")).toBe("2027-01-12");
    expect(parseDateTr("5/6/2027")).toBe("2027-06-05");
    expect(parseDateTr("31.02.2027")).toBeNull();
    expect(parseDateTr("2027-01-12")).toBeNull();
  });

  test("takvim günü farkı saatten bağımsız", () => {
    expect(daysUntil("2026-11-05", at(2026, 11, 5, 23))).toBe(0);
    expect(daysUntil("2026-11-06", at(2026, 11, 5, 23))).toBe(1);
    expect(daysUntil("2026-11-04", at(2026, 11, 5))).toBe(-1);
  });
});

describe("yaklaşan sınavlar", () => {
  const exams: ExamDates = {
    HUK3015: { vize: "2026-11-01", final: "2027-01-10" },
    HUK3012: { final: "2026-11-20" },
  };
  test("geçmiş sınavlar düşer, en yakın önce gelir", () => {
    const up = upcomingExams(exams, at(2026, 11, 8));
    expect(up.map((e) => [e.courseId, e.kind, e.days])).toEqual([
      ["HUK3012", "final", 12],
      ["HUK3015", "final", 63],
    ]);
  });
  test("geri sayım metni Türkçe eklerle", () => {
    expect(countdownText("Ceza Özel", { kind: "final", days: 12 })).toBe("Ceza Özel finaline 12 gün");
    expect(countdownText("Ceza Özel", { kind: "vize", days: 1 })).toBe("Ceza Özel vizesi yarın");
    expect(countdownText("Ceza Özel", { kind: "final", days: 0 })).toBe("Ceza Özel finali bugün");
  });
});

describe("sınav öncesi tekrar öne alma", () => {
  const exams: ExamDates = { HUK3015: { final: "2026-11-20" } };

  test("sınır sınavdan 3 gün önce başlar", () => {
    expect(examCap("HUK3015", exams, at(2026, 11, 16, 12))).toBeNull();
    expect(examCap("HUK3015", exams, at(2026, 11, 17, 9))?.getDate()).toBe(17);
    expect(examCap("HUK3012", exams, at(2026, 11, 17, 9))).toBeNull();
  });

  test("sınavdan sonraya vadeli kart son turda öne alınır, son turda tekrar edilince alınmaz", () => {
    const now = at(2026, 11, 18, 10);
    const cap = examCap("HUK3015", exams, now);
    const eski = state(at(2026, 12, 20), at(2026, 11, 1));
    const sonTurdaGorulmus = state(at(2026, 12, 20), at(2026, 11, 17, 15));
    expect(isDueForExam(eski, now, cap)).toBe(true);
    expect(isDueForExam(sonTurdaGorulmus, now, cap)).toBe(false);
    expect(isDueForExam(eski, now, null)).toBe(false);
  });

  test("yeni kart ve vadesi gelmiş kart her zaman vadeli", () => {
    const now = at(2026, 11, 10);
    expect(isDueForExam(null, now, null)).toBe(true);
    expect(isDueForExam(state(at(2026, 11, 9), at(2026, 11, 3)), now, null)).toBe(true);
  });
});

test("karar tarihi gün.ay.yıl olarak okunur", () => {
  expect(formatDate("09.03.2017")).toContain("2017");
  expect(formatDate("09.03.2017")).not.toContain("Eylül");
});
