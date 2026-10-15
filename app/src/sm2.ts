import type { CardState, Grade } from "./types";

/** Standart SM-2 (spec Bölüm 7). Uygulamada çalışır, böylece kartlar çevrimdışı zamanlanır. */

export const GRADE_QUALITY: Record<Grade, number> = { again: 0, hard: 3, good: 4, easy: 5 };
export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;

const DAY_MS = 24 * 60 * 60 * 1000;

export function review(state: CardState | null, grade: Grade, now: Date, cardId?: string): CardState {
  const q = GRADE_QUALITY[grade];
  const prevEase = state?.ease ?? INITIAL_EASE;
  const prevReps = state?.repetitions ?? 0;
  const prevInterval = state?.interval_days ?? 0;

  let repetitions: number;
  let interval: number;
  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions = prevReps + 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.max(1, Math.round(prevInterval * prevEase));
  }

  const ease = Math.max(MIN_EASE, prevEase + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  return {
    card_id: state?.card_id ?? cardId ?? "",
    ease: Math.round(ease * 1000) / 1000,
    interval_days: interval,
    repetitions,
    due_at: new Date(now.getTime() + interval * DAY_MS).toISOString(),
    last_grade: grade,
    updated_at: now.toISOString(),
  };
}

/** Hiç görülmemiş kart (state yok) da vadesi gelmiş sayılır. */
export function isDue(state: CardState | undefined | null, now: Date): boolean {
  if (!state) return true;
  return new Date(state.due_at).getTime() <= now.getTime();
}

/** Bir sonraki tekrarın ne zaman olacağını kısa Türkçe metinle anlatır. */
export function intervalLabel(days: number): string {
  if (days <= 1) return "yarın";
  if (days < 30) return `${days} gün sonra`;
  const months = Math.round(days / 30);
  return `${months} ay sonra`;
}
