import type { Period } from "@/features/interview/records";

/** 백엔드 형식은 미확정 */
export type CategoryScore = { name: string; score: number; previous: number | null };
export type Learning = { streakDays: number; categories: Record<Period, CategoryScore[]> };

const WEAK_COUNT = 2;

/** 점수가 높은 순 */
export const ranked = (categories: CategoryScore[]) => [...categories].sort((a, b) => b.score - a.score);

/** 가장 약한 분야. 약한 것부터. 80점 이상이면 약하다고 하지 않는다 */
export const weakest = (categories: CategoryScore[]) =>
  ranked(categories)
    .filter(({ score }) => score < 80)
    .slice(-WEAK_COUNT)
    .reverse();

export const averageOf = (categories: CategoryScore[]) => (categories.length === 0 ? 0 : Math.round(categories.reduce((sum, { score }) => sum + score, 0) / categories.length));

/** 받침이 있으면 이, 없으면 가 */
export function withSubject(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return `${word}${code >= 0 && code <= 11171 && code % 28 > 0 ? "이" : "가"}`;
}

/** 위에서 시계 방향으로 도는 점. 값은 0~100 */
export function radarPoint(index: number, count: number, value: number, radius: number) {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  const round = (n: number) => Math.round(n * 100) / 100;
  return { x: round(Math.cos(angle) * radius * (value / 100)), y: round(Math.sin(angle) * radius * (value / 100)) };
}
