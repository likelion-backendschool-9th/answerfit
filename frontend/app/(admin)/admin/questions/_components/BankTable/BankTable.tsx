"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon/Icon";
import { removeBankAction } from "@/features/admin/actions";
import type { BankQuestion } from "@/features/admin/types";
import { ConfirmDialog } from "../../../_components/ConfirmDialog/ConfirmDialog";
import { StateBadge, type BadgeTone } from "../../../_components/StateBadge/StateBadge";
import { QuestionDrawer } from "../QuestionDrawer/QuestionDrawer";
import styles from "./BankTable.module.css";

const REFRESH_MS = 3000;
const STATE: Record<BankQuestion["answerState"], [BadgeTone, string]> = { ready: ["success", "있음"], generating: ["accent", "AI 생성 중"], none: ["warning", "없음"] };

export function BankTable({ items }: { items: BankQuestion[] }) {
  const router = useRouter();
  const [checked, setChecked] = useState<string[]>([]);
  const [editing, setEditing] = useState<BankQuestion | null>(null);
  const [removing, setRemoving] = useState<string[]>([]);
  const all = useRef<HTMLInputElement>(null);
  // 지운 질문은 고른 것에서 빠진다
  const selected = checked.filter((id) => items.some((item) => item.id === id));
  const generating = items.some(({ answerState }) => answerState === "generating");

  useEffect(() => {
    if (!generating) return;
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [generating, router]);

  useEffect(() => {
    if (all.current) all.current.indeterminate = selected.length > 0 && selected.length < items.length;
  }, [selected.length, items.length]);

  const toggle = (id: string) => setChecked(selected.includes(id) ? selected.filter((one) => one !== id) : [...selected, id]);

  return (
    <>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <colgroup>
            <col className={styles.checkColumn} />
            <col className={styles.id} />
            <col className={styles.kind} />
            <col />
            <col className={styles.state} />
            <col className={styles.source} />
            <col className={styles.likes} />
            <col className={styles.date} />
            <col className={styles.tools} />
          </colgroup>
          <thead>
            <tr>
              <th className={styles.check}>
                <input ref={all} type="checkbox" className={styles.box} aria-label="이 쪽 모두 고르기" checked={selected.length === items.length} onChange={() => setChecked(selected.length === items.length ? [] : items.map(({ id }) => id))} />
              </th>
              {selected.length > 0 ? (
                <th colSpan={8}>
                  <span className={styles.bulk}>
                    {selected.length}개 선택
                    <button type="button" className={styles.bulkRemove} onClick={() => setRemoving(selected)}>
                      <Icon name="trash" size={16} /> 선택 삭제
                    </button>
                  </span>
                </th>
              ) : (
                <>
                  <th>ID</th>
                  <th>분류</th>
                  <th>질문</th>
                  <th>모범답안</th>
                  <th>출처</th>
                  <th>좋아요</th>
                  <th>수정일</th>
                  <th>
                    <span className={styles.hidden}>관리</span>
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((question) => {
              const { id, code, kind, category, text, answerState, hidden, source, likes, updatedOn } = question;
              const [tone, label] = hidden ? (["danger", "숨김 · 신고"] as const) : STATE[answerState];
              return (
                <tr key={id}>
                  <td className={styles.check}>
                    <input type="checkbox" className={styles.box} aria-label={`${code} 고르기`} checked={selected.includes(id)} onChange={() => toggle(id)} />
                  </td>
                  <td className={styles.code}>{code}</td>
                  <td>
                    {kind === "cs" ? (
                      <>
                        <span className={styles.cs}>CS</span> {category}
                      </>
                    ) : (
                      <span className={styles.personality}>인성</span>
                    )}
                  </td>
                  <td className={styles.text} title={text}>
                    {text}
                  </td>
                  <td>
                    <StateBadge tone={tone}>{label}</StateBadge>
                  </td>
                  <td className={source ? styles.muted : undefined}>{source ? `사용자 · ${source}` : "관리자"}</td>
                  <td className={styles.number}>{likes}</td>
                  <td className={styles.muted}>{updatedOn.slice(5).replace("-", ".")}</td>
                  <td className={styles.actions}>
                    <button type="button" className={styles.tool} aria-label={`${code} 수정`} onClick={() => setEditing(question)}>
                      <Icon name="pencil" size={18} />
                    </button>
                    <button type="button" className={`${styles.tool} ${styles.muted}`} aria-label={`${code} 삭제`} onClick={() => setRemoving([id])}>
                      <Icon name="trash" size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <QuestionDrawer open={editing !== null} question={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={removing.length > 0}
        title={removing.length > 1 ? `질문 ${removing.length}개를 삭제할까요?` : "질문을 삭제할까요?"}
        description="삭제하면 아카이브에서도 사라지고 되돌릴 수 없어요."
        action="삭제하기"
        run={() => removeBankAction(removing)}
        onClose={() => setRemoving([])}
      />
    </>
  );
}
