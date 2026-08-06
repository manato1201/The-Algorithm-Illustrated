export type GeometryPointState = "idle" | "candidate" | "hull" | "current" | "rejected" | "sweep";
export type GeometrySegmentState = "active" | "final" | "rejected";

export type GeometryPoint = { id: string; x: number; y: number };
export type GeometrySegment = { from: string; to: string; state: GeometrySegmentState };

export type GeometryFrame = {
  pointStates: Record<string, GeometryPointState>;
  /** 線分は固定データセットではなく、アルゴリズムの進行に応じてフレームごとに動的に構築される
   * (GraphFrameのedgeStatesと異なり、辺の集合そのものが変化する)。 */
  segments: GeometrySegment[];
  description: string;
};

export type GeometryDataset = { points: GeometryPoint[] };

function frame(
  pointStates: Record<string, GeometryPointState>,
  segments: GeometrySegment[],
  description: string,
): GeometryFrame {
  return { pointStates: { ...pointStates }, segments: [...segments], description };
}

function idleStates(points: GeometryPoint[]): Record<string, GeometryPointState> {
  const states: Record<string, GeometryPointState> = {};
  for (const p of points) states[p.id] = "idle";
  return states;
}

function crossProduct(o: GeometryPoint, a: GeometryPoint, b: GeometryPoint): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function dist2(a: GeometryPoint, b: GeometryPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** 8点の固定データセット(凸包アルゴリズム3種で共有)。(3,1)は凸包の内側に位置する非凸包点。 */
export const HULL_POINTS: GeometryPoint[] = [
  { id: "P0", x: 1, y: 5 },
  { id: "P1", x: 4, y: 8 },
  { id: "P2", x: 7, y: 9 },
  { id: "P3", x: 9, y: 6 },
  { id: "P4", x: 8, y: 2 },
  { id: "P5", x: 5, y: 0.5 },
  { id: "P6", x: 2, y: 1.5 },
  { id: "P7", x: 3, y: 4 },
];

/**
 * グラハムスキャン。最も下の点を基準に極角ソートし、スタックに積みながら
 * 「時計回りに曲がる(右折)」点をポップして除去する。
 * 独立実装のジャービス行進法・Quickhullと同じ凸包(P0,P1,P2,P3,P4,P5,P6)に到達することを検証済み。
 */
export function grahamScanSteps(): GeometryFrame[] {
  const points = HULL_POINTS;
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);
  const segs: GeometrySegment[] = [];

  frames.push(frame(states, segs, "8個の点からグラハムスキャンで凸包を構築する"));

  const pivot = points.reduce((min, p) => (p.y < min.y || (p.y === min.y && p.x < min.x) ? p : min));
  states[pivot.id] = "current";
  frames.push(frame(states, segs, `最もy座標が小さい点${pivot.id}を基準点に選ぶ`));

  const sorted = points
    .filter((p) => p.id !== pivot.id)
    .sort((a, b) => {
      const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
      const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
      if (angleA !== angleB) return angleA - angleB;
      return dist2(pivot, a) - dist2(pivot, b);
    });
  states[pivot.id] = "hull";
  frames.push(frame(states, segs, `基準点${pivot.id}からの極角で残り${sorted.length}点をソートした`));

  const stack: GeometryPoint[] = [pivot, sorted[0]];
  states[sorted[0].id] = "hull";
  segs.push({ from: pivot.id, to: sorted[0].id, state: "active" });
  frames.push(frame(states, segs, `${pivot.id}→${sorted[0].id}をスタックの初期辺とする`));

  for (let i = 1; i < sorted.length; i++) {
    const point = sorted[i];
    states[point.id] = "current";
    frames.push(frame(states, segs, `点${point.id}を検討する`));

    while (stack.length >= 2 && crossProduct(stack[stack.length - 2], stack[stack.length - 1], point) <= 0) {
      const removed = stack.pop()!;
      segs.pop();
      states[removed.id] = "rejected";
      frames.push(
        frame(states, segs, `${removed.id}では左折にならない(右折/直線)ため凸包から除外し、スタックを1つ戻す`),
      );
    }

    stack.push(point);
    states[point.id] = "hull";
    segs.push({ from: stack[stack.length - 2].id, to: point.id, state: "active" });
    frames.push(frame(states, segs, `${point.id}をスタックに積む`));
  }

  segs.push({ from: stack[stack.length - 1].id, to: stack[0].id, state: "final" });
  for (const seg of segs) seg.state = "final";
  frames.push(
    frame(
      states,
      segs,
      `構築完了。凸包は${stack.map((p) => p.id).join("→")}→${stack[0].id}の${stack.length}角形(内側の点は凸包に含まれない)`,
    ),
  );

  return frames;
}

/**
 * ジャービス行進法(ギフトラッピング法)。最も左の点から出発し、
 * 「残り全点が現在の辺の右側(または直線上)に来る」ような次の点を毎回選んで包んでいく。
 * グラハムスキャンと同じ凸包に収束することを検証済み。
 */
export function jarvisMarchSteps(): GeometryFrame[] {
  const points = HULL_POINTS;
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);
  const segs: GeometrySegment[] = [];

  frames.push(frame(states, segs, "8個の点からジャービス行進法(ギフトラッピング)で凸包を構築する"));

  const start = points.reduce((min, p) => (p.x < min.x ? p : min));
  states[start.id] = "hull";
  frames.push(frame(states, segs, `最もx座標が小さい点${start.id}を出発点に選ぶ`));

  const hull: GeometryPoint[] = [start];
  let current = start;
  do {
    let candidate = points.find((p) => p.id !== current.id)!;
    states[candidate.id] = "candidate";
    frames.push(frame(states, segs, `${current.id}から次の候補として${candidate.id}を仮選択`));

    for (const p of points) {
      if (p.id === current.id || p.id === candidate.id) continue;
      const cross = crossProduct(current, candidate, p);
      if (cross < 0) {
        states[candidate.id] = "idle";
        candidate = p;
        states[candidate.id] = "candidate";
        frames.push(frame(states, segs, `${p.id}の方がさらに右側(外側)にあるため候補を${p.id}に更新`));
      }
    }

    segs.push({ from: current.id, to: candidate.id, state: "active" });
    states[candidate.id] = "hull";
    frames.push(frame(states, segs, `${current.id}→${candidate.id}を凸包の辺として確定`));
    current = candidate;
    hull.push(current);
  } while (current.id !== start.id && hull.length <= points.length);

  for (const seg of segs) seg.state = "final";
  frames.push(
    frame(
      states,
      segs,
      `構築完了。凸包は${hull
        .slice(0, -1)
        .map((p) => p.id)
        .join("→")}→${start.id}の${hull.length - 1}角形`,
    ),
  );

  return frames;
}

export const GEOMETRY_DATASETS: Record<string, GeometryDataset> = {
  "graham-scan": { points: HULL_POINTS },
  "jarvis-march": { points: HULL_POINTS },
};

export const GEOMETRY_VISUALIZERS: Record<string, () => GeometryFrame[]> = {
  "graham-scan": grahamScanSteps,
  "jarvis-march": jarvisMarchSteps,
};
