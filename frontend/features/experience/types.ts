/** 백엔드 ActivityType 값. 화면 순서대로 둔다 */
export const ACTIVITY_TYPES = ["PROJECT", "INTERN", "PART_TIME", "CLUB", "CONTEST", "ETC"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/**
 * 한 경험을 역량 하나의 관점으로 적은 서술. 같은 공모전을 "분석력"과 "협업"으로 나눠 쓰면 서술이 두 개다.
 * 면접에서 역량별로 다른 일화를 꺼내 쓰기 위해서다.
 */
export type Story = {
  id: string;
  tags: string[];
  /** 활동 내용(상황·과제·행동) */
  content: string;
  result: string;
};

/** 백엔드 형식은 미확정. 날짜는 YYYY-MM-DD, 종료일이 없으면 진행 중이다. 서술은 하나 이상이다 */
export type Experience = {
  id: string;
  title: string;
  type: ActivityType | null;
  startedOn: string | null;
  endedOn: string | null;
  organization: string;
  role: string;
  stories: Story[];
};

/** 경험 전체에 걸린 열 */
export const EXPERIENCE_COLUMNS = ["title", "type", "period", "organization", "role"] as const;
/** 역량 행마다 다른 열 */
export const STORY_COLUMNS = ["tags", "content", "result"] as const;
export type Column = (typeof EXPERIENCE_COLUMNS)[number] | (typeof STORY_COLUMNS)[number];

/** 셀 하나를 고칠 때 바뀌는 값. 서술 열이면 그 서술에, 아니면 경험에 들어간다 */
export type Patch = Partial<Omit<Experience, "id" | "stories">> & Partial<Omit<Story, "id">>;
