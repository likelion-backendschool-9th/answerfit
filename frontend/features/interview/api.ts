import "server-only";
import { analyzeDemoAnswer, createDemoInterview, DEMO_GROUPS, findDemoInterview } from "@/demo/interview";
import { getDataMode } from "@/demo/mode";
import { requireMember } from "@/features/session/guard";
import { getAccessToken } from "@/features/session/session";
import { ApiError, callBackend } from "@/lib/backend-http";
import type { AnswerInput, DocumentGroup, Interview, InterviewSetup, Question } from "./types";

const call = async <T>(path: string, body?: object) => callBackend<T>(path, { method: body ? "POST" : "GET", body, token: await getAccessToken() });

export async function getDocumentGroups(): Promise<DocumentGroup[]> {
  await requireMember();
  if ((await getDataMode()) === "mock") return DEMO_GROUPS;
  return call("/api/document-groups");
}

export async function createInterview(setup: InterviewSetup): Promise<string> {
  await requireMember();
  if ((await getDataMode()) === "mock") return createDemoInterview(setup);
  return (await call<{ id: string }>("/api/interviews", setup)).id;
}

export async function getInterview(id: string): Promise<Interview | null> {
  await requireMember();
  if ((await getDataMode()) === "mock") return findDemoInterview(id);
  try {
    return await call(`/api/interviews/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** 꼬리 질문이 필요하면 돌려준다. 음성을 올리는 방식은 미확정이라 아직 보내지 않는다 */
export async function submitAnswer({ interviewId, questionId, seconds }: AnswerInput): Promise<Question | null> {
  await requireMember();
  if ((await getDataMode()) === "mock") return analyzeDemoAnswer(questionId);
  const path = `/api/interviews/${encodeURIComponent(interviewId)}/questions/${encodeURIComponent(questionId)}/answer`;
  return (await call<{ followUp: Question | null }>(path, { seconds })).followUp;
}

/** 시선 분석은 아직 없다. 목업 모드에서만 연결된 것처럼 보여 준다 */
export async function isGazeReady() {
  return (await getDataMode()) === "mock";
}
