import { KIND_LABEL } from "./rules";
import type { ArchiveQuestion, ModelAnswer, QuestionKind } from "./types";

export type BackendQuestionMajor = "CS" | "PERSONALITY";
export type BackendQuestionStatus = "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
export type BackendModelAnswerStatus = "PENDING" | "DONE" | "FAILED";

type CategoryItem = { id: string; name: string };
type Neighbor = { id: string; content: string };

/** Java의 QuestionListResponse와 같은 형식. ID는 문자열 그대로 보존한다. */
export type QuestionListItem = {
  id: string;
  major: BackendQuestionMajor;
  category: CategoryItem | null;
  content: string;
  status: BackendQuestionStatus;
  likeCount: number;
  isLiked: boolean;
  isMine: boolean;
  isReported: boolean;
};

export type QuestionListResponse = {
  items: QuestionListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  majorCounts: Record<BackendQuestionMajor, number>;
};

export type QuestionDetailResponse = QuestionListItem & {
  source: "ADMIN" | "USER";
  createdAt: string;
  reviewedAt: string | null;
  canEdit: boolean;
  canDelete: boolean;
  canReport: boolean;
  modelAnswer: string | null;
  modelAnswerStatus: BackendModelAnswerStatus | null;
  keywords: string[];
  rejectionReason: string | null;
  previous: Neighbor | null;
  next: Neighbor | null;
};

export type CategoryResponse = {
  majors: {
    major: BackendQuestionMajor;
    name: string;
    questionCount: number;
    categories: (CategoryItem & { sortOrder: number; questionCount: number })[];
  }[];
};

export type QuestionDetailView = {
  question: ArchiveQuestion;
  previous: { id: string; text: string } | null;
  next: { id: string; text: string } | null;
};

export type QuestionCategoryGroup = {
  kind: QuestionKind;
  label: string;
  count: number;
  categories: { id: string; name: string; count: number }[];
};

const KINDS: Record<BackendQuestionMajor, QuestionKind> = { CS: "cs", PERSONALITY: "personality" };
const seoulDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });

function dateInSeoul(instant: string) {
  const parts = seoulDate.formatToParts(new Date(instant));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function questionStatus(status: BackendQuestionStatus): ArchiveQuestion["status"] {
  switch (status) {
    case "APPROVED": return "approved";
    case "PENDING": return "pending";
    case "REJECTED": return "rejected";
    case "HIDDEN": throw new Error("숨긴 질문은 학습 화면에 표시할 수 없습니다.");
  }
}

/** 목록에는 답안과 변경 권한이 없다. 승인 여부로 권한을 추정하지 않는다. */
export function toArchiveQuestion(item: QuestionListItem): ArchiveQuestion {
  const kind = KINDS[item.major];
  return {
    id: item.id,
    kind,
    categoryId: item.category?.id ?? null,
    category: item.category?.name ?? KIND_LABEL[kind],
    text: item.content,
    likes: item.likeCount,
    liked: item.isLiked,
    mine: item.isMine,
    reported: item.isReported,
    status: questionStatus(item.status),
    answer: null,
  };
}

function modelAnswer(text: string | null, keywords: string[]): ModelAnswer | null {
  const content = text?.replace(/\r\n?/g, "\n").trim();
  if (!content) return null;
  const [summary, ...body] = content.split(/\n\s*\n/);
  return { summary: summary.trim(), body: body.join("\n\n").trim(), keywords: [...keywords] };
}

export function toQuestionDetail(detail: QuestionDetailResponse): QuestionDetailView {
  return {
    question: {
      ...toArchiveQuestion(detail),
      createdOn: dateInSeoul(detail.createdAt),
      ...(detail.status === "APPROVED" && detail.reviewedAt ? { approvedOn: dateInSeoul(detail.reviewedAt) } : {}),
      reviewedAt: detail.reviewedAt,
      answer: modelAnswer(detail.modelAnswer, detail.keywords),
      answerStatus: detail.modelAnswerStatus,
      rejectionReason: detail.rejectionReason,
      canEdit: detail.canEdit,
      canDelete: detail.canDelete,
      canReport: detail.canReport,
    },
    previous: detail.previous && { id: detail.previous.id, text: detail.previous.content },
    next: detail.next && { id: detail.next.id, text: detail.next.content },
  };
}

export function toQuestionCategories(response: CategoryResponse): QuestionCategoryGroup[] {
  return response.majors.map(({ major, name, questionCount, categories }) => ({
    kind: KINDS[major],
    label: name,
    count: questionCount,
    categories: categories.map(({ id, name, questionCount }) => ({ id, name, count: questionCount })),
  }));
}
