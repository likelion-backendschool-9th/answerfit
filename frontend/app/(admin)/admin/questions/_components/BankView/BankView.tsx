import { bankHref, searchBank, type BankQuery } from "@/features/admin/rules";
import type { BankQuestion } from "@/features/admin/types";
import { Segments } from "../../../_components/Segments/Segments";
import { TableFooter } from "../../../_components/TableFooter/TableFooter";
import { BankFilters } from "../BankFilters/BankFilters";
import { BankTable } from "../BankTable/BankTable";
import { RegisterQuestion } from "../RegisterQuestion/RegisterQuestion";
import styles from "./BankView.module.css";

export function BankView({ questions, query }: { questions: BankQuestion[]; query: BankQuery }) {
  const { items, ...range } = searchBank(questions, query);
  const count = (kind: BankQuestion["kind"]) => questions.filter((question) => question.kind === kind).length;
  const segments = [
    { label: "전체", count: questions.length, href: bankHref(query, { kind: null, category: null }), current: query.kind === null },
    { label: "CS", count: count("cs"), href: bankHref(query, { kind: "cs", category: null }), current: query.kind === "cs" },
    { label: "인성", count: count("personality"), href: bankHref(query, { kind: "personality", category: null }), current: query.kind === "personality" },
  ];
  const here = bankHref(query, { page: range.page });
  return (
    <>
      <div className={styles.filters}>
        <Segments label="분류" items={segments} />
        <BankFilters key={bankHref(query)} query={query} />
        <RegisterQuestion />
      </div>
      {items.length > 0 ? <BankTable key={here} items={items} /> : <p className={styles.empty}>조건에 맞는 질문이 없어요.</p>}
      <TableFooter unit="개" {...range} href={(page) => bankHref(query, { page })} />
    </>
  );
}
