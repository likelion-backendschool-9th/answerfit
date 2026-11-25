"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, ApiNotConnectedError } from "@/lib/backend-http";
import { changePassword, setLink, updateProfile, withdraw } from "./api";
import type { SaveResult } from "./types";
import { nicknameError, passwordChangeErrors, photoError, type PasswordErrors, type PasswordInput } from "./validation";

function messageOf(error: unknown) {
  if (error instanceof ApiNotConnectedError) return "아직 연동되지 않은 API예요.";
  if (error instanceof ApiError) return error.message;
  throw error;
}

export async function updateProfileAction(form: FormData): Promise<SaveResult<{ nickname?: string; photo?: string }>> {
  const nickname = String(form.get("nickname") ?? "").trim();
  const file = form.get("photo");
  const photo = file instanceof File && file.size > 0 ? file : null;
  const errors = { nickname: nicknameError(nickname), photo: photo ? photoError(photo) : undefined };
  if (errors.nickname || errors.photo) return { ok: false, errors };
  try {
    await updateProfile(nickname, form.get("useDefault") === "true" ? "default" : photo);
  } catch (error) {
    return { ok: false, message: messageOf(error) };
  }
  refresh();
  return { ok: true, message: "변경 사항을 저장했어요." };
}

export async function changePasswordAction(input: PasswordInput): Promise<SaveResult<PasswordErrors>> {
  const errors = passwordChangeErrors(input);
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  try {
    if (!(await changePassword(input.current, input.next))) return { ok: false, errors: { current: "현재 비밀번호가 맞지 않아요." } };
  } catch (error) {
    return { ok: false, message: messageOf(error) };
  }
  return { ok: true, message: "비밀번호를 바꿨어요." };
}

export async function setLinkAction(provider: string, linked: boolean): Promise<SaveResult> {
  if (provider !== "github" && provider !== "kakao") return { ok: false, message: "지원하지 않는 로그인 방식이에요." };
  try {
    await setLink(provider, linked);
  } catch (error) {
    return { ok: false, message: messageOf(error) };
  }
  refresh();
  return { ok: true };
}

export async function withdrawAction(): Promise<SaveResult> {
  try {
    await withdraw();
  } catch (error) {
    return { ok: false, message: messageOf(error) };
  }
  redirect("/");
}
