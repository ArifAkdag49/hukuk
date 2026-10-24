import { examCap, isDueForExam, type ExamDates } from "./exams";
import type { CardState, Flashcard } from "./types";

/**
 * Günlük kart hatırlatma planı (saf). Her gün için seçilen saatte vadesi gelmiş olacak kart sayısı.
 * Ana sayfadaki "Bugünkü tekrar" ile aynı kural: aktif dersler, hiç görülmemiş kartlar dahil.
 */
export interface PlanInput {
  cards: Flashcard[];
  cardStates: Map<string, CardState>;
  activeCourseIds: string[];
  now: Date;
  hour: number;
  minute: number;
  days?: number;
  /** Sınav takvimi: son turda öne alınan kartlar da sayılır. */
  exams?: ExamDates;
}

export interface PlannedReminder {
  date: Date;
  count: number;
}

export function planReminders({ cards, cardStates, activeCourseIds, now, hour, minute, days = 7, exams = {} }: PlanInput): PlannedReminder[] {
  const active = new Set(activeCourseIds);
  const pool = cards.filter((c) => active.has(c.course_id));
  const out: PlannedReminder[] = [];
  for (let d = 0; d < days; d++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, hour, minute, 0, 0);
    if (date.getTime() <= now.getTime()) continue;
    let count = 0;
    const caps = new Map<string, Date | null>();
    for (const c of pool) {
      if (!caps.has(c.course_id)) caps.set(c.course_id, examCap(c.course_id, exams, date));
      if (isDueForExam(cardStates.get(c.id), date, caps.get(c.course_id) ?? null)) count++;
    }
    if (count > 0) out.push({ date, count });
  }
  return out;
}
