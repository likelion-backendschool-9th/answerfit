"use client";

import { Icon } from "@/components/ui/Icon/Icon";
import { daysUntil } from "@/features/interview/result";
import { KEEP_DAYS, longDateLabel } from "@/features/interview/setup";
import styles from "./KeepDateField.module.css";

type Props = { value: string | null; today: string; onChange: (value: string | null) => void };

/** 날짜는 "2026년 12월 10일 (목) D-15"로 보이고, 누르면 브라우저 달력이 열린다 */
export function KeepDateField({ value, today, onChange }: Props) {
  const days = value ? daysUntil(value, today) : null;
  return (
    <label className={styles.field}>
      <Icon name="calendar" size={20} />
      <span className={value ? styles.value : styles.placeholder}>{value ? longDateLabel(value) : `고르지 않으면 면접일부터 ${KEEP_DAYS}일 뒤 삭제돼요`}</span>
      {days !== null && days >= 0 && <span className={styles.dday}>{days === 0 ? "D-DAY" : `D-${days}`}</span>}
      <Icon name="down" size={20} />
      <input
        type="date"
        className={styles.input}
        aria-label="영상 보관 기간"
        min={today}
        value={value ?? ""}
        onClick={(event) => event.currentTarget.showPicker?.()}
        onChange={(event) => onChange(event.target.value || null)}
      />
    </label>
  );
}
