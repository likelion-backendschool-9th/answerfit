import { describe, expect, it } from "vitest";
import { clock, initRoom, REAL_LIMIT_SECONDS, roomReducer, type RoomEvent, type RoomState } from "@/features/interview/room";
import type { InterviewMode, Question } from "@/features/interview/types";

const q = (id: string): Question => ({ id, category: "", text: id, hint: "" });
const start = (mode: InterviewMode = "practice") => initRoom({ id: "i", mode, type: "cs", questions: [q("1"), q("2")] });
const run = (state: RoomState, ...events: RoomEvent[]) => events.reduce(roomReducer, state);
const answered: RoomEvent[] = [{ type: "startAnswer" }, { type: "complete" }];
const ticks = (count: number): RoomEvent[] => Array.from({ length: count }, () => ({ type: "tick" }));

describe("연습 모드", () => {
  it("듣기 → 답변 → 분석 → 선택 → 다음 질문", () => {
    const chosen = run(start(), ...answered, { type: "analyzed", followUp: q("1f") });
    expect(chosen).toMatchObject({ phase: "choosing", followUp: { id: "1f" } });
    expect(run(chosen, { type: "next" })).toMatchObject({ phase: "listening", index: 1, question: { id: "2" }, answerSeconds: 0 });
  });
  it("꼬리 질문은 질문 번호를 바꾸지 않고, 꼬리 질문의 꼬리 질문은 없다", () => {
    const follow = run(start(), ...answered, { type: "analyzed", followUp: q("1f") }, { type: "followUp" });
    expect(follow).toMatchObject({ index: 0, isFollowUp: true, question: { id: "1f" }, phase: "listening" });
    expect(run(follow, ...answered, { type: "analyzed", followUp: q("1ff") })).toMatchObject({ phase: "choosing", followUp: null });
  });
  it("꼬리 질문이 없으면 고를 수 없다", () => {
    const chosen = run(start(), ...answered, { type: "analyzed", followUp: null });
    expect(run(chosen, { type: "followUp" })).toBe(chosen);
  });
  it("마지막 질문 다음에는 끝난다", () => {
    const one: RoomEvent[] = [...answered, { type: "analyzed", followUp: null }, { type: "next" }];
    expect(run(start(), ...one, ...one).phase).toBe("finished");
  });
  it("시간 제한이 없다", () => {
    expect(run(start(), { type: "startAnswer" }, ...ticks(REAL_LIMIT_SECONDS + 1)).phase).toBe("answering");
  });
  it("다시 들어도 답변 시간을 지우지 않는다", () => {
    expect(run(start(), { type: "startAnswer" }, ...ticks(3), { type: "replay" }, ...ticks(2), { type: "startAnswer" })).toMatchObject({ answerSeconds: 3, totalSeconds: 5 });
  });
});

describe("실전 모드", () => {
  it("힌트를 열 수 없다", () => expect(run(start("real"), { type: "toggleHint" }).hintOpen).toBe(false));
  it("제한 시간이 되면 분석으로 넘어간다", () => {
    const almost = run(start("real"), { type: "startAnswer" }, ...ticks(REAL_LIMIT_SECONDS - 1));
    expect(almost.phase).toBe("answering");
    expect(run(almost, { type: "tick" }).phase).toBe("analyzing");
  });
  it("꼬리 질문과 다음 질문을 자동으로 잇는다", () => {
    expect(run(start("real"), ...answered, { type: "analyzed", followUp: q("1f") })).toMatchObject({ phase: "listening", question: { id: "1f" } });
    expect(run(start("real"), ...answered, { type: "analyzed", followUp: null })).toMatchObject({ phase: "listening", question: { id: "2" } });
  });
});

describe("일시 정지", () => {
  it("멈춘 동안 시간이 가지 않고 다른 일을 받지 않는다", () => {
    const paused = run(start(), { type: "startAnswer" }, ...ticks(2), { type: "pause" });
    expect(run(paused, ...ticks(5), { type: "complete" })).toEqual(paused);
    expect(run(paused, { type: "resume" })).toMatchObject({ paused: false, phase: "answering", answerSeconds: 2 });
  });
  it("분석 중에는 멈출 수 없다", () => expect(run(start(), ...answered, { type: "pause" }).paused).toBe(false));
});

it("분석에 실패하면 다시 시도하거나 넘어갈 수 있다", () => {
  const failed = run(start(), ...answered, { type: "failed", error: "오류" });
  expect(failed).toMatchObject({ phase: "choosing", error: "오류" });
  expect(run(failed, { type: "retry" })).toMatchObject({ phase: "analyzing", error: null });
  expect(run(failed, { type: "next" })).toMatchObject({ index: 1, error: null });
});

it("분석과 선택 중에는 전체 시간이 가지 않는다", () => {
  const analyzing = run(start(), ...ticks(1), ...answered);
  expect(run(analyzing, ...ticks(5)).totalSeconds).toBe(1);
});

it("시간 표시", () => {
  expect(clock(0)).toBe("00:00");
  expect(clock(768)).toBe("12:48");
  expect(clock(3661)).toBe("61:01");
});
