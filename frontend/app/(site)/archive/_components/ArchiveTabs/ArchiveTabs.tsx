import Link from "next/link";
import { FilterChips } from "@/components/ui/FilterChips/FilterChips";
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
      <div className={styles.chips}>
        <FilterChips label="분야" chips={chips.map(([category, count]) => ({ label: category ?? "전체", count, href: archiveHref(query, { category }), current: category === query.category }))} />
      </div>
    </>
  );
}
