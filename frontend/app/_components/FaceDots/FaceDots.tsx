import { cn } from "@/lib/cn";
import { EYE_DOTS, INNER_DOTS, MOUTH_DOTS, OUTER_DOTS } from "./dots";
import styles from "./FaceDots.module.css";

/** 점으로 그린 얼굴 장식. eyes는 눈을 점선으로 그릴지 시선 표시로 그릴지 정한다 */
export function FaceDots({ eyes, className }: { eyes: "dots" | "gaze"; className?: string }) {
  return (
    <svg viewBox="0 0 220 290" className={cn(styles.face, className)} aria-hidden="true">
      <path className={styles.inner} d={INNER_DOTS} />
      <path className={styles.outer} d={OUTER_DOTS} />
      {eyes === "dots" ? (
        <>
          <path className={styles.eyeDots} d={EYE_DOTS} />
          <path className={styles.inner} d={MOUTH_DOTS} />
        </>
      ) : (
        <g className={styles.gaze}>
          <circle cx="85.4" cy="126" r="9.5" />
          <circle cx="134.6" cy="126" r="9.5" />
          <circle cx="85.4" cy="126" r="2.5" className={styles.pupil} />
          <circle cx="134.6" cy="126" r="2.5" className={styles.pupil} />
        </g>
      )}
    </svg>
  );
}
