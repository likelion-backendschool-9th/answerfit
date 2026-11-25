import "server-only";
import { cookies } from "next/headers";
import { getDataMode, isSwitchable } from "@/demo/mode";
import { clearDemoSession, readDemoSession, writeDemoSession } from "@/demo/session";
import { ApiError, callBackend } from "@/lib/backend-http";
import type { Session } from "./types";

const TOKEN_COOKIE = "access-token";
/** "로그인 상태 유지"를 고르면 14일. 고르지 않으면 브라우저를 닫을 때까지 */
const REMEMBER_SECONDS = 60 * 60 * 24 * 14;

export async function getSession(): Promise<Session | null> {
  if ((await getDataMode()) === "mock") return readDemoSession();
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  try {
    return await callBackend<Session>("/api/members/me", { token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

/** 목업은 회원 정보를, 실제 API는 토큰을 받는다 */
export async function startSession(credential: { demo: Session } | { accessToken: string }, remember: boolean) {
  const maxAge = remember ? REMEMBER_SECONDS : undefined;
  if ("demo" in credential) return writeDemoSession(credential.demo, maxAge);
  (await cookies()).set(TOKEN_COOKIE, credential.accessToken, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    // http로 여는 로컬·테스트 서버만 예외다. 환경을 모르면 운영으로 본다
    secure: !isSwitchable(),
    maxAge,
  });
}

export async function endSession() {
  await clearDemoSession();
  (await cookies()).delete(TOKEN_COOKIE);
}
