import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { finishKakaoLogin, loginWithSocial } from "@/features/auth/api";
import { getAccessToken, getSession } from "@/features/session/session";
import { getArchive, getLikedAnswers, getMyLikedQuestions, getMyQuestions, getQuestionDetail } from "@/features/question/api";
import { likeAction, loadQuestionCategoriesAction, removeQuestionAction, reportAction, saveQuestionAction, similarAction } from "@/features/question/actions";
import { ApiNotConnectedError } from "@/lib/backend-http";
import { readQuery } from "@/features/question/rules";

const context = vi.hoisted(() => ({ cookies: new Map<string, string>(), refresh: vi.fn(), revalidate: vi.fn() }));
// HTTP와 인증 로직은 실제로 실행하고 Next 요청/렌더링 환경만 제공한다.
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: (name: string) => context.cookies.has(name) ? { name, value: context.cookies.get(name) } : undefined,
  set: (name: string, value: string) => { context.cookies.set(name, value); },
  delete: (name: string | { name: string }) => { context.cookies.delete(typeof name === "string" ? name : name.name); },
}) }));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("next/cache", () => ({ refresh: context.refresh, revalidatePath: context.revalidate }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); },
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
}));

type Fixture = {
  backendUrl: string; ownerCode: string; otherCode: string; categoryId: string; alternateCategoryId: string;
  rejectedQuestionId: string; pendingAnswerId: string; failedAnswerId: string; doneAnswerId: string;
  hiddenQuestionId: string; deletedQuestionId: string; personalityQuestionId: string;
  publicCsCount: number; publicPersonalityCount: number;
};
const fixturePath = process.env.ANSWERFIT_INTEGRATION_FIXTURE;
if (!fixturePath) throw new Error("Run this suite through backend ./gradlew fullStackTest; a disposable server fixture is required.");
const fixture: Fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const endpoint = new URL(fixture.backendUrl);
if (endpoint.protocol !== "http:" || endpoint.hostname !== "127.0.0.1" || !endpoint.port) {
  throw new Error("Integration mutations require the isolated loopback backend started by fullStackTest.");
}
let ownerToken: string;
let otherToken: string;
const query = readQuery({});
const input = { categoryId: fixture.categoryId, text: "프로세스와 스레드의 차이는 무엇인가요?" };

async function login(code: string) {
  context.cookies.set("demo-mode", "api");
  const authorization = await loginWithSocial("kakao", "/archive");
  if (!authorization) throw new Error("The integration suite must not enter mock mode.");
  const state = new URL(authorization).searchParams.get("state");
  if (!state) throw new Error("The Kakao state cookie was not created.");
  const result = await finishKakaoLogin(new URLSearchParams({ code, state }));
  expect(result).toEqual({ ok: true, next: "/archive" });
  const token = await getAccessToken();
  if (!token) throw new Error("The real login response did not set an access-token cookie.");
  return token;
}
function actor(token: string) {
  context.cookies.set("demo-mode", "api");
  context.cookies.set("access-token", token);
}
function savedId(result: { id?: string; error?: string }) {
  expect(result.error).toBeUndefined();
  if (!result.id) throw new Error("Expected the backend-generated question ID.");
  return result.id;
}

beforeAll(async () => {
  vi.stubEnv("BACKEND_URL", fixture.backendUrl);
  vi.stubEnv("APP_ENV", "test");
  vi.stubEnv("KAKAO_CLIENT_ID", "integration-fixture-client");
  vi.stubEnv("SITE_URL", "http://frontend-regression.test");
  ownerToken = await login(fixture.ownerCode);
  otherToken = await login(fixture.otherCode);
  actor(ownerToken);
});
afterEach(() => {
  actor(ownerToken);
  context.refresh.mockClear();
  context.revalidate.mockClear();
});
afterAll(() => { context.cookies.clear(); vi.unstubAllEnvs(); });

