"use server";

import { ApiError, ApiNotConnectedError } from "@/lib/backend-http";
import { removeExperience, saveExperience } from "./api";
import { experienceError, toExperience } from "./rules";

type Result = { error?: string };

function messageOf(error: unknown) {
  if (error instanceof ApiNotConnectedError) return "아직 연동되지 않은 API예요.";
  if (error instanceof ApiError) return error.message;
  throw error;
}

export async function saveExperienceAction(input: unknown): Promise<Result> {
  const experience = toExperience(input);
  if (!experience) return { error: "저장할 수 없는 값이에요." };
  const problem = experienceError(experience);
  if (problem) return { error: problem };
  try {
    await saveExperience(experience);
  } catch (error) {
    return { error: messageOf(error) };
  }
  return {};
}

/** 붙여 넣은 행을 한꺼번에 저장한다. 하나라도 틀리면 아무것도 저장하지 않는다 */
export async function importExperiencesAction(inputs: unknown): Promise<Result> {
  if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > 200) return { error: "가져올 행이 없거나 너무 많아요. 200행까지 가져올 수 있어요." };
  const items = inputs.map(toExperience);
  if (items.some((item) => !item || experienceError(item))) return { error: "가져올 수 없는 행이 있어요." };
  try {
    // shortcut: 한 행씩 저장해 중간에 실패하면 앞 행만 남는다. 백엔드에 일괄 저장 API가 생기면 바꾼다
    for (const item of items) await saveExperience(item!);
  } catch (error) {
    return { error: messageOf(error) };
  }
  return {};
}

export async function removeExperienceAction(id: unknown): Promise<Result> {
  if (typeof id !== "string" || !id) return { error: "지울 경험을 찾지 못했어요." };
  try {
    await removeExperience(id);
  } catch (error) {
    return { error: messageOf(error) };
  }
  return {};
}
