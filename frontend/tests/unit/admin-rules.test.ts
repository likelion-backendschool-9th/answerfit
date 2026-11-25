import { describe, expect, it } from "vitest";
import { pageNumbers } from "@/components/ui/Pagination/pages";
import { bankHref, cleanDraft, countReasons, dayLabel, draftErrors, isSuspended, membersHref, pickReport, readBankQuery, readMemberQuery, readTab, releaseOn, reportHref, searchBank, searchMembers, seenLabel, shortTime, suspendedLabel, suspendError, tabHref } from "@/features/admin/rules";
import type { AdminMember, BankQuestion, QuestionDraft, ReportedQuestion, ReportStatus } from "@/features/admin/types";

const q = (id: string, change: Partial<BankQuestion> = {}): BankQuestion => ({ id, code: `Q-${id}`, kind: "cs", category: "네트워크", text: `질문 ${id}`, answerState: "ready", hidden: false, source: null, likes: 0, updatedOn: "2026-11-01", answer: "", keywords: [], ...change });
const m = (id: string, change: Partial<AdminMember> = {}): AdminMember => ({ id, nickname: id, email: `${id}@example.com`, provider: "local", joinedOn: "2026-11-01", lastSeenOn: "2026-11-01", interviews: 0, questions: 0, suspension: null, ...change });

describe("문제 은행", () => {
  const list = [q("0412"), q("0388", { kind: "personality", category: "협업", text: "의견이 갈렸을 때" }), q("0391", { category: "운영체제" })];
  const ids = (params: Record<string, string>) => searchBank(list, readBankQuery(params)).items.map(({ id }) => id);
  it("분류와 카테고리로 거른다", () => {
    expect(ids({ kind: "personality" })).toEqual(["0388"]);
    expect(ids({ category: "운영체제" })).toEqual(["0391"]);
  });
  it("내용과 ID로 찾는다", () => {
    expect(ids({ q: "의견" })).toEqual(["0388"]);
    expect(ids({ q: "q-0412" })).toEqual(["0412"]);
  });
  it("보여 주는 범위", () => {
    const many = Array.from({ length: 12 }, (_, i) => q(String(i)));
    expect(searchBank(many, readBankQuery({ page: "2" }))).toMatchObject({ from: 11, to: 12, total: 12, pages: 2 });
    expect(searchBank([], readBankQuery({}))).toMatchObject({ from: 0, to: 0, pages: 1 });
  });
  it("주소를 다시 읽으면 같다", () => {
    const query = readBankQuery({ kind: "cs", category: "웹", q: "a&b", page: "3" });
    expect(readBankQuery(Object.fromEntries(new URL(bankHref(query, { page: 3 }), "http://x").searchParams))).toEqual(query);
    expect(readTab({ tab: "reports" })).toBe("reports");
    expect(readTab({ tab: "x" })).toBe("bank");
  });
});

describe("질문 편집", () => {
  const draft: QuestionDraft = { kind: "cs", category: "웹", text: "CORS가 무엇인가요?", answer: "답", keywords: ["a"] };
  it("맞으면 오류가 없다", () => expect(draftErrors(draft)).toEqual({}));
  it("분류에 없는 카테고리를 막는다", () => {
    expect(draftErrors({ ...draft, category: "협업" })).toHaveProperty("category");
    expect(draftErrors({ ...draft, kind: "personality", category: "협업" })).toEqual({});
  });
  it("길이를 검사한다", () => {
    expect(draftErrors({ ...draft, text: "짧다" })).toHaveProperty("text");
    expect(draftErrors({ ...draft, answer: "" })).toHaveProperty("answer");
    expect(draftErrors({ ...draft, answer: "가".repeat(2001) })).toHaveProperty("answer");
    expect(draftErrors({ ...draft, keywords: Array(11).fill("a") })).toHaveProperty("keywords");
  });
  it("빈 키워드와 중복을 뺀다", () => expect(cleanDraft({ ...draft, text: " 질문 ", keywords: ["a", " a ", "", "b"] })).toMatchObject({ text: "질문", keywords: ["a", "b"] }));
});

it("신고 사유를 많은 것부터 센다", () => {
  const entry = (reason: string) => ({ reason, detail: "", at: "" });
  expect(countReasons([entry("기타"), entry("모범답안이 틀렸어요"), entry("모범답안이 틀렸어요")])).toEqual([
    { reason: "모범답안이 틀렸어요", count: 2 },
    { reason: "기타", count: 1 },
  ]);
});

