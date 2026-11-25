"use server";

import { refresh } from "next/cache";
import { todayInSeoul } from "@/features/interview/setup";
import { ApiError, ApiNotConnectedError } from "@/lib/backend-http";
import { approve, generateAnswer, reject, release, removeBank, saveBank, settleReport, suspend } from "./api";
import { cleanDraft, draftErrors, releaseOn, suspendError, type DraftErrors, type SuspendPeriod } from "./rules";
import type { ActionResult, QuestionDraft, ReportStatus } from "./types";

function messageOf(error: unknown) {
  if (error instanceof ApiNotConnectedError) return "아직 연동되지 않은 API예요.";
  if (error instanceof ApiError) return error.message;
  throw error;
}

async function attempt(run: () => Promise<boolean>, denied: string): Promise<ActionResult> {
  try {
    if (!(await run())) return { error: denied };
  } catch (error) {
    return { error: messageOf(error) };
  }
  refresh();
  return {};
}

const NO_QUESTION = "질문을 찾지 못했어요. 이미 처리됐을 수 있어요.";

export async function saveBankAction(id: string | null, raw: QuestionDraft): Promise<ActionResult & { errors?: DraftErrors }> {
  const draft = cleanDraft(raw);
  const errors = draftErrors(draft);
  if (Object.keys(errors).length > 0) return { errors };
  return attempt(() => saveBank(id, draft), NO_QUESTION);
}

export async function removeBankAction(ids: string[]): Promise<ActionResult> {
  return attempt(() => removeBank(ids), NO_QUESTION);
}

export async function generateAnswerAction(text: string): Promise<{ answer: string; keywords: string[] } | { error: string }> {
  if (!text.trim()) return { error: "질문을 먼저 써 주세요." };
  try {
    return await generateAnswer(text.trim());
  } catch (error) {
    return { error: messageOf(error) };
  }
}

export async function approveAction(id: string): Promise<ActionResult> {
  return attempt(() => approve(id), NO_QUESTION);
}

export async function rejectAction(id: string): Promise<ActionResult> {
  return attempt(() => reject(id), NO_QUESTION);
}

export async function settleReportAction(id: string, status: ReportStatus): Promise<ActionResult> {
  if (status !== "hidden" && status !== "closed") return { error: "처리 방법을 골라 주세요." };
  return attempt(() => settleReport(id, status), "신고를 찾지 못했어요.");
}

export async function suspendAction(id: string, period: string, rawReason: string): Promise<ActionResult> {
  const reason = rawReason.trim();
  const problem = suspendError(period, reason);
  if (problem) return { error: problem };
  const releaseDay = releaseOn(period as SuspendPeriod, todayInSeoul(new Date()));
  return attempt(() => suspend(id, { releaseOn: releaseDay, reason }), "이미 정지됐거나 없는 회원이에요.");
}

export async function releaseAction(id: string): Promise<ActionResult> {
  return attempt(() => release(id), "정지된 회원이 아니에요.");
}
