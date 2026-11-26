import { safeNextPath } from "@/lib/next-path";

/** docs/frontend/user/login.md. 서버와 테스트가 함께 쓰는 순수 함수 */
export const KAKAO_AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize";
export const KAKAO_CALLBACK_PATH = "/auth/kakao/callback";

/** 로그인 화면이 아는 실패 코드. 백엔드 코드(docs/backend/user/kakao-login.md)와 프론트에서 정한 코드를 함께 쓴다 */
export const SOCIAL_LOGIN_MESSAGES = {
  CANCELLED: "카카오 로그인을 취소했어요.",
  STATE_MISMATCH: "로그인 요청이 만료됐어요. 다시 시도해 주세요.",
  KAKAO_AUTH_FAILED: "카카오 인증에 실패했어요. 다시 시도해 주세요.",
  KAKAO_UNAVAILABLE: "카카오 서버와 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
  KAKAO_NOT_CONFIGURED: "카카오 로그인이 아직 설정되지 않았어요.",
  EMAIL_NOT_VERIFIED: "카카오 계정의 이메일 인증을 마친 뒤 다시 시도해 주세요.",
  EMAIL_ALREADY_REGISTERED: "이메일로 가입한 계정이에요. 이메일로 로그인해 주세요.",
  SUSPENDED: "이용이 정지된 계정이에요.",
  WITHDRAWN: "탈퇴한 계정이에요.",
  API_NOT_CONNECTED: "아직 연동되지 않은 API예요.",
} as const;
export type SocialLoginError = keyof typeof SOCIAL_LOGIN_MESSAGES;

export function isSocialLoginError(code: unknown): code is SocialLoginError {
  return typeof code === "string" && Object.hasOwn(SOCIAL_LOGIN_MESSAGES, code);
}

/** 백엔드 ErrorCode(docs/api-response.md) → 로그인 화면 안내 코드 */
const BACKEND_ERRORS: Record<string, SocialLoginError> = {
  "BACKEND-BUSINESS-108": "EMAIL_NOT_VERIFIED",
  "BACKEND-BUSINESS-109": "EMAIL_ALREADY_REGISTERED",
  "BACKEND-BUSINESS-110": "SUSPENDED",
  "BACKEND-BUSINESS-111": "WITHDRAWN",
  "BACKEND-INFRA-101": "KAKAO_AUTH_FAILED",
  "BACKEND-INFRA-102": "KAKAO_UNAVAILABLE",
  "BACKEND-INFRA-103": "KAKAO_NOT_CONFIGURED",
};

/** 백엔드 코드든 프론트에서 정한 코드든 안내 코드로 바꾼다. 모르는 코드는 인증 실패로 본다 */
export function socialErrorOf(code: unknown): SocialLoginError {
  if (typeof code === "string" && Object.hasOwn(BACKEND_ERRORS, code)) return BACKEND_ERRORS[code];
  return isSocialLoginError(code) ? code : "KAKAO_AUTH_FAILED";
}

/** 백엔드가 쓴 안내 문장(정지 사유 등). 그 문장을 만든 코드와 함께 남긴다 */
export const encodeNotice = (code: SocialLoginError, message: string) => JSON.stringify({ code, message });

/** 로그인 화면의 error 코드에 맞는 안내. 앞선 실패의 문장이 다른 코드의 안내를 덮지 않도록, 쿠키의 코드가 같을 때만 그 문장을 쓴다 */
export function noticeFor(error: unknown, rawNotice: string | undefined): string | undefined {
  if (!isSocialLoginError(error)) return undefined;
  try {
    const saved: unknown = rawNotice ? JSON.parse(rawNotice) : null;
    if (typeof saved === "object" && saved !== null) {
      const { code, message } = saved as Record<string, unknown>;
      if (code === error && typeof message === "string" && message) return message;
    }
  } catch {
    // 망가진 쿠키는 무시한다
  }
  return SOCIAL_LOGIN_MESSAGES[error];
}

/** 모르는 코드는 안내하지 않는다 */
export function socialLoginMessage(code: unknown): string | undefined {
  return isSocialLoginError(code) ? SOCIAL_LOGIN_MESSAGES[code] : undefined;
}

export function kakaoRedirectUri(siteUrl: string) {
  return new URL(KAKAO_CALLBACK_PATH, siteUrl).toString();
}

export function kakaoAuthorizeUrl({ clientId, redirectUri, state }: { clientId: string; redirectUri: string; state: string }) {
  const url = new URL(KAKAO_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

/** 카카오로 보내기 전에 쿠키에 남기는 값 */
export type KakaoLoginCookie = { state: string; next: string };

export const encodeKakaoCookie = (value: KakaoLoginCookie) => JSON.stringify(value);

export function decodeKakaoCookie(raw: string | undefined): KakaoLoginCookie | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { state, next } = value as Record<string, unknown>;
    if (typeof state !== "string" || state.length < 16) return null;
    return { state, next: safeNextPath(next) };
  } catch {
    return null;
  }
}

export type KakaoCallback = { ok: true; code: string; next: string } | { ok: false; error: SocialLoginError; next: string };

/** 카카오가 돌려보낸 주소를 확인한다. state가 쿠키와 같아야 우리가 시작한 로그인이다 */
export function readKakaoCallback(params: URLSearchParams, rawCookie: string | undefined): KakaoCallback {
  const saved = decodeKakaoCookie(rawCookie);
  const next = saved?.next ?? "/";
  const kakaoError = params.get("error");
  if (kakaoError) return { ok: false, error: kakaoError === "access_denied" ? "CANCELLED" : "KAKAO_AUTH_FAILED", next };
  if (!saved || params.get("state") !== saved.state) return { ok: false, error: "STATE_MISMATCH", next };
  const code = params.get("code");
  if (!code) return { ok: false, error: "KAKAO_AUTH_FAILED", next };
  return { ok: true, code, next };
}
