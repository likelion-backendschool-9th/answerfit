"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "../Icon/Icon";
import styles from "./LikeHeart.module.css";

/** 하트 둘레로 퍼지는 점 여섯 개의 방향 */
const SPARKS = [0, 60, 120, 180, 240, 300];

/**
 * 좋아요 하트(인스타그램 참고). liked가 false에서 true로 바뀌는 순간에만 살짝 움츠렸다가 튀어나오고,
 * 둘레로 고리와 점이 퍼진다. 처음 그릴 때와 좋아요를 끌 때는 움직이지 않는다. 색은 부르는 쪽의 글자색을 따른다
 */
export function LikeHeart({ liked, size = 20 }: { liked: boolean; size?: number }) {
  const [bursts, setBursts] = useState(0);
  const [was, setWas] = useState(liked);
  if (liked !== was) {
    setWas(liked);
    if (liked) setBursts((count) => count + 1);
  }
  const popping = liked && bursts > 0;
  // key가 바뀌면 다시 그려져 애니메이션이 처음부터 돈다
  return (
    <span key={bursts} className={cn(styles.heart, popping && styles.pop)} aria-hidden="true">
      <Icon name="heart" size={size} filled={liked} />
      {popping && (
        <span className={styles.burst}>
          {SPARKS.map((angle) => (
            <span key={angle} className={styles.spark} style={{ "--angle": `${angle}deg` } as CSSProperties} />
          ))}
        </span>
      )}
    </span>
  );
}
