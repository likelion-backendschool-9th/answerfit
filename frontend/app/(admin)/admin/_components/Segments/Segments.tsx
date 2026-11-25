import Link from "next/link";
import styles from "./Segments.module.css";

type Item = { label: string; count: number; href: string; current: boolean };

/** 고르면 주소가 바뀌는, 이어 붙은 조건 */
export function Segments({ label, items }: { label: string; items: Item[] }) {
  return (
    <nav className={styles.segments} aria-label={label}>
      {items.map(({ label: name, count, href, current }) => (
        <Link key={name} href={href} scroll={false} className={styles.item} aria-current={current ? "page" : undefined}>
          {name} <span className={styles.count}>{count.toLocaleString("ko-KR")}</span>
        </Link>
      ))}
    </nav>
  );
}
