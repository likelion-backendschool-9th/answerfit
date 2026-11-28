import "server-only";
import { listDemoExperiences, removeDemoExperience, saveDemoExperience } from "@/demo/experiences";
import { getDataMode } from "@/demo/mode";
import { requireMember } from "@/features/session/guard";
import { getAccessToken } from "@/features/session/session";
import { ApiError, callBackend } from "@/lib/backend-http";
import type { Experience } from "./types";

/** 백엔드 API는 아직 없다. 주소와 형식은 docs/frontend/document/experiences.md의 가정을 따른다 */
const BASE = "/api/v1/experiences";
const itemPath = (id: string) => `${BASE}/${encodeURIComponent(id)}`;
const call = async <T>(path: string, method = "GET", body?: object) => callBackend<T>(path, { method, body, token: await getAccessToken() });

export async function getExperiences(): Promise<Experience[]> {
  await requireMember();
  if ((await getDataMode()) === "mock") return listDemoExperiences();
  return call(BASE);
}

/** 아이디는 화면이 만든다. 없으면 새로 만들고, 있으면 고친다 */
export async function saveExperience(experience: Experience) {
  await requireMember();
  if ((await getDataMode()) === "mock") return saveDemoExperience(experience);
  await call(itemPath(experience.id), "PUT", experience);
}

/** 아직 저장하지 않은 행이면 백엔드가 404를 준다. 지우려던 결과와 같으니 성공으로 본다 */
export async function removeExperience(id: string) {
  await requireMember();
  if ((await getDataMode()) === "mock") return removeDemoExperience(id);
  try {
    await call(itemPath(id), "DELETE");
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  }
}
