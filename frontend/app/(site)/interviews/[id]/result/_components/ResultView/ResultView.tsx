"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import { ButtonLink } from "@/components/ui/Button/Button";
import { mainItems, type InterviewResult } from "@/features/interview/result";
import { needsDocuments } from "@/features/interview/setup";
import { cn } from "@/lib/cn";
import { GlanceCards } from "../GlanceCards/GlanceCards";
import { QuestionDetail } from "../QuestionDetail/QuestionDetail";
import { QuestionPager } from "../QuestionPager/QuestionPager";
import { ResultHeader } from "../ResultHeader/ResultHeader";
import styles from "./ResultView.module.css";

type Props = { result: InterviewResult; today: string; likedIds: string[] };

export function ResultView({ result, today, likedIds }: Props) {
  const { items } = result;
  const [selectedId, setSelectedId] = useState(items[0].id);
  /** 상세가 들어오는 방향. 뒤 번호로 가면 오른쪽에서, 앞 번호로 가면 왼쪽에서 */
  const [direction, setDirection] = useState<"next" | "previous">("next");
  const detail = useRef<HTMLDivElement>(null);
  const selected = items.find(({ id }) => id === selectedId) ?? items[0];
  const indexOf = (id: string) => items.findIndex((item) => item.id === id);

  function select(id: string) {
    if (id === selected.id) return;
    setDirection(indexOf(id) > indexOf(selected.id) ? "next" : "previous");
    setSelectedId(id);
  }

  /** 꼬리 질문 카드에서 고르면 상세 맨 위로 올려 준다 */
  function showDetail(id: string) {
    select(id);
    detail.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const again = new URLSearchParams({ mode: result.mode, type: result.type, count: String(mainItems(items).length) });
  if (result.groupId) again.set("group", result.groupId);

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <nav aria-label="현재 위치" className={styles.crumb}>
          <Link href={PATHS.newInterview}>모의 면접</Link> › <span aria-current="page">면접 결과</span>
        </nav>
        <section className={styles.card} aria-label="면접 정보와 요약">
          <ResultHeader result={result} today={today} />
          <GlanceCards items={items} />
        </section>
        <div className={styles.detail} ref={detail}>
          <QuestionPager items={items} currentId={selected.id} onSelect={select} />
          <div className={styles.clip}>
            <div key={selected.id} className={cn(styles.slide, styles[direction])}>
              <QuestionDetail interviewId={result.id} items={items} item={selected} liked={likedIds.includes(`${result.id}/${selected.id}`)} onSelect={showDetail} />
            </div>
          </div>
        </div>
        <div className={styles.buttons}>
          <ButtonLink href={PATHS.my} variant="outline" className={styles.my}>
            마이페이지로 가기
          </ButtonLink>
          <ButtonLink href={`${PATHS.newInterview}?${again}`} className={styles.again}>
            {needsDocuments(result.type) ? "같은 서류로 다시 연습하기" : "같은 설정으로 다시 연습하기"}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
