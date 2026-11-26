import type { Period } from "@/features/interview/records";

/** 백엔드 형식은 미확정 */
/** attempts: 그 기간에 이 분야 질문을 받은 횟수 */
export type CategoryScore = { name: string; score: number; previous: number | null; attempts: number };
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

/** 레이더는 3각형부터 그린다. 그보다 적으면 목록만 보인다 */
export const RADAR_MIN = 3;
/** 이보다 많으면 응시 횟수가 많은 RADAR_OVERFLOW개만 그린다 */
export const RADAR_MAX = 10;
export const RADAR_OVERFLOW = 8;

/** 레이더에 그릴 분야. 고른 분야는 원래 순서를 지켜 꼭짓점 자리가 기간마다 크게 바뀌지 않게 한다 */
export function radarCategories(categories: CategoryScore[]) {
  if (categories.length < RADAR_MIN) return [];
  if (categories.length <= RADAR_MAX) return categories;
  const kept = new Set([...categories].sort((a, b) => b.attempts - a.attempts).slice(0, RADAR_OVERFLOW));
  return categories.filter((category) => kept.has(category));
}

/** 점수가 가장 낮은 분야. 같으면 앞의 것 */
export const lowestOf = (categories: CategoryScore[]) => categories.reduce<CategoryScore | null>((low, category) => (!low || category.score < low.score ? category : low), null);

/** 위에서 시계 방향으로 도는 점. 값은 0~100 */
export function radarPoint(index: number, count: number, value: number, radius: number) {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  const round = (n: number) => Math.round(n * 100) / 100;
  return { x: round(Math.cos(angle) * radius * (value / 100)), y: round(Math.sin(angle) * radius * (value / 100)) };
}
