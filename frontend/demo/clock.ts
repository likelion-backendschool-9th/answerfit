import { addDays, daysUntil } from "@/features/interview/result";
import { todayInSeoul } from "@/features/interview/setup";

/** 목업을 만든 날. 시연 데이터의 날짜는 이 날을 기준으로 적는다 */
const MADE_ON = "2026-11-25";

/** 발표 날에도 "이번 달" 기록이 보이도록, 지난 날수만큼 날짜를 옮긴다 */
export function demoDate(date: string) {
  return addDays(date, Math.max(0, daysUntil(todayInSeoul(new Date()), MADE_ON)));
}

/** 한국 시각을 ISO로 */
export const demoTime = (date: string, time: string) => new Date(`${demoDate(date)}T${time}:00+09:00`).toISOString();
