import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon/Icon";
import type { CameraStatus } from "@/features/interview/useCamera";
import { cn } from "@/lib/cn";
import styles from "./DeviceRow.module.css";

type State = CameraStatus | "soon";
const LABEL: Record<State, string> = { pending: "확인 중", ready: "연결됨", denied: "권한 없음", missing: "연결 안 됨", soon: "준비 중" };
const ICON: Record<State, IconName> = { pending: "circle", ready: "check", denied: "error", missing: "error", soon: "circle" };

type Props = { icon: IconName; name: string; description: string; title?: string; state?: State; children?: ReactNode };

export function DeviceRow({ icon, name, description, title, state, children }: Props) {
  return (
    <div className={styles.row} title={title || undefined}>
      <Icon name={icon} />
      <div className={styles.text}>
        <p className={styles.name}>{name}</p>
        <p className={styles.description}>{description}</p>
      </div>
      {children}
      {state && (
        <p className={cn(styles.state, styles[state])}>
          <Icon name={ICON[state]} /> {LABEL[state]}
        </p>
      )}
    </div>
  );
}
