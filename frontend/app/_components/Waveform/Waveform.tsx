import { cn } from "@/lib/cn";
import styles from "./Waveform.module.css";

/** 소리 파형 장식. 색은 글자색을 따른다 */
export function Waveform({ bars, className }: { bars: number[]; className?: string }) {
  const height = Math.max(...bars);
  return (
    <svg viewBox={`0 0 ${bars.length * 10 - 5} ${height}`} className={cn(styles.wave, className)} aria-hidden="true">
      {bars.map((bar, i) => (
        <rect key={i} x={i * 10} y={(height - bar) / 2} width="5" height={bar} rx="2.5" />
      ))}
    </svg>
  );
}
