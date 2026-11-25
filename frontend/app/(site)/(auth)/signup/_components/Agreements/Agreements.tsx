"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import styles from "./Agreements.module.css";

const TERMS = ["서비스 이용약관", "개인정보 수집 · 이용", "면접 영상 녹화 · 자동 삭제 안내"];

type Props = { checked: boolean[]; error?: string; onChange: (checked: boolean[]) => void };

export function Agreements({ checked, error, onChange }: Props) {
  const [notice, setNotice] = useState("");
  return (
    <fieldset className={styles.agreements} aria-describedby={error ? "agreements-error" : undefined}>
      <legend className={styles.legend}>약관 동의</legend>
      <div className={styles.all}>
        <Checkbox checked={checked.every(Boolean)} onChange={(event) => onChange(TERMS.map(() => event.target.checked))}>
          <span className={styles.allLabel}>전체 동의</span>
        </Checkbox>
      </div>
      <ul className={styles.list}>
        {TERMS.map((term, index) => (
          <li key={term} className={styles.item}>
            <Checkbox checked={checked[index]} onChange={(event) => onChange(checked.map((value, i) => (i === index ? event.target.checked : value)))}>
              [필수] {term}
            </Checkbox>
            <button type="button" className={styles.view} aria-label={`${term} 보기`} onClick={() => setNotice(`${term} 내용은 준비 중이에요.`)}>
              보기
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.notice} role="status">
        {notice}
      </p>
      {error && (
        <p id="agreements-error" className={styles.error} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
