import { usedTags } from "@/features/experience/rules";
import type { Experience } from "@/features/experience/types";
import styles from "./CompetencyMatrix.module.css";

/** 경험(행) × 역량 태그(열). 칸의 숫자는 그 역량으로 나눠 쓴 역량 행 수다. 어떤 역량을 뒷받침할 경험이 비어 있는지 본다 */
export function CompetencyMatrix({ items }: { items: Experience[] }) {
  const tags = usedTags(items);
  if (tags.length === 0) return <p className={styles.empty}>태그를 단 경험이 없어요. 표에서 역량 태그를 골라 보세요.</p>;
  const count = (item: Experience, tag: string) => item.stories.filter((story) => story.tags.includes(tag)).length;
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">경험</th>
            {tags.map((tag) => (
              <th key={tag} scope="col">
                {tag} <span className={styles.count}>{items.filter((item) => count(item, tag) > 0).length}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <th scope="row">{item.title || "제목 없음"}</th>
              {tags.map((tag) => {
                const stories = count(item, tag);
                return (
                  <td key={tag} aria-label={stories ? `역량 행 ${stories}개` : "없음"}>
                    {stories > 0 && <span className={styles.mark}>{stories}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
