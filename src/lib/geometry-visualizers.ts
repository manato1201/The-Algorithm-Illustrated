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

// ============================================================
// RANSAC (ransac)
// ============================================================

export const RANSAC_POINTS: GeometryPoint[] = [
  { id: "P0", x: 0, y: 1.1 },
  { id: "P1", x: 2, y: 2.0 },
  { id: "P2", x: 4, y: 2.9 },
  { id: "P3", x: 6, y: 4.05 },
  { id: "P4", x: 8, y: 4.9 },
  { id: "P5", x: 10, y: 6.1 },
  { id: "P6", x: 1, y: 8 },
  { id: "P7", x: 7, y: 0.4 },
  { id: "P8", x: 3, y: 9.2 },
  { id: "P9", x: 9, y: 0.8 },
];
const RANSAC_ITERATIONS = 8;
const RANSAC_THRESHOLD = 0.6;

/** 固定シードの線形合同法による疑似乱数生成器(0〜1未満)。再現性のため乱数は決定的にする。 */
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** 点pと、点a,bを通る直線との距離。 */
function pointLineDistance(p: GeometryPoint, a: GeometryPoint, b: GeometryPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1e-9;
  return Math.abs(dx * (a.y - p.y) - dy * (a.x - p.x)) / len;
}

/**
 * RANSACのステップ列を生成する。10点(直線にほぼ乗る6点+外れ値4点)から、毎回2点を
 * ランダムサンプリングして直線モデルを仮定し(fit_line相当)、残りの全点との距離が
 * 閾値以下ならインライアとしてカウントする(全点への当てはめ評価)。指定反復回数のうち
 * インライア数が最大だったモデルを最終的な結果として採用する。乱数は固定シードの
 * 線形合同法で決定的に生成するため、実行するたびに同じ結果になる。
 */
export function ransacSteps(): GeometryFrame[] {
  const points = RANSAC_POINTS;
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);
  const rng = seededRandom(1);

  frames.push(frame(states, [], `${points.length}点(直線にほぼ乗る点と外れ値が混在)からRANSACで直線モデルを推定する`));

  let bestCount = -1;
  let bestPair: [number, number] = [0, 1];
  let bestInlierIds: string[] = [];

  for (let iter = 1; iter <= RANSAC_ITERATIONS; iter++) {
    const i = Math.floor(rng() * points.length);
    let j = Math.floor(rng() * points.length);
    while (j === i) j = Math.floor(rng() * points.length);
    const a = points[i];
    const b = points[j];

    for (const p of points) states[p.id] = bestInlierIds.includes(p.id) ? "hull" : "idle";
    states[a.id] = "candidate";
    states[b.id] = "candidate";
    frames.push(
      frame(
        states,
        [{ from: a.id, to: b.id, state: "active" }],
        `反復${iter}/${RANSAC_ITERATIONS}: 点${a.id},${b.id}をランダムサンプリングし、この2点を通る直線を仮定する`,
      ),
    );

    let inlierCount = 0;
    const inlierIds: string[] = [];
    for (const p of points) {
      if (pointLineDistance(p, a, b) <= RANSAC_THRESHOLD) {
        inlierCount++;
        inlierIds.push(p.id);
      }
    }

    if (inlierCount > bestCount) {
      bestCount = inlierCount;
      bestPair = [i, j];
      bestInlierIds = inlierIds;
      for (const p of points) states[p.id] = inlierIds.includes(p.id) ? "hull" : "idle";
      frames.push(
        frame(
          states,
          [{ from: a.id, to: b.id, state: "active" }],
          `インライア数${inlierCount}(過去最高) → このモデルを最良として更新する`,
        ),
      );
    } else {
      frames.push(
        frame(
          states,
          [{ from: a.id, to: b.id, state: "rejected" }],
          `インライア数${inlierCount}(これまでの最良${bestCount}を超えない) → このモデルは採用しない`,
        ),
      );
    }
  }

  const [bi, bj] = bestPair;
  for (const p of points) states[p.id] = bestInlierIds.includes(p.id) ? "hull" : "rejected";
  frames.push(
    frame(
      states,
      [{ from: points[bi].id, to: points[bj].id, state: "final" }],
      `${RANSAC_ITERATIONS}反復完了。最良モデル(インライア数${bestCount})を採用する。仕上げに全インライアで最小二乗法により再推定すると、さらに精度の高い結果が得られる`,
    ),
  );

  return frames;
}

