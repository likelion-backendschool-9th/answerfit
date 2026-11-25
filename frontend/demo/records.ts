import "server-only";
import type { InterviewRecord } from "@/features/interview/records";
import { defaultTitle } from "@/features/interview/result";
import type { InterviewMode, RecordType } from "@/features/interview/types";
import { demoDate, demoTime } from "./clock";

const GONE = "삭제된 서류 그룹";
const ENERGY = "자차에너지";

type Row = [date: string, time: string, type: RecordType, mode: InterviewMode, count: number, score: number, groupId: string | null, groupName: string, deleteAfter: string, title?: string];

/** 첫 줄은 목업의 결과(demo-sample)다 */
const ROWS: Row[] = [
  ["2026-11-24", "23:10", "experience", "practice", 5, 78, "webtoon", "", "2026-12-10"],
  ["2026-11-21", "21:40", "cs", "real", 6, 74, null, ENERGY, "2026-12-21"],
  ["2026-11-19", "20:30", "experience", "real", 5, 69, "bank", "", "2026-11-28", "마바뱅크 최종 대비"],
  ["2026-11-18", "22:05", "experience", "practice", 4, 82, "pay", "", "2026-12-03"],
  ["2026-11-10", "20:15", "cs", "practice", 5, 71, null, ENERGY, "2026-11-20"],
  ["2026-11-04", "19:30", "personality", "practice", 4, 80, null, ENERGY, "2026-11-15"],
  ["2026-10-29", "21:00", "cs", "real", 6, 66, null, ENERGY, "2026-11-10"],
  ["2026-10-22", "22:40", "experience", "practice", 4, 73, "webtoon", "", "2026-11-05"],
  ["2026-10-18", "20:00", "cs", "practice", 5, 79, null, ENERGY, "2026-11-01"],
  ["2026-10-15", "21:20", "experience", "practice", 5, 75, null, GONE, "2026-10-30"],
  ["2026-10-09", "19:40", "experience", "real", 5, 72, null, GONE, "2026-10-24"],
  ["2026-10-05", "22:10", "personality", "practice", 4, 74, null, GONE, "2026-10-20"],
  ["2026-10-02", "20:50", "cs", "practice", 5, 78, null, ENERGY, "2026-10-17"],
  ["2026-09-28", "21:30", "experience", "practice", 6, 70, null, GONE, "2026-10-13"],
  ["2026-09-24", "20:20", "cs", "practice", 5, 68, null, ENERGY, "2026-10-09"],
  ["2026-09-20", "19:10", "experience", "practice", 5, 71, null, GONE, "2026-10-05"],
  ["2026-09-15", "22:00", "cs", "real", 5, 65, null, ENERGY, "2026-09-30"],
  ["2026-09-11", "21:15", "experience", "practice", 4, 69, null, GONE, "2026-09-26"],
  ["2026-09-06", "20:40", "cs", "practice", 5, 64, null, ENERGY, "2026-09-21"],
  ["2026-09-01", "19:50", "experience", "practice", 5, 67, null, GONE, "2026-09-16"],
  ["2026-08-27", "21:45", "cs", "practice", 3, 61, null, ENERGY, "2026-09-11"],
  ["2026-08-22", "20:10", "experience", "practice", 5, 66, null, GONE, "2026-09-06"],
  ["2026-08-17", "19:20", "experience", "practice", 3, 63, null, GONE, "2026-09-01"],
];

export const SAMPLE_ID = "demo-sample";
const idOf = (index: number) => (index === 0 ? SAMPLE_ID : `demo-rec-${index}`);

/** groupNames는 지금 있는 서류 그룹의 이름. 지운 그룹은 지웠다고 보여 준다 */
export function demoRecords(groupNames: Map<string, string>): InterviewRecord[] {
  return ROWS.map(([date, time, type, mode, count, score, groupId, groupName, deleteAfter, title], index) => {
    const startedAt = demoTime(date, time);
    return {
      id: idOf(index),
      title: title ?? defaultTitle(startedAt),
      type,
      mode,
      count,
      score,
      groupId: groupId && groupNames.has(groupId) ? groupId : null,
      groupName: groupId ? (groupNames.get(groupId) ?? GONE) : groupName,
      startedAt,
      deleteAfter: demoDate(deleteAfter),
    };
  });
}
