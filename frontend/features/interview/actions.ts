"use server";

import { redirect } from "next/navigation";
import { ApiError, ApiNotConnectedError } from "@/lib/backend-http";
import { createInterview, getDocumentGroups, submitAnswer } from "./api";
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