// ============================================================
// FABRIK法(逆運動学) (fabrik-ik) / CCD法(逆運動学) (inverse-kinematics-ccd) 共通
// ============================================================

type Vec2 = { x: number; y: number };

function vecDist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ============================================================
// FABRIK法(逆運動学) (fabrik-ik)
// ============================================================

/** fixedを中心に、oldSelfへ向かう方向を保ったまま距離lengthの位置へ点を再配置する。 */
function fabrikPlaceAt(fixed: Vec2, oldSelf: Vec2, length: number): Vec2 {
  const d = vecDist(fixed, oldSelf) || 1e-9;
  const t = length / d;
  return { x: fixed.x + (oldSelf.x - fixed.x) * t, y: fixed.y + (oldSelf.y - fixed.y) * t };
}

const FABRIK_ROOT: Vec2 = { x: 0, y: 0 };
const FABRIK_LENGTHS = [2, 2, 2];
const FABRIK_TARGET: Vec2 = { x: 3, y: 4 };
const FABRIK_INITIAL: Vec2[] = [
  { x: 0, y: 0 },
  { x: 2, y: 0 },
  { x: 4, y: 0 },
  { x: 6, y: 0 },
];

/** FABRIK法の1反復(前方反応+後方反応)を実行し、前方・後方それぞれの中間関節位置を返す。 */
function fabrikIterate(
  chain: Vec2[],
  lengths: number[],
  root: Vec2,
  target: Vec2,
): { forward: Vec2[]; backward: Vec2[] } {
  const n = chain.length;
  const forward = chain.map((p) => ({ ...p }));
  forward[n - 1] = { ...target };
  for (let i = n - 2; i >= 0; i--) {
    forward[i] = fabrikPlaceAt(forward[i + 1], chain[i], lengths[i]);
  }
  const backward = forward.map((p) => ({ ...p }));
  backward[0] = { ...root };
  for (let i = 1; i < n; i++) {
    backward[i] = fabrikPlaceAt(backward[i - 1], forward[i], lengths[i - 1]);
  }
  return { forward, backward };
}

const FABRIK_TRACE = fabrikIterate(FABRIK_INITIAL, FABRIK_LENGTHS, FABRIK_ROOT, FABRIK_TARGET);

export const FABRIK_POINTS: GeometryPoint[] = [
  { id: "root", x: FABRIK_ROOT.x, y: FABRIK_ROOT.y },
  { id: "target", x: FABRIK_TARGET.x, y: FABRIK_TARGET.y },
  { id: "init_1", x: FABRIK_INITIAL[1].x, y: FABRIK_INITIAL[1].y },
  { id: "init_2", x: FABRIK_INITIAL[2].x, y: FABRIK_INITIAL[2].y },
  { id: "init_3", x: FABRIK_INITIAL[3].x, y: FABRIK_INITIAL[3].y },
  { id: "F_0", x: FABRIK_TRACE.forward[0].x, y: FABRIK_TRACE.forward[0].y },
  { id: "F_1", x: FABRIK_TRACE.forward[1].x, y: FABRIK_TRACE.forward[1].y },
  { id: "F_2", x: FABRIK_TRACE.forward[2].x, y: FABRIK_TRACE.forward[2].y },
  { id: "B_1", x: FABRIK_TRACE.backward[1].x, y: FABRIK_TRACE.backward[1].y },
  { id: "B_2", x: FABRIK_TRACE.backward[2].x, y: FABRIK_TRACE.backward[2].y },
  { id: "B_3", x: FABRIK_TRACE.backward[3].x, y: FABRIK_TRACE.backward[3].y },
];

/**
 * FABRIK法(逆運動学)のステップ列を生成する。4関節(root固定、リンク長2,2,2)のチェーンを、
 * 末端を目標へ強制移動してから根本へ向かって骨の長さを保ちながら位置をずらす「前方反応」、
 * 根本を元の位置へ戻してから末端へ向かって同様にずらす「後方反応」を1回ずつ行うことで、
 * 行列計算を一切使わずに目標近傍まで収束させる。
 */
