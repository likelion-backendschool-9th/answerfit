import { describe, expect, it } from "vitest";
import { emptyExperience, filterExperiences, formatPeriod, myTags, parsePasted, periodError, titleError, toExperience } from "@/features/experience/rules";

const item = (patch: Partial<ReturnType<typeof emptyExperience>>) => ({ ...emptyExperience("a"), ...patch });

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
    expect(toExperience({ ...emptyExperience("a"), type: "WRONG" })).toBeNull();
    expect(toExperience({ ...emptyExperience("a"), startedOn: "2025-13-40" })).toBeNull();
    expect(toExperience({ ...emptyExperience("a"), tags: [1] })).toBeNull();
  });

  it("글자를 다듬고 겹치는 태그를 하나로 만든다", () => {
    expect(toExperience({ ...emptyExperience("a"), title: " 제목 ", tags: ["협업", " 협업 ", ""] })).toMatchObject({ title: "제목", tags: ["협업"] });
  });
});

describe("필터", () => {
  const items = [item({ id: "1", title: "결제 서버", type: "INTERN", tags: ["책임감"] }), item({ id: "2", title: "스터디", type: "CLUB", content: "결제 모듈 공부" })];

  it("구분·태그·검색어를 함께 건다", () => {
    expect(filterExperiences(items, { type: null, tag: "", keyword: "결제" }).map(({ id }) => id)).toEqual(["1", "2"]);
    expect(filterExperiences(items, { type: "CLUB", tag: "", keyword: "결제" }).map(({ id }) => id)).toEqual(["2"]);
    expect(filterExperiences(items, { type: null, tag: "책임감", keyword: "" }).map(({ id }) => id)).toEqual(["1"]);
  });

  it("내 태그는 기본 태그를 빼고 모은다", () => {
    expect(myTags([{ tags: ["책임감", "꾸준함"] }, { tags: ["꾸준함", "기록"] }])).toEqual(["기록", "꾸준함"]);
  });
});

describe("붙여넣기", () => {
  let n = 0;
  const id = () => `id-${++n}`;

  it("머리글을 건너뛰고 열 순서대로 읽는다", () => {
    const text = "제목\t구분\t기간\n결제 서버\t인턴\t2025.09.01 ~ 진행 중\t다라페이\t서버\t책임감, 전문성\t실패율 감소\n\t\t\n이름 없음은 제목이 없다";
    const { items, skipped } = parsePasted(`${text}\n\t프로젝트`, id);
    expect(skipped).toBe(1);
    expect(items[0]).toMatchObject({ title: "결제 서버", type: "INTERN", startedOn: "2025-09-01", endedOn: null, organization: "다라페이", role: "서버", tags: ["책임감", "전문성"], result: "실패율 감소" });
    expect(items[1]).toMatchObject({ title: "이름 없음은 제목이 없다", type: null });
  });

  it("거꾸로 된 기간이나 모르는 구분은 비운다", () => {
    const [row] = parsePasted("대회\t모르는 구분\t2025-08-30 ~ 2025-03-04", id).items;
    expect(row).toMatchObject({ type: null, startedOn: null, endedOn: null });
  });
});
