import Link from "next/link";
import { tabHref, TABS, type Tab } from "@/features/admin/rules";
import { cn } from "@/lib/cn";
import styles from "./AdminTabs.module.css";

const LABEL: Record<Tab, string> = { bank: "문제 은행", pending: "승인 대기", reports: "신고" };

export function AdminTabs({ current, counts }: { current: Tab; counts: Record<Tab, number> }) {
  return (
    <nav className={styles.tabs} aria-label="질문 관리 구분">
      {TABS.map((tab) => (
        <Link key={tab} href={tabHref(tab)} className={styles.tab} aria-current={tab === current ? "page" : undefined}>
          {LABEL[tab]} <span className={cn(styles.count, styles[tab])}>{counts[tab].toLocaleString("ko-KR")}</span>
        </Link>
      ))}
    </nav>
  );
}
