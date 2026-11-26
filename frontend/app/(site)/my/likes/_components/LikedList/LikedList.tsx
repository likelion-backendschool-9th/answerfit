"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { likeAction, likeAnswerAction } from "@/features/question/actions";
import styles from "./LikedList.module.css";

const STEP = 6;

export type LikedItem = { id: string; source: "interview" | "archive"; category: string; text: string; meta: string; href: string };

export function LikedList({ items }: { items: LikedItem[] }) {
  const [limit, setLimit] = useState(STEP);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function unlike({ id, source }: LikedItem) {
    startTransition(async () => {
      const result = await (source === "interview" ? likeAnswerAction(id, false) : likeAction(id, false)).catch(() => ({ error: "좋아요를 바꾸지 못했어요." }));
      setError(result.error);
    });
  }

  if (items.length === 0) return <p className={styles.empty}>좋아요한 질문이 없어요.</p>;
  return (
    <>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <ul className={styles.list} aria-busy={pending}>
        {items.slice(0, limit).map((item) => (
          <li key={`${item.source}-${item.id}`} className={styles.row}>
            <div className={styles.text}>
              <p className={styles.category}>{item.category}</p>
              <Link href={item.href} className={styles.question}>
                {item.text}
              </Link>
              <p className={styles.meta}>{item.meta}</p>
            </div>
            <button type="button" className={styles.heart} aria-label="좋아요 취소" disabled={pending} onClick={() => unlike(item)}>
              <Icon name="heart" size={20} filled />
            </button>
          </li>
        ))}
      </ul>
      {items.length > limit && (
        <Button variant="outline" className={styles.more} onClick={() => setLimit(limit + STEP)}>
          더 보기 ({limit} / {items.length})
        </Button>
      )}
    </>
  );
}
