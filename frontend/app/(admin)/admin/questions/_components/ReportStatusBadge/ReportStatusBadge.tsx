import type { ReportStatus } from "@/features/admin/types";
import { StateBadge } from "../../../_components/StateBadge/StateBadge";

const LABEL = { waiting: ["warning", "처리 대기"], hidden: ["muted", "숨김"], closed: ["success", "유지 · 종료"] } as const;

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const [tone, label] = LABEL[status];
  return <StateBadge tone={tone}>{label}</StateBadge>;
}
