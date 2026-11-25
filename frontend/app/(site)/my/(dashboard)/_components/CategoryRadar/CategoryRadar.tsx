import { PERIODS, PREVIOUS_LABEL, type Period } from "@/features/interview/records";
import { radarPoint, weakest, type CategoryScore } from "@/features/member/learning";
import { cn } from "@/lib/cn";
import styles from "./CategoryRadar.module.css";

const RADIUS = 120;
/** 바깥부터 100점, 75점 */
const RINGS = [100, 75];
const LABEL_AT = 128;

/** 값은 옆의 막대 목록에도 있어 그림은 장식으로 둔다 */
export function CategoryRadar({ categories, period }: { categories: CategoryScore[]; period: Period }) {
  const count = categories.length;
  const weak = new Set(weakest(categories).slice(0, 1).map(({ name }) => name));
  const at = (index: number, value: number) => radarPoint(index, count, value, RADIUS);
  const polygon = (values: number[]) => values.map((value, i) => `${at(i, value).x},${at(i, value).y}`).join(" ");
  const before = categories.map(({ previous }) => previous);
  const hasBefore = before.every((value) => value !== null);

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <h3 className={styles.title}>
          CS 카테고리별 <span className={styles.count}>{count}개 카테고리</span>
        </h3>
        <ul className={styles.legend}>
          <li className={styles.now}>{PERIODS[period]}</li>
          {hasBefore && <li className={styles.past}>{PREVIOUS_LABEL[period]}</li>}
        </ul>
      </div>
      <svg className={styles.radar} viewBox="-200 -180 400 360" aria-hidden="true">
        {RINGS.map((value) => (
          <polygon key={value} className={styles.grid} points={polygon(categories.map(() => value))} />
        ))}
        {categories.map(({ name }, i) => (
          <line key={name} className={styles.grid} x1="0" y1="0" x2={at(i, 100).x} y2={at(i, 100).y} />
        ))}
        {hasBefore && <polygon className={styles.before} points={polygon(before.map((value) => value ?? 0))} />}
        <polygon className={styles.area} points={polygon(categories.map(({ score }) => score))} />
        {categories.map(({ name, score, previous }, i) => (
          <circle key={name} className={styles.point} cx={at(i, score).x} cy={at(i, score).y} r="4">
            <title>{`${name} ${score}점${previous === null ? "" : ` (${PREVIOUS_LABEL[period]} ${previous}점)`}`}</title>
          </circle>
        ))}
        {categories.map(({ name, score }, i) => {
          const { x, y } = radarPoint(i, count, 100, LABEL_AT);
          const anchor = Math.abs(x) < 1 ? "middle" : x > 0 ? "start" : "end";
          const shift = y < -LABEL_AT + 1 ? -22 : y > LABEL_AT - 1 ? 16 : y * 0.06;
          return (
            <text key={name} x={x} y={y + shift} textAnchor={anchor} className={cn(styles.name, weak.has(name) && styles.weak)}>
              {name}
              <tspan x={x} dy="19" className={styles.score}>
                {score}
              </tspan>
            </text>
          );
        })}
      </svg>
    </div>
  );
}
