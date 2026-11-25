import "server-only";
import { cookies } from "next/headers";
import type { DocumentGroup } from "@/features/interview/types";
import { demoDate, demoTime } from "./clock";

const COOKIE = "demo-documents";

type Edits = { names: Record<string, string>; removed: string[] };

const koreanDay = (date: string) => `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;

function seed(): DocumentGroup[] {
  const day = demoDate("2026-12-10");
  return [
    {
      id: "webtoon", name: "가나웹툰 · 백엔드 신입", shortName: "가나웹툰 · 백엔드", description: `자소서 PDF · 직무기술서 링크 · 면접일 ${koreanDay(day)}`, interviewDate: day, error: null, createdOn: demoDate("2026-11-20"),
      files: [
        { id: "webtoon-1", name: "자기소개서_가나웹툰_백엔드.pdf", kind: "pdf", uploadedAt: demoTime("2026-11-20", "14:02") },
        { id: "webtoon-2", name: "직무기술서_가나웹툰.txt", kind: "link", uploadedAt: demoTime("2026-11-20", "14:03") },
      ],
    },
    {
      id: "bank", name: "마바뱅크 · Server Developer", shortName: "마바뱅크 · Server", description: "", interviewDate: null, error: "직무기술서 링크 스캔 실패 — 텍스트로 붙여 넣어 주세요", createdOn: demoDate("2026-11-12"),
      files: [
        { id: "bank-1", name: "자기소개서_마바뱅크.pdf", kind: "pdf", uploadedAt: demoTime("2026-11-12", "10:20") },
        { id: "bank-2", name: "직무기술서_마바뱅크.txt", kind: "link", uploadedAt: demoTime("2026-11-12", "10:21") },
      ],
    },
    {
      id: "pay", name: "다라페이 · 서버 개발", shortName: "다라페이 · 서버", description: "자소서 텍스트 · 직무기술서 PDF · 면접일 미입력", interviewDate: null, error: null, createdOn: demoDate("2026-11-05"),
      files: [
        { id: "pay-1", name: "자기소개서_다라페이.txt", kind: "text", uploadedAt: demoTime("2026-11-05", "21:10") },
        { id: "pay-2", name: "직무기술서_다라페이.pdf", kind: "pdf", uploadedAt: demoTime("2026-11-05", "21:12") },
      ],
    },
    {
      id: "messenger", name: "사아메신저 · 서버 인턴", shortName: "사아메신저 · 서버", description: "자소서 PDF · 면접일 미입력", interviewDate: null, error: null, createdOn: demoDate("2026-11-02"),
      files: [{ id: "messenger-1", name: "자기소개서_사아메신저.pdf", kind: "pdf", uploadedAt: demoTime("2026-11-02", "18:40") }],
    },
  ];
}

async function readEdits(): Promise<Edits> {
  try {
    const value = JSON.parse((await cookies()).get(COOKIE)?.value ?? "{}") as Partial<Edits>;
    return { names: value.names ?? {}, removed: Array.isArray(value.removed) ? value.removed : [] };
  } catch {
    return { names: {}, removed: [] };
  }
}

async function writeEdits(edits: Edits) {
  (await cookies()).set(COOKIE, JSON.stringify(edits), { path: "/", sameSite: "lax", httpOnly: true });
}

export async function listDemoGroups(): Promise<DocumentGroup[]> {
  const { names, removed } = await readEdits();
  return seed()
    .filter(({ id }) => !removed.includes(id))
    .map((group) => (names[group.id] ? { ...group, name: names[group.id], shortName: names[group.id] } : group));
}

export async function renameDemoGroup(id: string, name: string) {
  const edits = await readEdits();
  await writeEdits({ ...edits, names: { ...edits.names, [id]: name } });
}

export async function removeDemoGroup(id: string) {
  const edits = await readEdits();
  await writeEdits({ ...edits, removed: [...new Set([...edits.removed, id])] });
}
