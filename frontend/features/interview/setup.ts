import type { DocumentGroup, InterviewMode, InterviewSetup, InterviewType } from "./types";

export const COUNTS = [3, 4, 5, 6, 7, 8];
export const MODE_LABEL: Record<InterviewMode, string> = { practice: "연습 모드", real: "실전 모드" };
export const TYPE_LABEL: Record<InterviewType, string> = { experience: "경험 면접", cs: "CS 면접" };
export const KEEP_DAYS = 30;
const MINUTES_PER_QUESTION = 5;

export const estimateMinutes = (count: number) => count * MINUTES_PER_QUESTION;

/** 2026-12-10 → 2026.12.10 이후 */
export const deleteLabel = (date: string | null) => (date ? `${date.replaceAll("-", ".")} 이후` : `면접일부터 ${KEEP_DAYS}일 뒤`);

/** 실제로 있는 날짜인지 본다. 2026-02-30 같은 값은 막는다 */
export function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** 화면과 서버가 함께 쓰는 검사. 문제가 없으면 undefined */
export function setupError(setup: InterviewSetup, groups: DocumentGroup[], today: string): string | undefined {
  if (!(setup.mode in MODE_LABEL)) return "진행 방식을 골라 주세요.";
  if (!(setup.type in TYPE_LABEL)) return "면접 유형을 골라 주세요.";
  if (!COUNTS.includes(setup.count)) return "질문 수를 3~8개 중에서 골라 주세요.";
  if (setup.deleteAfter !== null) {
    if (!isDate(setup.deleteAfter)) return "영상 보관 날짜가 올바르지 않아요.";
    if (setup.deleteAfter < today) return "영상 보관 날짜는 오늘부터 고를 수 있어요.";
  }
  if (setup.type !== "experience") return undefined;
  const group = groups.find(({ id }) => id === setup.groupId);
  if (!group) return "서류 그룹을 골라 주세요.";
  if (group.error) return "스캔에 실패한 서류 그룹은 쓸 수 없어요.";
}

/** 한국 시간 기준 오늘(YYYY-MM-DD) */
export const todayInSeoul = (now: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
