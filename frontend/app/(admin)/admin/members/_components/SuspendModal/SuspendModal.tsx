"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { Modal } from "@/components/ui/Modal/Modal";
import { suspendAction } from "@/features/admin/actions";
import { dayLabel, PERIODS, PROVIDER_LABEL, REASON_MAX, releaseOn, suspendError, type SuspendPeriod } from "@/features/admin/rules";
import type { AdminMember } from "@/features/admin/types";
import styles from "./SuspendModal.module.css";

type Props = { member: AdminMember | null; today: string; onClose: () => void };

export function SuspendModal({ member, today, onClose }: Props) {
  return (
    <Modal open={member !== null} size="sm" icon="ban" title="이용 정지" onClose={onClose}>
      {member && <Form member={member} today={today} onClose={onClose} />}
    </Modal>
  );
}

function Form({ member: { id, nickname, email, provider, interviews }, today, onClose }: { member: AdminMember; today: string; onClose: () => void }) {
  const [period, setPeriod] = useState<SuspendPeriod>("week");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const release = releaseOn(period, today);

  function submit() {
    const problem = suspendError(period, reason.trim());
    setError(problem);
    if (problem) return;
    startTransition(async () => {
      const result = await suspendAction(id, period, reason).catch(() => ({ error: "정지하지 못했어요. 다시 시도해 주세요." }));
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className={styles.member}>
        <Image src="/brand/logo-light.png" alt="" width={36} height={36} className={styles.avatar} />
        <div>
          <p className={styles.name}>{nickname}</p>
          <p className={styles.info}>
            {email} · {PROVIDER_LABEL[provider]} 가입 · 면접 {interviews}회
          </p>
        </div>
      </div>
      <fieldset className={styles.field}>
        <legend className={styles.label}>
          정지 기간 <span className={styles.required}>*</span>
        </legend>
        <div className={styles.periods}>
          {Object.entries(PERIODS).map(([value, { label }]) => (
            <label key={value} className={styles.period}>
              <input type="radio" name="period" className={styles.radio} checked={period === value} onChange={() => setPeriod(value as SuspendPeriod)} />
              {label}
            </label>
          ))}
        </div>
        <p className={styles.hint}>{release ? `${dayLabel(release)} 00:00에 자동으로 해제돼요` : "관리자가 해제할 때까지 정지돼요"}</p>
      </fieldset>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="suspend-reason">
          정지 사유 <span className={styles.required}>*</span>
        </label>
        <textarea
          id="suspend-reason"
          className={styles.textarea}
          maxLength={REASON_MAX}
          value={reason}
          aria-invalid={error ? true : undefined}
          aria-describedby="suspend-hint"
          onChange={(event) => {
            setReason(event.target.value);
            setError(undefined);
          }}
        />
        <p id="suspend-hint" className={styles.hint}>
          회원에게 정지 안내와 함께 보여져요
        </p>
      </div>
      <p className={styles.note}>
        <Icon name="info" size={16} /> 정지 기간에는 로그인할 수 없어요. 면접 기록과 등록한 질문은 지워지지 않아요.
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
        <Button variant="danger" type="submit" disabled={pending}>
          {pending ? "정지하는 중" : `${PERIODS[period].label} 이용 정지`}
        </Button>
      </div>
    </form>
  );
}
