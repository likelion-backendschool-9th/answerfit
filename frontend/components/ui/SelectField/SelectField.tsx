import type { ComponentProps } from "react";
import { Icon } from "../Icon/Icon";
import styles from "./SelectField.module.css";

/** groups는 options 뒤에 묶음(optgroup)으로 붙는다 */
type Props = Omit<ComponentProps<"select">, "className"> & { label: string; options: Record<string, string>; groups?: Record<string, readonly string[]> };

export function SelectField({ label, options, groups = {}, ...props }: Props) {
  return (
    <span className={styles.wrap}>
      <select className={styles.select} aria-label={label} {...props}>
        {Object.entries(options).map(([value, name]) => (
          <option key={value} value={value}>
            {name}
          </option>
        ))}
        {Object.entries(groups).map(([group, values]) => (
          <optgroup key={group} label={group}>
            {values.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <Icon name="down" size={16} />
    </span>
  );
}
