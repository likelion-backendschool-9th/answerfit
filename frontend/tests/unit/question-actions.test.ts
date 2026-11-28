import { beforeEach, describe, expect, it, vi } from "vitest";
import { likeAction, loadQuestionCategoriesAction, removeQuestionAction, reportAction, saveQuestionAction, similarAction } from "@/features/question/actions";
import { ApiError, ApiNotConnectedError } from "@/lib/backend-http";

const mocks = vi.hoisted(() => ({ add: vi.fn(), update: vi.fn(), remove: vi.fn(), like: vi.fn(), report: vi.fn(),
  categories: vi.fn(), candidates: vi.fn(), refresh: vi.fn(), revalidate: vi.fn(), redirect: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ refresh: mocks.refresh, revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/features/question/api", () => ({ addQuestion: mocks.add, updateQuestion: mocks.update,
  removeQuestion: mocks.remove, likeQuestion: mocks.like, reportQuestion: mocks.report,
  getQuestionCategories: mocks.categories, getSimilarityCandidates: mocks.candidates, likeAnswer: vi.fn() }));

const input = { categoryId: "9007199254740993", text: "프로세스와 스레드의 차이는 무엇인가요?" };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.add.mockResolvedValue("9223372036854775807");
  mocks.update.mockResolvedValue(true);
  mocks.remove.mockResolvedValue(true);
  mocks.report.mockResolvedValue(true);
  mocks.like.mockResolvedValue({ likeCount: 178, isLiked: true });
  mocks.candidates.mockResolvedValue([]);
  mocks.categories.mockResolvedValue([{ id: input.categoryId, name: "운영체제" }]);
  mocks.redirect.mockImplementation((path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); });
});
function expectViews(id: string) {
  for (const path of ["/archive", "/my/questions", "/my/likes", "/my", `/archive/${encodeURIComponent(id)}`]) {
    expect(mocks.revalidate).toHaveBeenCalledWith(path);
  }
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
}
function expectNoRefresh() {
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(mocks.revalidate).not.toHaveBeenCalled();
}

describe("등록과 재제출 액션", () => {
  it("입력을 정리하고 생성 ID를 폼에 돌려주며 관련 화면을 갱신한다", async () => {
    await expect(saveQuestionAction(null, { categoryId: ` ${input.categoryId} `, text: `\uFEFF ${input.text}\u00A0` }))
      .resolves.toEqual({ id: "9223372036854775807" });
    expect(mocks.add).toHaveBeenCalledWith(input);
    expect(mocks.update).not.toHaveBeenCalled();
    expectViews("9223372036854775807");
  });
  it("수정은 같은 ID로 반환하고 반려 상세도 새로 조회하게 한다", async () => {
    await expect(saveQuestionAction("42", input)).resolves.toEqual({ id: "42" });
    expect(mocks.update).toHaveBeenCalledWith("42", input);
    expect(mocks.add).not.toHaveBeenCalled();
    expectViews("42");
  });
  it.each([
    { categoryId: "", text: input.text }, { categoryId: "1", text: "가".repeat(9) },
    { categoryId: "1", text: "😀".repeat(201) },
  ])("잘못된 입력은 저장과 갱신 전에 거절한다", async (invalid) => {
    expect((await saveQuestionAction(null, invalid)).error).toBeTruthy();
    expect(mocks.add).not.toHaveBeenCalled(); expectNoRefresh();
  });
  it("직접 호출한 서버 액션의 잘못된 필드 타입도 입력 오류로 처리한다", async () => {
    expect((await saveQuestionAction(null, JSON.parse('{"categoryId":1,"text":false}'))).error).toBeTruthy();
    expect(mocks.add).not.toHaveBeenCalled(); expectNoRefresh();
  });
  it("200개 이모지를 UTF-16 길이로 잘못 거절하지 않는다", async () => {
    await expect(saveQuestionAction(null, { categoryId: "1", text: "😀".repeat(200) })).resolves.toHaveProperty("id");
    expect(mocks.add).toHaveBeenCalledTimes(1);
  });
  it("목업의 등록 개수 제한은 성공으로 처리하지 않는다", async () => {
    mocks.add.mockResolvedValueOnce(null);
    expect((await saveQuestionAction(null, input)).error).toContain("목업");
    expectNoRefresh();
  });
  it("목업 수정 거절도 성공으로 처리하지 않는다", async () => {
    mocks.update.mockResolvedValueOnce(false);
    expect((await saveQuestionAction("42", input)).error).toContain("승인 전");
    expectNoRefresh();
  });
  it("서버의 상태 경합 메시지를 보존하고 입력을 닫거나 성공 갱신하지 않는다", async () => {
    mocks.update.mockRejectedValueOnce(new ApiError(409, "QUESTION_NOT_EDITABLE", "이미 승인된 질문입니다."));
    await expect(saveQuestionAction("42", input)).resolves.toEqual({ error: "이미 승인된 질문입니다." });
    expectNoRefresh();
  });
});

