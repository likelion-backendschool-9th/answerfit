import { Icon, type IconName } from "@/components/ui/Icon/Icon";
import type { MemberSummary } from "@/features/admin/types";
import { cn } from "@/lib/cn";
import styles from "./MemberStats.module.css";

type Props = { total: number; suspended: number; summary: MemberSummary };

export function MemberStats({ total, suspended, summary: { joinedThisWeek, seenToday, interviewsThisMonth, releasedThisWeek } }: Props) {
  const people = Math.max(1, total);
  const cards: { icon: IconName; label: string; value: number; note: string; tone?: "good" | "danger" }[] = [
    { icon: "users", label: "전체 회원", value: total, note: `이번 주 +${joinedThisWeek}`, tone: "good" },
    { icon: "login", label: "오늘 접속", value: seenToday, note: `전체의 ${Math.round((seenToday / people) * 100)}%` },
    { icon: "trend", label: "이번 달 면접", value: interviewsThisMonth, note: `회원당 평균 ${(interviewsThisMonth / people).toFixed(1)}회` },
    { icon: "ban", label: "이용 정지", value: suspended, note: `이번 주 해제 ${releasedThisWeek}`, tone: "danger" },
  ];
  return (
    <dl className={styles.cards}>
      {cards.map(({ icon, label, value, note, tone }) => (
        <div key={label} className={styles.card}>
          <span className={cn(styles.icon, tone === "danger" && styles.dangerIcon)}>
            <Icon name={icon} size={20} />
          </span>
          <div>
            <dt className={styles.label}>{label}</dt>
            <dd className={styles.body}>
              <span className={styles.value}>{value.toLocaleString("ko-KR")}</span> <span className={cn(styles.note, tone && styles[tone])}>{note}</span>
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
