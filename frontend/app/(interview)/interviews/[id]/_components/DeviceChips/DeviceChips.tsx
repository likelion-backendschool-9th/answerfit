import { Icon, type IconName } from "@/components/ui/Icon/Icon";
import type { CameraStatus } from "@/features/interview/useCamera";
import { cn } from "@/lib/cn";
import styles from "./DeviceChips.module.css";

export function DeviceChips({ status, gazeReady }: { status: CameraStatus; gazeReady: boolean }) {
  const on = status === "ready";
  return (
    <ul className={styles.list}>
      <Chip icon="video" label="카메라" on={on} />
      <Chip icon="mic" label="마이크" on={on} />
      <Chip icon="face" label={gazeReady && on ? "시선 인식 중" : "시선 인식 꺼짐"} on={gazeReady && on} />
    </ul>
  );
}

function Chip({ icon, label, on }: { icon: IconName; label: string; on: boolean }) {
  return (
    <li className={styles.chip}>
      <Icon name={icon} size={16} /> {label}
      <span className={cn(styles.dot, on && styles.on)} />
      <span className={styles.hidden}>{on ? "켜짐" : "꺼짐"}</span>
    </li>
  );
}
