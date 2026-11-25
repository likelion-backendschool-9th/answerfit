import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import { PERIODS, type Period } from "@/features/interview/records";
import styles from "./PeriodTabs.module.css";

export function PeriodTabs({ period }: { period: Period }) {
  return (
    <nav className={styles.tabs} aria-label="기간">
      {(Object.keys(PERIODS) as Period[]).map((one) => (
        <Link key={one} href={one === "month" ? PATHS.my : `${PATHS.my}?period=${one}`} scroll={false} className={styles.tab} aria-current={one === period ? "page" : undefined}>
          {PERIODS[one]}
        </Link>
      ))}
    </nav>
  );
}
