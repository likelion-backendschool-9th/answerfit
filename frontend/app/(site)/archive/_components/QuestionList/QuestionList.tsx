import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import type { ArchiveQuestion } from "@/features/question/types";
import { LikeButton } from "../LikeButton/LikeButton";
import styles from "./QuestionList.module.css";

export function QuestionList({ items }: { items: ArchiveQuestion[] }) {
  return (
    <ul className={styles.list}>
      {items.map(({ id, category, text, likes, liked, mine }) => (
        <li key={id} className={styles.row}>
          <div className={styles.text}>
            <p className={styles.category}>{category}</p>
            <Link href={PATHS.question(id)} className={styles.question}>
              {text}
            </Link>
            <p className={styles.meta}>
              {mine && "내가 등록 · "}좋아요 {likes}
            </p>
          </div>
          <LikeButton id={id} liked={liked} likes={likes} />
        </li>
      ))}
    </ul>
  );
}
