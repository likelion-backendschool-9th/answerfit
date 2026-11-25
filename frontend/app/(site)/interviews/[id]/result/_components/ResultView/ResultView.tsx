"use client";

import { useRef, useState } from "react";
import { PATHS } from "@/app/_lib/paths";
import { ButtonLink } from "@/components/ui/Button/Button";
import { mainIdOf, mainItems, type InterviewResult } from "@/features/interview/result";
import { QuestionDetail } from "../QuestionDetail/QuestionDetail";
import { QuestionTabs } from "../QuestionTabs/QuestionTabs";
import { ResultHeader } from "../ResultHeader/ResultHeader";
import { SummaryCards } from "../SummaryCards/SummaryCards";
import styles from "./ResultView.module.css";

export function ResultView({ result, today }: { result: InterviewResult; today: string }) {
  const { items } = result;
  const [selectedId, setSelectedId] = useState(items[0].id);
  const detail = useRef<HTMLDivElement>(null);
  const selected = items.find(({ id }) => id === selectedId) ?? items[0];

  /** 위쪽 요약에서 고르면 상세까지 내려 준다 */
  function showDetail(id: string) {
    setSelectedId(id);
    detail.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    detail.current?.focus({ preventScroll: true });
  }

  const again = new URLSearchParams({ mode: result.mode, type: result.type, count: String(mainItems(items).length) });
  if (result.groupId) again.set("group", result.groupId);

  return (
    <div className={styles.content}>
      <ResultHeader result={result} today={today} />
      <SummaryCards items={items} onSelect={showDetail} />
      <section className={styles.section} aria-labelledby="detail-title" ref={detail} tabIndex={-1}>
        <QuestionTabs items={mainItems(items)} currentId={mainIdOf(selected)} onSelect={setSelectedId} />
        <QuestionDetail key={selected.id} interviewId={result.id} item={selected} />
      </section>
      <div className={styles.buttons}>
        <ButtonLink href={PATHS.my} variant="outline" className={styles.my}>
          마이페이지로 가기
        </ButtonLink>
        {(result.type === "experience" || result.type === "cs") && (
          <ButtonLink href={`${PATHS.newInterview}?${again}`} className={styles.again}>
            {result.type === "experience" ? "같은 서류로 다시 연습하기" : "같은 설정으로 다시 연습하기"}
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
