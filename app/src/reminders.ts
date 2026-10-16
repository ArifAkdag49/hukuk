import { isDue } from "./sm2";
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
}

export interface PlannedReminder {
  date: Date;
  count: number;
}

export function planReminders({ cards, cardStates, activeCourseIds, now, hour, minute, days = 7 }: PlanInput): PlannedReminder[] {
  const active = new Set(activeCourseIds);
  const pool = cards.filter((c) => active.has(c.course_id));
  const out: PlannedReminder[] = [];
  for (let d = 0; d < days; d++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, hour, minute, 0, 0);
    if (date.getTime() <= now.getTime()) continue;
    let count = 0;
    for (const c of pool) if (isDue(cardStates.get(c.id), date)) count++;
    if (count > 0) out.push({ date, count });
  }
  return out;
}