describe("actual frontend modules → HTTP → JWT → JPA", () => {
  it("로그인 쿠키로 회원·분류·서버 페이지와 개인화를 읽는다", async () => {
    expect(await getSession()).toMatchObject({ role: "member" });
    const categories = await loadQuestionCategoriesAction();
    expect(categories.error).toBeUndefined();
    expect(categories.categories).toContainEqual({ id: fixture.categoryId, name: "운영체제" });
    const page = await getArchive({ ...query, page: 999 });
    expect(page.total).toBe(fixture.publicCsCount);
    expect(page.majorCounts).toEqual({ cs: fixture.publicCsCount, personality: fixture.publicPersonalityCount });
    expect(page.page).toBe(2);
    expect(page.items).toHaveLength(4);
    expect(page.items.every((question) => question.status === "approved")).toBe(true);
    expect(page.items.map(({ id }) => id)).not.toContain(fixture.rejectedQuestionId);
  });

  it("CS 등록→본인 상세→타인 차단→수정→삭제와 204·404를 실제 요청으로 연결한다", async () => {
    const id = savedId(await saveQuestionAction(null, input));
    expect(context.revalidate).toHaveBeenCalledWith(`/archive/${id}`);
    expect((await getQuestionDetail(id))?.question).toMatchObject({ id, status: "pending", mine: true, canEdit: true, canDelete: true });
    actor(otherToken);
    expect(await getQuestionDetail(id)).toBeNull();
    expect((await saveQuestionAction(id, input)).error).toBe("질문을 찾을 수 없습니다.");
    actor(ownerToken);
    expect(savedId(await saveQuestionAction(id, { categoryId: fixture.alternateCategoryId, text: "수정한 프로세스와 스레드 질문의 내용입니다." }))).toBe(id);
    expect((await getQuestionDetail(id))?.question).toMatchObject({ categoryId: fixture.alternateCategoryId, text: "수정한 프로세스와 스레드 질문의 내용입니다." });
    await expect(removeQuestionAction(id, "/archive")).rejects.toThrow("NEXT_REDIRECT:/archive");
    expect(await getQuestionDetail(id)).toBeNull();
    expect((await removeQuestionAction(id, "/archive")).error).toBe("질문을 찾을 수 없습니다.");
    expect((await getArchive(query)).total).toBe(fixture.publicCsCount);
  });

  it("본인의 반려 상세를 같은 ID로 재제출하고 현재 사유를 해제한다", async () => {
    const before = await getQuestionDetail(fixture.rejectedQuestionId);
    expect(before?.question).toMatchObject({ status: "rejected", rejectionReason: "범위를 구체적으로 작성해 주세요.", canEdit: true });
    const result = await saveQuestionAction(fixture.rejectedQuestionId, input);
    expect(savedId(result)).toBe(fixture.rejectedQuestionId);
    expect((await getQuestionDetail(fixture.rejectedQuestionId))?.question)
      .toMatchObject({ status: "pending", rejectionReason: null, reviewedAt: null, canEdit: true, canDelete: true });
    actor(otherToken);
    expect(await getQuestionDetail(fixture.rejectedQuestionId)).toBeNull();
  });

  it("좋아요 반복 등록·취소와 다른 회원의 상태 및 likedOnly를 일치시킨다", async () => {
    expect((await likeAction(fixture.doneAnswerId, true)).like).toEqual({ likeCount: 1, isLiked: true });
    expect((await likeAction(fixture.doneAnswerId, true)).like).toEqual({ likeCount: 1, isLiked: true });
    expect((await getArchive({ ...query, likedOnly: true })).items.map(({ id }) => id)).toEqual([fixture.doneAnswerId]);
    actor(otherToken);
    expect((await getQuestionDetail(fixture.doneAnswerId))?.question).toMatchObject({ liked: false, likes: 1 });
    expect((await likeAction(fixture.doneAnswerId, true)).like).toEqual({ likeCount: 2, isLiked: true });
    actor(ownerToken);
    expect((await likeAction(fixture.doneAnswerId, false)).like).toEqual({ likeCount: 1, isLiked: false });
    expect((await likeAction(fixture.doneAnswerId, false)).like).toEqual({ likeCount: 1, isLiked: false });
    expect((await getArchive({ ...query, likedOnly: true })).total).toBe(0);
    actor(otherToken);
    expect((await getQuestionDetail(fixture.doneAnswerId))?.question).toMatchObject({ liked: true, likes: 1 });
  });

  it("신고 유형·빈 상세·중복 거절과 현재 회원 신고 표시를 연결한다", async () => {
    expect(await reportAction({ questionId: fixture.doneAnswerId, reason: "질문 내용이 사실과 달라요", detail: "" })).toEqual({});
    expect((await getQuestionDetail(fixture.doneAnswerId))?.question).toMatchObject({ reported: true, canReport: false });
    expect((await reportAction({ questionId: fixture.doneAnswerId, reason: "기타", detail: "" })).error).toBe("이미 신고한 질문입니다.");
    actor(otherToken);
    expect((await getQuestionDetail(fixture.doneAnswerId))?.question).toMatchObject({ reported: false, canReport: false });
    expect((await reportAction({ questionId: fixture.doneAnswerId, reason: "기타", detail: "" })).error).toBe("본인이 등록한 질문은 신고할 수 없습니다.");
    const anotherPublic = (await getArchive(query)).items.find((question) => !question.mine && !question.reported);
    if (!anotherPublic) throw new Error("Expected another public report fixture.");
    expect(await reportAction({ questionId: anotherPublic.id, reason: "모범답안이 틀렸어요", detail: "😀".repeat(300) })).toEqual({});
    actor(ownerToken);
    const ownId = savedId(await saveQuestionAction(null, input));
    expect((await reportAction({ questionId: ownId, reason: "기타", detail: "" })).error).toBe("질문을 찾을 수 없습니다.");
    await expect(removeQuestionAction(ownId, "/archive")).rejects.toThrow("NEXT_REDIRECT:/archive");
  });

  it("답안 생성 중·실패·완료와 nullable 인성 분류 및 비공개 거절을 표시 데이터로 변환한다", async () => {
    expect((await getQuestionDetail(fixture.pendingAnswerId))?.question).toMatchObject({ status: "approved", answerStatus: "PENDING", answer: null });
    expect((await getQuestionDetail(fixture.failedAnswerId))?.question).toMatchObject({ answerStatus: "FAILED", answer: null });
    expect((await getQuestionDetail(fixture.doneAnswerId))?.question.answer)
      .toEqual({ summary: "첫 문단입니다.", body: "나머지 설명입니다.", keywords: ["프로세스", "스레드"] });
    expect((await getQuestionDetail(fixture.personalityQuestionId))?.question).toMatchObject({ kind: "personality", categoryId: null });
    for (const id of [fixture.hiddenQuestionId, fixture.deletedQuestionId]) {
      expect(await getQuestionDetail(id)).toBeNull();
      expect((await likeAction(id, true)).error).toBe("질문을 찾을 수 없습니다.");
      expect((await reportAction({ questionId: id, reason: "기타", detail: "" })).error).toBe("질문을 찾을 수 없습니다.");
    }
    actor(otherToken);
    expect((await saveQuestionAction(fixture.doneAnswerId, input)).error).toBe("수정하거나 삭제할 수 없는 질문입니다.");
  });

  it("후보 검색은 실제 CS 검색 결과만 사용하고 미연결 개인 API는 빈 목록으로 숨기지 않는다", async () => {
    const suggestion = await similarAction("프로세스와 스레드의 차이는 무엇인가요?");
    expect(suggestion.error).toBeUndefined();
    expect(suggestion.question).not.toBeNull();
    for (const read of [getMyQuestions, getMyLikedQuestions, getLikedAnswers]) {
      await expect(read()).rejects.toBeInstanceOf(ApiNotConnectedError);
    }
  });

  it("토큰이 없거나 위조되면 실제 회원 조회에서 중단한다", async () => {
    context.cookies.delete("access-token");
    expect(await getSession()).toBeNull();
    await expect(getArchive(query)).rejects.toThrow("NEXT_REDIRECT:/login");
    context.cookies.set("access-token", "forged-token");
    expect(await getSession()).toBeNull();
    await expect(getQuestionDetail(fixture.doneAnswerId)).rejects.toThrow("NEXT_REDIRECT:/login");
  });
});
