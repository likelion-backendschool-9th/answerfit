import { describe, expect, it } from "vitest";
import { toArchiveQuestion, toQuestionCategories, toQuestionDetail, type CategoryResponse, type QuestionDetailResponse, type QuestionListItem } from "@/features/question/read-model";

const item = (change: Partial<QuestionListItem> = {}): QuestionListItem => ({
  id: "9223372036854775807",
  major: "CS",
  category: { id: "9007199254740993", name: "네트워크" },
  content: "TCP와 UDP의 차이를 설명해 주세요.",
  status: "APPROVED",
  likeCount: 12,
  isLiked: true,
  isMine: false,
  isReported: true,
  ...change,
});

const detail = (change: Partial<QuestionDetailResponse> = {}): QuestionDetailResponse => ({
  ...item(),
  source: "USER",
  createdAt: "2026-11-25T15:00:00Z",
  reviewedAt: "2026-12-31T15:01:00Z",
  canEdit: false,
  canDelete: false,
  canReport: false,
  modelAnswer: "  첫 문단 요약\r\n두 번째 줄\r\n\r\n본문 하나\r\n\r\n본문 둘  ",
  modelAnswerStatus: "DONE",
  keywords: ["신뢰성", "연결"],
  rejectionReason: null,
  previous: { id: "9007199254740994", content: "앞 질문" },
  next: null,
  ...change,
});

describe("목록 응답 변환", () => {
  it("큰 ID와 개인화 상태를 그대로 보존하고 목록에 없는 권한을 만들지 않는다", () => {
    const question = toArchiveQuestion(item());
    expect(question).toEqual({ id: "9223372036854775807", kind: "cs", categoryId: "9007199254740993", category: "네트워크", text: "TCP와 UDP의 차이를 설명해 주세요.", likes: 12, liked: true, mine: false, reported: true, status: "approved", answer: null });
    expect(question.canEdit).toBeUndefined();
    expect(question.canDelete).toBeUndefined();
    expect(question.canReport).toBeUndefined();
    expect(question.answerStatus).toBeUndefined();
  });

  it("중분류가 없는 인성 질문은 대분류 이름으로 표시한다", () => {
    expect(toArchiveQuestion(item({ major: "PERSONALITY", category: null }))).toMatchObject({ kind: "personality", category: "인성 면접", categoryId: null });
  });

  it("숨김 질문을 승인 질문으로 바꾸어 노출하지 않는다", () => {
    expect(() => toArchiveQuestion(item({ status: "HIDDEN" }))).toThrow();
  });
});

describe("상세 응답 변환", () => {
  it("KST 날짜와 서버가 정한 앞뒤 질문을 사용한다", () => {
    expect(toQuestionDetail(detail())).toMatchObject({
      question: { createdOn: "2026-11-26", approvedOn: "2027-01-01", reviewedAt: "2026-12-31T15:01:00Z" },
      previous: { id: "9007199254740994", text: "앞 질문" },
      next: null,
    });
  });

  it("첫 문단을 요약으로 나누고 본문·키워드를 보존하며 비교표를 만들지 않는다", () => {
    const answer = toQuestionDetail(detail()).question.answer;
    expect(answer).toEqual({ summary: "첫 문단 요약\n두 번째 줄", body: "본문 하나\n\n본문 둘", keywords: ["신뢰성", "연결"] });
    expect(answer?.table).toBeUndefined();
  });

  it("한 문단 답안과 생성 상태가 없는 관리자 작성 답안을 지원한다", () => {
    expect(toQuestionDetail(detail({ source: "ADMIN", modelAnswer: "한 문단 답안", modelAnswerStatus: null })).question).toMatchObject({ answer: { summary: "한 문단 답안", body: "", keywords: ["신뢰성", "연결"] }, answerStatus: null });
  });

  it.each([null, "", " \n\t "])("답안이 없으면 null을 유지하고 생성 실패 상태를 잃지 않는다: %j", (modelAnswer) => {
    expect(toQuestionDetail(detail({ modelAnswer, modelAnswerStatus: "FAILED" })).question).toMatchObject({ answer: null, answerStatus: "FAILED" });
  });

  it("반려 상태와 사유를 대기와 구별하고 권한을 다시 계산하지 않는다", () => {
    const question = toQuestionDetail(detail({ status: "REJECTED", isMine: true, modelAnswer: null, modelAnswerStatus: null, rejectionReason: "질문을 구체화해 주세요.", canEdit: false, canDelete: true, canReport: false })).question;
    expect(question).toMatchObject({ status: "rejected", rejectionReason: "질문을 구체화해 주세요.", canEdit: false, canDelete: true, canReport: false, answerStatus: null, answer: null });
    expect(question.approvedOn).toBeUndefined();
  });

  it("대기는 승인 날짜로 표시하지 않고 답안 생성 상태를 별도로 보존한다", () => {
    const result = toQuestionDetail(detail({ status: "PENDING", reviewedAt: null, modelAnswer: null, modelAnswerStatus: "PENDING", previous: null, next: null }));
    expect(result.question).toMatchObject({ status: "pending", answer: null, answerStatus: "PENDING", reviewedAt: null });
    expect(result.question.approvedOn).toBeUndefined();
    expect(result.previous).toBeNull();
    expect(result.next).toBeNull();
  });
});

it("카테고리 ID·서버 순서·0건 분류·대분류 전체 집계를 보존한다", () => {
  const response: CategoryResponse = {
    majors: [
      { major: "CS", name: "CS", questionCount: 13, categories: [{ id: "9007199254740993", name: "네트워크", sortOrder: 1, questionCount: 13 }, { id: "2", name: "웹", sortOrder: 2, questionCount: 0 }] },
      { major: "PERSONALITY", name: "인성 면접", questionCount: 4, categories: [] },
    ],
  };
  expect(toQuestionCategories(response)).toEqual([
    { kind: "cs", label: "CS", count: 13, categories: [{ id: "9007199254740993", name: "네트워크", count: 13 }, { id: "2", name: "웹", count: 0 }] },
    { kind: "personality", label: "인성 면접", count: 4, categories: [] },
  ]);
});
