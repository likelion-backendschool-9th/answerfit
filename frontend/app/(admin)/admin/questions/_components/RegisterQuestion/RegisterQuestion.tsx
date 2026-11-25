"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { QuestionDrawer } from "../QuestionDrawer/QuestionDrawer";
import styles from "./RegisterQuestion.module.css";

export function RegisterQuestion() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="accent" className={styles.button} onClick={() => setOpen(true)}>
        질문 등록
      </Button>
      <QuestionDrawer open={open} question={null} onClose={() => setOpen(false)} />
    </>
  );
}
