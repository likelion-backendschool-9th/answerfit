/** 백엔드 형식은 모두 미확정 */
export type InterviewMode = "practice" | "real";
export type InterviewType = "experience" | "cs";

export type DocumentGroup = {
  id: string;
  name: string;
  /** 요약에 쓰는 짧은 이름 */
  shortName: string;
  description: string;
  /** 기업 면접일(YYYY-MM-DD). 없으면 null */
  interviewDate: string | null;
  /** 스캔에 실패한 그룹은 고를 수 없다 */
  error: string | null;
};

export type InterviewSetup = {
  mode: InterviewMode;
  type: InterviewType;
  count: number;
  groupId: string | null;
  /** 이 날짜가 지나면 영상을 지운다(YYYY-MM-DD). 비우면 30일 뒤 */
  deleteAfter: string | null;
};

export type Question = { id: string; category: string; text: string; hint: string };
export type Interview = { id: string; mode: InterviewMode; type: InterviewType; questions: Question[] };

export type AnswerInput = { interviewId: string; questionId: string; seconds: number };
export type AnswerResult = { ok: true; followUp: Question | null } | { ok: false; error: string };
