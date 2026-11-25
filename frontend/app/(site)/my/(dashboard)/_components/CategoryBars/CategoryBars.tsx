import Link from "next/link";
import { Icon } from "@/components/ui/Icon/Icon";
import { archiveHref, CS_CATEGORIES, readQuery } from "@/features/question/rules";
import { averageOf, ranked, weakest, withSubject, type CategoryScore } from "@/features/member/learning";
import { cn } from "@/lib/cn";
import styles from "./CategoryBars.module.css";

export function CategoryBars({ categories }: { categories: CategoryScore[] }) {
  const weak = weakest(categories);
  const names = weak.map(({ name }) => name);
  // 아카이브에 있는 분야로 보낸다
  const target = names.find((name) => CS_CATEGORIES.includes(name)) ?? null;
  return (
    <div>
      <p className={styles.top}>
        <span>점수 높은 순</span>
        <span>평균 {averageOf(categories)}</span>
      </p>
      <ol className={styles.list}>
        {ranked(categories).map(({ name, score, previous }) => {
          const change = previous === null ? null : score - previous;
          const isWeak = names.includes(name);
          return (
            <li key={name} className={styles.row} title={previous === null ? `${name} ${score}점` : `${name} ${score}점, 앞 기간 ${previous}점`}>
              <span className={cn(styles.name, isWeak && styles.weakName)}>{name}</span>
              <span className={styles.track}>
                <span className={cn(styles.fill, isWeak ? styles.weak : score >= 80 && styles.good)} style={{ width: `${score}%` }} />
              </span>
              <span className={styles.score}>{score}</span>
              <span className={cn(styles.change, change !== null && change < 0 && styles.down)}>{change === null ? "" : `${change >= 0 ? "+" : "−"}${Math.abs(change)}`}</span>
            </li>
          );
        })}
      </ol>
      {weak.length > 0 && (
        <Link href={archiveHref(readQuery({}), { category: target })} className={styles.tip}>
          <span>{withSubject(names.join(" · "))} 가장 약해요. 아카이브에서 관련 질문을 먼저 풀어 보세요.</span>
          <Icon name="chevron" size={16} />
        </Link>
      )}
    </div>
  );
}
