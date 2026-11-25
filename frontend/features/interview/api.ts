import "server-only";
import { listDemoGroups, removeDemoGroup, renameDemoGroup } from "@/demo/documents";
import { analyzeDemoAnswer, createDemoInterview, demoProgress, findDemoInterview, findDemoResult, finishDemoInterview, listDemoRecords, renameDemoInterview } from "@/demo/interview";
import { getDataMode } from "@/demo/mode";
import { requireMember } from "@/features/session/guard";
import { getAccessToken } from "@/features/session/session";
import { ApiError, callBackend } from "@/lib/backend-http";
import { analysisAt, type AnalysisProgress } from "./analysis";
import type { InterviewRecord } from "./records";
import type { ResultState } from "./result";
import type { AnswerInput, DocumentGroup, Interview, InterviewSetup, Question } from "./types";

const call = async <T>(path: string, body?: object) => callBackend<T>(path, { method: body ? "POST" : "GET", body, token: await getAccessToken() });

const interviewPath = (id: string) => `/api/interviews/${encodeURIComponent(id)}`;

async function orNull<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getDocumentGroups(): Promise<DocumentGroup[]> {
  await requireMember();
  if ((await getDataMode()) === "mock") return listDemoGroups();
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
  return orNull(call<Interview>(interviewPath(id)));
}

/** 꼬리 질문이 필요하면 돌려준다. 음성을 올리는 방식은 미확정이라 아직 보내지 않는다 */
export async function submitAnswer({ interviewId, questionId, seconds }: AnswerInput): Promise<Question | null> {
  await requireMember();
  if ((await getDataMode()) === "mock") return analyzeDemoAnswer({ interviewId, questionId, seconds });
  const path = `${interviewPath(interviewId)}/questions/${encodeURIComponent(questionId)}/answer`;
  return (await call<{ followUp: Question | null }>(path, { seconds })).followUp;
}

export async function finishInterview(id: string) {
  await requireMember();
  if ((await getDataMode()) === "mock") return finishDemoInterview(id);
  await call(`${interviewPath(id)}/finish`, {});
}

/** 끝나지 않았거나 없는 면접이면 null */
export async function getProgress(id: string): Promise<AnalysisProgress | null> {
  await requireMember();
  if ((await getDataMode()) === "mock") return demoProgress(id);
  const progress = await orNull(call<{ percent: number; total: number }>(`${interviewPath(id)}/analysis`));
  return progress && analysisAt(progress.percent, progress.total);
}

export async function getResult(id: string): Promise<ResultState | null> {
  await requireMember();
  if ((await getDataMode()) === "mock") return findDemoResult(id);
  return orNull(call<ResultState>(`${interviewPath(id)}/result`));
}

/** 바꾸지 못하면 false */
export async function renameInterview(id: string, title: string): Promise<boolean> {
  await requireMember();
  if ((await getDataMode()) === "mock") return renameDemoInterview(id, title);
  await call(`${interviewPath(id)}/title`, { title });
  return true;
}

/** 끝난 면접의 기록. 최신순 */
export async function getRecords(): Promise<InterviewRecord[]> {
  await requireMember();
  if ((await getDataMode()) === "mock") return listDemoRecords();
  return call("/api/interviews/records");
}

const groupPath = (id: string) => `/api/document-groups/${encodeURIComponent(id)}`;
const hasGroup = async (id: string) => (await getDocumentGroups()).some((group) => group.id === id);

/** 내 서류 그룹이 아니면 false */
export async function renameGroup(id: string, name: string): Promise<boolean> {
  if (!(await hasGroup(id))) return false;
  if ((await getDataMode()) === "mock") await renameDemoGroup(id, name);
  else await call(`${groupPath(id)}/name`, { name });
  return true;
}

export async function removeGroup(id: string): Promise<boolean> {
  if (!(await hasGroup(id))) return false;
  if ((await getDataMode()) === "mock") await removeDemoGroup(id);
  else await callBackend(groupPath(id), { method: "DELETE", token: await getAccessToken() });
  return true;
}

/** 시선 분석은 아직 없다. 목업 모드에서만 연결된 것처럼 보여 준다 */
export async function isGazeReady() {
  return (await getDataMode()) === "mock";
}
