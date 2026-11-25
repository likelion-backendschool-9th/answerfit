/** 백엔드 형식은 모두 미확정 */
export type QuestionKind = "cs" | "personality";

export type ModelAnswer = {
  summary: string;
  table?: { head: string[]; rows: string[][] };
  body: string;
  keywords: string[];
};

export type ArchiveQuestion = {
  id: string;
  kind: QuestionKind;
  category: string;
  text: string;
  likes: number;
  liked: boolean;
  /** 내가 등록한 질문 */
  mine: boolean;
  status: "approved" | "pending";
  reported: boolean;
  /** 내가 등록한 질문에만 있다(YYYY-MM-DD) */
  createdOn?: string;
  approvedOn?: string;
  /** 승인 전에는 없다 */
  answer: ModelAnswer | null;
};

/** 면접에서 받아 좋아요한 질문 */
export type LikedAnswer = { id: string; interviewId: string; text: string; date: string; typeLabel: string; score: number };

export type QuestionInput = { category: string; text: string };
export type ReportInput = { questionId: string; reason: string; detail: string };
export type SimilarQuestion = { id: string; text: string };
export type ActionResult = { error?: string };
