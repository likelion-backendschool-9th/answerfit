import Link from "next/link";
import styles from "./FilterChips.module.css";

type Chip = { label: string; count: number; href: string; current: boolean };

/** 고르면 주소가 바뀌는 조건 */
export function FilterChips({ label, chips }: { label: string; chips: Chip[] }) {
  return (
    <nav className={styles.chips} aria-label={label}>
      {chips.map(({ label: name, count, href, current }) => (
        <Link key={name} href={href} scroll={false} className={styles.chip} aria-current={current ? "page" : undefined}>
          {name} <span className={styles.count}>{count}</span>
        </Link>
      ))}
    </nav>
  );
}
