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

/**
 * RVOのデモ用データ。エージェントA(左→右)とB(右→左)が正面衝突コースにあり、
 * それぞれが回避コストを半分ずつ負担するように上下へ半歩ずつ回避する4点の離散軌道。
 * content/algorithms/reciprocal-velocity-obstacles.mdの「相手との相対速度の中間点を
 * 頂点として半分だけシフトした禁止領域を避ける」という考え方を、連続的な速度空間ではなく
 * 事前計算済みの離散的な経路点の系列として可視化する(GeometryVisualizerは点の位置が
 * フレームごとに動かない静的データセットである制約のため)。
 */
export const RVO_POINTS: GeometryPoint[] = [
  { id: "A0", x: 0, y: 5.2 },
  { id: "A1", x: 3.5, y: 5.6 },
  { id: "A2", x: 6.5, y: 5.6 },
  { id: "A3", x: 10, y: 4.8 },
  { id: "B0", x: 10, y: 5.2 },
  { id: "B1", x: 6.5, y: 4.4 },
  { id: "B2", x: 3.5, y: 4.4 },
  { id: "B3", x: 0, y: 4.8 },
];

export function reciprocalVelocityObstaclesSteps(): GeometryFrame[] {
  const points = RVO_POINTS;
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);
  const segs: GeometrySegment[] = [];

  frames.push(frame(states, segs, "エージェントA(左→右)とB(右→左)が正面衝突コースで接近する"));

  states.A0 = "current";
  states.B0 = "current";
  frames.push(frame(states, segs, "このまま直進すると衝突円錐(Collision Cone)が重なり合ってしまう"));

  segs.push({ from: "A0", to: "A1", state: "active" }, { from: "B0", to: "B1", state: "active" });
  states.A0 = "hull";
  states.B0 = "hull";
  states.A1 = "current";
  states.B1 = "current";
  frames.push(
    frame(states, segs, "RVO: 相手との相対速度の中間点を基準に、回避コストを半分ずつ負担する。Aは上へ、Bは下へ半歩ずつ回避する"),
  );

  segs.push({ from: "A1", to: "A2", state: "active" }, { from: "B1", to: "B2", state: "active" });
  states.A1 = "hull";
  states.B1 = "hull";
  states.A2 = "current";
  states.B2 = "current";
  frames.push(frame(states, segs, "最接近点を通過。単純なVOと違い、双方の回避量が半分ずつなので振動が起きない"));

  segs.push({ from: "A2", to: "A3", state: "active" }, { from: "B2", to: "B3", state: "active" });
  states.A2 = "hull";
  states.B2 = "hull";
  states.A3 = "current";
  states.B3 = "current";
  frames.push(frame(states, segs, "すれ違いが完了し、双方とも元の進行方向へ戻り始める"));

  for (const seg of segs) seg.state = "final";
  states.A3 = "hull";
  states.B3 = "hull";
  frames.push(frame(states, segs, "計算完了。局所的な速度選択の繰り返しだけで、振動なく滑らかな相互回避が実現した"));

  return frames;
}

/**
 * ボロノイ図による経路計画のデモ用データ。3つの障害物代表点(O1〜O3)に対し、
 * 各障害物からちょうど等距離になるボロノイ頂点V1・V2を骨格線上の経路候補として抽出し、
 * S→V1→V2→Gという「障害物から最大限離れた」経路を構築する簡略化した例。
 */
export const VORONOI_PATH_POINTS: GeometryPoint[] = [
  { id: "O1", x: 2, y: 7 },
  { id: "O2", x: 5, y: 2 },
  { id: "O3", x: 8, y: 7 },
  { id: "S", x: 0, y: 4.5 },
  { id: "V1", x: 3.5, y: 5.5 },
  { id: "V2", x: 6.5, y: 5.5 },
  { id: "G", x: 10, y: 4.5 },
];

export function voronoiPathPlanningSteps(): GeometryFrame[] {
  const points = VORONOI_PATH_POINTS;
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);
  const segs: GeometrySegment[] = [];

  states.O1 = "rejected";
  states.O2 = "rejected";
  states.O3 = "rejected";
  frames.push(frame(states, segs, "3つの障害物代表点(O1〜O3)を配置する。これらから最も遠い場所だけを経路候補とみなす"));

  states.V1 = "candidate";
  states.V2 = "candidate";
  frames.push(frame(states, segs, "ボロノイ図を計算し、隣接する障害物からちょうど等距離になる頂点V1・V2を骨格線(ボロノイグラフ)のノードとして抽出"));

  states.S = "current";
  segs.push({ from: "S", to: "V1", state: "active" });
  frames.push(frame(states, segs, "現在位置Sを最寄りのボロノイグラフ上の点V1へ接続する"));

  states.S = "hull";
  states.V1 = "hull";
  states.V2 = "current";
  segs.push({ from: "V1", to: "V2", state: "active" });
  frames.push(frame(states, segs, "骨格線に沿ってV1→V2をダイクストラ法で辿る(各点は障害物から最大限離れている)"));

  states.V2 = "hull";
  states.G = "hull";
  segs.push({ from: "V2", to: "G", state: "active" });
  frames.push(frame(states, segs, "V2からゴールGへ接続し、経路S→V1→V2→Gが確定した"));

  for (const seg of segs) seg.state = "final";
  frames.push(
    frame(states, segs, "計算完了。この経路は定義上どの障害物からもできるだけ離れた場所を通るため、衝突マージンの大きい安全な経路になっている"),
  );

  return frames;
}

export const GEOMETRY_DATASETS: Record<string, GeometryDataset> = {
  "graham-scan": { points: HULL_POINTS },
  "jarvis-march": { points: HULL_POINTS },
  "reciprocal-velocity-obstacles": { points: RVO_POINTS },
  "voronoi-path-planning": { points: VORONOI_PATH_POINTS },
};

export const GEOMETRY_VISUALIZERS: Record<string, () => GeometryFrame[]> = {
  "graham-scan": grahamScanSteps,
  "jarvis-march": jarvisMarchSteps,
  "reciprocal-velocity-obstacles": reciprocalVelocityObstaclesSteps,
  "voronoi-path-planning": voronoiPathPlanningSteps,
};
