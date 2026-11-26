"use client";

import { useState, useTransition, ViewTransition, type CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import { followUpOf, itemNumber, type ResultItem } from "@/features/interview/result";
import { likeAnswerAction } from "@/features/question/actions";
import { cn } from "@/lib/cn";
import { FeedbackCard } from "../FeedbackCard/FeedbackCard";
import { ScoreCard } from "../ScoreCard/ScoreCard";
import { SectionLabel } from "../SectionLabel/SectionLabel";
import { VideoPlayer } from "../VideoPlayer/VideoPlayer";
import styles from "./QuestionDetail.module.css";

/** 뒤 번호로 가면 왼쪽으로, 앞 번호로 가면 오른쪽으로 넘긴다. 애니메이션은 globals.css의 result-next·result-previous */
const SLIDE = { "result-next": "result-next", "result-previous": "result-previous", default: "none" };

/** 하트 둘레로 퍼지는 점 여섯 개의 방향 */
const SPARKS = [0, 60, 120, 180, 240, 300];

type Props = { interviewId: string; items: ResultItem[]; item: ResultItem; liked: boolean; onSelect: (id: string) => void };

export function QuestionDetail({ interviewId, items, item, liked: initialLiked, onSelect }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [bursts, setBursts] = useState(0);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const followUp = followUpOf(items, item);
  const followUpIndex = followUp ? items.indexOf(followUp) : -1;

  function toggleLike() {
    const next = !liked;
    setLiked(next);
    // 좋아요를 누를 때만 터뜨린다. 숫자가 바뀌면 하트가 다시 그려져 애니메이션이 처음부터 돈다
    if (next) setBursts((count) => count + 1);
    setError("");
    startTransition(async () => {
      const result = await likeAnswerAction(`${interviewId}/${item.id}`, next).catch(() => ({ error: "좋아요를 바꾸지 못했어요." }));
      if (result.error) {
        setLiked(!next);
        setError(result.error);
      }
    });
  }

  return (
    <article className={styles.card} aria-labelledby="detail-title">
      <div className={styles.head}>
        <SectionLabel number="03" id="detail-title">
          질문별 상세 내용
        </SectionLabel>
        <button type="button" className={styles.like} aria-pressed={liked} disabled={pending} onClick={toggleLike}>
          <span key={bursts} className={cn(styles.heart, liked && bursts > 0 && styles.pop)} aria-hidden="true">
            <Icon name="heart" size={16} filled={liked} />
            {liked && bursts > 0 && (
              <span className={styles.burst}>
                {SPARKS.map((angle) => (
                  <span key={angle} className={styles.spark} style={{ "--angle": `${angle}deg` } as CSSProperties} />
                ))}
              </span>
            )}
          </span>
          좋아요
        </button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {/* 흰 카드 틀과 제목 줄은 그대로 두고 안의 내용만 넘긴다. 문항이 바뀌면 이 컴포넌트가 새로 그려져 이전·새 내용이 한 쌍이 된다 */}
      <ViewTransition name="result-detail" share={SLIDE} default="none">
        <div className={styles.grid}>
          <div className={styles.side}>
            <VideoPlayer interviewId={interviewId} item={item} />
            <ScoreCard item={item} />
          </div>
          <div className={styles.main}>
            <h3 className={styles.question}>{item.text}</h3>
            <section aria-labelledby="answer-title">
              <h4 id="answer-title" className={styles.heading}>
                <Icon name="mic" size={18} /> 내 답변
              </h4>
              <p className={styles.transcript}>{item.transcript}</p>
              <p className={styles.answerNote}>음성 인식 결과 · 일부 단어가 다를 수 있어요</p>
            </section>
            <FeedbackCard item={item} />
            {followUp && (
              <button type="button" className={styles.followUp} onClick={() => onSelect(followUp.id)}>
                <span className={styles.followIcon}>
                  <Icon name="arrow" size={18} />
                </span>
                <span className={styles.followText}>
                  <span className={styles.followLabel}>이 질문에서 이어진 꼬리 질문</span>
                  <span className={styles.followTitle}>
                    <span className={styles.followNumber}>{itemNumber(followUpIndex)}</span> {followUp.text}
                  </span>
                </span>
                <span className={styles.followScore}>
                  <strong>{followUp.score}</strong> / 100
                </span>
                <span className={styles.followLink}>
                  꼬리 질문 보기 <Icon name="chevron" size={16} />
                </span>
              </button>
            )}
          </div>
        </div>
      </ViewTransition>
    </article>
  );
}