describe("좋아요·신고·삭제 액션", () => {
  it("낙관적으로 계산한 수가 아닌 서버의 최종 좋아요 값을 반환한다", async () => {
    await expect(likeAction("42", true)).resolves.toEqual({ like: { likeCount: 178, isLiked: true } });
    expect(mocks.like).toHaveBeenCalledWith("42", true);
    expectViews("42");
  });
  it("좋아요 거절은 표시할 오류만 반환하고 성공 상태를 만들지 않는다", async () => {
    mocks.like.mockRejectedValueOnce(new ApiError(404, "QUESTION_NOT_FOUND", "질문이 삭제되었습니다."));
    await expect(likeAction("42", true)).resolves.toEqual({ error: "질문이 삭제되었습니다." });
    expectNoRefresh();
  });
  it("신고 상세를 정리한 뒤 보내고 신고 표시가 갱신되게 한다", async () => {
    await expect(reportAction({ questionId: "42", reason: "기타", detail: "\uFEFF  내용 \u00A0" })).resolves.toEqual({});
    expect(mocks.report).toHaveBeenCalledWith({ questionId: "42", reason: "기타", detail: "내용" });
    expectViews("42");
  });
  it.each([{ reason: "없는 사유", detail: "" }, { reason: "기타", detail: "😀".repeat(301) }])("잘못된 신고는 요청 전에 거절한다", async (report) => {
    expect((await reportAction({ questionId: "42", ...report })).error).toBeTruthy();
    expect(mocks.report).not.toHaveBeenCalled(); expectNoRefresh();
  });
  it("빈 상세와 300자 상세를 허용한다", async () => {
    await reportAction({ questionId: "42", reason: "기타", detail: "" });
    await reportAction({ questionId: "42", reason: "기타", detail: "😀".repeat(300) });
    expect(mocks.report).toHaveBeenCalledTimes(2);
  });
  it("중복 신고는 그대로 안내한다", async () => {
    mocks.report.mockRejectedValueOnce(new ApiError(409, "ALREADY_REPORTED", "이미 신고한 질문입니다."));
    await expect(reportAction({ questionId: "42", reason: "기타", detail: "" })).resolves.toEqual({ error: "이미 신고한 질문입니다." });
    expectNoRefresh();
  });
  it("삭제 성공 후에만 화면을 무효화하고 안전한 다음 주소로 이동한다", async () => {
    await expect(removeQuestionAction("42", "https://outside.example/path")).rejects.toThrow("NEXT_REDIRECT:/");
    expect(mocks.remove).toHaveBeenCalledWith("42");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
    expectViews("42");
  });
  it("삭제 거절은 이동하지 않는다", async () => {
    mocks.remove.mockRejectedValueOnce(new ApiError(403, "ACCESS_DENIED", "삭제 권한이 없습니다."));
    await expect(removeQuestionAction("42", "/archive")).resolves.toEqual({ error: "삭제 권한이 없습니다." });
    expect(mocks.redirect).not.toHaveBeenCalled(); expectNoRefresh();
  });
});

describe("분류·유사 질문과 예외 경계", () => {
  it("분류 옵션은 서버의 ID를 그대로 전달한다", async () => {
    await expect(loadQuestionCategoriesAction()).resolves.toEqual({ categories: [{ id: input.categoryId, name: "운영체제" }] });
  });
  it("분류 실패는 빈 선택지와 오류를 함께 전달한다", async () => {
    mocks.categories.mockRejectedValueOnce(new ApiNotConnectedError("/api/v1/categories"));
    await expect(loadQuestionCategoriesAction()).resolves.toEqual({ categories: [], error: "아직 연동되지 않은 API예요." });
  });
  it("좁힌 후보에서 전체 입력의 유사도를 비교한다", async () => {
    mocks.candidates.mockResolvedValueOnce([{ id: "42", text: input.text }]);
    await expect(similarAction(input.text)).resolves.toEqual({ question: { id: "42", text: input.text } });
    expect(mocks.candidates).toHaveBeenCalledWith(input.text);
    expectNoRefresh();
  });
  it("긴 입력을 code point 200자로 제한한다", async () => {
    await similarAction("😀".repeat(201));
    expect(mocks.candidates).toHaveBeenCalledWith("😀".repeat(200));
  });
  it("후보 조회 실패를 없음으로 오인하지 않게 전달한다", async () => {
    mocks.candidates.mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR", "후보 조회 실패"));
    await expect(similarAction(input.text)).resolves.toEqual({ question: null, error: "후보 조회 실패" });
    expectNoRefresh();
  });
  it("로그인 리다이렉트와 알 수 없는 오류는 메시지로 삼키지 않는다", async () => {
    const redirect = new Error("NEXT_REDIRECT:login");
    mocks.add.mockRejectedValueOnce(redirect);
    await expect(saveQuestionAction(null, input)).rejects.toBe(redirect);
    mocks.categories.mockRejectedValueOnce(redirect);
    await expect(loadQuestionCategoriesAction()).rejects.toBe(redirect);
    expectNoRefresh();
  });
});
