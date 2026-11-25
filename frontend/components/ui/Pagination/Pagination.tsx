import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon } from "../Icon/Icon";
import { pageNumbers } from "./pages";
import styles from "./Pagination.module.css";

type Props = { page: number; pages: number; href: (page: number) => string; variant?: "plain" | "boxed" };

export function Pagination({ page, pages, href, variant = "plain" }: Props) {
  if (pages <= 1) return null;
  return (
    <nav className={cn(styles.pages, styles[variant])} aria-label="쪽">
      <Arrow href={page > 1 ? href(page - 1) : null} label="이전 쪽" icon="back" />
      {pageNumbers(page, pages).map((number, i) =>
        number === null ? (
          <span key={`gap-${i}`} className={styles.gap}>
            …
          </span>
        ) : (
          <Link key={number} href={href(number)} className={styles.page} aria-current={number === page ? "page" : undefined}>
            {number}
          </Link>
        ),
      )}
      <Arrow href={page < pages ? href(page + 1) : null} label="다음 쪽" icon="arrow" />
    </nav>
  );
}

function Arrow({ href, label, icon }: { href: string | null; label: string; icon: "back" | "arrow" }) {
  if (!href) {
    return (
      <span className={styles.disabled}>
        <Icon name={icon} size={20} />
      </span>
    );
  }
  return (
    <Link href={href} className={styles.page} aria-label={label}>
      <Icon name={icon} size={20} />
    </Link>
  );
}
