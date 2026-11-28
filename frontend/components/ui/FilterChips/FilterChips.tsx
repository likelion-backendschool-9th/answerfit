import Link from "next/link";
import styles from "./FilterChips.module.css";

/** href가 있으면 주소가 바뀌고, onSelect가 있으면 화면 안에서 고른다 */
type Chip = { label: string; count?: number; current: boolean } & ({ href: string } | { onSelect: () => void });

export function FilterChips({ label, chips }: { label: string; chips: Chip[] }) {
  const links = chips.every((chip) => "href" in chip);
  const Wrap = links ? "nav" : "div";
  return (
    <Wrap className={styles.chips} aria-label={label} role={links ? undefined : "group"}>
      {chips.map((chip) => {
        const body = (
          <>
            {chip.label} {chip.count !== undefined && <span className={styles.count}>{chip.count}</span>}
          </>
        );
        return "href" in chip ? (
          <Link key={chip.label} href={chip.href} scroll={false} className={styles.chip} aria-current={chip.current ? "page" : undefined}>
            {body}
          </Link>
        ) : (
          <button key={chip.label} type="button" className={styles.chip} aria-pressed={chip.current} onClick={chip.onSelect}>
            {body}
          </button>
        );
      })}
    </Wrap>
  );
}
