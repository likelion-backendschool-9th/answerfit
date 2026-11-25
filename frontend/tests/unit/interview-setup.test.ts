import { describe, expect, it } from "vitest";
import { deleteLabel, estimateMinutes, isDate, setupError, todayInSeoul } from "@/features/interview/setup";
import type { DocumentGroup, InterviewSetup } from "@/features/interview/types";

const group = (id: string, error: string | null = null): DocumentGroup => ({ id, name: id, shortName: id, description: "", interviewDate: null, error });
const groups = [group("good"), group("bad", "스캔 실패")];
const setup: InterviewSetup = { mode: "practice", type: "experience", count: 5, groupId: "good", deleteAfter: "2026-12-10" };
const check = (change: Partial<InterviewSetup>) => setupError({ ...setup, ...change }, groups, "2026-11-25");

describe("setupError", () => {
  it("맞는 설정은 통과한다", () => expect(check({})).toBeUndefined());
  it.each([2, 9, 3.5])("질문 수 %s는 막는다", (count) => expect(check({ count })).toBeDefined());
  it("경험 면접은 서류 그룹이 필요하다", () => expect(check({ groupId: null })).toBeDefined());
  it("스캔에 실패한 그룹은 막는다", () => expect(check({ groupId: "bad" })).toBeDefined());
  it("CS 면접은 서류 그룹이 필요 없다", () => expect(check({ type: "cs", groupId: null })).toBeUndefined());
  it("보관 날짜를 비울 수 있다", () => expect(check({ deleteAfter: null })).toBeUndefined());
  it("오늘은 되고 어제는 막는다", () => {
    expect(check({ deleteAfter: "2026-11-25" })).toBeUndefined();
    expect(check({ deleteAfter: "2026-11-24" })).toBeDefined();
  });
  it("정해지지 않은 유형과 방식을 막는다", () => {
    expect(check({ type: "pt" as InterviewSetup["type"] })).toBeDefined();
    expect(check({ mode: "easy" as InterviewSetup["mode"] })).toBeDefined();
  });
});

it("없는 날짜를 거른다", () => {
  expect(isDate("2026-12-10")).toBe(true);
  expect(isDate("2026-02-30")).toBe(false);
  expect(isDate("2026-1-1")).toBe(false);
});

it("표시 문구", () => {
  expect(estimateMinutes(5)).toBe(25);
  expect(deleteLabel("2026-12-10")).toBe("2026.12.10 이후");
  expect(deleteLabel(null)).toBe("면접일부터 30일 뒤");
});

it("오늘은 한국 시간으로 계산한다", () => {
  expect(todayInSeoul(new Date("2026-11-24T15:30:00Z"))).toBe("2026-11-25");
});
