/** 화면에서 사용하는 형식. 백엔드 응답은 read-model에서 변환한다. */
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
  categoryId?: string | null;
  text: string;
  likes: number;
  liked: boolean;
  /** 내가 등록한 질문 */
  mine: boolean;
  status: "approved" | "pending" | "rejected";
  reported: boolean;
  /** 내가 등록한 질문에만 있다(YYYY-MM-DD) */
  createdOn?: string;
  approvedOn?: string;
  /** 승인 전에는 없다 */
  answer: ModelAnswer | null;
  answerStatus?: "PENDING" | "DONE" | "FAILED" | null;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  canEdit?: boolean;
  canDelete?: boolean;
  canReport?: boolean;
};

/** 면접에서 받아 좋아요한 질문 */
export type LikedAnswer = { id: string; interviewId: string; text: string; date: string; typeLabel: string; score: number };

export type QuestionCategoryOption = { id: string; name: string };
export type QuestionInput = { categoryId: string; text: string };
export type ReportInput = { questionId: string; reason: string; detail: string };
export type SimilarQuestion = { id: string; text: string };
export type SimilarResult = { question: SimilarQuestion | null; error?: string };
export type QuestionLikeResult = { likeCount: number; isLiked: boolean };
export type ActionResult = { error?: string; id?: string; like?: QuestionLikeResult };
