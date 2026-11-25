import type { ReactNode } from "react";
import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import { Icon } from "@/components/ui/Icon/Icon";
import { dayLabel } from "@/features/admin/rules";
import styles from "./AdminPage.module.css";

type Props = { title: string; description: string; /** YYYY-MM-DD */ today: string; children: ReactNode };

export function AdminPage({ title, description, today, children }: Props) {
  return (
    <>
      <div className={styles.bar}>
        <p className={styles.crumb}>
          관리자 <span aria-hidden="true">›</span> {title}
        </p>
        <div className={styles.right}>
          <Link href={PATHS.notifications} className={styles.bell} aria-label="알림">
            <Icon name="bell" size={20} />
          </Link>
          <time dateTime={today}>{dayLabel(today)}</time>
        </div>
      </div>
      <div className={styles.body}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        {children}
      </div>
    </>
  );
}
