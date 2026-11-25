"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { Modal } from "@/components/ui/Modal/Modal";
import { withdrawAction } from "@/features/member/actions";
import styles from "./Withdraw.module.css";

const WARNING = "탈퇴하면 면접 기록, 녹화 영상, 서류 그룹이 모두 삭제되고 되돌릴 수 없어요.";

export function Withdraw() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const close = () => setOpen(false);
  return (
    <section className={styles.card}>
      <div>
        <h2 className={styles.title}>회원 탈퇴</h2>
        <p className={styles.description}>{WARNING}</p>
      </div>
      <button type="button" className={styles.button} onClick={() => setOpen(true)}>
        <Icon name="alert" /> 탈퇴하기
      </button>
      <Modal open={open} title="정말 탈퇴할까요?" description={WARNING} onClose={close}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.buttons}>
          <Button variant="outline" onClick={close} disabled={pending}>
            취소
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await withdrawAction();
                if (result) setError(result.message);
              })
            }
          >
            {pending ? "탈퇴 중" : "탈퇴하기"}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
