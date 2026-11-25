"use server";

import { redirect } from "next/navigation";
import { ApiError, ApiNotConnectedError } from "@/lib/backend-http";
import { safeNextPath } from "@/lib/next-path";
import { isEmailTaken, login, loginWithSocial, logout, signup } from "./api";
import { SOCIAL_PROVIDERS, type AccountErrors, type LoginState, type SignupResult, type SocialProvider } from "./types";
import { hasErrors, validateAccount, validateProfile } from "./validation";

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};

/** 폼 안에 보여 줄 문구. 예상하지 못한 오류는 그대로 던진다 */
function messageOf(error: unknown) {
  if (error instanceof ApiNotConnectedError) return "아직 연동되지 않은 API예요.";
  if (error instanceof ApiError) return error.message;
  throw error;
}

export async function loginAction(_: LoginState, form: FormData): Promise<LoginState> {
  const email = text(form, "email").trim();
  const password = text(form, "password");
  const remember = form.get("remember") === "on";
  const fail = (error: string): LoginState => ({ error, email, remember });

  if (!email || !password) return fail("이메일과 비밀번호를 입력해 주세요.");
  try {
    if (!(await login({ email, password, remember }))) return fail("이메일이나 비밀번호가 맞지 않아요.");
  } catch (error) {
    return fail(messageOf(error));
  }
  redirect(safeNextPath(form.get("next")));
}

export async function socialLoginAction(_: LoginState, form: FormData): Promise<LoginState> {
  const provider = text(form, "provider") as SocialProvider;
  if (!SOCIAL_PROVIDERS.includes(provider)) return { error: "지원하지 않는 로그인 방식이에요." };
  try {
    await loginWithSocial(provider);
  } catch (error) {
    return { error: messageOf(error) };
  }
  redirect(safeNextPath(form.get("next")));
}

const readAccount = (form: FormData) => ({
  email: text(form, "email").trim(),
  password: text(form, "password"),
  passwordConfirm: text(form, "passwordConfirm"),
  agreed: form.get("agreed") === "true",
});

async function checkAccount(account: ReturnType<typeof readAccount>): Promise<AccountErrors> {
  const errors = validateAccount(account);
  if (!errors.email && (await isEmailTaken(account.email))) errors.email = "이미 가입한 이메일이에요.";
  return errors;
}

/** 1단계에서 다음으로 넘어가도 되는지 확인한다 */
export async function checkAccountAction(form: FormData): Promise<SignupResult> {
  try {
    const account = await checkAccount(readAccount(form));
    return hasErrors(account) ? { ok: false, account } : { ok: true };
  } catch (error) {
    return { ok: false, error: messageOf(error) };
  }
}

/** 화면의 검사를 믿지 않고 두 단계를 모두 다시 확인한다 */
export async function signupAction(form: FormData): Promise<SignupResult> {
  const input = readAccount(form);
  const nickname = text(form, "nickname").trim();
  const file = form.get("photo");
  const photo = file instanceof File && file.size > 0 ? file : null;
  try {
    const account = await checkAccount(input);
    if (hasErrors(account)) return { ok: false, account };
    const profile = validateProfile({ nickname, photo });
    if (hasErrors(profile)) return { ok: false, profile };
    await signup({ email: input.email, password: input.password, nickname, photo });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageOf(error) };
  }
}

export async function logoutAction() {
  await logout();
  redirect("/");
}
