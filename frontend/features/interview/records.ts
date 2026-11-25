import type { InterviewMode, RecordType } from "./types";

/** 백엔드 형식은 미확정 */
export type InterviewRecord = {
  id: string;
  title: string;
  type: RecordType;
  mode: InterviewMode;
  count: number;
  score: number;
  groupId: string | null;
  groupName: string | null;
  /** 시작한 시각(ISO) */
  startedAt: string;
  /** 이 날짜가 지나면 영상을 지운다(YYYY-MM-DD) */
  deleteAfter: string;
};

export const RECORD_TYPES: RecordType[] = ["experience", "cs", "personality", "pt"];
export const RECORD_LABEL: Record<RecordType, string> = { experience: "경험 면접", cs: "CS 면접", personality: "인성 면접", pt: "PT 면접" };
export const RECORD_SHORT: Record<RecordType, string> = { experience: "경험", cs: "CS", personality: "인성", pt: "PT" };
export const MODE_SHORT: Record<InterviewMode, string> = { practice: "연습", real: "실전" };
export const RECORD_SORTS = { latest: "최신순", oldest: "오래된순", score: "점수순" } as const;
export type RecordSort = keyof typeof RECORD_SORTS;
export const RECORD_PAGE_SIZE = 8;

export type RecordQuery = { type: RecordType | null; keyword: string; sort: RecordSort; page: number };
type Params = Record<string, string | string[] | undefined>;

export function readRecordQuery(params: Params): RecordQuery {
  const one = (name: string) => (typeof params[name] === "string" ? params[name] : "");
  const page = Number(one("page"));
  const sort = one("sort");
  return {
    type: RECORD_TYPES.find((type) => type === one("type")) ?? null,
    keyword: one("q").trim().slice(0, 100),
    sort: sort === "oldest" || sort === "score" ? sort : "latest",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** 조건을 바꾸면 첫 쪽으로 간다 */
export function recordsHref(query: RecordQuery, change: Partial<RecordQuery> = {}) {
  const next = { ...query, page: 1, ...change };
  const params = new URLSearchParams();
  if (next.type) params.set("type", next.type);
  if (next.keyword) params.set("q", next.keyword);
  if (next.sort !== "latest") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  const text = params.toString();
  return text ? `/my/interviews?${text}` : "/my/interviews";
}

const byTime = (a: InterviewRecord, b: InterviewRecord) => Date.parse(b.startedAt) - Date.parse(a.startedAt);
const ORDER: Record<RecordSort, (a: InterviewRecord, b: InterviewRecord) => number> = {
  latest: byTime,
  oldest: (a, b) => byTime(b, a),
  score: (a, b) => b.score - a.score || byTime(a, b),
};

export function searchRecords(records: InterviewRecord[], query: RecordQuery) {
  const keyword = query.keyword.toLowerCase();
  const found = records.filter(({ type, title }) => (!query.type || type === query.type) && title.toLowerCase().includes(keyword)).sort(ORDER[query.sort]);
  const pages = Math.max(1, Math.ceil(found.length / RECORD_PAGE_SIZE));
  const page = Math.min(query.page, pages);
  return { items: found.slice((page - 1) * RECORD_PAGE_SIZE, page * RECORD_PAGE_SIZE), page, pages };
}

export const PERIODS = { month: "이번 달", quarter: "최근 3개월", all: "전체" } as const;
export type Period = keyof typeof PERIODS;
/** 견주는 앞 기간의 이름. 전체는 견줄 기간이 없다 */
export const PREVIOUS_LABEL: Record<Period, string | null> = { month: "지난달", quarter: "이전 3개월", all: null };

export const readPeriod = (value: unknown): Period => (value === "quarter" || value === "all" ? value : "month");

/** 한국 시간으로 몇 번째 달인지. 달끼리 빼서 몇 달 차이인지 센다 */
function monthIndex(date: Date) {
  const [year, month] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(date).split("-").map(Number);
  return year * 12 + month;
}

/** 이번 기간과 바로 앞 기간의 기록 */
export function splitByPeriod(records: InterviewRecord[], period: Period, now: Date) {
  if (period === "all") return { current: records, previous: [] };
  const size = period === "month" ? 1 : 3;
  const age = ({ startedAt }: InterviewRecord) => monthIndex(now) - monthIndex(new Date(startedAt));
  return {
    current: records.filter((record) => age(record) >= 0 && age(record) < size),
    previous: records.filter((record) => age(record) >= size && age(record) < size * 2),
  };
}

export const averageScore = (records: InterviewRecord[]) => (records.length === 0 ? null : Math.round(records.reduce((sum, { score }) => sum + score, 0) / records.length));

/** 유형 하나의 평균과 앞 기간과의 차이. 견줄 기록이 없으면 차이는 null */
export function typeStats(records: InterviewRecord[], type: RecordType, period: Period, now: Date) {
  const { current, previous } = splitByPeriod(
    records.filter((record) => record.type === type),
    period,
    now,
  );
  const score = averageScore(current);
  const before = averageScore(previous);
  return { score, count: current.length, change: score !== null && before !== null ? score - before : null };
}