export function fabrikIkSteps(): GeometryFrame[] {
  const points = FABRIK_POINTS;
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);
  const segs: GeometrySegment[] = [
    { from: "root", to: "init_1", state: "active" },
    { from: "init_1", to: "init_2", state: "active" },
    { from: "init_2", to: "init_3", state: "active" },
  ];
  frames.push(frame(states, segs, "初期姿勢: root(固定)から3リンク(各長さ2)の腕。目標targetへ到達させたい"));

  states.target = "current";
  const totalLength = FABRIK_LENGTHS.reduce((sum, v) => sum + v, 0);
  const rootToTarget = vecDist(FABRIK_ROOT, FABRIK_TARGET);
  frames.push(
    frame(
      states,
      segs,
      `到達可能判定: 全リンク長の合計${totalLength} ≥ root-target間の距離${rootToTarget.toFixed(2)} → 到達可能`,
    ),
  );

  states.init_3 = "rejected";
  states.F_2 = "candidate";
  segs.length = 0;
  segs.push(
    { from: "root", to: "init_1", state: "active" },
    { from: "init_1", to: "init_2", state: "active" },
    { from: "target", to: "F_2", state: "active" },
  );
  frames.push(frame(states, segs, "前方反応(Forward Reaching): 末端p3をtargetへ強制的に移動し、p2をtargetからリンク長2だけ離れた位置(元のp2への方向線上)へ再配置"));

  states.init_2 = "rejected";
  states.F_1 = "candidate";
  segs.length = 0;
  segs.push(
    { from: "root", to: "init_1", state: "active" },
    { from: "init_1", to: "F_1", state: "active" },
    { from: "F_1", to: "F_2", state: "active" },
  );
  frames.push(frame(states, segs, "p1を、新しいp2からリンク長2だけ離れた位置へ再配置"));

  states.init_1 = "rejected";
  states.F_0 = "candidate";
  segs.length = 0;
  segs.push({ from: "F_0", to: "F_1", state: "active" }, { from: "F_1", to: "F_2", state: "active" });
  frames.push(frame(states, segs, "p0(root)を、新しいp1からリンク長2だけ離れた位置へ再配置(その結果rootが元の位置からずれてしまう)"));

  states.root = "current";
  segs.length = 0;
  frames.push(frame(states, segs, "後方反応(Backward Reaching): rootを元の位置へ強制的に戻す"));

  states.B_1 = "hull";
  segs.push({ from: "root", to: "B_1", state: "active" });
  frames.push(frame(states, segs, "p1を、rootからリンク長2だけ離れた位置(前方反応後のp1への方向線上)へ再配置"));

  states.B_2 = "hull";
  segs.push({ from: "B_1", to: "B_2", state: "active" });
  frames.push(frame(states, segs, "p2を、新しいp1からリンク長2だけ離れた位置へ再配置"));

  states.B_3 = "hull";
  segs.push({ from: "B_2", to: "B_3", state: "active" });
  const finalDist = vecDist(FABRIK_TRACE.backward[3], FABRIK_TARGET);
  frames.push(
    frame(states, segs, `p3(末端)を、新しいp2からリンク長2だけ離れた位置へ再配置。目標との残り距離は約${finalDist.toFixed(2)}`),
  );

  for (const s of segs) s.state = "final";
  states.target = "hull";
  frames.push(
    frame(
      states,
      segs,
      `1反復(前方+後方)が完了。実際にはこれを目標との距離が十分小さくなるまで繰り返す(この例ではリンク長6に対し1回の反復で誤差約${finalDist.toFixed(2)}まで収束した)`,
    ),
  );

  return frames;
}

// ============================================================
// CCD法(Cyclic Coordinate Descent)による逆運動学 (inverse-kinematics-ccd)
// ============================================================

function ccdRotateAround(pivot: Vec2, point: Vec2, angle: number): Vec2 {
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
}

/** pivotから見て、現在のエンドエフェクタ方向から目標方向までの符号付き回転角。 */
function ccdAngleBetween(pivot: Vec2, effector: Vec2, target: Vec2): number {
  const a1 = Math.atan2(effector.y - pivot.y, effector.x - pivot.x);
  const a2 = Math.atan2(target.y - pivot.y, target.x - pivot.x);
  return a2 - a1;
}

