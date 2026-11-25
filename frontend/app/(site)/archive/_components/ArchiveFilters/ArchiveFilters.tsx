"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import { Icon } from "@/components/ui/Icon/Icon";
import { archiveHref, SORTS, type ArchiveQuery, type Sort } from "@/features/question/rules";
import styles from "./ArchiveFilters.module.css";

export function ArchiveFilters({ query }: { query: ArchiveQuery }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(query.keyword);
  const go = (change: Partial<ArchiveQuery>) => router.push(archiveHref({ ...query, keyword: keyword.trim() }, change), { scroll: false });

  return (
    <form
      className={styles.filters}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        go({});
      }}
    >
      <label className={styles.search}>
        <Icon name="search" size={20} />
        <input type="search" className={styles.input} aria-label="질문 내용으로 검색" placeholder="질문 내용으로 검색" value={keyword} maxLength={100} onChange={(event) => setKeyword(event.target.value)} />
      </label>
      <Checkbox checked={query.likedOnly} onChange={(event) => go({ likedOnly: event.target.checked })}>
        좋아요한 질문만
      </Checkbox>
      <span className={styles.sort}>
        <select className={styles.select} aria-label="정렬" value={query.sort} onChange={(event) => go({ sort: event.target.value as Sort })}>
          {Object.entries(SORTS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Icon name="down" size={16} />
      </span>
    </form>
  );
}
