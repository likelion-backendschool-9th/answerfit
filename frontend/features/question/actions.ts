"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, ApiNotConnectedError } from "@/lib/backend-http";
import { safeNextPath } from "@/lib/next-path";
import { addQuestion, getQuestions, likeAnswer, likeQuestion, removeQuestion, reportQuestion, updateQuestion } from "./api";
import { findSimilar, questionError, reportError, TEXT_MAX } from "./rules";
import type { ActionResult, QuestionInput, ReportInput, SimilarQuestion } from "./types";

function messageOf(error: unknown) {
  if (error instanceof ApiNotConnectedError) return "아직 연동되지 않은 API예요.";
  if (error instanceof ApiError) return error.message;
  throw error;
}

/** 실패 이유를 돌려준다. run이 false를 주면 denied를 보여 준다 */
async function attempt(run: () => Promise<boolean>, denied: string): Promise<ActionResult> {
  try {
    if (!(await run())) return { error: denied };
  } catch (error) {
    return { error: messageOf(error) };
  }
  refresh();
  return {};
}

const clean = ({ category, text }: QuestionInput): QuestionInput => ({ category, text: text.trim() });

export async function likeAction(id: string, liked: boolean): Promise<ActionResult> {
  return attempt(() => likeQuestion(id, liked), "질문을 찾지 못했어요.");
}

export async function unlikeAnswerAction(id: string): Promise<ActionResult> {
  return attempt(async () => {
    await likeAnswer(id, false);
    return true;
  }, "");
}

export async function saveQuestionAction(id: string | null, raw: QuestionInput): Promise<ActionResult> {
  const input = clean(raw);
  const problem = questionError(input);
  if (problem) return { error: problem };
  if (id) return attempt(() => updateQuestion(id, input), "승인 전인 내 질문만 수정할 수 있어요.");
  return attempt(async () => (await addQuestion(input)) !== null, "승인 대기 중인 질문이 너무 많아요.");
}

/** 지운 뒤 next로 간다 */
export async function removeQuestionAction(id: string, next: string): Promise<ActionResult> {
  try {
    if (!(await removeQuestion(id))) return { error: "승인 전인 내 질문만 삭제할 수 있어요." };
  } catch (error) {
    return { error: messageOf(error) };
  }
  redirect(safeNextPath(next));
}

export async function reportAction(input: ReportInput): Promise<ActionResult> {
  const report = { ...input, detail: input.detail.trim() };
  const problem = reportError(report);
  if (problem) return { error: problem };
  return attempt(() => reportQuestion(report), "이미 신고했거나 신고할 수 없는 질문이에요.");
}

/** 등록하려는 질문과 비슷한, 이미 승인된 질문 */
export async function similarAction(text: string): Promise<SimilarQuestion | null> {
  try {
    const approved = (await getQuestions()).filter(({ kind, status }) => kind === "cs" && status === "approved");
    const found = findSimilar(approved, text.slice(0, TEXT_MAX));
    return found && { id: found.id, text: found.text };
  } catch (error) {
    messageOf(error);
    return null;
  }
}
