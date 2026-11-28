"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import { likeAction } from "@/features/question/actions";
import { cn } from "@/lib/cn";
import styles from "./LikeButton.module.css";

type Props = { id: string; liked: boolean; likes: number; /** 글자와 개수를 함께 보여 주는 큰 버튼 */ wide?: boolean };

export function LikeButton({ id, liked, likes, wide = false }: Props) {
  const [shown, setShown] = useOptimistic({ isLiked: liked, likeCount: likes });
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);

  function toggle() {
    if (busy.current) return;
    busy.current = true;
    const next = !shown.isLiked;
    startTransition(async () => {
      setShown({ isLiked: next, likeCount: Math.max(0, shown.likeCount + (next ? 1 : -1)) });
      try {
        const result = await likeAction(id, next).catch(() => ({ error: "좋아요를 바꾸지 못했어요.", like: undefined }));
        setError(result.error);
        const confirmed = result.like;
        if (confirmed) startTransition(() => setShown(confirmed));
      } finally { busy.current = false; }
    });
  }

  return (
    <span className={styles.wrap}>
      <button type="button" className={cn(wide ? styles.wide : styles.small, shown.isLiked && styles.liked)} aria-pressed={shown.isLiked} aria-label={wide ? undefined : "좋아요"} disabled={pending} onClick={toggle}>
        <Icon name="heart" size={20} filled={shown.isLiked} />
        {wide && (
          <>
            좋아요 <span className={styles.count}>{shown.likeCount}</span>
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
