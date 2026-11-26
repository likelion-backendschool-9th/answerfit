import "server-only";
import { getDataMode } from "@/demo/mode";
import { listDemoLikedAnswers } from "@/demo/liked";
import { addDemoQuestion, likeDemoAnswer, likeDemoQuestion, listDemoQuestions, removeDemoQuestion, reportDemoQuestion, updateDemoQuestion } from "@/demo/question";
import { requireMember } from "@/features/session/guard";
import { getAccessToken } from "@/features/session/session";
import { callBackend } from "@/lib/backend-http";
import type { ArchiveQuestion, LikedAnswer, QuestionInput, ReportInput } from "./types";

const call = async <T>(path: string, method = "GET", body?: object) => callBackend<T>(path, { method, body, token: await getAccessToken() });
const path = (id: string) => `/api/v1/questions/${encodeURIComponent(id)}`;

const inMock = async () => (await getDataMode()) === "mock";

/** 최신순. 검색과 쪽 나누기를 서버가 할지는 미확정이라 지금은 모두 받아 화면에서 거른다 */
export async function getQuestions(): Promise<ArchiveQuestion[]> {
  await requireMember();
  return (await inMock()) ? listDemoQuestions() : call("/api/v1/questions");
}

export async function getQuestion(id: string): Promise<ArchiveQuestion | null> {
  return (await getQuestions()).find((question) => question.id === id) ?? null;
}

/** 승인 전인 내 질문인지. 수정과 삭제는 이때만 할 수 있다 */
async function isEditable(id: string) {
  const question = await getQuestion(id);
  return Boolean(question?.mine && question.status === "pending");
}

export async function likeQuestion(id: string, liked: boolean): Promise<boolean> {
  if (!(await getQuestion(id))) return false;
  if (await inMock()) await likeDemoQuestion(id, liked);
  else await call(`${path(id)}/like`, liked ? "PUT" : "DELETE");
  return true;
}

/** 더 등록할 수 없으면 null */
export async function addQuestion(input: QuestionInput): Promise<string | null> {
  const { nickname, email } = await requireMember();
  if (await inMock()) return addDemoQuestion(input, { nickname, email });
  return (await call<{ id: string }>("/api/v1/questions", "POST", input)).id;
}

export async function updateQuestion(id: string, input: QuestionInput): Promise<boolean> {
  if (!(await isEditable(id))) return false;
  if (await inMock()) await updateDemoQuestion(id, input);
  else await call(path(id), "PUT", input);
  return true;
}

export async function removeQuestion(id: string): Promise<boolean> {
  if (!(await isEditable(id))) return false;
  if (await inMock()) await removeDemoQuestion(id);
  else await call(path(id), "DELETE");
  return true;
}

/** 내 질문과 이미 신고한 질문은 신고할 수 없다 */
export async function reportQuestion({ questionId, reason, detail }: ReportInput): Promise<boolean> {
  const question = await getQuestion(questionId);
  if (!question || question.mine || question.reported) return false;
  if (await inMock()) await reportDemoQuestion({ questionId, reason, detail });
  else await call(`${path(questionId)}/reports`, "POST", { reason, detail });
  return true;
}

/** 면접 결과에서 좋아요한 질문 */
export async function getLikedAnswers(): Promise<LikedAnswer[]> {
  await requireMember();
  return (await inMock()) ? listDemoLikedAnswers() : call("/api/v1/questions/liked-answers");
}

export async function likeAnswer(id: string, liked: boolean) {
  await requireMember();
  if (await inMock()) await likeDemoAnswer(id, liked);
  else await call(`/api/v1/questions/liked-answers/${encodeURIComponent(id)}`, liked ? "PUT" : "DELETE");
}
