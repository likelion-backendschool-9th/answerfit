import type { Metadata } from "next";
import { PATHS } from "@/app/_lib/paths";
import { getDocumentGroups, getRecords } from "@/features/interview/api";
import { requireMember } from "@/features/session/guard";
import { PageHeading } from "../_components/PageHeading/PageHeading";
import { DocumentList } from "./_components/DocumentList/DocumentList";

export const metadata: Metadata = { title: "서류 관리" };

export default async function DocumentsPage() {
  await requireMember(PATHS.myDocuments);
  const [groups, records] = await Promise.all([getDocumentGroups(), getRecords()]);
  return (
    <>
      <PageHeading title="서류 관리" description="서류를 내려받거나, 이 서류로 본 면접을 다시 볼 수 있어요." />
      <DocumentList groups={groups} records={records.filter(({ groupId }) => groupId)} />
    </>
  );
}
