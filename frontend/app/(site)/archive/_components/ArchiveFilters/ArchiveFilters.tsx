"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import { SearchField } from "@/components/ui/SearchField/SearchField";
import { SelectField } from "@/components/ui/SelectField/SelectField";
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
      <SearchField label="질문 내용으로 검색" className={styles.search} value={keyword} onChange={(event) => setKeyword(event.target.value)} />
      <Checkbox checked={query.likedOnly} onChange={(event) => go({ likedOnly: event.target.checked })}>
        좋아요한 질문만
      </Checkbox>
      <SelectField label="정렬" options={SORTS} value={query.sort} onChange={(event) => go({ sort: event.target.value as Sort })} />
    </form>
  );
}
