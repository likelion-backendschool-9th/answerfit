import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import { Icon } from "@/components/ui/Icon/Icon";
import { MODE_SHORT, RECORD_LABEL, type InterviewRecord } from "@/features/interview/records";
import { daysUntil } from "@/features/interview/result";
import { cn } from "@/lib/cn";
import styles from "./RecordTable.module.css";

/** 삭제가 이만큼 남으면 눈에 띄게 알린다 */
const SOON_DAYS = 3;

export function RecordTable({ items, today }: { items: InterviewRecord[]; today: string }) {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">면접 이름 · 서류 그룹</th>
            <th scope="col">유형</th>
            <th scope="col">모드</th>
            <th scope="col">평균 점수</th>
            <th scope="col">녹화 영상</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ id, title, groupName, type, mode, score, deleteAfter }) => (
            <tr key={id}>
              <td>
                <Link href={PATHS.interviewResult(id)} className={styles.title}>
                  {title}
                </Link>
                {groupName && <span className={styles.group}>{groupName}</span>}
              </td>
              <td>{RECORD_LABEL[type]}</td>
              <td>{MODE_SHORT[mode]}</td>
              <td className={cn(styles.score, score >= 80 && styles.good)}>{score}</td>
              <td>
                <Video deleteAfter={deleteAfter} today={today} />
                <span className={styles.arrow}>
                  <Icon name="chevron" size={16} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Video({ deleteAfter, today }: { deleteAfter: string; today: string }) {
  const days = daysUntil(deleteAfter, today);
  if (days < 0) return <span className={styles.gone}>삭제됨</span>;
  return (
    <span className={cn(styles.video, days <= SOON_DAYS && styles.soon)}>
      {deleteAfter.slice(5).replace("-", ".")} 삭제 · {days === 0 ? "D-DAY" : `D-${days}`}
    </span>
  );
}
