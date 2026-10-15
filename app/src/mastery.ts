import type { Grade } from "./types";

/** Ustalık puanı (spec Bölüm 7). */

export interface DataPoint {
  kind: "mcq" | "case" | "card";
  value: number; // 0-100
  at: Date;
}

export interface Mastery {
  score: number | null; // null → yetersiz veri
  dataPoints: number;
}

export const KIND_WEIGHT: Record<DataPoint["kind"], number> = { mcq: 1, case: 2, card: 0.5 };
export const HALF_LIFE_DAYS = 14;
export const MIN_DATA_POINTS = 3;

const CARD_VALUE: Record<Grade, number> = { again: 0, hard: 60, good: 85, easy: 100 };
const DAY_MS = 24 * 60 * 60 * 1000;

export function cardValue(grade: Grade): number {
  return CARD_VALUE[grade];
}

export function topicMastery(points: DataPoint[], now: Date): Mastery {
  const dataPoints = points.length;
  if (dataPoints < MIN_DATA_POINTS) return { score: null, dataPoints };
  let sumW = 0;
  let sumWV = 0;
  for (const p of points) {
    const days = Math.max(0, (now.getTime() - p.at.getTime()) / DAY_MS);
    const w = KIND_WEIGHT[p.kind] * Math.pow(0.5, days / HALF_LIFE_DAYS);
    sumW += w;
    sumWV += w * p.value;
  }
  if (sumW === 0) return { score: null, dataPoints };
  return { score: Math.round(sumWV / sumW), dataPoints };
}

/** Ders puanı: yalnızca yeterli verisi olan konuların ortalaması. */
export function courseMastery(topicScores: (number | null)[]): number | null {
  const valid = topicScores.filter((s): s is number => s !== null);
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}
