import type {
  GeometryDataset,
  GeometryFrame,
  GeometryPoint,
  GeometryPointState,
  GeometrySegment,
} from "./geometry-visualizers";

/**
 * 幾何kindの可視化のうち、geometry-visualizers.ts の外に置いたもの(同ファイルが Object.assign で登録する)。
 *  - ラマー・ダグラス・ポイカー法: 折れ線の両端を結ぶ弦から最も遠い点を調べ、許容誤差を超えたらそこで二分して再帰する
 */

// ===========================================================================
// ラマー・ダグラス・ポイカー法
// ===========================================================================

export const RDP_EPSILON = 0.8;
const RDP_COORDS: [number, number][] = [
  [0, 0],
  [1, 0.4],
  [2, -0.3],
  [3, 0.2],
  [4, 3],
  [5, 5.5],
  [6, 5.8],
  [7, 5.3],
  [8, 5.6],
  [9, 8.5],
  [10, 9.6],
  [11, 9.4],
];
export const RDP_POINTS: GeometryPoint[] = RDP_COORDS.map(([x, y], i) => ({
  id: `P${i}`,
  x,
  y,
}));

/** 点 p から、a-b を通る直線までの垂直距離。a=b なら a からの距離。 */
export function lineDistance(
  p: GeometryPoint,
  a: GeometryPoint,
  b: GeometryPoint,
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dy * (p.x - a.x) - dx * (p.y - a.y)) / length;
}

export function ramerDouglasPeuckerSteps(): GeometryFrame[] {
  const pts = RDP_POINTS;
  const n = pts.length;
  const eps = RDP_EPSILON;
  const kept = new Set<number>([0, n - 1]);
  const dropped = new Set<number>();
  const finals: GeometrySegment[] = [];
  const original: GeometrySegment[] = pts
    .slice(1)
    .map((p, i) => ({ from: pts[i].id, to: p.id, state: "rejected" }));
  const frames: GeometryFrame[] = [];

  const push = (
    range: [number, number] | null,
    active: [number, number] | null,
    current: number | null,
    description: string,
  ) => {
    const pointStates: Record<string, GeometryPointState> = {};
    pts.forEach((p, i) => {
      if (kept.has(i)) pointStates[p.id] = "hull";
      else if (dropped.has(i)) pointStates[p.id] = "rejected";
      else if (range && i >= range[0] && i <= range[1])
        pointStates[p.id] = "candidate";
      else pointStates[p.id] = "idle";
    });
    if (current !== null) pointStates[pts[current].id] = "current";
    const segments: GeometrySegment[] = [...original, ...finals];
    if (active)
      segments.push({
        from: pts[active[0]].id,
        to: pts[active[1]].id,
        state: "active",
      });
    frames.push({ pointStates, segments, description });
  };

  push(
    null,
    null,
    null,
    `${n}個の点の折れ線を、許容誤差 ε=${eps} で簡略化する。両端を弦で結び、弦から最も遠い点が ε 以内なら間の点は全部捨て、超えるならその点を残して二分する(最初から描かれている細かい線が元の折れ線)`,
  );
  const simplify = (lo: number, hi: number) => {
    push([lo, hi], [lo, hi], null, `範囲 P${lo}〜P${hi}: 両端を弦で結ぶ`);
    if (hi - lo < 2) {
      finals.push({ from: pts[lo].id, to: pts[hi].id, state: "final" });
      push(
        [lo, hi],
        null,
        null,
        `P${lo}とP${hi}は隣り合っていて間に点がない → そのまま採用`,
      );
      return;
    }
    let far = lo + 1;
    let dmax = -1;
    for (let i = lo + 1; i < hi; i++) {
      const d = lineDistance(pts[i], pts[lo], pts[hi]);
      if (d > dmax) {
        dmax = d;
        far = i;
      }
    }
    push(
      [lo, hi],
      [lo, hi],
      far,
      `弦から最も遠い点は P${far}(距離 ${dmax.toFixed(2)})`,
    );
    if (dmax <= eps) {
      for (let i = lo + 1; i < hi; i++) dropped.add(i);
      finals.push({ from: pts[lo].id, to: pts[hi].id, state: "final" });
      push(
        [lo, hi],
        null,
        null,
        `${dmax.toFixed(2)} ≤ ε(${eps}) → 間の ${hi - lo - 1} 個(P${lo + 1}〜P${hi - 1})は不要。弦 P${lo}-P${hi} だけを残す`,
      );
    } else {
      kept.add(far);
      push(
        [lo, hi],
        null,
        null,
        `${dmax.toFixed(2)} > ε(${eps}) → P${far} は形を決める点なので残し、P${lo}〜P${far} と P${far}〜P${hi} に分けて再帰する`,
      );
      simplify(lo, far);
      simplify(far, hi);
    }
  };
  simplify(0, n - 1);
  push(
    null,
    null,
    null,
    `完了: ${n}個 → ${kept.size}個(${[...kept]
      .sort((a, b) => a - b)
      .map((i) => `P${i}`)
      .join("・")})。除外した点は、すべて弦から ε 以内に収まっている`,
  );
  return frames;
}

export const GEOMETRY_EXTRA_VISUALIZERS: Record<string, () => GeometryFrame[]> =
  {
    "ramer-douglas-peucker": ramerDouglasPeuckerSteps,
  };

export const GEOMETRY_EXTRA_DATASETS: Record<string, GeometryDataset> = {
  "ramer-douglas-peucker": { points: RDP_POINTS },
};
