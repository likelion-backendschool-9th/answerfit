import { cn } from "@/lib/cn";
import styles from "./SectionHeading.module.css";

type Props = { id: string; eyebrow: string; title: string; description: string; dark?: boolean };

export function SectionHeading({ id, eyebrow, title, description, dark }: Props) {
  return (
    <div className={cn(dark && styles.dark)}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 id={id} className={styles.title}>
        {title}
      </h2>
      <p className={styles.description}>{description}</p>
    </div>
  );
}
