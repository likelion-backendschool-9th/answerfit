import { cn } from "@/lib/cn";
import { Icon, type IconName } from "../Icon/Icon";
import styles from "./ChoiceCard.module.css";

type Props = {
  name: string;
  title: string;
  description: string;
  icon: IconName;
  /** 아이콘 대신 보여 줄 이미지 주소 */
  preview?: string;
  checked: boolean;
  /** locked는 아직 열리지 않은 선택지, error는 고를 수 없는 이유가 있는 선택지 */
  state?: "locked" | "error";
  onSelect: () => void;
};

export function ChoiceCard({ name, title, description, icon, preview, checked, state, onSelect }: Props) {
  const mark: IconName = state === "locked" ? "lock" : state === "error" ? "error" : checked ? "check" : "circle";
  return (
    <label className={cn(styles.choice, state && styles[state])}>
      <span className={styles.avatar}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- 아직 올리지 않은 파일이라 이미지 최적화를 쓸 수 없다
          <img src={preview} alt="" className={styles.preview} />
        ) : (
          <Icon name={icon} />
        )}
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.description}>{description}</span>
      </span>
      <input type="radio" name={name} className={styles.input} checked={checked} disabled={Boolean(state)} onChange={onSelect} />
      <span className={styles.mark}>
        <Icon name={mark} />
      </span>
    </label>
  );
}
