"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import { likeAction } from "@/features/question/actions";
import { cn } from "@/lib/cn";
import styles from "./LikeButton.module.css";

type Props = { id: string; liked: boolean; likes: number; /** 글자와 개수를 함께 보여 주는 큰 버튼 */ wide?: boolean };

export function LikeButton({ id, liked, likes, wide = false }: Props) {
  const [shown, setShown] = useOptimistic(liked);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const count = likes + (shown === liked ? 0 : shown ? 1 : -1);

  function toggle() {
    startTransition(async () => {
      setShown(!shown);
      const result = await likeAction(id, !shown).catch(() => ({ error: "좋아요를 바꾸지 못했어요." }));
      setError(result.error);
    });
  }

  return (
    <span className={styles.wrap}>
      <button type="button" className={cn(wide ? styles.wide : styles.small, shown && styles.liked)} aria-pressed={shown} aria-label={wide ? undefined : "좋아요"} disabled={pending} onClick={toggle}>
        <Icon name="heart" size={20} filled={shown} />
        {wide && (
          <>
            좋아요 <span className={styles.count}>{count}</span>
          </>
        )}
      </button>
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
