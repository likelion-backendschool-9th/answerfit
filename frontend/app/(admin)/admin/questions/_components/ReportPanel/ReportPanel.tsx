"use client";

import { useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { removeBankAction, settleReportAction } from "@/features/admin/actions";
import { countReasons, reportHref, shortTime } from "@/features/admin/rules";
import type { ReportedQuestion, ReportStatus } from "@/features/admin/types";
import { ConfirmDialog } from "../../../_components/ConfirmDialog/ConfirmDialog";
import { ReportStatusBadge } from "../ReportStatusBadge/ReportStatusBadge";
import styles from "./ReportPanel.module.css";

export function ReportPanel({ report: { id, code, text, status, entries } }: { report: ReportedQuestion }) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function settle(next: ReportStatus) {
    startTransition(async () => {
      const result = await settleReportAction(id, next).catch(() => ({ error: "처리하지 못했어요. 다시 시도해 주세요." }));
      setError(result.error);
    });
  }

  return (
    <section className={styles.panel} aria-label={`${code} 신고 내용`}>
      <div className={styles.top}>
        <span className={styles.code}>{code}</span>
        <ReportStatusBadge status={status} />
        <Link href={reportHref(null)} scroll={false} className={styles.close} aria-label="닫기">
          <Icon name="close" size={20} />
        </Link>
      </div>
      <h2 className={styles.text}>{text}</h2>
      <h3 className={styles.label}>신고 사유</h3>
      <ul>
        {countReasons(entries).map(({ reason, count }) => (
          <li key={reason} className={styles.reason}>
            <span className={styles.reasonName}>{reason}</span>
            <span className={styles.track}>
              <span className={styles.bar} style={{ "--share": count / entries.length } as CSSProperties} />
            </span>
            <span className={styles.number}>{count}</span>
          </li>
        ))}
      </ul>
      <h3 className={styles.label}>신고 내용</h3>
      <ul className={styles.entries}>
        {entries.map(({ reason, detail, at }, i) => (
          <li key={`${at}-${i}`} className={styles.entry}>
            <p>
              익명 {i + 1} <time className={styles.time}>{shortTime(at)}</time>
            </p>
            <p>{detail || reason}</p>
          </li>
        ))}
      </ul>
      <div className={styles.bottom}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.buttons}>
          {status !== "hidden" && (
            <Button variant="outline" className={styles.hide} disabled={pending} onClick={() => settle("hidden")}>
              <Icon name="eyeOff" size={16} /> 숨김
            </Button>
          )}
          <Button variant="danger" className={styles.button} disabled={pending} onClick={() => setRemoving(true)}>
            <Icon name="trash" size={16} /> 삭제
          </Button>
        </div>
        {status !== "closed" && (
          <Button variant="outline" className={styles.done} disabled={pending} onClick={() => settle("closed")}>
            <Icon name="tick" size={16} /> {status === "hidden" ? "다시 공개 · 신고 종료" : "문제 없음 · 신고 종료"}
          </Button>
        )}
        <p className={styles.note}>숨기면 아카이브와 면접 문제에서 빠지고, 언제든 다시 공개할 수 있어요. 삭제는 되돌릴 수 없어요.</p>
      </div>
      <ConfirmDialog open={removing} title="질문을 삭제할까요?" description="질문과 신고가 함께 사라지고 되돌릴 수 없어요." action="삭제하기" run={() => removeBankAction([id])} onClose={() => setRemoving(false)} />
    </section>
  );
}
