import styles from "./StepHeading.module.css";

/** 단계가 바뀌면 초점을 받으므로 tabIndex를 둔다 */
export function StepHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className={styles.heading}>
      <h1 className={styles.title} tabIndex={-1}>
        {title}
      </h1>
      <p className={styles.description}>{description}</p>
    </div>
  );
}
