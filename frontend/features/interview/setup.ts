import type { DocumentGroup, InterviewMode, InterviewSetup, InterviewType } from "./types";

export const COUNTS = [3, 4, 5, 6, 7, 8];
export const MODE_LABEL: Record<InterviewMode, string> = { practice: "연습 모드", real: "실전 모드" };
export const TYPE_LABEL: Record<InterviewType, string> = { experience: "경험 면접", cs: "CS 면접", personality: "인성 · 컬쳐핏 면접", pt: "PT 면접" };
export const KEEP_DAYS = 30;

/** 자소서·직무기술서로 질문을 만드는 유형 */
export const needsDocuments = (type: InterviewType) => type === "experience" || type === "personality";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 2026-12-10 → 2026년 12월 10일 (목) */
export function longDateLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}년 ${month}월 ${day}일 (${WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]})`;
}

/** "2026-12" → 달력 칸. 1일 앞의 요일 수만큼 빈칸(null)을 두고 날짜(YYYY-MM-DD)를 잇는다. 첫 칸은 일요일 */
export function monthDays(month: string): (string | null)[] {
  const [year, index] = month.split("-").map(Number);
  const blanks = new Date(Date.UTC(year, index - 1, 1)).getUTCDay();
  const count = new Date(Date.UTC(year, index, 0)).getUTCDate();
  return [...Array<null>(blanks).fill(null), ...Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
}

/** "2026-12"에서 by달 옮긴 달 */
export function shiftMonth(month: string, by: number) {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index - 1 + by, 1)).toISOString().slice(0, 7);
}

/** 실제로 있는 날짜인지 본다. 2026-02-30 같은 값은 막는다 */
export function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** 화면과 서버가 함께 쓰는 검사. 문제가 없으면 undefined */
export function setupError(setup: InterviewSetup, groups: DocumentGroup[], today: string): string | undefined {
  if (!Object.hasOwn(MODE_LABEL, setup.mode)) return "진행 방식을 골라 주세요.";
  if (!Object.hasOwn(TYPE_LABEL, setup.type)) return "면접 유형을 골라 주세요.";
  if (!COUNTS.includes(setup.count)) return "질문 수를 3~8개 중에서 골라 주세요.";
  if (setup.deleteAfter !== null) {
    if (!isDate(setup.deleteAfter)) return "영상 보관 날짜가 올바르지 않아요.";
    if (setup.deleteAfter < today) return "영상 보관 날짜는 오늘부터 고를 수 있어요.";
  }
  if (!needsDocuments(setup.type)) return undefined;
  const group = groups.find(({ id }) => id === setup.groupId);
  if (!group) return "서류 그룹을 골라 주세요.";
  if (group.error) return "스캔에 실패한 서류 그룹은 쓸 수 없어요.";
}

export const GROUP_NAME_MAX = 30;

export function groupNameError(name: string) {
  const length = [...name].length;
  if (length < 1 || length > GROUP_NAME_MAX) return `이름은 1~${GROUP_NAME_MAX}자로 입력해 주세요.`;
}

type Params = Record<string, string | string[] | undefined>;

/** 주소의 값으로 처음 설정을 정한다. 잘못된 값은 기본값으로 둔다 */
export function initialSetup(groups: DocumentGroup[], params: Params, today: string): InterviewSetup {
  const usable = groups.filter(({ error }) => !error);
  const group = usable.find(({ id }) => id === params.group) ?? usable[0] ?? null;
  const count = Number(params.count);
  const date = group?.interviewDate ?? null;
  return {
    mode: params.mode === "real" ? "real" : "practice",
    type: typeof params.type === "string" && Object.hasOwn(TYPE_LABEL, params.type) ? (params.type as InterviewType) : "experience",
    count: COUNTS.includes(count) ? count : 5,
    groupId: group?.id ?? null,
    // 지난 면접일은 보관 날짜로 쓸 수 없다
    deleteAfter: date && date >= today ? date : null,
  };
}

/** 한국 시간 기준 오늘(YYYY-MM-DD) */
export const todayInSeoul = (now: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
