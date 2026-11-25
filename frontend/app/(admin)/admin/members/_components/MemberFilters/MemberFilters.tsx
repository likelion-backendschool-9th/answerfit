"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchField } from "@/components/ui/SearchField/SearchField";
import { SelectField } from "@/components/ui/SelectField/SelectField";
import { MEMBER_SORTS, membersHref, PROVIDER_LABEL, type MemberQuery, type MemberSort } from "@/features/admin/rules";
import type { LoginProvider } from "@/features/admin/types";
import styles from "./MemberFilters.module.css";

export function MemberFilters({ query }: { query: MemberQuery }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(query.keyword);
  const go = (change: Partial<MemberQuery>) => router.push(membersHref({ ...query, keyword: keyword.trim() }, change), { scroll: false });
  return (
    <form
      className={styles.filters}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        go({});
      }}
    >
      <SelectField label="가입 방식" options={{ "": "가입 방식 전체", ...PROVIDER_LABEL }} value={query.provider ?? ""} onChange={(event) => go({ provider: (event.target.value || null) as LoginProvider | null })} />
      <SearchField label="이메일 · 닉네임 검색" size="sm" className={styles.search} value={keyword} onChange={(event) => setKeyword(event.target.value)} />
      <span className={styles.sort}>
        <SelectField label="정렬" options={MEMBER_SORTS} value={query.sort} onChange={(event) => go({ sort: event.target.value as MemberSort })} />
      </span>
    </form>
  );
}
