import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ModelAnswer } from "@/app/(site)/archive/[id]/_components/ModelAnswer/ModelAnswer";
import { PendingCard } from "@/app/(site)/archive/[id]/_components/PendingCard/PendingCard";

describe("질문 상세 상태 안내", () => {
  it("반려 사유와 수정 후 재제출 안내를 승인 대기와 구분한다", () => {
    const html = renderToStaticMarkup(createElement(PendingCard, { rejected: true, reason: "질문 범위를 구체적으로 작성해 주세요." }));
    expect(html).toContain("질문이 반려되었어요");
    expect(html).toContain("질문 범위를 구체적으로 작성해 주세요.");
    expect(html).toContain("수정 후 재제출");
    expect(html).not.toContain("관리자 확인을 기다리고 있어요");
  });

  it("대기 안내는 승인 즉시 공개되는 순서를 설명한다", () => {
    const html = renderToStaticMarkup(createElement(PendingCard));
    expect(html).toContain("아카이브에 바로 공개");
    expect(html.indexOf("아카이브 공개")).toBeLessThan(html.indexOf("AI 모범답안"));
  });

  it.each([
    ["PENDING", "모범답안을 생성하고 있어요"],
    ["FAILED", "모범답안 생성에 실패했어요"],
    ["DONE", "등록된 모범답안이 없어요"],
    [null, "등록된 모범답안이 없어요"],
  ] as const)("답안이 없을 때 %s 상태를 구분한다", (answerStatus, message) => {
    const html = renderToStaticMarkup(createElement(ModelAnswer, { answer: null, pending: false, answerStatus }));
    expect(html).toContain(message);
    if (answerStatus !== "PENDING") expect(html).not.toContain("모범답안을 생성하고 있어요");
  });

  it("답안이 있어도 키워드가 없으면 비어 있는 이유를 표시한다", () => {
    const html = renderToStaticMarkup(createElement(ModelAnswer, {
      answer: { summary: "답안 첫 문단", body: "나머지 설명", keywords: [] }, pending: false, answerStatus: null,
    }));
    expect(html).toContain("답안 첫 문단");
    expect(html).toContain("나머지 설명");
    expect(html).toContain("등록된 핵심 키워드가 없어요");
  });
});