const CCD_ROOT: Vec2 = { x: 0, y: 0 };
const CCD_TARGET: Vec2 = { x: 3, y: 4 };
const CCD_INITIAL: Vec2[] = [
  { x: 0, y: 0 },
  { x: 2, y: 0 },
  { x: 4, y: 0 },
  { x: 6, y: 0 },
];

/**
 * CCD法で1イテレーション(末端に近い関節p2から根本p0へ向かって1関節ずつ回転)を実行し、
 * 各関節を軸にした回転直後のチェーン全体のスナップショットを、処理順に返す。
 */
function ccdIterate(chain: Vec2[], target: Vec2): Vec2[][] {
  const snapshots: Vec2[][] = [];
  let current = chain.map((p) => ({ ...p }));
  for (let pivotIndex = current.length - 2; pivotIndex >= 0; pivotIndex--) {
    const pivot = current[pivotIndex];
    const effector = current[current.length - 1];
    const angle = ccdAngleBetween(pivot, effector, target);
    const next = current.map((p) => ({ ...p }));
    for (let j = pivotIndex + 1; j < next.length; j++) {
      next[j] = ccdRotateAround(pivot, current[j], angle);
    }
    snapshots.push(next);
    current = next;
  }
  return snapshots;
}

// snapshots[0]: p2を軸に回転した直後、snapshots[1]: p1を軸に回転した直後、snapshots[2]: p0を軸に回転した直後
const CCD_SNAPSHOTS = ccdIterate(CCD_INITIAL, CCD_TARGET);

export const CCD_POINTS: GeometryPoint[] = [
  { id: "root", x: CCD_ROOT.x, y: CCD_ROOT.y },
  { id: "target", x: CCD_TARGET.x, y: CCD_TARGET.y },
  { id: "init_1", x: CCD_INITIAL[1].x, y: CCD_INITIAL[1].y },
  { id: "init_2", x: CCD_INITIAL[2].x, y: CCD_INITIAL[2].y },
  { id: "init_3", x: CCD_INITIAL[3].x, y: CCD_INITIAL[3].y },
  { id: "A_3", x: CCD_SNAPSHOTS[0][3].x, y: CCD_SNAPSHOTS[0][3].y },
  { id: "B_2", x: CCD_SNAPSHOTS[1][2].x, y: CCD_SNAPSHOTS[1][2].y },
  { id: "B_3", x: CCD_SNAPSHOTS[1][3].x, y: CCD_SNAPSHOTS[1][3].y },
  { id: "C_1", x: CCD_SNAPSHOTS[2][1].x, y: CCD_SNAPSHOTS[2][1].y },
  { id: "C_2", x: CCD_SNAPSHOTS[2][2].x, y: CCD_SNAPSHOTS[2][2].y },
  { id: "C_3", x: CCD_SNAPSHOTS[2][3].x, y: CCD_SNAPSHOTS[2][3].y },
];

/**
 * CCD法(Cyclic Coordinate Descent)による逆運動学のステップ列を生成する。4関節
 * (root固定、リンク長2,2,2)のチェーンに対し、エンドエフェクタに最も近い関節p2から
 * 根本p0へ向かって1関節ずつ、「現在のエンドエフェクタへのベクトル」と「目標へのベクトル」の
 * なす角度だけ回転させていく。FABRIK法と異なり全関節を同時には動かさず、1関節ずつ
 * 貪欲にエンドエフェクタを目標へ近づける。
 */
