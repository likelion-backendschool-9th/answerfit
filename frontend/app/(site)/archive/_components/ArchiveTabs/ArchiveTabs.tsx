import Link from "next/link";
import { archiveHref, type ArchiveQuery } from "@/features/question/rules";
import type { QuestionKind } from "@/features/question/types";
import styles from "./ArchiveTabs.module.css";

type Props = { query: ArchiveQuery; kinds: { kind: QuestionKind; label: string; count: number }[]; categories: [string, number][] };

export function ArchiveTabs({ query, kinds, categories }: Props) {
  const total = kinds.find(({ kind }) => kind === query.kind)?.count ?? 0;
  const chips: [string | null, number][] = [[null, total], ...categories];
  return (
    <>
      <nav className={styles.kinds} aria-label="질문 종류">
        {kinds.map(({ kind, label, count }) => (
          <Link key={kind} href={archiveHref(query, { kind, category: null })} className={styles.kind} aria-current={kind === query.kind ? "page" : undefined}>
            {label} <span className={styles.kindCount}>{count}</span>
          </Link>
        ))}
      </nav>
      <nav className={styles.chips} aria-label="분야">
        {chips.map(([category, count]) => (
          <Link key={category ?? "all"} href={archiveHref(query, { category })} scroll={false} className={styles.chip} aria-current={category === query.category ? "page" : undefined}>
            {category ?? "전체"} <span className={styles.count}>{count}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
