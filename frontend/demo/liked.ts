import "server-only";
import { RECORD_LABEL } from "@/features/interview/records";
import { startedLabel } from "@/features/interview/result";
import type { LikedAnswer } from "@/features/question/types";
import { findDemoResult } from "./interview";
import { readDemoLikedAnswers } from "./question";

/** 좋아요한 면접 질문을 그 면접의 결과에서 찾아 보여 준다. 없어진 면접의 질문은 뺀다 */
export async function listDemoLikedAnswers(): Promise<LikedAnswer[]> {
  const found = await Promise.all(
    (await readDemoLikedAnswers()).map(async (id): Promise<LikedAnswer | null> => {
      const [interviewId, itemId] = id.split("/");
      const result = await findDemoResult(interviewId);
      if (result?.state !== "done") return null;
      const item = result.result.items.find((one) => one.id === itemId);
      if (!item) return null;
      return { id, interviewId, text: item.text, date: startedLabel(result.result.startedAt).slice(0, 10), typeLabel: RECORD_LABEL[result.result.type], score: item.score };
    }),
  );
  return found.filter((one) => one !== null);
}
