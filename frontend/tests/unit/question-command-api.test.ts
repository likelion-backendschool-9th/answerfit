import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addQuestion, getQuestionCategories, getSimilarityCandidates, likeQuestion, removeQuestion, reportQuestion, updateQuestion } from "@/features/question/api";
import type { ArchiveQuestion } from "@/features/question/types";
import { ApiError } from "@/lib/backend-http";

const mocks = vi.hoisted(() => ({ member: vi.fn(), token: vi.fn(), mode: vi.fn(), fetch: vi.fn<typeof fetch>(),
  list: vi.fn(), add: vi.fn(), update: vi.fn(), remove: vi.fn(), like: vi.fn(), report: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/features/session/guard", () => ({ requireMember: mocks.member }));
vi.mock("@/features/session/session", () => ({ getAccessToken: mocks.token }));
vi.mock("@/demo/mode", () => ({ getDataMode: mocks.mode }));
vi.mock("@/demo/liked", () => ({ listDemoLikedAnswers: vi.fn() }));
vi.mock("@/demo/question", () => ({ listDemoQuestions: mocks.list, addDemoQuestion: mocks.add,
  updateDemoQuestion: mocks.update, removeDemoQuestion: mocks.remove, likeDemoQuestion: mocks.like,
  reportDemoQuestion: mocks.report, likeDemoAnswer: vi.fn() }));

const base = "/api/v1/learning/questions";
const input = { categoryId: "9007199254740993", text: "프로세스와 스레드의 차이는 무엇인가요?" };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("BACKEND_URL", "http://answerfit.test");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.member.mockResolvedValue({ email: "member@example.com", nickname: "회원", role: "member" });
  mocks.token.mockResolvedValue("synthetic-token");
  mocks.mode.mockResolvedValue("api");
  mocks.list.mockResolvedValue([]);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
const request = () => ({ url: new URL(String(mocks.fetch.mock.calls[0][0])), options: mocks.fetch.mock.calls[0][1] });
const body = () => JSON.parse(String(request().options?.body));

describe("문제은행 쓰기 요청", () => {
  it("생성 ID를 보존하고 서버가 결정하는 속성은 보내지 않는다", async () => {
    mocks.fetch.mockResolvedValueOnce(json({ id: "9223372036854775807", status: "PENDING" }, 201));
    const forged = { ...input, authorId: "999", status: "APPROVED", source: "ADMIN" };
    await expect(addQuestion(forged)).resolves.toBe("9223372036854775807");
    expect(request().url.pathname).toBe(base);
    expect(request().options).toMatchObject({ method: "POST", cache: "no-store" });
    expect(body()).toEqual({ categoryId: input.categoryId, content: input.text });
    expect(new Headers(request().options?.headers).get("Authorization")).toBe("Bearer synthetic-token");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("수정은 전체 배열을 먼저 읽지 않고 PATCH한다", async () => {
    mocks.fetch.mockResolvedValueOnce(json({ id: "42", status: "PENDING", canEdit: true, canDelete: true }));
    await expect(updateQuestion("42", input)).resolves.toBe(true);
    expect(request().url.pathname).toBe(`${base}/42`);
    expect(request().options?.method).toBe("PATCH");
    expect(body()).toEqual({ categoryId: input.categoryId, content: input.text });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("삭제는 body 없는 DELETE와 빈 204를 처리한다", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(removeQuestion("42")).resolves.toBe(true);
    expect(request().options).toMatchObject({ method: "DELETE", body: undefined });
    expect(request().url.pathname).toBe(`${base}/42`);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each([true, false])("좋아요 %s는 서버의 최종 집계와 선택 상태를 사용한다", async (liked) => {
    mocks.fetch.mockResolvedValueOnce(json({ likeCount: 47, isLiked: liked }));
    await expect(likeQuestion("42", liked)).resolves.toEqual({ likeCount: 47, isLiked: liked });
    expect(request().url.pathname).toBe(`${base}/42/likes`);
    expect(request().options).toMatchObject({ method: liked ? "POST" : "DELETE", body: undefined });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each([
    ["질문 내용이 사실과 달라요", "WRONG_QUESTION"], ["모범답안이 틀렸어요", "WRONG_ANSWER"],
    ["이미 있는 질문과 중복돼요", "DUPLICATE"], ["부적절한 표현이 있어요", "INAPPROPRIATE"], ["기타", "ETC"],
  ])("신고 문구 %s를 서버 유형으로 보낸다", async (reason, reasonType) => {
    mocks.fetch.mockResolvedValueOnce(json({ id: "8", status: "PENDING" }, 201));
    await expect(reportQuestion({ questionId: "42", reason, detail: "상세" })).resolves.toBe(true);
    expect(request().url.pathname).toBe(`${base}/42/reports`);
    expect(request().options?.method).toBe("POST");
    expect(body()).toEqual({ reasonType, detail: "상세" });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each(["1/2?userId=7", "..", ".", "", "0", "-1"])("잘못된 쓰기 ID %s는 URL로 변환하기 전에 거절한다", async (id) => {
    await expect(removeQuestion(id)).rejects.toMatchObject({ status: 400, code: "INVALID_REQUEST" });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

const writes = [
  { name: "등록", run: () => addQuestion(input) }, { name: "수정", run: () => updateQuestion("42", input) },
  { name: "삭제", run: () => removeQuestion("42") }, { name: "좋아요", run: () => likeQuestion("42", true) },
  { name: "신고", run: () => reportQuestion({ questionId: "42", reason: "기타", detail: "" }) },
];
describe("인증과 쓰기 실패", () => {
  it.each([...writes, { name: "카테고리", run: getQuestionCategories }, { name: "후보 검색", run: () => getSimilarityCandidates("프로세스 질문입니다.") }])
  ("$name은 회원 확인 실패 후 데이터에 접근하지 않는다", async ({ run }) => {
    const redirect = new Error("NEXT_REDIRECT");
    mocks.member.mockRejectedValueOnce(redirect);
    await expect(run()).rejects.toBe(redirect);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it.each(writes.flatMap((write) => [
    { ...write, status: 403, code: "ACCESS_DENIED" }, { ...write, status: 404, code: "QUESTION_NOT_FOUND" },
    { ...write, status: 409, code: "QUESTION_STATE_CHANGED" },
  ]))("$name $status를 재시도하거나 목업으로 대체하지 않는다", async ({ run, status, code }) => {
    mocks.fetch.mockResolvedValueOnce(json({ code, message: "서버 거절" }, status));
    await expect(run()).rejects.toMatchObject({ status, code, message: "서버 거절" });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.add).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled(); expect(mocks.like).not.toHaveBeenCalled(); expect(mocks.report).not.toHaveBeenCalled();
  });
  it("Security 필터의 401 envelope도 같은 오류 경계로 보낸다", async () => {
    mocks.fetch.mockResolvedValueOnce(json({ success: false, data: null, error: { errorCode: "BACKEND-SECURITY-101", detail: "로그인 필요" } }, 401));
    await expect(addQuestion(input)).rejects.toMatchObject({ status: 401, message: "로그인 필요" });
  });
  it("알 수 없는 신고 문구는 요청 전에 거절한다", async () => {
    await expect(reportQuestion({ questionId: "42", reason: "unknown", detail: "" })).rejects.toBeInstanceOf(ApiError);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

describe("분류와 후보 검색", () => {
  it("서버의 CS 분류 ID와 이름만 폼 옵션으로 전달한다", async () => {
    mocks.fetch.mockResolvedValueOnce(json({ majors: [
      { major: "CS", name: "CS", questionCount: 1, categories: [{ id: input.categoryId, name: "새 분류", sortOrder: 1, questionCount: 1 }] },
      { major: "PERSONALITY", name: "인성", questionCount: 0, categories: [{ id: "2", name: "협업", sortOrder: 1, questionCount: 0 }] },
    ] }));
    await expect(getQuestionCategories()).resolves.toEqual([{ id: input.categoryId, name: "새 분류" }]);
    expect(request().url.pathname).toBe("/api/v1/categories");
  });
  it("최대 100자 검색어와 한 페이지 20개로 후보만 요청한다", async () => {
    mocks.fetch.mockResolvedValueOnce(json({ items: [], totalCount: 500, page: 1, totalPages: 25, pageSize: 20, majorCounts: { CS: 500, PERSONALITY: 0 } }));
    await expect(getSimilarityCandidates("x".repeat(200))).resolves.toEqual([]);
    expect(Object.fromEntries(request().url.searchParams)).toEqual({ major: "CS", keyword: "x".repeat(100), sort: "LATEST", page: "1", pageSize: "20" });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("의미 있는 핵심어가 없으면 전체 아카이브를 다운로드하지 않는다", async () => {
    await expect(getSimilarityCandidates("설명해 주세요.")).resolves.toEqual([]);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

describe("명시적 목업 분기", () => {
  const question = (change: Partial<ArchiveQuestion> = {}): ArchiveQuestion => ({ id: "demo", kind: "cs", category: "웹", text: "목업 질문입니다.", likes: 2, liked: false, mine: true, status: "pending", reported: false, answer: null, ...change });
  beforeEach(() => mocks.mode.mockResolvedValue("mock"));
  it("폼의 목업 ID를 표시 이름으로 바꿔 기존 데모 저장소에 전달한다", async () => {
    mocks.add.mockResolvedValueOnce("new-demo");
    await expect(addQuestion({ categoryId: "웹", text: input.text })).resolves.toBe("new-demo");
    expect(mocks.add).toHaveBeenCalledWith({ category: "웹", text: input.text }, { nickname: "회원", email: "member@example.com" });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each(["pending", "rejected"] as const)("본인 %s 질문을 수정한다", async (status) => {
    mocks.list.mockResolvedValueOnce([question({ status })]);
    await expect(updateQuestion("demo", { categoryId: "웹", text: input.text })).resolves.toBe(true);
    expect(mocks.update).toHaveBeenCalledWith("demo", { category: "웹", text: input.text });
  });
  it("승인된 질문은 목업에서도 삭제하지 않는다", async () => {
    mocks.list.mockResolvedValueOnce([question({ status: "approved" })]);
    await expect(removeQuestion("demo")).resolves.toBe(false);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it.each([
    { change: { status: "pending" as const }, code: "QUESTION_NOT_FOUND" },
    { change: { status: "approved" as const }, code: "SELF_REPORT_NOT_ALLOWED" },
    { change: { status: "approved" as const, mine: false, reported: true }, code: "ALREADY_REPORTED" },
  ])("목업도 $code 신고를 거절한다", async ({ change, code }) => {
    mocks.list.mockResolvedValueOnce([question(change)]);
    await expect(reportQuestion({ questionId: "demo", reason: "기타", detail: "" })).rejects.toMatchObject({ code });
    expect(mocks.report).not.toHaveBeenCalled();
  });
});
