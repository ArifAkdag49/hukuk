import { isDue } from "./sm2";
import type { CardState } from "./types";

/**
 * Sınav takvimi (saf). Her dersin vize ve final tarihi "YYYY-AA-GG" olarak tutulur.
 *
 * Tekrar planını öne alma kuralı: sınava SON_TUR_GUN gün kala o dersin, sınavdan önce sırası
 * gelmeyecek kartları bir kez öne alınır. Kart bu son turda tekrar edildiyse (updated_at sınır
 * gününden sonra) bir daha öne alınmaz, normal SM-2 vadesine döner.
 */

export type ExamKind = "vize" | "final";
export const EXAM_KINDS: ExamKind[] = ["vize", "final"];
export const EXAM_LABEL: Record<ExamKind, string> = { vize: "Vize", final: "Final" };

/** Ders kodu → sınav türü → "YYYY-AA-GG" */
export type ExamDates = Record<string, Partial<Record<ExamKind, string>>>;

export const SON_TUR_GUN = 3;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TR_RE = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/;

function localDay(iso: string): Date | null {
  const m = ISO_RE.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** "12.01.2027" → "2027-01-12"; geçersiz tarih (31.02 gibi) → null. */
export function parseDateTr(s: string): string | null {
  const m = TR_RE.exec(s.trim());
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "2027-01-12" → "12.01.2027" */
export function formatDateTr(iso: string): string {
  const m = ISO_RE.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

/** Takvim günü farkı: bugün 0, yarın 1, geçmiş negatif. */
export function daysUntil(iso: string, now: Date): number {
  const d = localDay(iso);
  if (!d) return Number.NaN;
  return Math.round((d.getTime() - startOfDay(now).getTime()) / 86_400_000);
}

export interface UpcomingExam {
  courseId: string;
  kind: ExamKind;
  date: string;
  days: number;
}

/** Bugün ve sonrasındaki sınavlar, en yakından uzağa. courseIds verilirse yalnız o dersler. */
export function upcomingExams(exams: ExamDates, now: Date, courseIds?: Iterable<string>): UpcomingExam[] {
  const only = courseIds ? new Set(courseIds) : null;
  const out: UpcomingExam[] = [];
  for (const [courseId, kinds] of Object.entries(exams)) {
    if (only && !only.has(courseId)) continue;
    for (const kind of EXAM_KINDS) {
      const date = kinds[kind];
      if (!date) continue;
      const days = daysUntil(date, now);
      if (days >= 0) out.push({ courseId, kind, date, days });
    }
  }
  return out.sort((a, b) => a.days - b.days || a.courseId.localeCompare(b.courseId));
}

/** "Ceza Özel finaline 12 gün", "… finali bugün", "… finali yarın" */
export function countdownText(courseName: string, e: Pick<UpcomingExam, "kind" | "days">): string {
  const [iyelik, yonelme] = e.kind === "vize" ? ["vizesi", "vizesine"] : ["finali", "finaline"];
  if (e.days === 0) return `${courseName} ${iyelik} bugün`;
  if (e.days === 1) return `${courseName} ${iyelik} yarın`;
  return `${courseName} ${yonelme} ${e.days} gün`;
}

/**
 * Bu dersin son tur sınırı: en yakın sınavdan SON_TUR_GUN gün önceki günün başı.
 * Sınır henüz gelmediyse ya da yaklaşan sınav yoksa null.
 */
export function examCap(courseId: string, exams: ExamDates, now: Date): Date | null {
  const next = upcomingExams(exams, now, [courseId])[0];
  if (!next) return null;
  const exam = localDay(next.date);
  if (!exam) return null;
  const cap = new Date(exam.getFullYear(), exam.getMonth(), exam.getDate() - SON_TUR_GUN);
  return cap.getTime() <= now.getTime() ? cap : null;
}

/** SM-2'ye göre vadesi gelmişse ya da sınav son turunda öne alınmışsa true. */
export function isDueForExam(state: CardState | undefined | null, now: Date, cap: Date | null): boolean {
  if (isDue(state, now)) return true;
  if (!cap || !state) return false;
  return new Date(state.updated_at).getTime() < cap.getTime();
}
