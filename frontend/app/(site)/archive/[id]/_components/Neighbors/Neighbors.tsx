import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import { Icon } from "@/components/ui/Icon/Icon";
import styles from "./Neighbors.module.css";

type Neighbor = { id: string; text: string };
type Props = { previous: Neighbor | null; next: Neighbor | null };

export function Neighbors({ previous, next }: Props) {
  if (!previous && !next) return null;
  return (
    <nav className={styles.neighbors} aria-label="앞뒤 질문">
      {previous && (
        <Link href={PATHS.question(previous.id)} className={styles.link}>
          <span className={styles.label}>
            <Icon name="back" size={16} /> 이전 질문
          </span>
          <span className={styles.text}>{previous.text}</span>
        </Link>
      )}
      {next && (
        <Link href={PATHS.question(next.id)} className={`${styles.link} ${styles.next}`}>
          <span className={styles.label}>
            다음 질문 <Icon name="arrow" size={16} />
          </span>
          <span className={styles.text}>{next.text}</span>
        </Link>
      )}
    </nav>
  );
}
