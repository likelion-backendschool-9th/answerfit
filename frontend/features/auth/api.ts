import "server-only";
import { addDemoMember, demoSocialMember, findDemoMember, isDemoEmailTaken } from "@/demo/auth";
import { getDataMode } from "@/demo/mode";
import { endSession, startSession } from "@/features/session/session";
import { ApiError, ApiNotConnectedError, callBackend } from "@/lib/backend-http";
import type { LoginInput, SignupInput, SocialProvider } from "./types";

type TokenResponse = { accessToken: string };

/** 맞지 않으면 false. 이메일과 비밀번호 중 무엇이 틀렸는지는 알려 주지 않는다 */
export async function login({ email, password, remember }: LoginInput): Promise<boolean> {
  if ((await getDataMode()) === "mock") {
    const member = await findDemoMember(email, password);
    if (!member) return false;
    await startSession({ demo: member }, remember);
    return true;
  }
  try {
    const { accessToken } = await callBackend<TokenResponse>("/api/auth/login", { method: "POST", body: { email, password } });
    await startSession({ accessToken }, remember);
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return false;
    throw error;
  }
}

export async function loginWithSocial(provider: SocialProvider) {
  if ((await getDataMode()) === "api") throw new ApiNotConnectedError(`/api/auth/social/${provider}`);
  await startSession({ demo: demoSocialMember() }, false);
}

export async function isEmailTaken(email: string): Promise<boolean> {
  if ((await getDataMode()) === "mock") return isDemoEmailTaken(email);
  const { available } = await callBackend<{ available: boolean }>(`/api/auth/email-availability?email=${encodeURIComponent(email)}`);
  return !available;
}

export async function signup({ email, password, nickname, photo }: SignupInput) {
  if ((await getDataMode()) === "mock") {
    await startSession({ demo: await addDemoMember(email, nickname) }, false);
    return;
  }
  const form = new FormData();
  form.set("email", email);
  form.set("password", password);
  form.set("nickname", nickname);
  if (photo) form.set("photo", photo);
  const { accessToken } = await callBackend<TokenResponse>("/api/auth/signup", { method: "POST", body: form });
  await startSession({ accessToken }, false);
}

/** 이 브라우저의 세션만 지운다. 서버 토큰을 무효로 만드는 API는 미확정 */
export async function logout() {
  await endSession();
}
