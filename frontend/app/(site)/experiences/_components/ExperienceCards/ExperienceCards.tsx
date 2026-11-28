import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import { Chip } from "@/components/ui/Chip/Chip";
import { ACTIVITY_LABEL, formatPeriod } from "@/features/experience/rules";
import type { Experience } from "@/features/experience/types";
import styles from "./ExperienceCards.module.css";

/** 모바일에서 표 대신 보인다. 역량 행마다 태그와 성과를 한 줄씩 보여 준다. items가 null이면 불러오는 중이다 */
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
            <span className={styles.stories}>
              {item.stories.map((story) => (
                <span key={story.id} className={styles.story}>
                  <span className={styles.tags}>
                    {story.tags.length > 0 ? (
                      story.tags.map((tag) => (
                        <Chip key={tag} size="sm">
                          {tag}
                        </Chip>
                      ))
                    ) : (
                      <span className={styles.sub}>역량 미정</span>
                    )}
                  </span>
                  {(story.result || story.content) && <span className={styles.result}>{story.result || story.content}</span>}
                </span>
              ))}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