export function inverseKinematicsCcdSteps(): GeometryFrame[] {
  const points = CCD_POINTS;
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);
  const segs: GeometrySegment[] = [
    { from: "root", to: "init_1", state: "active" },
    { from: "init_1", to: "init_2", state: "active" },
    { from: "init_2", to: "init_3", state: "active" },
  ];
  frames.push(frame(states, segs, "初期姿勢: root(固定)から3リンク(各長さ2)の腕。目標targetへ到達させたい"));

  states.target = "current";
  const rootToTarget = vecDist(CCD_ROOT, CCD_TARGET);
  frames.push(frame(states, segs, `到達可能判定: 全リンク長の合計6 ≥ root-target間の距離${rootToTarget.toFixed(2)} → 到達可能`));

  states.init_2 = "current";
  frames.push(frame(states, segs, "エンドエフェクタに最も近い関節p2を軸に選ぶ(1イテレーションの最初の関節)"));

  states.init_3 = "rejected";
  states.A_3 = "candidate";
  segs.length = 0;
  segs.push(
    { from: "root", to: "init_1", state: "active" },
    { from: "init_1", to: "init_2", state: "active" },
    { from: "init_2", to: "A_3", state: "active" },
  );
  frames.push(
    frame(states, segs, "p2から見た「現在のエンドエフェクタ方向」と「目標方向」のなす角だけ回転させ、末端p3を新しい位置へ動かす"),
  );

  states.init_2 = "rejected";
  states.init_1 = "current";
  frames.push(frame(states, segs, "1つ根本側の関節p1に処理を移す"));

  states.A_3 = "rejected";
  states.B_2 = "candidate";
  states.B_3 = "candidate";
  segs.length = 0;
  segs.push(
    { from: "root", to: "init_1", state: "active" },
    { from: "init_1", to: "B_2", state: "active" },
    { from: "B_2", to: "B_3", state: "active" },
  );
  frames.push(
    frame(states, segs, "p1から見た現在のエンドエフェクタ方向と目標方向のなす角だけ、p1より末端側(p2,p3)を回転させる"),
  );

  states.init_1 = "rejected";
  states.root = "current";
  frames.push(frame(states, segs, "根本p0に処理を移す(このイテレーションの最後の関節)"));

  states.B_2 = "rejected";
  states.B_3 = "rejected";
  states.C_1 = "hull";
  states.C_2 = "hull";
  states.C_3 = "hull";
  segs.length = 0;
  segs.push(
    { from: "root", to: "C_1", state: "active" },
    { from: "C_1", to: "C_2", state: "active" },
    { from: "C_2", to: "C_3", state: "active" },
  );
  const finalDist = vecDist(CCD_SNAPSHOTS[2][3], CCD_TARGET);
  frames.push(
    frame(states, segs, `p0から見た方向のなす角だけp1・p2・p3を回転させる。1イテレーション完了。目標との残り距離は約${finalDist.toFixed(2)}`),
  );

  for (const s of segs) s.state = "final";
  frames.push(
    frame(
      states,
      segs,
      "目標との距離が十分小さくなるか最大反復回数に達するまでこれを繰り返す(FABRIK法と比べ、収束はやや遅く関節が振れ回るように動くことがある)",
    ),
  );

  return frames;
}

// ============================================================
// フラスタムカリング(Frustum Culling) (frustum-culling)
// ============================================================

const FRUSTUM_NEAR = 2;
const FRUSTUM_FAR = 12;
const FRUSTUM_HALF_FOV_TAN = 0.7;

const FRUSTUM_OBJECTS: { id: string; x: number; y: number }[] = [
  { id: "O1", x: 5, y: 1 },
  { id: "O2", x: 8, y: -2 },
  { id: "O3", x: 1, y: 0.5 },
  { id: "O4", x: 15, y: 3 },
  { id: "O5", x: 6, y: 5 },
  { id: "O6", x: -3, y: 1 },
  { id: "O7", x: 9, y: -6 },
  { id: "O8", x: 4, y: 3 },
  { id: "O9", x: 5, y: -4 },
];

export const FRUSTUM_POINTS: GeometryPoint[] = [
  { id: "camera", x: 0, y: 0 },
  { id: "near_l", x: FRUSTUM_NEAR, y: FRUSTUM_NEAR * FRUSTUM_HALF_FOV_TAN },
  { id: "near_r", x: FRUSTUM_NEAR, y: -FRUSTUM_NEAR * FRUSTUM_HALF_FOV_TAN },
  { id: "far_l", x: FRUSTUM_FAR, y: FRUSTUM_FAR * FRUSTUM_HALF_FOV_TAN },
  { id: "far_r", x: FRUSTUM_FAR, y: -FRUSTUM_FAR * FRUSTUM_HALF_FOV_TAN },
  ...FRUSTUM_OBJECTS.map((o) => ({ id: o.id, x: o.x, y: o.y })),
];

