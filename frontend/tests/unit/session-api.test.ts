import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSession } from "@/features/session/session";
import type { Session } from "@/features/session/types";
import { ApiError, ApiNotConnectedError } from "@/lib/backend-http";

const mocks = vi.hoisted(() => ({
  mode: vi.fn<() => Promise<"api" | "mock">>(),
  cookieGet: vi.fn<(name: string) => { value: string } | undefined>(),
  cookieSet: vi.fn(),
  cookieDelete: vi.fn(),
  cookies: vi.fn(),
  demoSession: vi.fn<() => Promise<Session | null>>(),
  fetch: vi.fn<typeof fetch>(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/demo/mode", () => ({ getDataMode: mocks.mode, isSwitchable: vi.fn(() => true) }));
vi.mock("@/demo/session", () => ({
  readDemoSession: mocks.demoSession,
  writeDemoSession: vi.fn(),
  clearDemoSession: vi.fn(),
}));

const token = "synthetic-access-token";
const session: Session = { email: "member@example.com", nickname: "면접 연습생", role: "member" };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("BACKEND_URL", "http://answerfit-backend.test");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.mode.mockResolvedValue("api");
  mocks.cookies.mockResolvedValue({ get: mocks.cookieGet, set: mocks.cookieSet, delete: mocks.cookieDelete });
  mocks.cookieGet.mockImplementation((name) => name === "access-token" ? { value: token } : undefined);
  mocks.demoSession.mockResolvedValue(session);
  mocks.fetch.mockRejectedValue(new Error("Unexpected backend request"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("실제 API 세션 조회", () => {
  it.each(["member", "admin"] as const)("%s 세션을 cookie의 토큰으로 조회하고 공통 envelope의 data를 사용한다", async (role) => {
    const member: Session = { ...session, role };
    mocks.fetch.mockResolvedValueOnce(json({ success: true, data: member, error: null }));

    await expect(getSession()).resolves.toEqual(member);

    expect(mocks.cookieGet).toHaveBeenCalledExactlyOnceWith("access-token");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = mocks.fetch.mock.calls[0];
    expect(String(url)).toBe("http://answerfit-backend.test/api/v1/members/me");
    expect(options).toMatchObject({ method: "GET", cache: "no-store" });
    expect(options?.body).toBeUndefined();
    const headers = new Headers(options?.headers);
    expect(headers.get("Authorization")).toBe(`Bearer ${token}`);
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("Cookie")).toBeNull();
    expect(String(url)).not.toContain(token);
    expect(mocks.demoSession).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
    expect(mocks.cookieDelete).not.toHaveBeenCalled();
  });

  it("access-token cookie가 없으면 백엔드나 목업을 조회하지 않고 null을 반환한다", async () => {
    mocks.cookieGet.mockReturnValue(undefined);

    await expect(getSession()).resolves.toBeNull();

    expect(mocks.cookieGet).toHaveBeenCalledExactlyOnceWith("access-token");
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.demoSession).not.toHaveBeenCalled();
  });

  it("Security의 실제 401 envelope는 미로그인 상태로 처리한다", async () => {
    mocks.fetch.mockResolvedValueOnce(json(fail("BACKEND-SECURITY-101", "인증 자격 증명이 유효하지 않습니다."), 401));

    await expect(getSession()).resolves.toBeNull();

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.demoSession).not.toHaveBeenCalled();
  });

  it.each([
    { status: 403, code: "BACKEND-SECURITY-102", message: "접근 권한이 없습니다." },
    { status: 500, code: "BACKEND-GLOBAL-102", message: "서버 내부 오류가 발생했습니다." },
  ])("$status envelope를 미로그인이나 목업으로 숨기지 않는다", async ({ status, code, message }) => {
    mocks.fetch.mockResolvedValueOnce(json(fail(code, message), status));

    await expect(getSession()).rejects.toMatchObject({ name: "ApiError", status, code, message });

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.demoSession).not.toHaveBeenCalled();
  });

  it("인증 API가 없다는 전역 404는 미연동 오류로 전파한다", async () => {
    mocks.fetch.mockResolvedValueOnce(json(fail("BACKEND-GLOBAL-103", "요청한 API를 찾을 수 없습니다."), 404));

    await expect(getSession()).rejects.toBeInstanceOf(ApiNotConnectedError);

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.demoSession).not.toHaveBeenCalled();
  });

  it("네트워크 실패를 null이나 목업 세션으로 대신하지 않는다", async () => {
    mocks.fetch.mockRejectedValueOnce(new Error("offline"));

    await expect(getSession()).rejects.toBeInstanceOf(ApiNotConnectedError);

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.demoSession).not.toHaveBeenCalled();
  });

  it("백엔드 주소가 없으면 실제 요청 전에 미연동 오류를 전파한다", async () => {
    vi.stubEnv("BACKEND_URL", "");

    await expect(getSession()).rejects.toBeInstanceOf(ApiNotConnectedError);

    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.demoSession).not.toHaveBeenCalled();
  });

  it("질문 API의 평문 호환 처리를 인증 세션에 적용하지 않는다", async () => {
    mocks.fetch.mockResolvedValueOnce(json(session));

    await expect(getSession()).rejects.toBeInstanceOf(ApiError);

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.demoSession).not.toHaveBeenCalled();
  });
});

describe("명시한 목업 모드 세션 조회", () => {
  it.each([session, null])("목업 세션 %j를 실제 토큰이나 백엔드 없이 읽는다", async (demoSession) => {
    mocks.mode.mockResolvedValue("mock");
    mocks.demoSession.mockResolvedValue(demoSession);

    await expect(getSession()).resolves.toEqual(demoSession);

    expect(mocks.demoSession).toHaveBeenCalledTimes(1);
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(mocks.cookieGet).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

function fail(errorCode: string, detail: string) {
  return { success: false, data: null, error: { errorCode, detail } };
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}
