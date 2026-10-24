import { parseStarred, wrongQuestionIds } from "../src/mistakes";
import type { Attempt } from "../src/types";

const a = (question_id: string, correct: boolean, created_at: string, kind: Attempt["kind"] = "mcq"): Attempt => ({
  id: `${question_id}-${created_at}`, question_id, kind, correct, created_at,
});

describe("yanlışlarım defteri", () => {
  test("son cevabı yanlış olanlar, en son yanlış önce", () => {
    const ids = wrongQuestionIds([
      a("q1", false, "2026-10-01T10:00:00Z"),
      a("q2", false, "2026-10-02T10:00:00Z"),
      a("q1", true, "2026-10-03T10:00:00Z"), // sonradan doğru: çıkar
      a("q3", true, "2026-10-01T09:00:00Z"),
      a("q3", false, "2026-10-04T09:00:00Z"), // sonradan yanlış: girer
      a("c1", false, "2026-10-05T09:00:00Z", "case"), // olaylar sayılmaz
    ]);
    expect(ids).toEqual(["q3", "q2"]);
  });

  test("yıldız kaydı bozuksa boş", () => {
    expect([...parseStarred('["q1","q2"]')]).toEqual(["q1", "q2"]);
    expect(parseStarred("{bozuk").size).toBe(0);
    expect(parseStarred(null).size).toBe(0);
  });
});
