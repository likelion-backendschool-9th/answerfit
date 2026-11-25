import styles from "./PhotoChoice.module.css";

const ICONS = {
  person: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2",
  camera: "M3 8a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8ZM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
};

type Props = { title: string; description: string; icon: keyof typeof ICONS; preview?: string; checked: boolean; onSelect: () => void };

export function PhotoChoice({ title, description, icon, preview, checked, onSelect }: Props) {
  return (
    <label className={styles.choice}>
      <span className={styles.avatar}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- 아직 올리지 않은 파일이라 이미지 최적화를 쓸 수 없다
          <img src={preview} alt="" className={styles.preview} />
        ) : (
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={ICONS[icon]} />
          </svg>
        )}
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.description}>{description}</span>
      </span>
      <input type="radio" name="photoChoice" className={styles.input} checked={checked} onChange={onSelect} />
      <svg className={styles.mark} viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10.25" />
        {checked && <path d="m8.5 12.5 2.5 2.5 4.5-5" />}
      </svg>
    </label>
  );
}
