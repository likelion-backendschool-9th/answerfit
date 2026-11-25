"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { Modal } from "@/components/ui/Modal/Modal";
import { reportAction } from "@/features/question/actions";
import { DETAIL_MAX, REPORT_REASONS, reportError } from "@/features/question/rules";
import styles from "./ReportButton.module.css";

type Props = { id: string; label: string; text: string; reported: boolean };

export function ReportButton({ id, label, text, reported }: Props) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <button type="button" className={styles.report} disabled={reported} onClick={() => setOpen(true)}>
        {reported ? "신고 접수됨" : "신고하기"}
      </button>
      <Modal open={open} title="질문 신고" onClose={close}>
        <ReportForm id={id} label={label} text={text} onClose={close} />
      </Modal>
    </>
  );
}

function ReportForm({ id, label, text, onClose }: Omit<Props, "reported"> & { onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const length = [...detail].length;

  function submit() {
    const problem = reportError({ reason, detail: detail.trim() });
    setError(problem);
    if (problem) return;
    startTransition(async () => {
      const result = await reportAction({ questionId: id, reason, detail }).catch(() => ({ error: "신고하지 못했어요. 다시 시도해 주세요." }));
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <form
      onChange={() => setError(undefined)}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className={styles.target}>
        <p className={styles.targetLabel}>{label}</p>
        <p>{text}</p>
      </div>
      <fieldset className={styles.field}>
        <legend className={styles.label}>
          신고 사유 <span className={styles.required}>*</span>
        </legend>
        <div className={styles.reasons}>
          {REPORT_REASONS.map((name) => (
            <label key={name} className={styles.reason}>
              <input type="radio" name="reason" className={styles.radio} checked={reason === name} onChange={() => setReason(name)} />
              {name}
            </label>
          ))}
        </div>
      </fieldset>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="report-detail">
          자세한 내용 <span className={styles.optional}>(선택)</span>
        </label>
        <div className={styles.box}>
          <textarea id="report-detail" className={styles.textarea} rows={2} value={detail} onChange={(event) => setDetail(event.target.value)} />
          <span className={length > DETAIL_MAX ? styles.over : styles.count}>
            {length} / {DETAIL_MAX}
          </span>
        </div>
      </div>
      <p className={styles.note}>
        <Icon name="info" size={16} /> 관리자가 확인한 뒤 질문을 숨기거나 삭제해요. 신고한 사람은 공개되지 않아요.
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.buttons}>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          취소
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "신고 중" : "신고하기"}
        </Button>
      </div>
    </form>
  );
}
