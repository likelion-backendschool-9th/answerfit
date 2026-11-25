import type { ComponentProps } from "react";
import { Icon } from "../Icon/Icon";
import styles from "./SelectField.module.css";

type Props = Omit<ComponentProps<"select">, "className"> & { label: string; options: Record<string, string> };

export function SelectField({ label, options, ...props }: Props) {
  return (
    <span className={styles.wrap}>
      <select className={styles.select} aria-label={label} {...props}>
        {Object.entries(options).map(([value, name]) => (
          <option key={value} value={value}>
            {name}
          </option>
        ))}
      </select>
      <Icon name="down" size={16} />
    </span>
  );
}
