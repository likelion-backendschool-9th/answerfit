const RINGS = 9;
const SPACING = 8.3;

const round = (value: number) => Math.round(value * 100) / 100;

/** 길이가 0인 선을 둥근 끝으로 그리면 점이 된다. 점 수백 개를 path 하나로 그린다 */
export function ellipseDots(cx: number, cy: number, rx: number, ry: number, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    return `M${round(cx + rx * Math.cos(angle))} ${round(cy + ry * Math.sin(angle))}h0`;
  }).join("");
}

function ring(index: number) {
  const rx = 11.6 * index;
  const ry = 15.1 * index;
  const around = Math.PI * 2 * Math.sqrt((rx * rx + ry * ry) / 2);
  return ellipseDots(110, 141 + index * 0.5, rx, ry, Math.round(around / SPACING));
}

const rings = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => ring(from + i)).join("");

/** 안쪽 고리는 굵고 바깥 두 고리는 가늘다 */
export const INNER_DOTS = rings(1, RINGS - 2);
export const OUTER_DOTS = rings(RINGS - 1, RINGS);
/** 입꼬리가 올라간 점 10개 */
export const MOUTH_DOTS = Array.from({ length: 10 }, (_, i) => `M${round(90 + i * 4.4)} ${round(175 + Math.sin((i / 9) * Math.PI) * 5)}h0`).join("");
export const EYE_DOTS = ellipseDots(75, 126, 9, 5, 10) + ellipseDots(145, 126, 9, 5, 10);
