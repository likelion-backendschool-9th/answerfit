"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchField } from "@/components/ui/SearchField/SearchField";
import { SelectField } from "@/components/ui/SelectField/SelectField";
import { RECORD_SORTS, recordsHref, type RecordQuery, type RecordSort } from "@/features/interview/records";
import styles from "./RecordFilters.module.css";

export function RecordFilters({ query }: { query: RecordQuery }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(query.keyword);
  const go = (change: Partial<RecordQuery>) => router.push(recordsHref({ ...query, keyword: keyword.trim() }, change), { scroll: false });
  return (
    <form
      className={styles.filters}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        go({});
      }}
    >
      <SearchField label="면접 이름 검색" size="sm" className={styles.search} value={keyword} onChange={(event) => setKeyword(event.target.value)} />
      <SelectField label="정렬" options={RECORD_SORTS} value={query.sort} onChange={(event) => go({ sort: event.target.value as RecordSort })} />
    </form>
  );
}
