import { describe, expect, it } from "vitest";
import { readApiResponse } from "@/lib/api-response";

const fail = (errorCode: string, detail: string) => ({ success: false, data: null, error: { errorCode, detail } });

describe("백엔드 응답 읽기 (docs/api-response.md)", () => {
  it("성공하면 data를 꺼낸다", () => {
    expect(readApiResponse(200, { success: true, data: { accessToken: "t" }, error: null })).toEqual({ ok: true, data: { accessToken: "t" } });
    expect(readApiResponse(200, { success: true, data: null, error: null })).toEqual({ ok: true, data: null });
  });

  it("200이어도 ApiResponse가 아니면 성공으로 보지 않는다", () => {
    expect(readApiResponse(200, { available: true })).toMatchObject({ ok: false, notConnected: false });
    expect(readApiResponse(200, { accessToken: "t" })).toMatchObject({ ok: false, notConnected: false });
    expect(readApiResponse(200, { accessToken: "t" }, "envelope")).toMatchObject({ ok: false, notConnected: false });
    expect(readApiResponse(200, null)).toMatchObject({ ok: false });
    expect(readApiResponse(204, null)).toMatchObject({ ok: false });
  });

  it("실패하면 errorCode와 detail을 쓴다", () => {
    expect(readApiResponse(409, fail("BACKEND-BUSINESS-109", "이메일로 가입한 계정이에요."))).toEqual({
      ok: false,
      notConnected: false,
      code: "BACKEND-BUSINESS-109",
      message: "이메일로 가입한 계정이에요.",
    });
  });

  it.each([
    ["백엔드의 API_NOT_FOUND", 404, fail("BACKEND-GLOBAL-103", "요청한 API를 찾을 수 없습니다.")],
    ["백엔드의 METHOD_NOT_ALLOWED", 405, fail("BACKEND-GLOBAL-104", "지원하지 않는 요청 방식입니다.")],
    ["우리 형식이 아닌 404", 404, { status: 404, error: "Not Found" }],
    ["본문 없는 501", 501, null],
  ])("%s → 아직 없는 API", (_, status, body) => {
    expect(readApiResponse(status, body)).toMatchObject({ ok: false, notConnected: true });
  });

  it("없는 회원(404 USER_NOT_FOUND)은 아직 없는 API가 아니다", () => {
    expect(readApiResponse(404, fail("BACKEND-BUSINESS-103", "존재하지 않는 회원입니다."))).toMatchObject({ ok: false, notConnected: false });
  });

  it("문장이 없으면 기본 문장", () => {
    expect(readApiResponse(500, { success: false })).toMatchObject({ ok: false, message: "요청을 처리하지 못했어요." });
  });
});

describe("명시한 문제은행 평문 응답 읽기", () => {
  it("객체와 전체 배열의 성공 응답을 그대로 읽는다", () => {
    const question = { id: "9007199254740993", status: "PENDING" };
    expect(readApiResponse(201, question, "plain")).toEqual({ ok: true, data: question });
    expect(readApiResponse(200, [question], "plain")).toEqual({ ok: true, data: [question] });
  });

  it("본문 없는 삭제 성공을 허용한다", () => {
    expect(readApiResponse(204, null, "plain")).toEqual({ ok: true, data: null });
  });

  it("업무 오류의 code와 message를 보존하고 API 미연동으로 바꾸지 않는다", () => {
    expect(readApiResponse(404, { code: "QUESTION_NOT_FOUND", message: "질문을 찾을 수 없습니다." }, "plain")).toEqual({
      ok: false, notConnected: false, code: "QUESTION_NOT_FOUND", message: "질문을 찾을 수 없습니다.",
    });
    expect(readApiResponse(409, { code: "QUESTION_NOT_EDITABLE", message: "승인된 질문입니다." }, "plain")).toEqual({
      ok: false, notConnected: false, code: "QUESTION_NOT_EDITABLE", message: "승인된 질문입니다.",
    });
  });

  it.each([404, 405, 501])("평문 형식의 코드 없는 %s는 API 미연동으로 구분한다", (status) => {
    expect(readApiResponse(status, { message: "Not Found" }, "plain")).toMatchObject({ ok: false, notConnected: true });
  });

  it("평문 오류 문장이 없으면 공통 문장을 쓴다", () => {
    expect(readApiResponse(500, { code: "INTERNAL_ERROR", message: "" }, "plain")).toMatchObject({ ok: false, notConnected: false, code: "INTERNAL_ERROR", message: "요청을 처리하지 못했어요." });
  });

  it("공통 성공 envelope를 만나면 data를 꺼낸다", () => {
    expect(readApiResponse(200, { success: true, data: { id: "42" }, error: null }, "plain")).toEqual({ ok: true, data: { id: "42" } });
  });

  it.each([
    { status: 401, code: "BACKEND-SECURITY-101", message: "로그인이 필요합니다." },
    { status: 403, code: "BACKEND-SECURITY-102", message: "접근할 수 없습니다." },
  ])("Security 필터의 $status envelope도 코드와 사유를 보존한다", ({ status, code, message }) => {
    expect(readApiResponse(status, fail(code, message), "plain")).toEqual({ ok: false, notConnected: false, code, message });
  });

  it("전역 API 없음 envelope는 평문 모드에서도 API 미연동으로 구분한다", () => {
    expect(readApiResponse(404, fail("BACKEND-GLOBAL-103", "요청한 API를 찾을 수 없습니다."), "plain")).toMatchObject({ ok: false, notConnected: true, code: "BACKEND-GLOBAL-103" });
  });

  it("HTTP 200인 실패 envelope를 평문 성공으로 통과시키지 않는다", () => {
    expect(readApiResponse(200, fail("BACKEND-SECURITY-101", "로그인이 필요합니다."), "plain")).toMatchObject({ ok: false, notConnected: false });
  });
});
