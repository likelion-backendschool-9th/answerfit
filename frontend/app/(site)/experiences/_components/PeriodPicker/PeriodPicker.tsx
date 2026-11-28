import { TextField } from "@/components/ui/TextField/TextField";
import { periodError } from "@/features/experience/rules";
import type { Experience } from "@/features/experience/types";
import styles from "./PeriodPicker.module.css";

type Period = Pick<Experience, "startedOn" | "endedOn">;

/** 브라우저 달력을 쓴다. 종료일을 비우면 진행 중이다 */
export function PeriodPicker({ value, onChange }: { value: Period; onChange: (value: Period) => void }) {
  const error = periodError(value.startedOn, value.endedOn);
  return (
    <div className={styles.picker}>
      <TextField label="시작일" type="date" value={value.startedOn ?? ""} max={value.endedOn ?? undefined} onChange={(event) => onChange({ ...value, startedOn: event.target.value || null })} />
      <TextField
        label="종료일"
        type="date"
        value={value.endedOn ?? ""}
        min={value.startedOn ?? undefined}
        error={error ?? undefined}
        hint="비우면 진행 중으로 표시돼요"
        onChange={(event) => onChange({ ...value, endedOn: event.target.value || null })}
      />
    </div>
  );
}
