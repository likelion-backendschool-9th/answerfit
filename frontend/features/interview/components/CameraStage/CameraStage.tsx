"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./CameraStage.module.css";

type Props = { stream: MediaStream | null; dimmed?: boolean; className?: string; children?: ReactNode };

/** 내 카메라 화면. 카메라가 꺼져 있으면 사람 모양을 그린다 */
export function CameraStage({ stream, dimmed, className, children }: Props) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (video.current) video.current.srcObject = stream;
  }, [stream]);

  return (
    <div className={cn(styles.stage, dimmed && styles.dimmed, className)}>
      <div className={styles.picture}>
        {stream ? <video ref={video} className={styles.video} autoPlay muted playsInline aria-label="내 카메라 화면" /> : <Silhouette />}
      </div>
      {children}
    </div>
  );
}

function Silhouette() {
  return (
    <svg className={styles.silhouette} viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path className={styles.suit} d="M500 1080C520 860 660 740 880 704l80 36 80-36c220 36 360 156 380 376Z" />
      <path className={styles.neck} d="M890 560h140v95c0 36-30 65-65 65h-10c-35 0-65-29-65-65Z" />
      <path className={styles.collar} d="m880 700 18-9 62 69 62-69 18 9-62 122h-36Z" />
      <path className={styles.tie} d="M945 770h30l15 230-30 40-30-40Z" />
      <ellipse className={styles.head} cx="960" cy="440" rx="150" ry="190" />
    </svg>
  );
}
