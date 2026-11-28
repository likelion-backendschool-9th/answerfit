import "server-only";
import { getDataMode } from "@/demo/mode";
import { listDemoLikedAnswers } from "@/demo/liked";
import { addDemoQuestion, likeDemoAnswer, likeDemoQuestion, listDemoQuestions, removeDemoQuestion, reportDemoQuestion, updateDemoQuestion } from "@/demo/question";
import { requireMember } from "@/features/session/guard";
import { getAccessToken } from "@/features/session/session";
import { ApiError, callBackend } from "@/lib/backend-http";
import { toArchiveQuestion, toQuestionCategories, toQuestionDetail, type CategoryResponse, type QuestionCategoryGroup, type QuestionDetailResponse, type QuestionDetailView, type QuestionListResponse } from "./read-model";
import { CS_CATEGORIES, KIND_LABEL, neighbors, PAGE_SIZE, reportReasonType, searchQuestions, similarityKeyword, SIMILAR_CANDIDATE_LIMIT, type ArchiveQuery } from "./rules";
import type { ArchiveQuestion, LikedAnswer, QuestionCategoryOption, QuestionInput, QuestionKind, QuestionLikeResult, ReportInput } from "./types";

const call = async <T>(path: string, method = "GET", body?: object) => callBackend<T>(path, { method, body, token: await getAccessToken(), responseFormat: "plain" });
const QUESTION_PATH = "/api/v1/learning/questions";
const path = (id: string) => {
  // URL의 점 경로 정규화로 다른 자원을 가리키지 않도록 쓰기 ID 형식을 먼저 검사한다.
  if (typeof id !== "string" || !/^[0-9]+$/.test(id) || /^0+$/.test(id)) {
    throw new ApiError(400, "INVALID_REQUEST", "질문 ID를 확인해 주세요.");
  }
  return `${QUESTION_PATH}/${encodeURIComponent(id)}`;
};

const inMock = async () => (await getDataMode()) === "mock";

/** 마이페이지와 후속 액션의 기존 전체 배열 계약. 공개 목록의 페이지 응답으로 대체하지 않는다. */
async function getLegacyQuestions(): Promise<ArchiveQuestion[]> {
  await requireMember();
  return (await inMock()) ? listDemoQuestions() : call("/api/v1/questions");
}

export async function getMyQuestions() {
  return (await getLegacyQuestions()).filter((question) => question.mine);
}

export async function getMyLikedQuestions() {
  return (await getLegacyQuestions()).filter((question) => question.liked);
}

export async function getQuestionCategories(): Promise<QuestionCategoryOption[]> {
  await requireMember();
  if (await inMock()) return CS_CATEGORIES.map((name) => ({ id: name, name }));
  const groups = toQuestionCategories(await call<CategoryResponse>("/api/v1/categories"));
  return groups.find(({ kind }) => kind === "cs")?.categories.map(({ id, name }) => ({ id, name })) ?? [];
}

export async function getSimilarityCandidates(text: string): Promise<ArchiveQuestion[]> {
  await requireMember();
  const keyword = similarityKeyword(text);
  if (!keyword) return [];
  if (await inMock()) {
    const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, "");
    return (await listDemoQuestions()).filter((question) => question.kind === "cs" && question.status === "approved"
      && normalize(question.text).includes(normalize(keyword))).slice(0, SIMILAR_CANDIDATE_LIMIT);
  }
  const params = new URLSearchParams({ major: "CS", keyword, sort: "LATEST", page: "1", pageSize: String(SIMILAR_CANDIDATE_LIMIT) });
  return (await call<QuestionListResponse>(`${QUESTION_PATH}?${params}`)).items.map(toArchiveQuestion);
}

type ArchiveResult = {
  items: ArchiveQuestion[];
  total: number;
  page: number;
  pages: number;
  majorCounts: Record<QuestionKind, number>;
  categories: QuestionCategoryGroup[];
  query: ArchiveQuery;
};

function demoCategories(questions: ArchiveQuestion[]): QuestionCategoryGroup[] {
  return (["cs", "personality"] as const).map((kind) => {
    const own = questions.filter((question) => question.kind === kind);
    const names = [...new Set([...(kind === "cs" ? CS_CATEGORIES : []), ...own.map(({ category }) => category)])];
    return { kind, label: KIND_LABEL[kind], count: own.length,
      categories: names.map((name) => ({ id: name, name, count: own.filter(({ category }) => category === name).length })) };
  });
}

function selectedCategory(groups: QuestionCategoryGroup[], query: ArchiveQuery) {
  if (!query.category) return null;
  const selected = groups.find(({ kind }) => kind === query.kind)?.categories
    .find(({ id, name }) => id === query.category || name === query.category);
  if (!selected) throw new ApiError(400, "INVALID_CATEGORY", "올바른 카테고리를 선택해 주세요.");
  return selected;
}

/** API 모드에서는 서버의 검색·정렬·집계·페이지 결과를 그대로 사용한다. */
export async function getArchive(query: ArchiveQuery): Promise<ArchiveResult> {
  await requireMember();
  if (await inMock()) {
    const questions = (await listDemoQuestions()).filter(({ status }) => status === "approved");
    const categories = demoCategories(questions);
    const selected = selectedCategory(categories, query);
    const result = searchQuestions(questions, { ...query, category: selected?.name ?? null });
    return { ...result, categories, majorCounts: {
      cs: categories.find(({ kind }) => kind === "cs")?.count ?? 0,
      personality: categories.find(({ kind }) => kind === "personality")?.count ?? 0,
    }, query: { ...query, category: selected?.id ?? null, page: result.page } };
  }

  const categories = toQuestionCategories(await call<CategoryResponse>("/api/v1/categories"));
  const selected = selectedCategory(categories, query);
  const params = new URLSearchParams({ major: query.kind === "cs" ? "CS" : "PERSONALITY",
    likedOnly: String(query.likedOnly), sort: query.sort === "likes" ? "LIKES" : "LATEST",
    page: String(query.page), pageSize: String(PAGE_SIZE) });
  if (selected) params.set("categoryId", selected.id);
  if (query.keyword) params.set("keyword", query.keyword);
  const result = await call<QuestionListResponse>(`/api/v1/learning/questions?${params}`);
  return { items: result.items.map(toArchiveQuestion), total: result.totalCount, page: result.page,
    pages: result.totalPages, categories, majorCounts: { cs: result.majorCounts.CS, personality: result.majorCounts.PERSONALITY },
    query: { ...query, category: selected?.id ?? null, page: result.page } };
}

