import { describe, expect, it } from "vitest";
import { averageScore, readRecordQuery, RECORD_PAGE_SIZE, recordsHref, searchRecords, splitByPeriod, typeStats, type InterviewRecord } from "@/features/interview/records";
import { averageOf, lowestOf, radarCategories, radarPoint, weakest, withSubject } from "@/features/member/learning";
import { nicknameError, passwordChangeErrors } from "@/features/member/validation";

const make = (id: string, startedAt: string, change: Partial<InterviewRecord> = {}): InterviewRecord => ({ id, title: `면접 ${id}`, type: "cs", mode: "practice", count: 5, score: 70, groupId: null, groupName: null, startedAt, deleteAfter: "2026-12-31", ...change });
const now = new Date("2026-11-25T03:00:00Z");
const query = readRecordQuery({});

describe("면접 기록 찾기", () => {
  const list = [make("a", "2026-11-01T00:00:00Z", { score: 90 }), make("b", "2026-11-20T00:00:00Z"), make("c", "2026-10-01T00:00:00Z", { type: "experience", title: "마바뱅크 최종 대비", score: 80 })];
  const ids = (change: object) => searchRecords(list, { ...query, ...change }).items.map(({ id }) => id);
  it("최신순, 오래된순, 점수순", () => {
    expect(ids({})).toEqual(["b", "a", "c"]);
    expect(ids({ sort: "oldest" })).toEqual(["c", "a", "b"]);
    expect(ids({ sort: "score" })).toEqual(["a", "c", "b"]);
  });
  it("유형과 이름으로 거른다", () => {
    expect(ids({ type: "experience" })).toEqual(["c"]);
    expect(ids({ keyword: "마바뱅크" })).toEqual(["c"]);
    expect(ids({ type: "pt" })).toEqual([]);
  });
  it("쪽을 나눈다", () => {
    const many = Array.from({ length: RECORD_PAGE_SIZE * 2 + 1 }, (_, i) => make(String(i), "2026-11-01T00:00:00Z"));
    expect(searchRecords(many, { ...query, page: 9 })).toMatchObject({ page: 3, pages: 3 });
  });
  it("주소를 다시 읽으면 같고, 잘못된 값은 무시한다", () => {
    const full = { type: "cs" as const, keyword: "a&b", sort: "score" as const, page: 2 };
    expect(readRecordQuery(Object.fromEntries(new URL(recordsHref(full, { page: 2 }), "http://x").searchParams))).toEqual(full);
    expect(readRecordQuery({ type: "x", sort: "x", page: "0" })).toEqual(query);
  });
});

describe("기간별 통계", () => {
  it("한국 시간으로 달을 나눈다", () => {
    const edge = [make("nov", "2026-10-31T15:30:00Z"), make("oct", "2026-10-31T14:30:00Z")];
    const { current, previous } = splitByPeriod(edge, "month", now);
    expect(current.map(({ id }) => id)).toEqual(["nov"]);
    expect(previous.map(({ id }) => id)).toEqual(["oct"]);
  });
  it("해가 바뀌어도 앞 기간을 찾는다", () => {
    const list = [make("jan", "2027-01-05T00:00:00Z"), make("dec", "2026-12-05T00:00:00Z"), make("sep", "2026-09-05T00:00:00Z")];
    expect(splitByPeriod(list, "month", new Date("2027-01-10T00:00:00Z")).previous.map(({ id }) => id)).toEqual(["dec"]);
    expect(splitByPeriod(list, "quarter", new Date("2027-01-10T00:00:00Z")).previous.map(({ id }) => id)).toEqual(["sep"]);
  });
  it("앞 기간과의 차이를 계산하고, 견줄 기록이 없으면 null", () => {
    const list = [make("a", "2026-11-10T00:00:00Z", { score: 80 }), make("b", "2026-11-11T00:00:00Z", { score: 75 }), make("c", "2026-10-11T00:00:00Z", { score: 70 })];
    expect(typeStats(list, "cs", "month", now)).toEqual({ score: 78, count: 2, change: 8 });
    expect(typeStats(list, "cs", "all", now)).toEqual({ score: 75, count: 3, change: null });
    expect(typeStats(list, "pt", "month", now)).toEqual({ score: null, count: 0, change: null });
  });
  it("기록이 없으면 평균은 null", () => expect(averageScore([])).toBeNull());
});

describe("CS 분야", () => {
  const list = [58, 64, 81].map((score, i) => ({ name: ["알고리즘", "데이터베이스", "네트워크"][i], score, previous: null, attempts: 1 }));
  const many = (count: number) => Array.from({ length: count }, (_, i) => ({ name: `분야${i}`, score: 70 + i, previous: null, attempts: i % 4 }));
  it("약한 분야를 약한 것부터 고른다", () => expect(weakest(list).map(({ name }) => name)).toEqual(["알고리즘", "데이터베이스"]));
  it("80점 이상은 약하다고 하지 않는다", () => expect(weakest([{ name: "웹", score: 80, previous: null, attempts: 1 }])).toEqual([]));
  it("레이더는 3~10개를 그대로 그린다", () => {
    expect(radarCategories(many(2))).toEqual([]);
    expect(radarCategories(many(3))).toHaveLength(3);
    expect(radarCategories(many(10))).toHaveLength(10);
  });
  it("10개를 넘으면 응시 횟수가 많은 8개를 원래 순서로 그린다", () => {
    const picked = radarCategories(many(11));
    expect(picked).toHaveLength(8);
    expect(picked.map(({ name }) => name)).toEqual(["분야1", "분야2", "분야3", "분야5", "분야6", "분야7", "분야9", "분야10"]);
  });
  it("가장 낮은 분야", () => {
    expect(lowestOf(list)?.name).toBe("알고리즘");
    expect(lowestOf([])).toBeNull();
  });
  it("평균", () => expect(averageOf(list)).toBe(68));
  it("조사를 맞춘다", () => {
    expect(withSubject("알고리즘")).toBe("알고리즘이");
    expect(withSubject("자료구조")).toBe("자료구조가");
  });
  it("첫 점은 위에 있다", () => {
    expect(radarPoint(0, 8, 100, 120)).toEqual({ x: 0, y: -120 });
    expect(radarPoint(2, 8, 50, 120)).toEqual({ x: 60, y: 0 });
  });
});

describe("계정", () => {
  it.each([
    ["지우", true],
    ["Jiwoo12", true],
    ["지", false],
    ["가".repeat(13), false],
    ["지 우", false],
    ["지우!", false],
  ])("닉네임 %s → %s", (nickname, ok) => expect(nicknameError(nickname) === undefined).toBe(ok));
  it("비밀번호 변경을 검사한다", () => {
    expect(passwordChangeErrors({ current: "answerfit1", next: "newpass12", confirm: "newpass12" })).toEqual({});
    expect(Object.keys(passwordChangeErrors({ current: "", next: "short", confirm: "" }))).toEqual(["current", "next", "confirm"]);
    expect(passwordChangeErrors({ current: "answerfit1", next: "answerfit1", confirm: "answerfit1" })).toHaveProperty("next");
    expect(passwordChangeErrors({ current: "a", next: "newpass12", confirm: "newpass13" })).toHaveProperty("confirm");
  });
});
