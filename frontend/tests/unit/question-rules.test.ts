import { describe, expect, it } from "vitest";
import { archiveHref, countByCategory, findSimilar, neighbors, PAGE_SIZE, questionError, readQuery, reportError, reportReasonType, searchQuestions, similarityKeyword } from "@/features/question/rules";
import type { ArchiveQuestion } from "@/features/question/types";

const make = (id: string, change: Partial<ArchiveQuestion> = {}): ArchiveQuestion => ({ id, kind: "cs", category: "네트워크", text: `질문 ${id}`, likes: 0, liked: false, mine: false, status: "approved", reported: false, answer: null, ...change });
const query = readQuery({});

describe("readQuery", () => {
  it("값이 없으면 기본값", () => expect(query).toEqual({ kind: "cs", category: null, keyword: "", likedOnly: false, sort: "latest", page: 1 }));
  it("잘못된 값을 무시한다", () => expect(readQuery({ kind: "x", sort: "x", page: "-1", liked: "yes", q: ["a", "b"] })).toEqual(query));
  it("검색어는 이모지도 한 글자로 세어 100 code point까지 전달한다", () => {
    expect(readQuery({ q: " \uFEFF" + "😀".repeat(101) + " \u00A0" }).keyword).toBe("😀".repeat(100));
  });
  it("주소로 만들었다가 다시 읽으면 같다", () => {
    const full = { kind: "personality" as const, category: "협업", keyword: "갈등 & 해결", likedOnly: true, sort: "likes" as const, page: 3 };
    expect(readQuery(Object.fromEntries(new URL(archiveHref(full, { page: 3 }), "http://x").searchParams))).toEqual(full);
  });
  it("조건을 바꾸면 첫 쪽으로 간다", () => expect(archiveHref({ ...query, page: 4 }, { category: "웹" })).toBe(`/archive?category=${encodeURIComponent("웹")}`));
});

describe("searchQuestions", () => {
  const list = [make("1", { likes: 3 }), make("2", { likes: 9, liked: true }), make("3", { category: "웹", text: "CORS가 무엇인가요?" }), make("4", { kind: "personality", category: "협업" })];
  const ids = (change: object) => searchQuestions(list, { ...query, ...change }).items.map(({ id }) => id);
  it("종류와 분야로 거른다", () => {
    expect(ids({})).toEqual(["1", "2", "3"]);
    expect(ids({ category: "웹" })).toEqual(["3"]);
    expect(ids({ kind: "personality" })).toEqual(["4"]);
  });
  it("띄어쓰기와 대소문자를 무시하고 찾는다", () => expect(ids({ keyword: "cors 가" })).toEqual(["3"]));
  it("좋아요한 질문만, 좋아요순", () => {
    expect(ids({ likedOnly: true })).toEqual(["2"]);
    expect(ids({ sort: "likes" })).toEqual(["2", "1", "3"]);
  });
  it("쪽을 나누고 넘친 쪽은 마지막으로 맞춘다", () => {
    const many = Array.from({ length: PAGE_SIZE + 1 }, (_, i) => make(String(i)));
    expect(searchQuestions(many, query)).toMatchObject({ total: PAGE_SIZE + 1, page: 1, pages: 2 });
    expect(searchQuestions(many, { ...query, page: 99 })).toMatchObject({ page: 2, items: [{ id: String(PAGE_SIZE) }] });
    expect(searchQuestions([], query)).toMatchObject({ total: 0, page: 1, pages: 1 });
  });
  it("받은 목록의 순서를 바꾸지 않는다", () => {
    ids({ sort: "likes" });
    expect(list.map(({ id }) => id)).toEqual(["1", "2", "3", "4"]);
  });
});

it("분야별로 세고 없는 CS 분야는 0으로 둔다", () => {
  const counts = new Map(countByCategory([make("1"), make("2"), make("3", { kind: "personality", category: "협업" })], "cs"));
  expect(counts.get("네트워크")).toBe(2);
  expect(counts.get("웹")).toBe(0);
  expect(counts.has("협업")).toBe(false);
});

it("같은 분야 안에서만 앞뒤로 간다", () => {
  const list = [make("1"), make("x", { category: "웹" }), make("2"), make("3")];
  expect(neighbors(list, list[2])).toMatchObject({ previous: { id: "1" }, next: { id: "3" } });
  expect(neighbors(list, list[0]).previous).toBeNull();
});

describe("등록과 신고", () => {
  it("질문 길이와 분야를 검사한다", () => {
    expect(questionError({ categoryId: "9007199254740993", text: "가".repeat(10) })).toBeUndefined();
    expect(questionError({ categoryId: "1", text: "가".repeat(9) })).toBeDefined();
    expect(questionError({ categoryId: "1", text: "😀".repeat(200) })).toBeUndefined();
    expect(questionError({ categoryId: "1", text: "😀".repeat(201) })).toBeDefined();
    expect(questionError({ categoryId: "", text: "가".repeat(10) })).toBeDefined();
  });
  it("정해진 사유만 받는다", () => {
    expect(reportError({ reason: "기타", detail: "" })).toBeUndefined();
    expect(reportError({ reason: "그냥", detail: "" })).toBeDefined();
    expect(reportError({ reason: "기타", detail: "가".repeat(301) })).toBeDefined();
  });
});

describe("유사 질문 검색어", () => {
  it("조사와 일반 문구를 덜어 낸 가장 긴 핵심어를 선택한다", () => {
    expect(similarityKeyword("프로세스와 스레드의 차이를 설명해 주세요.")).toBe("프로세스");
    expect(similarityKeyword("HTTP와 HTTPS의 차이는 무엇인가요?")).toBe("HTTPS");
    expect(similarityKeyword("설명해 주세요.")).toBeNull();
    expect(similarityKeyword("TCP")).toBeNull();
  });
  it("입력은 200 code point, 검색어는 100 code point로 제한한다", () => {
    expect(similarityKeyword("x".repeat(201))).toBe("x".repeat(100));
    expect(similarityKeyword("가".repeat(200))?.length).toBe(100);
  });
});

it("화면 신고 문구 5개를 서로 다른 서버 코드로 변환한다", () => {
  expect(["질문 내용이 사실과 달라요", "모범답안이 틀렸어요", "이미 있는 질문과 중복돼요", "부적절한 표현이 있어요", "기타"].map(reportReasonType))
    .toEqual(["WRONG_QUESTION", "WRONG_ANSWER", "DUPLICATE", "INAPPROPRIATE", "ETC"]);
  expect(reportReasonType("임의 사유")).toBeNull();
});

describe("findSimilar", () => {
  const list = [{ text: "L4 로드밸런싱과 L7 로드밸런싱의 차이는?" }, { text: "TCP와 UDP의 차이를 설명해 주세요." }];
  it("비슷한 질문을 찾는다", () => expect(findSimilar(list, "로드밸런서의 L4와 L7 방식은 어떻게 다른가요? 각각 어떤 상황에서 쓰는지도 설명해 주세요.")?.text).toContain("로드밸런싱"));
  it("다른 질문은 찾지 않는다", () => expect(findSimilar(list, "데드락이 생기는 네 가지 조건을 설명해 주세요.")).toBeNull());
  it("너무 짧으면 찾지 않는다", () => expect(findSimilar(list, "TCP")).toBeNull());
});
