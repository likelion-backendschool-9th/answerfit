"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchField } from "@/components/ui/SearchField/SearchField";
import { SelectField } from "@/components/ui/SelectField/SelectField";
import { bankHref, categoriesOf, type BankQuery } from "@/features/admin/rules";
import styles from "./BankFilters.module.css";

export function BankFilters({ query }: { query: BankQuery }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(query.keyword);
  const go = (change: Partial<BankQuery>) => router.push(bankHref({ ...query, keyword: keyword.trim() }, change), { scroll: false });
  const categories = query.kind ? categoriesOf(query.kind) : [...categoriesOf("cs"), ...categoriesOf("personality")];
  return (
    <form
      className={styles.filters}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        go({});
      }}
    >
      <SelectField label="카테고리" options={{ "": "카테고리 전체", ...Object.fromEntries(categories.map((name) => [name, name])) }} value={query.category ?? ""} onChange={(event) => go({ category: event.target.value || null })} />
      <SearchField label="질문 내용 · ID 검색" size="sm" className={styles.search} value={keyword} onChange={(event) => setKeyword(event.target.value)} />
    </form>
  );
}
