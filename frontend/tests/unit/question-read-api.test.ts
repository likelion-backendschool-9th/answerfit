import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getArchive, getMyLikedQuestions, getMyQuestions, getQuestionDetail, getSimilarityCandidates } from "@/features/question/api";
import type { CategoryResponse, QuestionDetailResponse, QuestionListItem, QuestionListResponse } from "@/features/question/read-model";
import type { ArchiveQuery } from "@/features/question/rules";
import type { ArchiveQuestion } from "@/features/question/types";
import type { Session } from "@/features/session/types";
import { ApiError, ApiNotConnectedError } from "@/lib/backend-http";

const mocks = vi.hoisted(() => ({
  mode: vi.fn<() => Promise<"api" | "mock">>(),
  member: vi.fn<() => Promise<Session>>(),
  token: vi.fn<() => Promise<string | undefined>>(),
  demoQuestions: vi.fn<() => Promise<ArchiveQuestion[]>>(),
  fetch: vi.fn<typeof fetch>(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/demo/mode", () => ({ getDataMode: mocks.mode }));
vi.mock("@/demo/liked", () => ({ listDemoLikedAnswers: vi.fn() }));
vi.mock("@/demo/question", () => ({
  listDemoQuestions: mocks.demoQuestions,
  addDemoQuestion: vi.fn(),
  likeDemoAnswer: vi.fn(),
  likeDemoQuestion: vi.fn(),
  removeDemoQuestion: vi.fn(),
  reportDemoQuestion: vi.fn(),
  updateDemoQuestion: vi.fn(),
}));
vi.mock("@/features/session/guard", () => ({ requireMember: mocks.member }));
vi.mock("@/features/session/session", () => ({ getAccessToken: mocks.token }));

const query: ArchiveQuery = { kind: "cs", category: null, keyword: "", likedOnly: false, sort: "latest", page: 1 };
const session: Session = { email: "member@example.com", nickname: "면접 연습생", role: "member" };
const sharedIds = Array.from({ length: 10 }, (_, index) => `owned-liked-${index}`);

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("BACKEND_URL", "http://answerfit-backend.test");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.mode.mockResolvedValue("api");
  mocks.member.mockResolvedValue(session);
  mocks.token.mockResolvedValue("verified-access-token");
  mocks.demoQuestions.mockResolvedValue([]);
  mocks.fetch.mockRejectedValue(new Error("Unexpected backend request"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("아카이브 API 조회", () => {
  it.each(["member", "admin"] as const)("%s 역할도 같은 계약과 검증된 토큰을 사용한다", async (role) => {
    mocks.member.mockResolvedValue({ ...session, role });
    mocks.token.mockResolvedValue(`token-for-${role}`);
    mocks.fetch.mockResolvedValueOnce(json(categories())).mockResolvedValueOnce(json(listResponse()));

    const result = await getArchive(query);

    expect(mocks.member).toHaveBeenCalled();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(fetchedUrl(0).pathname).toBe("/api/v1/categories");
    expect(fetchedUrl(1).pathname).toBe("/api/v1/learning/questions");
    expect(Object.fromEntries(fetchedUrl(1).searchParams)).toEqual({
      major: "CS", likedOnly: "false", sort: "LATEST", page: "1", pageSize: "7",
    });
    for (const [, options] of mocks.fetch.mock.calls) {
      expect(options).toMatchObject({ method: "GET", cache: "no-store" });
      expect(new Headers(options?.headers).get("Authorization")).toBe(`Bearer token-for-${role}`);
    }
    expect(result.items[0]).toMatchObject({ id: "1", likes: 4, liked: true, mine: false, reported: true });
    expect(result.items[1]).toMatchObject({ id: "2", mine: true, reported: false });
    expect(mocks.demoQuestions).not.toHaveBeenCalled();
  });

  it.each(["9007199254740993", "운영체제"])("카테고리 %s를 선택 대분류의 서버 ID로 해석한다", async (category) => {
    mocks.fetch.mockResolvedValueOnce(json(categories()))
      .mockResolvedValueOnce(json({ ...listResponse(), totalCount: 13, totalPages: 2 }));

    const result = await getArchive({ ...query, category });

    expect(fetchedUrl(1).searchParams.get("categoryId")).toBe("9007199254740993");
    expect(result.query.category).toBe("9007199254740993");
  });

  it("서버의 필터·순서·전체 건수·페이지·대분류 집계를 다시 계산하지 않는다", async () => {
    const selected: ArchiveQuery = { kind: "personality", category: "협업", keyword: "갈등 & 관계", likedOnly: true, sort: "likes", page: 99 };
    const items = [
      wireItem("last-a", { major: "PERSONALITY", category: { id: "30", name: "협업" }, content: "갈등 & 관계를 해결한 경험은?", likeCount: 8, isLiked: true }),
      wireItem("last-b", { major: "PERSONALITY", category: { id: "30", name: "협업" }, content: "갈등 & 관계에서 배운 점은?", likeCount: 2, isLiked: true }),
    ];
    mocks.fetch.mockResolvedValueOnce(json(categories())).mockResolvedValueOnce(json({
      items, totalCount: 9, page: 2, pageSize: 7, totalPages: 2, majorCounts: { CS: 27, PERSONALITY: 9 },
    } satisfies QuestionListResponse));

    const result = await getArchive(selected);

    expect(Object.fromEntries(fetchedUrl(1).searchParams)).toEqual({
      major: "PERSONALITY", categoryId: "30", keyword: "갈등 & 관계", likedOnly: "true", sort: "LIKES", page: "99", pageSize: "7",
    });
    expect(result.items.map(({ id }) => id)).toEqual(["last-a", "last-b"]);
    expect(result).toMatchObject({ total: 9, page: 2, pages: 2, majorCounts: { cs: 27, personality: 9 } });
    expect(result.query).toEqual({ ...selected, category: "30", page: 2 });
    expect(result.categories).toMatchObject([
      { kind: "cs", label: "CS", count: 27 },
      { kind: "personality", label: "인성 면접", count: 9, categories: [{ id: "30", name: "협업", count: 9 }] },
    ]);
  });

  it.each(["missing", "30", "협업"])("다른 대분류 또는 존재하지 않는 카테고리 %s는 목록 호출 전에 거절한다", async (category) => {
    mocks.fetch.mockResolvedValueOnce(json(categories()));

    await expect(getArchive({ ...query, category })).rejects.toMatchObject({ status: 400, code: "INVALID_CATEGORY" });

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(fetchedUrl(0).pathname).toBe("/api/v1/categories");
    expect(mocks.demoQuestions).not.toHaveBeenCalled();
  });

  it.each(["categories", "list"])("%s 조회 실패를 목업으로 대체하지 않는다", async (failedRequest) => {
    if (failedRequest === "list") mocks.fetch.mockResolvedValueOnce(json(categories()));
    mocks.fetch.mockResolvedValueOnce(json({ code: "INTERNAL_ERROR", message: "서버 조회 실패" }, 500));

    await expect(getArchive(query)).rejects.toMatchObject({ status: 500, code: "INTERNAL_ERROR" });

    expect(mocks.fetch).toHaveBeenCalledTimes(failedRequest === "list" ? 2 : 1);
    expect(mocks.demoQuestions).not.toHaveBeenCalled();
  });
});

describe("전용 질문 상세 API", () => {
  it("공개 목록을 재조회하지 않고 본인 반려 질문과 권한을 상세 응답에서 가져온다", async () => {
    mocks.fetch.mockResolvedValueOnce(json(detailResponse()));

    const result = await getQuestionDetail("9223372036854775807");

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(fetchedUrl(0).pathname).toBe("/api/v1/learning/questions/9223372036854775807");
    expect(result).toMatchObject({
      question: { id: "9223372036854775807", status: "rejected", mine: true, canEdit: true, canDelete: true, canReport: false,
        rejectionReason: "질문의 범위를 구체적으로 정해 주세요.", answerStatus: null, answer: null },
      previous: null, next: null,
    });
    expect(new Headers(mocks.fetch.mock.calls[0][1]?.headers).get("Authorization")).toBe("Bearer verified-access-token");
    expect(mocks.demoQuestions).not.toHaveBeenCalled();
  });

  it("경로의 ID를 인코딩해 슬래시나 쿼리가 호출 URL의 의미를 바꾸지 못하게 한다", async () => {
    const id = "1/2?mine=true";
    mocks.fetch.mockResolvedValueOnce(json({ code: "INVALID_REQUEST", message: "잘못된 ID" }, 400));

    await expect(getQuestionDetail(id)).rejects.toBeInstanceOf(ApiError);

    expect(fetchedUrl(0).pathname).toBe(`/api/v1/learning/questions/${encodeURIComponent(id)}`);
    expect(fetchedUrl(0).search).toBe("");
  });

  it("QUESTION_NOT_FOUND인 404만 상세 없음으로 해석한다", async () => {
    mocks.fetch.mockResolvedValueOnce(json({ code: "QUESTION_NOT_FOUND", message: "질문을 찾을 수 없습니다." }, 404));

    await expect(getQuestionDetail("404")).resolves.toBeNull();

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.demoQuestions).not.toHaveBeenCalled();
  });

  it.each([
    { status: 401, code: "UNAUTHENTICATED" },
    { status: 403, code: "ACCESS_DENIED" },
    { status: 500, code: "INTERNAL_ERROR" },
    { status: 404, code: "OTHER_NOT_FOUND" },
  ])("$status/$code는 상세 없음으로 숨기지 않는다", async ({ status, code }) => {
    mocks.fetch.mockResolvedValueOnce(json({ code, message: "백엔드 거절" }, status));

    await expect(getQuestionDetail("42")).rejects.toMatchObject({ status, code, message: "백엔드 거절" });

    expect(mocks.demoQuestions).not.toHaveBeenCalled();
  });

  it.each(["missing-api", "offline"])("%s 오류를 전파하고 목업을 호출하지 않는다", async (failure) => {
    if (failure === "missing-api") mocks.fetch.mockResolvedValueOnce(json({ message: "Not Found" }, 404));
    else mocks.fetch.mockRejectedValueOnce(new Error("offline"));

    await expect(getQuestionDetail("42")).rejects.toBeInstanceOf(ApiNotConnectedError);

    expect(mocks.demoQuestions).not.toHaveBeenCalled();
  });
});

describe("회원 전용 조회 경계", () => {
  it.each([
    { name: "아카이브", read: () => getArchive(query) },
    { name: "상세", read: () => getQuestionDetail("42") },
    { name: "내 질문", read: getMyQuestions },
    { name: "좋아요 목록", read: getMyLikedQuestions },
    { name: "유사 질문 후보", read: getSimilarityCandidates },
  ])("$name은 회원 검증 실패 전에 데이터에 접근하지 않는다", async ({ read }) => {
    const redirect = new Error("NEXT_REDIRECT:login");
    mocks.member.mockRejectedValueOnce(redirect);

    await expect(read()).rejects.toBe(redirect);

    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.token).not.toHaveBeenCalled();
    expect(mocks.demoQuestions).not.toHaveBeenCalled();
  });
});

describe("기존 전체 배열 소비자", () => {
  it.each([
    { name: "내 질문", read: getMyQuestions, expected: [...sharedIds, "mine-pending", "mine-rejected"] },
    { name: "좋아요 목록", read: getMyLikedQuestions, expected: [...sharedIds, "personality-liked"] },
    { name: "유사 질문 후보", read: getSimilarityCandidates, expected: [...sharedIds, "other-approved"] },
  ])("$name은 아카이브 첫 페이지로 대체되지 않는다", async ({ read, expected }) => {
    mocks.fetch.mockResolvedValueOnce(json(legacyQuestions()));

    const result = await read();

    expect(result.map(({ id }) => id)).toEqual(expected);
    expect(result.length).toBeGreaterThan(7);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(fetchedUrl(0).pathname).toBe("/api/questions");
    expect(fetchedUrl(0).search).toBe("");
    expect(mocks.demoQuestions).not.toHaveBeenCalled();
  });
});

describe("목업 조회", () => {
  it("아카이브에는 승인 질문만 포함하고 로컬 페이지와 공개 건수를 계산한다", async () => {
    mocks.mode.mockResolvedValue("mock");
    mocks.demoQuestions.mockResolvedValue([
      ...Array.from({ length: 8 }, (_, index) => demoQuestion(`cs-${index}`)),
      demoQuestion("mine-pending", { mine: true, status: "pending" }),
      demoQuestion("mine-rejected", { mine: true, status: "rejected" }),
      demoQuestion("personality", { kind: "personality", category: "협업" }),
    ]);

    const result = await getArchive({ ...query, page: 99 });

    expect(result.items.map(({ id }) => id)).toEqual(["cs-7"]);
    expect(result).toMatchObject({ total: 8, page: 2, pages: 2, majorCounts: { cs: 8, personality: 1 }, query: { page: 2 } });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("본인 승인대기 상세는 열리며 미승인 질문에는 앞뒤 이동을 붙이지 않는다", async () => {
    mocks.mode.mockResolvedValue("mock");
    mocks.demoQuestions.mockResolvedValue([
      demoQuestion("new"), demoQuestion("mine-pending", { mine: true, status: "pending" }), demoQuestion("old"),
    ]);

    await expect(getQuestionDetail("mine-pending")).resolves.toMatchObject({
      question: { id: "mine-pending", mine: true, status: "pending", canEdit: true, canDelete: true }, previous: null, next: null,
    });
    await expect(getQuestionDetail("missing")).resolves.toBeNull();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("공개 질문의 앞뒤 이동에서 승인대기와 반려 질문을 제외한다", async () => {
    mocks.mode.mockResolvedValue("mock");
    mocks.demoQuestions.mockResolvedValue([
      demoQuestion("new"), demoQuestion("pending", { mine: true, status: "pending" }), demoQuestion("middle"),
      demoQuestion("rejected", { mine: true, status: "rejected" }), demoQuestion("old"),
    ]);

    await expect(getQuestionDetail("middle")).resolves.toMatchObject({
      previous: { id: "new", text: "질문 new" }, next: { id: "old", text: "질문 old" },
    });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

function fetchedUrl(index: number) {
  return new URL(String(mocks.fetch.mock.calls[index][0]));
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

function categories(): CategoryResponse {
  return { majors: [
    { major: "CS", name: "CS", questionCount: 27, categories: [
      { id: "9007199254740993", name: "운영체제", sortOrder: 10, questionCount: 13 },
      { id: "20", name: "네트워크", sortOrder: 20, questionCount: 14 },
    ] },
    { major: "PERSONALITY", name: "인성 면접", questionCount: 9, categories: [
      { id: "30", name: "협업", sortOrder: 10, questionCount: 9 },
    ] },
  ] };
}

function wireItem(id: string, change: Partial<QuestionListItem> = {}): QuestionListItem {
  return { id, major: "CS", category: { id: "9007199254740993", name: "운영체제" }, content: `서버 질문 ${id}`,
    status: "APPROVED", likeCount: 0, isLiked: false, isMine: false, isReported: false, ...change };
}

function listResponse(): QuestionListResponse {
  return { items: [wireItem("1", { likeCount: 4, isLiked: true, isMine: false, isReported: true }),
    wireItem("2", { likeCount: 3, isMine: true }),
    ...Array.from({ length: 5 }, (_, index) => wireItem(String(index + 3)))],
  totalCount: 27, page: 1, pageSize: 7, totalPages: 4, majorCounts: { CS: 27, PERSONALITY: 9 } };
}

function detailResponse(): QuestionDetailResponse {
  return { ...wireItem("9223372036854775807", { status: "REJECTED", isMine: true }), source: "USER",
    createdAt: "2026-11-26T01:00:00Z", reviewedAt: "2026-11-26T02:00:00Z", canEdit: true, canDelete: true, canReport: false,
    modelAnswer: null, modelAnswerStatus: null, keywords: [], rejectionReason: "질문의 범위를 구체적으로 정해 주세요.", previous: null, next: null };
}

function demoQuestion(id: string, change: Partial<ArchiveQuestion> = {}): ArchiveQuestion {
  return { id, kind: "cs", category: "운영체제", text: `질문 ${id}`, likes: 0, liked: false, mine: false,
    status: "approved", reported: false, answer: null, ...change };
}

function legacyQuestions(): ArchiveQuestion[] {
  return [...sharedIds.map((id) => demoQuestion(id, { mine: true, liked: true })),
    demoQuestion("mine-pending", { mine: true, status: "pending" }),
    demoQuestion("mine-rejected", { mine: true, status: "rejected" }),
    demoQuestion("personality-liked", { kind: "personality", category: "협업", liked: true }),
    demoQuestion("other-approved")];
}
