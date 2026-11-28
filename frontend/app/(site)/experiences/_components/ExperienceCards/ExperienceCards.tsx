import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import { Chip } from "@/components/ui/Chip/Chip";
import { ACTIVITY_LABEL, formatPeriod } from "@/features/experience/rules";
import type { Experience } from "@/features/experience/types";
import styles from "./ExperienceCards.module.css";

/** 모바일에서 표 대신 보인다. items가 null이면 불러오는 중이다 */
export function ExperienceCards({ items }: { items: Experience[] | null }) {
  if (items === null) {
    return (
      <ul className={styles.cards} aria-busy="true">
        {[0, 1, 2].map((key) => (
          <li key={key} className={styles.card}>
            <span className={styles.bone} />
            <span className={styles.bone} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className={styles.cards}>
      {items.map((item) => (
        <li key={item.id}>
          <Link href={PATHS.experience(item.id)} className={styles.card}>
            <span className={styles.head}>
              <strong className={styles.title}>{item.title || "제목 없음"}</strong>
              {item.type && <Chip>{ACTIVITY_LABEL[item.type]}</Chip>}
            </span>
            {formatPeriod(item) && <span className={styles.sub}>{formatPeriod(item)}</span>}
            {(item.organization || item.role) && <span className={styles.sub}>{[item.organization, item.role].filter(Boolean).join(" · ")}</span>}
            {item.tags.length > 0 && (
              <span className={styles.tags}>
                {item.tags.map((tag) => (
                  <Chip key={tag}>{tag}</Chip>
                ))}
              </span>
            )}
            {item.result && <span className={styles.result}>{item.result}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