type FrustumPlaneCheck = { name: string; test: (p: { x: number; y: number }) => boolean };
/** カメラ原点・+x方向注視の単純化した2Dフラスタム(near/far平面+上下2平面の計4枚)。 */
const FRUSTUM_PLANES: FrustumPlaneCheck[] = [
  { name: "near", test: (p) => p.x >= FRUSTUM_NEAR },
  { name: "far", test: (p) => p.x <= FRUSTUM_FAR },
  { name: "upper", test: (p) => p.y <= p.x * FRUSTUM_HALF_FOV_TAN },
  { name: "lower", test: (p) => p.y >= -p.x * FRUSTUM_HALF_FOV_TAN },
];
const FRUSTUM_PLANE_LABEL: Record<string, string> = {
  near: "near平面(近すぎる/カメラの後ろ)",
  far: "far平面(遠すぎる)",
  upper: "上側の側面",
  lower: "下側の側面",
};

/**
 * フラスタムカリング(Frustum Culling)のステップ列を生成する。カメラ原点から+x方向を見る
 * 単純化した2D視錐台(near/far平面+上下2平面の計4枚)に対し、各オブジェクトの座標を
 * 平面ごとに順番にテストする。1枚でも「外側」と判定されればその時点で打ち切り、
 * 全ての平面で内側と判定されたオブジェクトだけを可視として描画対象に残す。
 */
export function frustumCullingSteps(): GeometryFrame[] {
  const points = FRUSTUM_POINTS;
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);
  states.camera = "current";
  const segs: GeometrySegment[] = [
    { from: "near_l", to: "near_r", state: "final" },
    { from: "near_l", to: "far_l", state: "final" },
    { from: "near_r", to: "far_r", state: "final" },
    { from: "far_l", to: "far_r", state: "final" },
  ];

  frames.push(
    frame(
      states,
      segs,
      `カメラ(原点、+x方向を注視)の視錐台(near=${FRUSTUM_NEAR}, far=${FRUSTUM_FAR})に対し、${FRUSTUM_OBJECTS.length}個のオブジェクトを検査する`,
    ),
  );

  const visibleIds: string[] = [];
  for (const obj of FRUSTUM_OBJECTS) {
    states[obj.id] = "candidate";
    frames.push(frame(states, segs, `オブジェクト${obj.id}(${obj.x},${obj.y})を検査開始`));

    let culledBy: string | null = null;
    for (const plane of FRUSTUM_PLANES) {
      if (!plane.test(obj)) {
        culledBy = plane.name;
        break;
      }
    }

    if (culledBy) {
      states[obj.id] = "rejected";
      frames.push(frame(states, segs, `${FRUSTUM_PLANE_LABEL[culledBy]}の外側と判定 → この時点で打ち切り、描画対象から除外`));
    } else {
      states[obj.id] = "hull";
      visibleIds.push(obj.id);
      frames.push(frame(states, segs, "4枚の平面全てで内側と判定 → 可視、描画対象に加える"));
    }
  }

  frames.push(
    frame(
      states,
      segs,
      `検査完了。可視オブジェクト: ${visibleIds.join(", ")}(${FRUSTUM_OBJECTS.length}個中${visibleIds.length}個)`,
    ),
  );

  return frames;
}

export const GEOMETRY_DATASETS: Record<string, GeometryDataset> = {
  "graham-scan": { points: HULL_POINTS },
  "jarvis-march": { points: HULL_POINTS },
  "reciprocal-velocity-obstacles": { points: RVO_POINTS },
  "voronoi-path-planning": { points: VORONOI_PATH_POINTS },
  ransac: { points: RANSAC_POINTS },
  "fabrik-ik": { points: FABRIK_POINTS },
  "inverse-kinematics-ccd": { points: CCD_POINTS },
  "frustum-culling": { points: FRUSTUM_POINTS },
};

export const GEOMETRY_VISUALIZERS: Record<string, () => GeometryFrame[]> = {
  "graham-scan": grahamScanSteps,
  "jarvis-march": jarvisMarchSteps,
  "reciprocal-velocity-obstacles": reciprocalVelocityObstaclesSteps,
  "voronoi-path-planning": voronoiPathPlanningSteps,
  ransac: ransacSteps,
  "fabrik-ik": fabrikIkSteps,
  "inverse-kinematics-ccd": inverseKinematicsCcdSteps,
  "frustum-culling": frustumCullingSteps,
};
