/** 백엔드 ActivityType 값. 화면 순서대로 둔다 */
export const ACTIVITY_TYPES = ["PROJECT", "INTERN", "PART_TIME", "CLUB", "CONTEST", "ETC"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** 백엔드 형식은 미확정. 날짜는 YYYY-MM-DD, 종료일이 없으면 진행 중이다 */
export type Experience = {
  id: string;
  title: string;
  type: ActivityType | null;
  startedOn: string | null;
  endedOn: string | null;
  organization: string;
  role: string;
  tags: string[];
  /** 활동 내용(상황·과제·행동). 긴 내용이라 상세 패널에서 적는다 */
  content: string;
  result: string;
};

/** 표에서 바로 고치는 열 */
export type Column = "title" | "type" | "period" | "organization" | "role" | "tags" | "result";
