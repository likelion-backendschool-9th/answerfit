"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, ApiNotConnectedError } from "@/lib/backend-http";
import { safeNextPath } from "@/lib/next-path";
import { addQuestion, getQuestionCategories, getSimilarityCandidates, likeAnswer, likeQuestion, removeQuestion, reportQuestion, updateQuestion } from "./api";
import { questionHref } from "./paths";
import { findSimilar, questionError, reportError, TEXT_MAX } from "./rules";
import type { ActionResult, QuestionCategoryOption, QuestionInput, ReportInput, SimilarResult } from "./types";

function updateViews(id?: string) {
  for (const path of ["/archive", "/my/questions", "/my/likes", "/my"]) revalidatePath(path);
  if (id) revalidatePath(questionHref(id));
  refresh();
}

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
  updateViews();
  return {};
}

const clean = (raw: QuestionInput): QuestionInput => ({
  categoryId: typeof raw?.categoryId === "string" ? raw.categoryId.trim() : "",
  text: typeof raw?.text === "string" ? raw.text.trim() : "",
});

export async function loadQuestionCategoriesAction(): Promise<{ categories: QuestionCategoryOption[]; error?: string }> {
  try {
    return { categories: await getQuestionCategories() };
  } catch (error) {
    return { categories: [], error: messageOf(error) };
  }
}

export async function likeAction(id: string, liked: boolean): Promise<ActionResult> {
  try {
    const like = await likeQuestion(id, liked);
    updateViews(id);
    return { like };
  } catch (error) {
    return { error: messageOf(error) };
  }
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
  try {
    if (id) {
      if (!(await updateQuestion(id, input))) return { error: "승인 전인 내 질문만 수정할 수 있어요." };
      updateViews(id);
      return { id };
    }
    const createdId = await addQuestion(input);
    if (createdId === null) return { error: "목업에서 등록할 수 있는 승인대기 질문 수를 초과했어요." };
    updateViews(createdId);
    return { id: createdId };
  } catch (error) {
    return { error: messageOf(error) };
  }
}

/** 지운 뒤 next로 간다 */
export async function removeQuestionAction(id: string, next: string): Promise<ActionResult> {
  try {
    if (!(await removeQuestion(id))) return { error: "승인 전인 내 질문만 삭제할 수 있어요." };
  } catch (error) {
    return { error: messageOf(error) };
  }
  updateViews(id);
  redirect(safeNextPath(next));
}

export async function reportAction(input: ReportInput): Promise<ActionResult> {
  const report: ReportInput = { questionId: typeof input?.questionId === "string" ? input.questionId : "",
    reason: typeof input?.reason === "string" ? input.reason : "",
    detail: typeof input?.detail === "string" ? input.detail.trim() : "" };
  const problem = reportError(report);
  if (problem) return { error: problem };
  try {
    if (!(await reportQuestion(report))) return { error: "이미 신고했거나 신고할 수 없는 질문이에요." };
    updateViews(report.questionId);
    return {};
  } catch (error) {
    return { error: messageOf(error) };
  }
}

/** 등록하려는 질문과 비슷한, 이미 승인된 질문 */
export async function similarAction(text: string): Promise<SimilarResult> {
  try {
    const input = typeof text === "string" ? [...text.trim()].slice(0, TEXT_MAX).join("") : "";
    const found = findSimilar(await getSimilarityCandidates(input), input);
    return { question: found ? { id: found.id, text: found.text } : null };
  } catch (error) {
    return { question: null, error: messageOf(error) };
  }
}
