import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { demoSuspensionMessage } from "@/demo/members";
import { addDemoMember, demoSocialMember, findDemoMember, isDemoEmailTaken, isDemoNicknameTaken } from "@/demo/auth";
import { getDataMode, isSwitchable } from "@/demo/mode";
import { safeNextPath } from "@/lib/next-path";
import { endSession, startSession } from "@/features/session/session";
import { ApiError, ApiNotConnectedError, callBackend } from "@/lib/backend-http";
import { encodeKakaoCookie, encodeNotice, isSocialLoginError, KAKAO_CALLBACK_PATH, socialErrorOf, kakaoAuthorizeUrl, kakaoRedirectUri, noticeFor, readKakaoCallback, SOCIAL_LOGIN_MESSAGES, type SocialLoginError } from "./kakao";
import type { LoginInput, SignupInput, SocialProvider } from "./types";

type TokenResponse = { accessToken: string };

/** 이용이 정지된 회원은 로그인할 수 없다 */
async function rejectSuspended(email: string) {
  const message = await demoSuspensionMessage(email);
  if (message) throw new ApiError(403, "SUSPENDED", message);
}

/** 맞지 않으면 false. 이메일과 비밀번호 중 무엇이 틀렸는지는 알려 주지 않는다 */
export async function login({ email, password, remember }: LoginInput): Promise<boolean> {
  if ((await getDataMode()) === "mock") {
    const member = await findDemoMember(email, password);
    if (!member) return false;
    await rejectSuspended(member.email);
    await startSession({ demo: member }, remember);
    return true;
  }
  try {
    const { accessToken } = await callBackend<TokenResponse>("/api/v1/auth/login", { method: "POST", body: { email, password } });
    await startSession({ accessToken }, remember);
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return false;
    throw error;
  }
}

/** 목업은 바로 로그인한다. 실제 카카오 로그인은 카카오 동의 화면 주소를 돌려준다 */
export async function loginWithSocial(provider: SocialProvider, next: unknown): Promise<string | undefined> {
  if ((await getDataMode()) === "mock") {
    const member = demoSocialMember();
    await rejectSuspended(member.email);
    await startSession({ demo: member }, false);
    return undefined;
  }
  if (provider !== "kakao") throw new ApiNotConnectedError(`/api/v1/auth/social/${provider}`);
  return startKakaoLogin(safeNextPath(next));
}

const KAKAO_COOKIE = "kakao-login";
const NOTICE_COOKIE = "login-notice";
// http로 여는 로컬·테스트 서버만 secure를 끈다. 환경을 모르면 운영으로 본다
const cookieBase = () => ({ httpOnly: true, sameSite: "lax" as const, secure: !isSwitchable() });

function kakaoConfig() {
  const clientId = process.env.KAKAO_CLIENT_ID;
  const siteUrl = process.env.SITE_URL;
  if (!clientId || !siteUrl) throw new ApiError(503, "KAKAO_NOT_CONFIGURED", SOCIAL_LOGIN_MESSAGES.KAKAO_NOT_CONFIGURED);
  return { clientId, redirectUri: kakaoRedirectUri(siteUrl) };
}

/** state를 쿠키에 남기고 카카오 동의 화면 주소를 만든다. 쿠키는 콜백 주소에만 보낸다 */
async function startKakaoLogin(next: string) {
  const { clientId, redirectUri } = kakaoConfig();
  const state = randomUUID();
  (await cookies()).set(KAKAO_COOKIE, encodeKakaoCookie({ state, next }), { ...cookieBase(), path: KAKAO_CALLBACK_PATH, maxAge: 60 * 10 });
  return kakaoAuthorizeUrl({ clientId, redirectUri, state });
}

export type KakaoLoginResult = { ok: true; next: string } | { ok: false; error: SocialLoginError; next: string };

/** 콜백에서 부른다. 실패하면 로그인 화면이 보일 안내를 쿠키로 남긴다 */
export async function finishKakaoLogin(params: URLSearchParams): Promise<KakaoLoginResult> {
  const jar = await cookies();
  const callback = readKakaoCallback(params, jar.get(KAKAO_COOKIE)?.value);
  jar.delete({ name: KAKAO_COOKIE, path: KAKAO_CALLBACK_PATH });
  if (!callback.ok) return callback;
  try {
    const { redirectUri } = kakaoConfig();
    const { accessToken } = await callBackend<TokenResponse>("/api/v1/auth/social/kakao", { method: "POST", body: { code: callback.code, redirectUri } });
    await startSession({ accessToken }, false);
    return { ok: true, next: callback.next };
  } catch (error) {
    if (error instanceof ApiNotConnectedError) return { ok: false, error: "API_NOT_CONNECTED", next: callback.next };
    if (!(error instanceof ApiError)) throw error;
    const code = socialErrorOf(error.code);
    // 정지 사유처럼 백엔드가 쓴 문장은 주소에 넣지 않고 짧은 쿠키로 넘긴다
    jar.set(NOTICE_COOKIE, encodeNotice(code, error.message), { ...cookieBase(), path: "/login", maxAge: 60 });
    return { ok: false, error: code, next: callback.next };
  }
}

/** 로그인 화면에 보일 소셜 로그인 안내. 백엔드가 남긴 문장이 있으면 그것을 쓴다 */
export async function socialLoginNotice(error: unknown): Promise<string | undefined> {
  if (!isSocialLoginError(error)) return undefined;
  return noticeFor(error, (await cookies()).get(NOTICE_COOKIE)?.value);
}

export async function isEmailTaken(email: string): Promise<boolean> {
  if ((await getDataMode()) === "mock") return isDemoEmailTaken(email);
  const { available } = await callBackend<{ available: boolean }>(`/api/v1/auth/email-availability?email=${encodeURIComponent(email)}`);
  return !available;
}

export async function isNicknameTaken(nickname: string): Promise<boolean> {
  if ((await getDataMode()) === "mock") return isDemoNicknameTaken(nickname);
  const query = new URLSearchParams({ nickname });
  const result = await callBackend<{ available?: unknown } | null>(
    `/api/v1/auth/nickname-available?${query}`,
  );
  const available = result?.available;
  if (typeof available !== "boolean") {
    throw new ApiError(502, undefined, "닉네임 사용 가능 여부를 확인하지 못했어요.");
  }
  return !available;
}

export async function signup({ email, password, nickname, photo, consents }: SignupInput): Promise<boolean> {
  if ((await getDataMode()) === "mock") {
    await startSession({ demo: await addDemoMember(email, nickname) }, false);
    return true;
  }
  const form = new FormData();
  form.set("email", email);
  form.set("password", password);
  form.set("nickname", nickname);
  for (const [name, accepted] of Object.entries(consents)) form.set(name, String(accepted));
  if (photo) form.set("photo", photo);
  await callBackend<null>("/api/v1/auth/signup", { method: "POST", body: form });
  return false;
}

/** 이 브라우저의 세션만 지운다. 서버 토큰을 무효로 만드는 API는 미확정 */
export async function logout() {
  await endSession();
}
