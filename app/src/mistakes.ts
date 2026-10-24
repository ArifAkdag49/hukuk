import type { Attempt } from "./types";

/**
 * Yanlışlarım defteri (saf): çoktan seçmeli bir sorunun EN SON cevabı yanlışsa soru deftere girer;
 * sonradan doğru cevaplanınca çıkar. Sıra: en son yanlış yapılan önce.
 */
export function wrongQuestionIds(attempts: Attempt[]): string[] {
  const last = new Map<string, Attempt>();
  for (const a of attempts) {
    if (a.kind !== "mcq") continue;
    const prev = last.get(a.question_id);
    if (!prev || prev.created_at <= a.created_at) last.set(a.question_id, a);
  }
  return [...last.values()]
    .filter((a) => a.correct === false)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
    .map((a) => a.question_id);
}

/** Yıldızlı soruların meta kaydı: JSON dizi. Bozuk kayıtta boş küme. */
export function parseStarred(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const v: unknown = JSON.parse(raw);
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}
