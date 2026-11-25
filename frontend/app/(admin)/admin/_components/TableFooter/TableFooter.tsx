import { Pagination } from "@/components/ui/Pagination/Pagination";
import styles from "./TableFooter.module.css";

type Props = { unit: string; total: number; from: number; to: number; page: number; pages: number; href: (page: number) => string };

export function TableFooter({ unit, total, from, to, page, pages, href }: Props) {
  return (
    <div className={styles.footer}>
      <p className={styles.range}>
        {total.toLocaleString("ko-KR")}
        {unit} 중 {from}–{to}
      </p>
      <Pagination page={page} pages={pages} href={href} variant="boxed" />
    </div>
  );
}
