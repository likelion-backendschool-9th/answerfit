import { PERIODS, PREVIOUS_LABEL, type Period } from "@/features/interview/records";
import { lowestOf, RADAR_MAX, RADAR_OVERFLOW, radarCategories, radarPoint, type CategoryScore } from "@/features/member/learning";
import { cn } from "@/lib/cn";
import styles from "./CategoryRadar.module.css";

const RADIUS = 110;
/** 바깥부터 100, 75, 50, 25점 */
const RINGS = [100, 75, 50, 25];
/** 분야 이름을 놓는 바깥 원의 반지름. 이름은 이 원 위에 가운데 정렬한다 */
const LABEL_AT = 140;

/**
 * 꼭짓점 수 = 분야 수(3~10개). 각도는 360° ÷ n, 첫 축은 12시 방향.
 * 10개를 넘으면 응시 횟수가 많은 8개만 그리고, 전체는 옆의 목록에서 본다. 3개보다 적으면 그리지 않는다.
 * 값은 옆의 막대 목록에도 있어 그림은 장식으로 둔다
 */
export function CategoryRadar({ categories, period }: { categories: CategoryScore[]; period: Period }) {
  const shown = radarCategories(categories);
  if (shown.length === 0) return null;
  const count = shown.length;
  const lowest = lowestOf(shown)?.name;
  const at = (index: number, value: number) => radarPoint(index, count, value, RADIUS);
  const polygon = (values: number[]) => values.map((value, i) => `${at(i, value).x},${at(i, value).y}`).join(" ");
  const before = shown.map(({ previous }) => previous);
  const hasBefore = before.every((value) => value !== null);

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <h3 className={styles.title}>
          CS 카테고리별 <span className={styles.count}>{categories.length}개 카테고리</span>
        </h3>
        <ul className={styles.legend}>
          <li className={styles.now}>{PERIODS[period]}</li>
          {hasBefore && <li className={styles.past}>{PREVIOUS_LABEL[period]}</li>}
        </ul>
      </div>
      {categories.length > RADAR_MAX && <p className={styles.note}>응시가 많은 {RADAR_OVERFLOW}개만 그렸어요. 전체는 오른쪽 목록에서 볼 수 있어요.</p>}
      <svg className={styles.radar} viewBox="-215 -165 430 330" aria-hidden="true">
        {RINGS.map((value) => (
          <polygon key={value} className={styles.grid} points={polygon(shown.map(() => value))} />
        ))}
        {shown.map(({ name }, i) => (
          <line key={name} className={styles.grid} x1="0" y1="0" x2={at(i, 100).x} y2={at(i, 100).y} />
        ))}
        {hasBefore && <polygon className={styles.before} points={polygon(before.map((value) => value ?? 0))} />}
        <polygon className={styles.area} points={polygon(shown.map(({ score }) => score))} />
        {shown.map(({ name, score, previous }, i) => (
          <circle key={name} className={styles.point} cx={at(i, score).x} cy={at(i, score).y} r="4">
            <title>{`${name} ${score}점${previous === null ? "" : ` (${PREVIOUS_LABEL[period]} ${previous}점)`}`}</title>
          </circle>
        ))}
        {shown.map(({ name }, i) => {
          const { x, y } = radarPoint(i, count, 100, LABEL_AT);
          return (
            <text key={name} x={x} y={y} textAnchor="middle" dominantBaseline="central" className={cn(styles.name, name === lowest && styles.weak)}>
              {name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
