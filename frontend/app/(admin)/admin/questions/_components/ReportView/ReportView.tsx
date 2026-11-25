import { pickReport } from "@/features/admin/rules";
import type { ReportedQuestion } from "@/features/admin/types";
import { ReportPanel } from "../ReportPanel/ReportPanel";
import { ReportTable } from "../ReportTable/ReportTable";
import styles from "./ReportView.module.css";

export function ReportView({ reports, selected }: { reports: ReportedQuestion[]; selected: string | string[] | undefined }) {
  const current = pickReport(reports, selected);
  if (reports.length === 0) return <p className={styles.empty}>들어온 신고가 없어요.</p>;
  return (
    <div className={styles.view}>
      <ReportTable reports={reports} current={current?.id ?? null} />
      {current && <ReportPanel key={current.id} report={current} />}
    </div>
  );
}
