"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import { addDays, daysUntil } from "@/features/interview/result";
import { KEEP_DAYS, longDateLabel, monthDays, shiftMonth } from "@/features/interview/setup";
import { cn } from "@/lib/cn";
import styles from "./KeepDateField.module.css";

type Props = { value: string | null; today: string; onChange: (value: string | null) => void };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
/** 방향키로 옮기는 날 수 */
const MOVES: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

/** 날짜는 "2026년 12월 10일 (목) D-15"로 보이고, 누르면 아래에 달력이 열린다. 오늘 전 날짜는 고를 수 없다 */
export function KeepDateField({ value, today, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState((value ?? today).slice(0, 7));
  /** 키보드 초점이 있는 날짜 */
  const [focused, setFocused] = useState(value ?? today);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const days = value ? daysUntil(value, today) : null;

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  // 달력이 열리거나 초점 날짜가 바뀌면 그 날짜 버튼으로 초점을 옮긴다
  useEffect(() => {
    if (open) grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [open, focused, month]);

  function toggle() {
    if (!open) {
      const start = value ?? today;
      setMonth(start.slice(0, 7));
      setFocused(start);
    }
    setOpen(!open);
  }

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  function pick(date: string) {
    onChange(date);
    close();
  }

  function moveFocus(event: KeyboardEvent) {
    if (event.key === "Escape") return close();
    const by = MOVES[event.key];
    if (by === undefined) return;
    event.preventDefault();
    const next = addDays(focused, by);
    if (next < today) return;
    setFocused(next);
    setMonth(next.slice(0, 7));
  }

  const firstMonth = month <= today.slice(0, 7);

  return (
    <div className={styles.root} ref={root}>
      <button type="button" ref={trigger} className={styles.field} aria-haspopup="dialog" aria-expanded={open} onClick={toggle}>
        <Icon name="calendar" size={20} />
        <span className={value ? styles.value : styles.placeholder}>{value ? longDateLabel(value) : `고르지 않으면 면접일부터 ${KEEP_DAYS}일 뒤 삭제돼요`}</span>
        {days !== null && days >= 0 && <span className={styles.dday}>{days === 0 ? "D-DAY" : `D-${days}`}</span>}
        <span className={cn(styles.chevron, open && styles.up)}>
          <Icon name="down" size={20} />
        </span>
        <span className={styles.hidden}>영상 보관 기간 고르기</span>
      </button>
      {open && (
        <div className={styles.popover} role="dialog" aria-modal="false" aria-labelledby={titleId} onKeyDown={moveFocus}>
          <div className={styles.head}>
            <button type="button" className={styles.nav} aria-label="이전 달" disabled={firstMonth} onClick={() => setMonth(shiftMonth(month, -1))}>
              <Icon name="back" size={18} />
            </button>
            <p id={titleId} className={styles.month} aria-live="polite">
              {Number(month.slice(0, 4))}년 {Number(month.slice(5))}월
            </p>
            <button type="button" className={styles.nav} aria-label="다음 달" onClick={() => setMonth(shiftMonth(month, 1))}>
              <Icon name="arrow" size={18} />
            </button>
          </div>
          <div className={styles.weekdays} aria-hidden="true">
            {WEEKDAYS.map((day, i) => (
              <span key={day} className={cn(styles.weekday, i === 0 && styles.sunday)}>
                {day}
              </span>
            ))}
          </div>
          <div className={styles.days} ref={grid}>
            {monthDays(month).map((date, i) =>
              date === null ? (
                <span key={`blank-${i}`} />
              ) : (
                <button
                  key={date}
                  type="button"
                  data-date={date}
                  className={cn(styles.day, i % 7 === 0 && styles.sunday, date === value && styles.selected)}
                  aria-label={longDateLabel(date)}
                  aria-pressed={date === value}
                  disabled={date < today}
                  tabIndex={date === focused ? 0 : -1}
                  onClick={() => pick(date)}
                >
                  {Number(date.slice(8))}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
