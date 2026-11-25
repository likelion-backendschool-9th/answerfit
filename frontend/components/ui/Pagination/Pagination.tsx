import Link from "next/link";
import { Icon } from "@/components/ui/Icon/Icon";
import { archiveHref, type ArchiveQuery } from "@/features/question/rules";
import styles from "./Pagination.module.css";

export function Pagination({ query, page, pages }: { query: ArchiveQuery; page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (target: number) => archiveHref(query, { page: target });
  return (
    <nav className={styles.pages} aria-label="쪽">
      {page > 1 ? (
        <Link href={href(page - 1)} className={styles.page} aria-label="이전 쪽">
          <Icon name="back" size={20} />
        </Link>
      ) : (
        <span className={styles.disabled}>
          <Icon name="back" size={20} />
        </span>
      )}
      {Array.from({ length: pages }, (_, i) => i + 1).map((number) => (
        <Link key={number} href={href(number)} className={styles.page} aria-current={number === page ? "page" : undefined}>
          {number}
        </Link>
      ))}
      {page < pages ? (
        <Link href={href(page + 1)} className={styles.page} aria-label="다음 쪽">
          <Icon name="arrow" size={20} />
        </Link>
      ) : (
        <span className={styles.disabled}>
          <Icon name="arrow" size={20} />
        </span>
      )}
    </nav>
  );
}
