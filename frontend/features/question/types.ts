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
  /** 승인 전에는 없다 */
  answer: ModelAnswer | null;
};

export type QuestionInput = { category: string; text: string };
export type ReportInput = { questionId: string; reason: string; detail: string };
export type SimilarQuestion = { id: string; text: string };
export type ActionResult = { error?: string };
