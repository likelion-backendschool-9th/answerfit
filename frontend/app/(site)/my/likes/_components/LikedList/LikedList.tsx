"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button/Button";
import { LikeHeart } from "@/components/ui/LikeHeart/LikeHeart";
import { likeAction, likeAnswerAction } from "@/features/question/actions";
import { cn } from "@/lib/cn";
import styles from "./LikedList.module.css";

const STEP = 6;

export type LikedItem = { id: string; source: "interview" | "archive"; category: string; text: string; meta: string; href: string };

const keyOf = ({ source, id }: LikedItem) => `${source}-${id}`;

export function LikedList({ items }: { items: LikedItem[] }) {
  // 실수로 누른 것을 되돌릴 수 있게, 좋아요를 풀어도 새로고침하기 전까지는 처음 받은 목록을 그대로 보여 준다
  const [shown] = useState(items);
  const [unliked, setUnliked] = useState<ReadonlySet<string>>(new Set());
  const [limit, setLimit] = useState(STEP);
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();

  function mark(key: string, off: boolean) {
    setUnliked((previous) => {
      const next = new Set(previous);
      if (off) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function toggle(item: LikedItem) {
    const key = keyOf(item);
    const liked = unliked.has(key);
    mark(key, !liked);
    setError(undefined);
    startTransition(async () => {
      const result = await (item.source === "interview" ? likeAnswerAction(item.id, liked) : likeAction(item.id, liked)).catch(() => ({ error: "좋아요를 바꾸지 못했어요." }));
      if (result.error) {
        mark(key, liked);
        setError(result.error);
      }
    });
  }

  if (shown.length === 0) return <p className={styles.empty}>좋아요한 질문이 없어요.</p>;
  return (
    <>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <ul className={styles.list}>
        {shown.slice(0, limit).map((item) => {
          const off = unliked.has(keyOf(item));
          return (
            <li key={keyOf(item)} className={cn(styles.row, off && styles.off)}>
              <div className={styles.text}>
                <p className={styles.category}>{item.category}</p>
                <Link href={item.href} className={styles.question}>
                  {item.text}
                </Link>
                <p className={styles.meta}>{off ? "좋아요를 해제했어요 · 새로고침하면 목록에서 빠져요" : item.meta}</p>
              </div>
              <button type="button" className={styles.heart} aria-pressed={!off} aria-label={off ? "다시 좋아요" : "좋아요 취소"} onClick={() => toggle(item)}>
                <LikeHeart liked={!off} />
              </button>
            </li>
          );
        })}
      </ul>
      {shown.length > limit && (
        <Button variant="outline" className={styles.more} onClick={() => setLimit(limit + STEP)}>
          더 보기 ({limit} / {shown.length})
        </Button>
      )}
    </>
  );
}
