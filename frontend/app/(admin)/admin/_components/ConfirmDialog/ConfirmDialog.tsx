"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import type { ActionResult } from "@/features/admin/types";
import styles from "./ConfirmDialog.module.css";

type Props = { open: boolean; title: string; description: string; action: string; run: () => Promise<ActionResult>; onClose: () => void; onDone?: () => void };

/** 되돌릴 수 없는 일을 한 번 더 묻는다 */
export function ConfirmDialog({ open, title, description, action, run, onClose, onDone }: Props) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function close() {
    setError(undefined);
    onClose();
  }

  function submit() {
    startTransition(async () => {
      const result = await run().catch(() => ({ error: "처리하지 못했어요. 다시 시도해 주세요." }));
      if (result.error) return setError(result.error);
      close();
      onDone?.();
    });
  }

  return (
    <Modal open={open} size="sm" title={title} description={description} onClose={close}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.buttons}>
        <Button variant="outline" onClick={close} disabled={pending}>
          취소
        </Button>
        <Button variant="danger" onClick={submit} disabled={pending}>
          {pending ? "처리 중" : action}
        </Button>
      </div>
    </Modal>
  );
}
