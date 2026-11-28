import { Icon } from "@/components/ui/Icon/Icon";
import { usedTags } from "@/features/experience/rules";
import type { Experience } from "@/features/experience/types";
import styles from "./CompetencyMatrix.module.css";

/** 경험(행) × 역량 태그(열). 어떤 역량을 뒷받침할 경험이 비어 있는지 본다 */
export function CompetencyMatrix({ items }: { items: Experience[] }) {
  const tags = usedTags(items);
  if (tags.length === 0) return <p className={styles.empty}>태그를 단 경험이 없어요. 표에서 태그를 골라 보세요.</p>;
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">경험</th>
            {tags.map((tag) => (
              <th key={tag} scope="col">
                {tag} <span className={styles.count}>{items.filter((item) => item.tags.includes(tag)).length}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <th scope="row">{item.title || "제목 없음"}</th>
              {tags.map((tag) => (
                <td key={tag}>
                  {item.tags.includes(tag) && (
                    <span role="img" aria-label="있음">
                      <Icon name="tick" size={16} />
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
