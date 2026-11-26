import { describe, expect, it } from "vitest";
import { decodeKakaoCookie, encodeKakaoCookie, encodeNotice, kakaoAuthorizeUrl, kakaoRedirectUri, noticeFor, readKakaoCallback, socialErrorOf, socialLoginMessage } from "@/features/auth/kakao";

const STATE = "0b7c1d3e-5f6a-4b8c-9d0e-1f2a3b4c5d6e";
const cookie = encodeKakaoCookie({ state: STATE, next: "/interviews/new" });
const params = (query: string) => new URLSearchParams(query);

describe("카카오 동의 화면 주소", () => {
  it("Redirect URI는 사이트 주소 뒤에 콜백 경로를 붙인다", () => {
    expect(kakaoRedirectUri("http://localhost:3000")).toBe("http://localhost:3000/auth/kakao/callback");
    expect(kakaoRedirectUri("http://answerfit.newlecture.com/")).toBe("http://answerfit.newlecture.com/auth/kakao/callback");
  });

  it("인가 주소에 코드 방식, 키, Redirect URI, state를 넣는다", () => {
    const url = new URL(kakaoAuthorizeUrl({ clientId: "rest-key", redirectUri: "http://localhost:3000/auth/kakao/callback", state: STATE }));
    expect(url.origin + url.pathname).toBe("https://kauth.kakao.com/oauth/authorize");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: "code",
      client_id: "rest-key",
      redirect_uri: "http://localhost:3000/auth/kakao/callback",
      state: STATE,
    });
  });
});

describe("콜백 확인", () => {
  it("state가 쿠키와 같으면 인가 코드와 돌아갈 주소를 준다", () => {
    expect(readKakaoCallback(params(`code=abc&state=${STATE}`), cookie)).toEqual({ ok: true, code: "abc", next: "/interviews/new" });
  });

  it.each([
    ["state가 다르다", `code=abc&state=other-state-value-123`, cookie],
    ["state가 없다", "code=abc", cookie],
    ["쿠키가 없다(10분 지남, 다른 브라우저)", `code=abc&state=${STATE}`, undefined],
    ["쿠키가 망가졌다", `code=abc&state=${STATE}`, "{not json"],
  ])("%s → STATE_MISMATCH", (_, query, raw) => {
    expect(readKakaoCallback(params(query), raw)).toMatchObject({ ok: false, error: "STATE_MISMATCH" });
  });

  it("동의를 취소하면 CANCELLED, 다른 카카오 오류는 KAKAO_AUTH_FAILED", () => {
    expect(readKakaoCallback(params(`error=access_denied&state=${STATE}`), cookie)).toEqual({ ok: false, error: "CANCELLED", next: "/interviews/new" });
    expect(readKakaoCallback(params(`error=server_error&state=${STATE}`), cookie)).toMatchObject({ ok: false, error: "KAKAO_AUTH_FAILED" });
  });

  it("코드가 없으면 KAKAO_AUTH_FAILED", () => {
    expect(readKakaoCallback(params(`state=${STATE}`), cookie)).toMatchObject({ ok: false, error: "KAKAO_AUTH_FAILED" });
  });

  it("쿠키의 돌아갈 주소도 사이트 안의 경로만 받는다", () => {
    expect(decodeKakaoCookie(encodeKakaoCookie({ state: STATE, next: "//evil.example" }))).toEqual({ state: STATE, next: "/" });
  });

  it("짧거나 문자열이 아닌 state는 쿠키를 버린다", () => {
    expect(decodeKakaoCookie(JSON.stringify({ state: "short", next: "/" }))).toBeNull();
    expect(decodeKakaoCookie(JSON.stringify({ state: 123, next: "/" }))).toBeNull();
    expect(decodeKakaoCookie("null")).toBeNull();
  });
});

describe("로그인 화면 안내", () => {
  const suspended = encodeNotice("SUSPENDED", "이용이 정지된 계정이에요. 사유: 같은 질문을 반복해서 등록함");

  it("백엔드가 쓴 문장은 같은 코드일 때만 쓴다", () => {
    expect(noticeFor("SUSPENDED", suspended)).toBe("이용이 정지된 계정이에요. 사유: 같은 질문을 반복해서 등록함");
    expect(noticeFor("CANCELLED", suspended)).toBe("카카오 로그인을 취소했어요.");
  });

  it("쿠키가 없거나 망가졌으면 정해진 문장, 모르는 코드는 안내 없음", () => {
    expect(noticeFor("SUSPENDED", undefined)).toBe("이용이 정지된 계정이에요.");
    expect(noticeFor("SUSPENDED", "{broken")).toBe("이용이 정지된 계정이에요.");
    expect(noticeFor("toString", suspended)).toBeUndefined();
  });

  it("아는 코드만 문장으로 바꾼다", () => {
    expect(socialLoginMessage("EMAIL_ALREADY_REGISTERED")).toBe("이메일로 가입한 계정이에요. 이메일로 로그인해 주세요.");
    expect(socialLoginMessage("CANCELLED")).toBe("카카오 로그인을 취소했어요.");
    expect(socialLoginMessage("KAKAO_UNAVAILABLE")).toBe("카카오 서버와 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    expect(socialLoginMessage("toString")).toBeUndefined();
    expect(socialLoginMessage("<script>")).toBeUndefined();
    expect(socialLoginMessage(["SUSPENDED"])).toBeUndefined();
  });
});

describe("백엔드 오류 코드 → 안내 코드", () => {
  it.each([
    ["BACKEND-BUSINESS-108", "EMAIL_NOT_VERIFIED"],
    ["BACKEND-BUSINESS-109", "EMAIL_ALREADY_REGISTERED"],
    ["BACKEND-BUSINESS-110", "SUSPENDED"],
    ["BACKEND-BUSINESS-111", "WITHDRAWN"],
    ["BACKEND-INFRA-101", "KAKAO_AUTH_FAILED"],
    ["BACKEND-INFRA-102", "KAKAO_UNAVAILABLE"],
    ["BACKEND-INFRA-103", "KAKAO_NOT_CONFIGURED"],
    ["KAKAO_NOT_CONFIGURED", "KAKAO_NOT_CONFIGURED"],
    ["BACKEND-GLOBAL-102", "KAKAO_AUTH_FAILED"],
    [undefined, "KAKAO_AUTH_FAILED"],
    ["toString", "KAKAO_AUTH_FAILED"],
  ])("%s → %s", (code, expected) => {
    expect(socialErrorOf(code)).toBe(expected);
  });
});
