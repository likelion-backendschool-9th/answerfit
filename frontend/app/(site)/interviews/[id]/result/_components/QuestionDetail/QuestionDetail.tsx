"use client";

import { useState, useTransition, ViewTransition } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import { LikeHeart } from "@/components/ui/LikeHeart/LikeHeart";
import { followUpOf, itemNumber, type ResultItem } from "@/features/interview/result";
import { likeAnswerAction } from "@/features/question/actions";
import { FeedbackCard } from "../FeedbackCard/FeedbackCard";
import { ScoreCard } from "../ScoreCard/ScoreCard";
import { SectionLabel } from "../SectionLabel/SectionLabel";
import { VideoPlayer } from "../VideoPlayer/VideoPlayer";
import styles from "./QuestionDetail.module.css";

/** 뒤 번호로 가면 왼쪽으로, 앞 번호로 가면 오른쪽으로 넘긴다. 애니메이션은 globals.css의 result-next·result-previous */
const SLIDE = { "result-next": "result-next", "result-previous": "result-previous", default: "none" };

type Props = { interviewId: string; items: ResultItem[]; item: ResultItem; liked: boolean; onSelect: (id: string) => void };

export function QuestionDetail({ interviewId, items, item, liked: initialLiked, onSelect }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const followUp = followUpOf(items, item);
  const followUpIndex = followUp ? items.indexOf(followUp) : -1;

  function toggleLike() {
    const next = !liked;
    setLiked(next);
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
          <LikeHeart liked={liked} size={16} />
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
