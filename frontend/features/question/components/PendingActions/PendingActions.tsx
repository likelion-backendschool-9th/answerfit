"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { Modal } from "@/components/ui/Modal/Modal";
import { removeQuestionAction } from "@/features/question/actions";
import { QuestionForm } from "../../../_components/QuestionForm/QuestionForm";
import styles from "./PendingActions.module.css";

export function PendingActions({ id, category, text }: { id: string; category: string; text: string }) {
  const [open, setOpen] = useState<"edit" | "remove" | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const close = () => setOpen(null);

  function remove() {
    startTransition(async () => {
      const result = await removeQuestionAction(id);
      if (result) setError(result.error);
    });
  }

  return (
    <>
      <Button variant="outline" className={styles.edit} onClick={() => setOpen("edit")}>
        수정
      </Button>
      <button type="button" className={styles.remove} onClick={() => setOpen("remove")}>
        <Icon name="trash" size={16} /> 삭제
      </button>
      <Modal open={open === "edit"} title="CS 질문 수정" description="승인 전까지 몇 번이든 고칠 수 있어요." onClose={close}>
        <QuestionForm id={id} initial={{ category, text }} onCancel={close} onDone={close} />
      </Modal>
      <Modal open={open === "remove"} title="질문을 삭제할까요?" description="삭제하면 되돌릴 수 없어요." onClose={close}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.buttons}>
          <Button variant="outline" onClick={close} disabled={pending}>
            취소
          </Button>
          <Button onClick={remove} disabled={pending}>
            {pending ? "삭제 중" : "삭제하기"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
