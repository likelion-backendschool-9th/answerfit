import Image from "next/image";
import Link from "next/link";
import styles from "./BrandLogo.module.css";

export function BrandLogo() {
  return (
    <Link href="/" className={styles.logo} aria-label="ANSWERFIT 홈">
      <Image src="/brand/logo-light.png" alt="" width={28} height={28} />
      <span className={styles.word} aria-hidden="true">
        ANSWER<span className={styles.fit}>FIT</span>
      </span>
    </Link>
  );
}
