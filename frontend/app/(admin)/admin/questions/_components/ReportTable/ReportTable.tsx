import Link from "next/link";
import { countReasons, reportHref, shortReason } from "@/features/admin/rules";
import type { ReportedQuestion } from "@/features/admin/types";
import { todayInSeoul } from "@/features/interview/setup";
import { ReportStatusBadge } from "../ReportStatusBadge/ReportStatusBadge";
import styles from "./ReportTable.module.css";

/** 이만큼 쌓이면 붉게 보여 준다 */
const MANY = 3;

export function ReportTable({ reports, current }: { reports: ReportedQuestion[]; current: string | null }) {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.id}>ID</th>
            <th>질문</th>
            <th className={styles.reason}>주요 사유</th>
            <th className={styles.count}>신고</th>
            <th className={styles.date}>최근</th>
            <th className={styles.status}>상태</th>
          </tr>
        </thead>
        <tbody>
          {reports.map(({ id, code, text, status, entries }) => (
            <tr key={id} className={id === current ? styles.selected : undefined}>
              <td className={styles.code}>{code}</td>
              <td>
                <Link href={reportHref(id)} scroll={false} className={styles.link} aria-current={id === current ? "true" : undefined}>
                  {text}
                </Link>
              </td>
              <td>{shortReason(countReasons(entries)[0]?.reason ?? "")}</td>
              <td className={entries.length >= MANY ? styles.many : styles.number}>{entries.length}</td>
              <td className={styles.muted}>{todayInSeoul(new Date(entries[0].at)).slice(5).replace("-", ".")}</td>
              <td>
                <ReportStatusBadge status={status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