/** 공개 목록에 없는 본인 미승인 질문도 전용 상세 경로에서 조회한다. */
export async function getQuestionDetail(id: string): Promise<QuestionDetailView | null> {
  await requireMember();
  if (await inMock()) {
    const questions = await listDemoQuestions();
    const question = questions.find((one) => one.id === id);
    if (!question) return null;
    const approved = question.status === "approved";
    const editable = question.mine && !approved;
    const adjacent = approved ? neighbors(questions.filter(({ status }) => status === "approved"), question)
      : { previous: null, next: null };
    return { question: { ...question, categoryId: question.category, canEdit: editable, canDelete: editable,
      canReport: approved && !question.mine && !question.reported,
      answerStatus: approved ? question.answer ? "DONE" : "PENDING" : null },
      previous: adjacent.previous && { id: adjacent.previous.id, text: adjacent.previous.text },
      next: adjacent.next && { id: adjacent.next.id, text: adjacent.next.text } };
  }
  try {
    return toQuestionDetail(await call<QuestionDetailResponse>(`/api/v1/learning/questions/${encodeURIComponent(id)}`));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && error.code === "QUESTION_NOT_FOUND") return null;
    throw error;
  }
}

function demoCategoryName(id: string) {
  if (!CS_CATEGORIES.includes(id)) throw new ApiError(400, "INVALID_CATEGORY", "올바른 카테고리를 선택해 주세요.");
  return id;
}

async function editableDemoQuestion(id: string) {
  const question = (await listDemoQuestions()).find((one) => one.id === id);
  return question?.mine && (question.status === "pending" || question.status === "rejected");
}

export async function likeQuestion(id: string, liked: boolean): Promise<QuestionLikeResult> {
  await requireMember();
  if (!(await inMock())) return call(`${path(id)}/likes`, liked ? "POST" : "DELETE");
  const question = (await listDemoQuestions()).find((one) => one.id === id && one.status === "approved");
  if (!question) throw new ApiError(404, "QUESTION_NOT_FOUND", "질문을 찾을 수 없습니다.");
  await likeDemoQuestion(id, liked);
  return { likeCount: question.likes + (question.liked === liked ? 0 : liked ? 1 : -1), isLiked: liked };
}

/** 더 등록할 수 없으면 null */
export async function addQuestion(input: QuestionInput): Promise<string | null> {
  const { nickname, email } = await requireMember();
  if (await inMock()) return addDemoQuestion({ category: demoCategoryName(input.categoryId), text: input.text }, { nickname, email });
  return (await call<{ id: string; status: "PENDING" }>(QUESTION_PATH, "POST", { categoryId: input.categoryId, content: input.text })).id;
}

export async function updateQuestion(id: string, input: QuestionInput): Promise<boolean> {
  await requireMember();
  if (await inMock()) {
    if (!(await editableDemoQuestion(id))) return false;
    await updateDemoQuestion(id, { category: demoCategoryName(input.categoryId), text: input.text });
  } else await call(path(id), "PATCH", { categoryId: input.categoryId, content: input.text });
  return true;
}

export async function removeQuestion(id: string): Promise<boolean> {
  await requireMember();
  if (await inMock()) {
    if (!(await editableDemoQuestion(id))) return false;
    await removeDemoQuestion(id);
  } else await call<null>(path(id), "DELETE");
  return true;
}

/** 내 질문과 이미 신고한 질문은 신고할 수 없다 */
export async function reportQuestion({ questionId, reason, detail }: ReportInput): Promise<boolean> {
  await requireMember();
  const reasonType = reportReasonType(reason);
  if (!reasonType) throw new ApiError(400, "INVALID_REPORT_REASON", "올바른 신고 사유를 선택해 주세요.");
  if (await inMock()) {
    const question = (await listDemoQuestions()).find((one) => one.id === questionId && one.status === "approved");
    if (!question) throw new ApiError(404, "QUESTION_NOT_FOUND", "질문을 찾을 수 없습니다.");
    if (question.mine) throw new ApiError(403, "SELF_REPORT_NOT_ALLOWED", "본인이 등록한 질문은 신고할 수 없습니다.");
    if (question.reported) throw new ApiError(409, "ALREADY_REPORTED", "이미 신고한 질문입니다.");
    await reportDemoQuestion({ questionId, reason, detail });
  } else await call(`${path(questionId)}/reports`, "POST", { reasonType, detail });
  return true;
}

/** 면접 결과에서 좋아요한 질문 */
export async function getLikedAnswers(): Promise<LikedAnswer[]> {
  await requireMember();
  return (await inMock()) ? listDemoLikedAnswers() : call("/api/v1/questions/liked-answers");
}

export async function likeAnswer(id: string, liked: boolean) {
  await requireMember();
  if (await inMock()) await likeDemoAnswer(id, liked);
  else await call(`/api/v1/questions/liked-answers/${encodeURIComponent(id)}`, liked ? "PUT" : "DELETE");
}
