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
    expect(readApiResponse(200, null)).toMatchObject({ ok: false });
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
