"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { questionHref } from "@/features/question/paths";
import { QuestionForm } from "../QuestionForm/QuestionForm";
import styles from "./RegisterButton.module.css";

export function RegisterButton({ variant = "primary" }: { variant?: "primary" | "outline" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div className={styles.wrap}>
      <Button
        variant={variant}
        className={styles.button}
        onClick={() => {
          setDone(false);
          setOpen(true);
        }}
      >
        CS 질문 등록
      </Button>
      <p className={styles.notice} role="status">
        {done && "질문을 등록했어요. 승인대기 상세로 이동하고 있어요."}
      </p>
      <Modal open={open} title="CS 질문 등록" description="등록한 질문은 관리자가 확인한 뒤 아카이브와 면접 문제 은행에 올라가요." onClose={() => setOpen(false)}>
        <QuestionForm
          id={null}
          onCancel={() => setOpen(false)}
          onDone={(id) => {
            setOpen(false);
            setDone(true);
            router.push(questionHref(id));
          }}
        />
      </Modal>
    </div>
  );
}
