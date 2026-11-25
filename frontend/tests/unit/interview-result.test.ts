import { describe, expect, it } from "vitest";
import { analysisAt } from "@/features/interview/analysis";
import { addDays, bestItem, daysUntil, defaultTitle, duration, itemsToReview, rateScore, rateTime, startedLabel, summarize, titleError, type ResultItem } from "@/features/interview/result";

const item = (id: string, score: number, gaze = 50, seconds = 100) => ({ id, score, gaze, seconds, parentId: null }) as ResultItem;

it.each([
  [100, "우수"],
  [80, "우수"],
  [79, "준수"],
  [60, "준수"],
  [59, "노력 필요"],
  [0, "노력 필요"],
])("점수 %s → %s", (score, label) => expect(rateScore(score).label).toBe(label));

it.each([
  [59, "빠름"],
  [60, "준수"],
  [150, "준수"],
  [151, "느림"],
])("답변 %s초 → %s", (seconds, label) => expect(rateTime(seconds).label).toBe(label));

describe("요약", () => {
  it("평균을 반올림한다", () => expect(summarize([item("1", 84, 60, 105), item("2", 79, 57, 112)])).toEqual({ score: 82, gaze: 59, seconds: 109 }));
  it("답변이 없으면 0이다", () => expect(summarize([])).toEqual({ score: 0, gaze: 0, seconds: 0 }));
  it("낮은 점수 2개를 고르고 우수한 답변은 뺀다", () => {
    expect(itemsToReview([item("a", 84), item("b", 78), item("c", 69), item("d", 74)]).map(({ id }) => id)).toEqual(["c", "d"]);
    expect(itemsToReview([item("a", 84)])).toEqual([]);
  });
  it("가장 잘한 답변을 고른다", () => {
    expect(bestItem([item("a", 84), item("b", 86)])?.id).toBe("b");
    expect(bestItem([])).toBeNull();
  });
});

it("날짜를 센다", () => {
  expect(daysUntil("2026-12-10", "2026-11-24")).toBe(16);
  expect(daysUntil("2026-11-24", "2026-11-24")).toBe(0);
  expect(daysUntil("2026-11-23", "2026-11-24")).toBe(-1);
  expect(addDays("2026-11-25", 30)).toBe("2026-12-25");
});

it("한국 시간으로 표시한다", () => {
  expect(startedLabel("2026-11-24T14:10:00Z")).toBe("2026.11.24 (화) 23:10");
  expect(defaultTitle("2026-11-24T15:05:00Z")).toBe("2026.11.25 00:05 면접");
  expect(duration(112)).toBe("1:52");
  expect(duration(5)).toBe("0:05");
});

it("제목 길이를 검사한다", () => {
  expect(titleError("")).toBeDefined();
  expect(titleError("가".repeat(40))).toBeUndefined();
  expect(titleError("가".repeat(41))).toBeDefined();
});

describe("analysisAt", () => {
  it.each([
    [0, 0],
    [19, 0],
    [20, 1],
    [40, 2],
    [79, 2],
    [80, 3],
    [99, 3],
  ])("%s%% → %s번째 단계", (percent, step) => expect(analysisAt(percent, 7)).toMatchObject({ step, done: false }));
  it("62%면 코멘트 7개 중 4개를 썼다", () => expect(analysisAt(62, 7)).toMatchObject({ commented: 4, total: 7 }));
  it("범위를 벗어난 값을 자른다", () => {
    expect(analysisAt(-5, 3)).toMatchObject({ percent: 0, commented: 0 });
    expect(analysisAt(140, 3)).toMatchObject({ percent: 100, commented: 3, done: true });
  });
});
