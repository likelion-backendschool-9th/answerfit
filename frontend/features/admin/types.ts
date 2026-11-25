import type { QuestionKind } from "@/features/question/types";

/** 백엔드 형식은 모두 미확정 */
export type AnswerState = "ready" | "generating" | "none";

export type BankQuestion = {
  id: string;
  code: string;
  kind: QuestionKind;
  category: string;
  text: string;
  answerState: AnswerState;
  /** 신고로 숨겼다 */
  hidden: boolean;
  /** 올린 사용자의 닉네임. 관리자가 등록했으면 null */
  source: string | null;
  likes: number;
  /** YYYY-MM-DD */
  updatedOn: string;
  answer: string;
  keywords: string[];
};

export type QuestionDraft = { kind: QuestionKind; category: string; text: string; answer: string; keywords: string[] };

export type PendingQuestion = {
  id: string;
  code: string;
  category: string;
  text: string;
  nickname: string;
  email: string;
  /** ISO */
  createdAt: string;
  similar: { id: string; code: string; text: string } | null;
};

export type ReportStatus = "waiting" | "hidden" | "closed";
export type ReportEntry = { reason: string; detail: string; /** ISO */ at: string };
export type ReportedQuestion = { id: string; code: string; text: string; status: ReportStatus; /** 최근 것부터 */ entries: ReportEntry[] };

export type LoginProvider = "local" | "github" | "kakao" | "google";
export type Suspension = { /** 풀리는 날(YYYY-MM-DD). 영구면 null */ releaseOn: string | null; reason: string };
export type AdminMember = {
  id: string;
  nickname: string;
  email: string;
  provider: LoginProvider;
  /** YYYY-MM-DD */
  joinedOn: string;
  lastSeenOn: string;
  interviews: number;
  questions: number;
  suspension: Suspension | null;
};
export type MemberSummary = { joinedThisWeek: number; seenToday: number; interviewsThisMonth: number; releasedThisWeek: number };

export type ActionResult = { error?: string };
