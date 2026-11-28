import { describe, expect, it } from "vitest";
import { customTags, emptyExperience, emptyStory, filterExperiences, formatPeriod, parsePasted, periodError, titleError, toExperience } from "@/features/experience/rules";
import type { Experience, Story } from "@/features/experience/types";

const story = (id: string, patch: Partial<Story> = {}): Story => ({ ...emptyStory(id), ...patch });
const item = (patch: Partial<Experience>): Experience => ({ ...emptyExperience("a", "a-1"), ...patch });

describe("기간", () => {
  it("종료일이 없으면 진행 중, 시작일이 없으면 표시하지 않는다", () => {
    expect(formatPeriod({ startedOn: "2025-03-04", endedOn: "2025-08-30" })).toBe("2025.03.04 ~ 2025.08.30");
    expect(formatPeriod({ startedOn: "2025-03-04", endedOn: null })).toBe("2025.03.04 ~ 진행 중");
    expect(formatPeriod({ startedOn: null, endedOn: null })).toBeNull();
  });

  it("종료일은 시작일과 같은 날까지 허용하고, 앞서면 막는다", () => {
    expect(periodError("2025-03-04", "2025-03-04")).toBeNull();
    expect(periodError("2025-03-04", "2025-03-03")).toBe("종료일은 시작일 이후여야 해요.");
    expect(periodError(null, "2025-03-03")).toBe("시작일을 먼저 골라 주세요.");
  });
});

describe("제목", () => {
  it("공백만 있거나 100자를 넘으면 막는다", () => {
    expect(titleError("  ")).not.toBeNull();
    expect(titleError("가".repeat(100))).toBeNull();
    expect(titleError("가".repeat(101))).not.toBeNull();
  });
});

describe("서버 입구 검사", () => {
  it("형식이 틀린 값은 받지 않는다", () => {
    expect(toExperience(null)).toBeNull();
    expect(toExperience(item({ type: "WRONG" as never }))).toBeNull();
    expect(toExperience(item({ startedOn: "2025-13-40" }))).toBeNull();
    expect(toExperience(item({ stories: [] }))).toBeNull();
    expect(toExperience(item({ stories: [story("s", { tags: [1 as never] })] }))).toBeNull();
  });

  it("역량 행 아이디가 겹치면 받지 않는다", () => {
    expect(toExperience(item({ stories: [story("s"), story("s")] }))).toBeNull();
  });

  it("글자를 다듬고 역량 행마다 겹치는 태그를 하나로 만든다", () => {
    const result = toExperience(item({ title: " 제목 ", stories: [story("s1", { tags: ["협업", " 협업 ", ""] }), story("s2", { tags: ["분석력"] })] }));
    expect(result).toMatchObject({ title: "제목", stories: [{ id: "s1", tags: ["협업"] }, { id: "s2", tags: ["분석력"] }] });
  });
});

describe("필터", () => {
  const contest = item({ id: "c", title: "공모전", type: "CONTEST", stories: [story("c1", { tags: ["분석력"], content: "회귀 분석" }), story("c2", { tags: ["협업"], content: "역할 분담" })] });
  const club = item({ id: "s", title: "스터디", type: "CLUB", stories: [story("s1", { tags: ["협업"], content: "분석 공부" })] });

  it("태그를 고르면 그 태그의 역량 행만 남기고, 행이 없는 경험은 뺀다", () => {
    const shown = filterExperiences([contest, club], { type: null, tag: "분석력", keyword: "" });
    expect(shown.map(({ id, stories }) => [id, stories.map((s) => s.id)])).toEqual([["c", ["c1"]]]);
  });

  it("검색어는 역량 행의 활동 내용에서도 찾고, 구분과 함께 건다", () => {
    expect(filterExperiences([contest, club], { type: null, tag: "", keyword: "분석" }).map(({ id }) => id)).toEqual(["c", "s"]);
    expect(filterExperiences([contest, club], { type: "CLUB", tag: "", keyword: "분석" }).map(({ id }) => id)).toEqual(["s"]);
  });

  it("거른 결과는 원본을 바꾸지 않는다(저장할 때는 원본을 쓴다)", () => {
    filterExperiences([contest], { type: null, tag: "협업", keyword: "" });
    expect(contest.stories).toHaveLength(2);
  });

  it("내 태그는 기본 태그를 빼고 모든 역량 행에서 모은다", () => {
    expect(customTags([item({ stories: [story("1", { tags: ["책임감", "꾸준함"] }), story("2", { tags: ["기록"] })] })])).toEqual(["기록", "꾸준함"]);
  });
});

describe("붙여넣기", () => {
  let n = 0;
  const id = () => `id-${++n}`;

  it("머리글을 건너뛰고 열 순서대로 읽는다", () => {
    const text = "제목\t구분\t기간\n결제 서버\t인턴\t2025.09.01 ~ 진행 중\t다라페이\t서버\t책임감, 전문성\t배치를 나눴다\t실패율 감소";
    const { items, skipped } = parsePasted(text, id);
    expect(skipped).toBe(0);
    expect(items[0]).toMatchObject({ title: "결제 서버", type: "INTERN", startedOn: "2025-09-01", endedOn: null, organization: "다라페이", role: "서버" });
    expect(items[0].stories).toMatchObject([{ tags: ["책임감", "전문성"], content: "배치를 나눴다", result: "실패율 감소" }]);
  });

  it("병합한 셀처럼 제목이 빈 줄은 바로 위 경험의 역량 행이 된다", () => {
    const text = "공모전\t공모전·대회\t\t\t\t분석력\t회귀 분석\t혼잡 구간 도출\n\t\t\t\t\t협업\t역할 분담\t장려상";
    const { items } = parsePasted(text, id);
    expect(items).toHaveLength(1);
    expect(items[0].stories.map(({ tags, result }) => [tags, result])).toEqual([
      [["분석력"], "혼잡 구간 도출"],
      [["협업"], "장려상"],
    ]);
  });

  it("붙일 경험이 없는 빈 제목 줄은 건너뛴다", () => {
    expect(parsePasted("\t\t\t\t\t협업\t내용", id)).toMatchObject({ items: [], skipped: 1 });
  });

  it("거꾸로 된 기간이나 모르는 구분은 비운다", () => {
    const [row] = parsePasted("대회\t모르는 구분\t2025-08-30 ~ 2025-03-04", id).items;
    expect(row).toMatchObject({ type: null, startedOn: null, endedOn: null });
  });
});
