import "server-only";
import { redirect } from "next/navigation";
import { clearDemoRecords, demoLearning, demoProfile, isDemoPassword, setDemoLink, updateDemoNickname } from "@/demo/member";
import { getDataMode } from "@/demo/mode";
import { requireMember } from "@/features/session/guard";
import { endSession, getAccessToken } from "@/features/session/session";
import { ApiError, callBackend } from "@/lib/backend-http";
import type { Learning } from "./learning";
import type { LinkedLogin, Profile } from "./types";

const call = async <T>(path: string, method = "GET", body?: object | FormData) => callBackend<T>(path, { method, body, token: await getAccessToken() });
const inMock = async () => (await getDataMode()) === "mock";

export async function getProfile(): Promise<Profile> {
  await requireMember();
  const profile = (await inMock()) ? await demoProfile() : await call<Profile>("/api/members/me/profile");
  if (!profile) redirect("/login");
  return profile;
}

export async function getLearning(): Promise<Learning> {
  await requireMember();
  return (await inMock()) ? demoLearning() : call("/api/members/me/learning");
}

/** 목업은 사진을 저장하지 않는다. photo가 null이면 사진을 그대로 두고, "default"면 기본 이미지로 바꾼다 */
export async function updateProfile(nickname: string, photo: File | "default" | null) {
  await requireMember();
  if (await inMock()) return updateDemoNickname(nickname);
  const form = new FormData();
  form.set("nickname", nickname);
  if (photo === "default") form.set("useDefaultPhoto", "true");
  else if (photo) form.set("photo", photo);
  await call("/api/members/me/profile", "PUT", form);
}

/** 현재 비밀번호가 틀리면 false */
export async function changePassword(current: string, next: string): Promise<boolean> {
  await requireMember();
  if (await inMock()) return isDemoPassword(current);
  try {
    await call("/api/members/me/password", "PUT", { current, next });
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) return false;
    throw error;
  }
}

export async function setLink(provider: LinkedLogin["provider"], linked: boolean) {
  await requireMember();
  if (await inMock()) return setDemoLink(provider, linked);
  await call(`/api/members/me/links/${provider}`, linked ? "PUT" : "DELETE");
}

export async function withdraw() {
  await requireMember();
  if (await inMock()) await clearDemoRecords();
  else await call("/api/members/me", "DELETE");
  await endSession();
}
