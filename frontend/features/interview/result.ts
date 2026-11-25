import type { InterviewMode, RecordType } from "./types";

/** 백엔드 형식은 모두 미확정 */
export type ResultItem = {
  id: string;
  /** Q2, Q2-1 */
  label: string;
  /** 꼬리 질문이면 원래 질문의 id */
  parentId: string | null;
  category: string;
  /** 목록에 쓰는 짧은 제목 */
  title: string;
  text: string;
  score: number;
  accuracy: number;
  accuracyNote: string;
  gaze: number;
  gazeNote: string;
  seconds: number;
  /** 다시 볼 이유 한 줄 */
  reviewNote: string;
  comment: string;
  keywords: string[];
  tip: string;
  transcript: string;
};

export type InterviewResult = {
  id: string;
  title: string;
  mode: InterviewMode;
  type: RecordType;
  groupId: string | null;
  groupName: string | null;
  /** 시작한 시각(ISO) */
  startedAt: string;
  /** 이 날짜가 지나면 영상을 지운다(YYYY-MM-DD) */
  deleteAfter: string;
  items: ResultItem[];
};

export type ResultState = { state: "inProgress" } | { state: "analyzing" } | { state: "done"; result: InterviewResult };

export type Rating = { label: string; tone: "good" | "neutral" | "bad" };

/** 80 이상 우수, 60~79 준수, 60 미만 노력 필요 */
export function rateScore(score: number): Rating {
  if (score >= 80) return { label: "우수", tone: "good" };
  if (score >= 60) return { label: "준수", tone: "neutral" };
  return { label: "노력 필요", tone: "bad" };
}

export const FAST_UNDER = 60;
export const SLOW_OVER = 150;

/** 1분 미만 빠름, 1분~2분 30초 준수, 2분 30초 초과 느림 */
export function rateTime(seconds: number): Rating {
  if (seconds < FAST_UNDER) return { label: "빠름", tone: "bad" };
  if (seconds > SLOW_OVER) return { label: "느림", tone: "bad" };
  return { label: "준수", tone: "good" };
}

const TIME_NOTE: Record<string, string> = { 빠름: "핵심을 전하기에 조금 짧았어요", 준수: "핵심을 전하기에 알맞은 길이였어요", 느림: "핵심을 전하기에 조금 길었어요" };
export const timeNote = (seconds: number) => `${TIME_NOTE[rateTime(seconds).label]} · 권장 1분~2분 30초`;

const average = (values: number[]) => (values.length === 0 ? 0 : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length));

export function summarize(items: ResultItem[]) {
  return {
    score: average(items.map(({ score }) => score)),
    gaze: average(items.map(({ gaze }) => gaze)),
    seconds: average(items.map(({ seconds }) => seconds)),
  };
}

/** 점수가 낮은 순으로 최대 2개. 우수한 답변은 다시 보라고 하지 않는다 */
export const itemsToReview = (items: ResultItem[]) => items.filter(({ score }) => score < 80).sort((a, b) => a.score - b.score).slice(0, 2);

export const bestItem = (items: ResultItem[]) => items.reduce<ResultItem | null>((best, item) => (!best || item.score > best.score ? item : best), null);

export const mainItems = (items: ResultItem[]) => items.filter(({ parentId }) => parentId === null);

/** 꼬리 질문을 보고 있으면 원래 질문의 자리 */
export const mainIdOf = ({ id, parentId }: ResultItem) => parentId ?? id;

/** 112 → 1:52 */
export const duration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const DAY_MS = 24 * 60 * 60 * 1000;

/** 날짜 사이의 일수. 지났으면 음수 */
export const daysUntil = (date: string, today: string) => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);

export const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

function seoulParts(iso: string) {
  const parts = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${get("year")}.${get("month")}.${get("day")}`, weekday: get("weekday"), time: `${get("hour")}:${get("minute")}` };
}

export function startedLabel(iso: string) {
  const { date, weekday, time } = seoulParts(iso);
  return `${date} (${weekday}) ${time}`;
}

export function defaultTitle(iso: string) {
  const { date, time } = seoulParts(iso);
  return `${date} ${time} 면접`;
}

export const TITLE_MAX = 40;

export function titleError(title: string) {
  const length = [...title].length;
  if (length < 1 || length > TITLE_MAX) return `제목은 1~${TITLE_MAX}자로 입력해 주세요.`;
}
