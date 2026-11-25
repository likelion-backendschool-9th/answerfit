"use client";

import { useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import { KEYWORD_COUNT, KEYWORD_MAX } from "@/features/admin/rules";
import styles from "./KeywordField.module.css";

type Props = { keywords: string[]; onChange: (keywords: string[]) => void };

export function KeywordField({ keywords, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");

  function add() {
    const keyword = value.trim();
    if (keyword && !keywords.includes(keyword)) onChange([...keywords, keyword]);
    setValue("");
  }

  function onKeyDown(event: KeyboardEvent) {
    // 한글을 조합하는 중의 Enter는 글자를 정하는 키다
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter") {
      event.preventDefault();
      add();
    } else if (event.key === "Escape") {
      // 패널은 닫지 않고 입력만 그만둔다
      event.preventDefault();
      setValue("");
      setAdding(false);
    }
  }

  return (
    <div className={styles.keywords}>
      {keywords.map((keyword) => (
        <span key={keyword} className={styles.keyword}>
          {keyword}
          <button type="button" className={styles.remove} aria-label={`${keyword} 빼기`} onClick={() => onChange(keywords.filter((one) => one !== keyword))}>
            <Icon name="close" size={14} />
          </button>
        </span>
      ))}
      {adding && keywords.length < KEYWORD_COUNT ? (
        <input
          className={styles.input}
          aria-label="추가할 키워드"
          placeholder="Enter로 추가"
          maxLength={KEYWORD_MAX}
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            add();
            setAdding(false);
          }}
        />
      ) : (
        keywords.length < KEYWORD_COUNT && (
          <button type="button" className={styles.add} onClick={() => setAdding(true)}>
            <Icon name="plus" size={14} /> 추가
          </button>
        )
      )}
    </div>
  );
}