describe("회원", () => {
  const list = [m("a", { joinedOn: "2026-09-01", interviews: 9 }), m("b", { provider: "github", lastSeenOn: "2026-11-25" }), m("c", { suspension: { releaseOn: null, reason: "" } })];
  const ids = (params: Record<string, string>) => searchMembers(list, readMemberQuery(params)).items.map(({ id }) => id);
  it("상태, 가입 방식, 이름으로 거른다", () => {
    expect(ids({ status: "suspended" })).toEqual(["c"]);
    expect(ids({ status: "active" })).toEqual(["b", "a"]);
    expect(ids({ provider: "github" })).toEqual(["b"]);
    expect(ids({ q: "A@EXAMPLE" })).toEqual(["a"]);
  });
  it("정렬한다", () => {
    expect(ids({ sort: "interviews" })[0]).toBe("a");
    expect(ids({ sort: "seen" })[0]).toBe("b");
  });
  it("주소를 다시 읽으면 같다", () => {
    const query = readMemberQuery({ status: "active", provider: "kakao", q: "지우", sort: "seen", page: "2" });
    expect(readMemberQuery(Object.fromEntries(new URL(membersHref(query, { page: 2 }), "http://x").searchParams))).toEqual(query);
    expect(readMemberQuery({ provider: "toString" }).provider).toBeNull();
  });
});

describe("이용 정지", () => {
  it("풀리는 날을 계산한다", () => {
    expect(releaseOn("week", "2026-11-25")).toBe("2026-12-02");
    expect(releaseOn("month", "2026-11-25")).toBe("2026-12-25");
    expect(releaseOn("forever", "2026-11-25")).toBeNull();
  });
  it("풀리는 날 0시부터 정지가 아니다", () => {
    expect(isSuspended("2026-12-02", "2026-12-01")).toBe(true);
    expect(isSuspended("2026-12-02", "2026-12-02")).toBe(false);
    expect(isSuspended(null, "2030-01-01")).toBe(true);
  });
  it("표시 문구", () => {
    expect(suspendedLabel("2026-12-02")).toBe("정지 · 12.01까지");
    expect(suspendedLabel(null)).toBe("정지 · 영구");
    expect(dayLabel("2026-12-02")).toBe("2026.12.02 (수)");
    expect(seenLabel("2026-11-25", "2026-11-25")).toBe("오늘");
    expect(seenLabel("2026-11-24", "2026-11-25")).toBe("어제");
    expect(seenLabel("2026-11-20", "2026-11-25")).toBe("11.20");
  });
  it("기간과 사유가 필요하다", () => {
    expect(suspendError("week", "사유")).toBeUndefined();
    expect(suspendError("day", "사유")).toBeDefined();
    expect(suspendError("week", "")).toBeDefined();
    expect(suspendError("week", "가".repeat(301))).toBeDefined();
  });
});

describe("쪽 번호", () => {
  it.each([
    [1, 3, [1, 2, 3]],
    [1, 42, [1, 2, 3, null, 42]],
    [20, 42, [1, null, 19, 20, 21, null, 42]],
    [42, 42, [1, null, 40, 41, 42]],
    [3, 42, [1, 2, 3, 4, null, 42]],
  ])("%s / %s", (page, pages, expected) => expect(pageNumbers(page, pages)).toEqual(expected));
});

describe("신고 패널", () => {
  const r = (id: string, status: ReportStatus): ReportedQuestion => ({ id, code: id, text: id, status, entries: [] });
  const list = [r("a", "closed"), r("b", "waiting"), r("c", "hidden")];
  it("고른 신고를 보여 준다", () => expect(pickReport(list, "c")?.id).toBe("c"));
  it("고르지 않았거나 없는 신고면 처리할 것부터 보여 준다", () => {
    expect(pickReport(list, undefined)?.id).toBe("b");
    expect(pickReport(list, "gone")?.id).toBe("b");
    expect(pickReport([r("a", "closed")], undefined)?.id).toBe("a");
    expect(pickReport([], undefined)).toBeNull();
  });
  it("닫으면 보여 주지 않는다", () => expect(pickReport(list, new URL(reportHref(null), "http://x").searchParams.get("report")!)).toBeNull());
});

it("탭 주소를 다시 읽으면 같다", () => {
  for (const tab of ["bank", "pending", "reports"] as const) expect(readTab(Object.fromEntries(new URL(tabHref(tab), "http://x").searchParams))).toBe(tab);
});

it("짧은 시각은 서울 기준이다", () => expect(shortTime("2026-11-24T14:52:00Z")).toBe("11.24 23:52"));
