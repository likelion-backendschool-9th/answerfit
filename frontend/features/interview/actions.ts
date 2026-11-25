"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, ApiNotConnectedError } from "@/lib/backend-http";
import type { AnalysisProgress } from "./analysis";
import { createInterview, finishInterview, getDocumentGroups, getProgress, renameInterview, submitAnswer } from "./api";
import { titleError } from "./result";
import { setupError, todayInSeoul } from "./setup";
import type { AnswerInput, AnswerResult, InterviewSetup } from "./types";

function messageOf(error: unknown) {
  if (error instanceof ApiNotConnectedError) return "아직 연동되지 않은 API예요.";
  if (error instanceof ApiError) return error.message;
  throw error;
}

export async function startInterviewAction(setup: InterviewSetup): Promise<{ error: string }> {
  let id: string;
  try {
    const error = setupError(setup, await getDocumentGroups(), todayInSeoul(new Date()));
    if (error) return { error };
    id = await createInterview(setup);
  } catch (error) {
    return { error: messageOf(error) };
  }
  redirect(`/interviews/${id}`);
}

export async function submitAnswerAction(input: AnswerInput): Promise<AnswerResult> {
  try {
    return { ok: true, followUp: await submitAnswer(input) };
  } catch (error) {
    return { ok: false, error: messageOf(error) };
  }
}

/** 성공하면 결과를 정리하는 화면으로 간다 */
export async function finishInterviewAction(id: string): Promise<{ error: string }> {
  try {
    await finishInterview(id);
  } catch (error) {
    return { error: messageOf(error) };
  }
  redirect(`/interviews/${encodeURIComponent(id)}/analyzing`);
}

export async function analysisProgressAction(id: string): Promise<{ progress: AnalysisProgress } | { error: string }> {
  try {
    const progress = await getProgress(id);
    return progress ? { progress } : { error: "정리 중인 면접을 찾지 못했어요." };
  } catch (error) {
    return { error: messageOf(error) };
  }
}

export async function renameInterviewAction(id: string, input: string): Promise<{ error?: string }> {
  const title = input.trim();
  const problem = titleError(title);
  if (problem) return { error: problem };
  try {
    if (!(await renameInterview(id, title))) return { error: "예시 면접의 제목은 바꿀 수 없어요." };
  } catch (error) {
    return { error: messageOf(error) };
  }
  refresh();
  return {};
}
