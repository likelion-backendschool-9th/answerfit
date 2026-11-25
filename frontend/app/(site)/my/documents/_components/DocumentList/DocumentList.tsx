"use client";

import { useState } from "react";
import { SearchField } from "@/components/ui/SearchField/SearchField";
import { SelectField } from "@/components/ui/SelectField/SelectField";
import type { InterviewRecord } from "@/features/interview/records";
import type { DocumentGroup } from "@/features/interview/types";
import { GroupCard } from "../GroupCard/GroupCard";
import styles from "./DocumentList.module.css";

const SORTS = { latest: "최근 등록순", oldest: "오래된 등록순", name: "이름순" };
type Sort = keyof typeof SORTS;

export function DocumentList({ groups, records }: { groups: DocumentGroup[]; records: InterviewRecord[] }) {
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<Sort>("latest");
  const [openId, setOpenId] = useState<string | null>(groups[0]?.id ?? null);
  const found = groups
    .filter(({ name }) => name.toLowerCase().includes(keyword.trim().toLowerCase()))
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name, "ko") : sort === "latest" ? b.createdOn.localeCompare(a.createdOn) : a.createdOn.localeCompare(b.createdOn)));

  return (
    <>
      <div className={styles.filters}>
        <SearchField label="그룹 이름 검색" size="sm" className={styles.search} value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        <SelectField label="정렬" options={SORTS} value={sort} onChange={(event) => setSort(event.target.value as Sort)} />
      </div>
      {found.length === 0 && <p className={styles.empty}>{groups.length === 0 ? "등록한 서류 그룹이 없어요." : "조건에 맞는 서류 그룹이 없어요."}</p>}
      <ul className={styles.list}>
        {found.map((group) => (
          <li key={group.id}>
            <GroupCard group={group} records={records.filter(({ groupId }) => groupId === group.id)} open={group.id === openId} onToggle={() => setOpenId(group.id === openId ? null : group.id)} />
          </li>
        ))}
      </ul>
    </>
  );
}
