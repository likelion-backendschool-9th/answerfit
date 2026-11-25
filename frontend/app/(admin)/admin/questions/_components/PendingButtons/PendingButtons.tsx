"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button/Button";
import { approveAction, rejectAction } from "@/features/admin/actions";
import { ConfirmDialog } from "../../../_components/ConfirmDialog/ConfirmDialog";
import styles from "./PendingButtons.module.css";

export function PendingButtons({ id }: { id: string }) {
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function approve() {
    startTransition(async () => {
      const result = await approveAction(id).catch(() => ({ error: "승인하지 못했어요. 다시 시도해 주세요." }));
      setError(result.error);
    });
  }

  return (
    <div className={styles.side}>
      <div className={styles.buttons}>
        <Button variant="outline" className={styles.reject} onClick={() => setRejecting(true)} disabled={pending}>
          반려
        </Button>
        <Button variant="accent" className={styles.approve} onClick={approve} disabled={pending}>
          {pending ? "승인 중" : "승인 · AI 답안 생성"}
        </Button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <ConfirmDialog open={rejecting} title="질문을 반려할까요?" description="반려하면 승인 대기 목록에서 사라지고 되돌릴 수 없어요." action="반려하기" run={() => rejectAction(id)} onClose={() => setRejecting(false)} />
    </div>
  );
}
