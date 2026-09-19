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

// ============================================================
// Harrisコーナー検出 (harris-corner-detection)
// ============================================================

const HARRIS_ROWS = 8;
const HARRIS_COLS = 8;

/** 白い正方形(値8)を背景(値0)に置いた合成画像。正方形の4隅が真のコーナーになる。 */
const HARRIS_IMAGE: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 8, 8, 8, 8, 0, 0, 0],
  [0, 8, 8, 8, 8, 0, 0, 0],
  [0, 8, 8, 8, 8, 0, 0, 0],
  [0, 8, 8, 8, 8, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const HARRIS_K = 0.04;
const HARRIS_WINDOW = 1;
const HARRIS_THRESHOLD = 1e-6;

/** 候補点(行,列)。正方形の4隅(真のコーナー)・上辺と左辺の中間(エッジ)・
 * 正方形内部(平坦)・背景2点(平坦)を混在させ、Harrisのスコアが正しく分類できるか検証する。 */
const HARRIS_CANDIDATES: { id: string; row: number; col: number }[] = [
  { id: "TL", row: 1, col: 1 },
  { id: "TR", row: 1, col: 4 },
  { id: "BL", row: 4, col: 1 },
  { id: "BR", row: 4, col: 4 },
  { id: "TopEdge", row: 1, col: 2 },
  { id: "LeftEdge", row: 2, col: 1 },
  { id: "Interior", row: 3, col: 3 },
  { id: "Bg1", row: 0, col: 0 },
  { id: "Bg2", row: 6, col: 6 },
];

export const HARRIS_POINTS: GeometryPoint[] = HARRIS_CANDIDATES.map((p) => ({
  id: p.id,
  x: p.col,
  y: HARRIS_ROWS - 1 - p.row,
}));

/** ソーベルカーネルによる勾配Ix, Iyの計算(境界は端の画素を複製)。 */
function harrisImageGradients(img: number[][], rows: number, cols: number): { ix: number[][]; iy: number[][] } {
  const gxK = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];
  const gyK = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ];
  const ix: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const iy: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let sx = 0;
      let sy = 0;
      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 3; kx++) {
          const py = Math.min(Math.max(y + ky - 1, 0), rows - 1);
          const px = Math.min(Math.max(x + kx - 1, 0), cols - 1);
          sx += img[py][px] * gxK[ky][kx];
          sy += img[py][px] * gyK[ky][kx];
        }
      }
      ix[y][x] = sx;
      iy[y][x] = sy;
    }
  }
  return { ix, iy };
}

/** 点(row,col)を中心とするwindow内の構造テンソルからHarrisコーナー応答R = det(M) - k×trace(M)²を計算する。 */
function harrisResponseAt(
  ix: number[][],
  iy: number[][],
  row: number,
  col: number,
  rows: number,
  cols: number,
  window: number,
  k: number,
): number {
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let dy = -window; dy <= window; dy++) {
    for (let dx = -window; dx <= window; dx++) {
      const py = Math.min(Math.max(row + dy, 0), rows - 1);
      const px = Math.min(Math.max(col + dx, 0), cols - 1);
      sxx += ix[py][px] * ix[py][px];
      syy += iy[py][px] * iy[py][px];
      sxy += ix[py][px] * iy[py][px];
    }
  }
  const det = sxx * syy - sxy * sxy;
  const trace = sxx + syy;
  return det - k * trace * trace;
}

/**
 * Harrisコーナー検出のステップ列を生成する。白い正方形の合成画像上に固定した候補点それぞれについて、
 * 周囲の構造テンソル(勾配Ix, Iyから作る2×2行列)の行列式とトレースからコーナー応答スコア
 * R = det(M) - k×trace(M)²を実際に計算し、Rが正(あらゆる方向で明るさが大きく変化する)なら
 * コーナーとして確定、そうでなければエッジまたは平坦な領域として棄却する。
 */
export function harrisCornerDetectionSteps(): GeometryFrame[] {
  const points = HARRIS_POINTS;
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);
  const { ix, iy } = harrisImageGradients(HARRIS_IMAGE, HARRIS_ROWS, HARRIS_COLS);

  frames.push(
    frame(states, [], "白い正方形の合成画像上のコーナー候補点について、構造テンソルからHarrisコーナー応答Rを計算する"),
  );

  let acceptedCount = 0;
  for (const cand of HARRIS_CANDIDATES) {
    states[cand.id] = "current";
    frames.push(frame(states, [], `点${cand.id}(列${cand.col}, 行${cand.row})の周囲の構造テンソルを計算中`));

    const r = harrisResponseAt(ix, iy, cand.row, cand.col, HARRIS_ROWS, HARRIS_COLS, HARRIS_WINDOW, HARRIS_K);
    if (r > HARRIS_THRESHOLD) {
      states[cand.id] = "hull";
      acceptedCount++;
      frames.push(frame(states, [], `R=${r.toFixed(1)} > 0 → あらゆる方向で明るさが大きく変化する。コーナーとして確定`));
    } else {
      states[cand.id] = "rejected";
      frames.push(
        frame(states, [], `R=${r.toFixed(1)} ≤ 0 → 片方向のみ、または全く変化しない(エッジまたは平坦な領域)。コーナーではない`),
      );
    }
  }

  frames.push(
    frame(states, [], `計算完了。${HARRIS_CANDIDATES.length}個の候補点中${acceptedCount}個をコーナーとして検出した`),
  );
  return frames;
}

// ============================================================
// 非最大値抑制(Non-Maximum Suppression, NMS) (non-maximum-suppression)
// ============================================================

type NmsCandidate = { id: string; x: number; y: number; score: number };

/** スコア付きの重複する候補点(物体検出のバウンディングボックスの中心点を簡略化したもの)。
 * P1〜P3、P4〜P5はそれぞれ近接したクラスタで、P6は近くに重複候補のない孤立点。 */
export const NMS_CANDIDATES: NmsCandidate[] = [
  { id: "P1", x: 2.0, y: 2.0, score: 0.9 },
  { id: "P2", x: 2.6, y: 2.3, score: 0.7 },
  { id: "P3", x: 1.6, y: 1.6, score: 0.6 },
  { id: "P4", x: 7.0, y: 3.0, score: 0.85 },
  { id: "P5", x: 7.6, y: 3.4, score: 0.5 },
  { id: "P6", x: 5.0, y: 8.0, score: 0.4 },
];
export const NMS_SUPPRESSION_RADIUS = 1.5;

export const NMS_POINTS: GeometryPoint[] = NMS_CANDIDATES.map((c) => ({ id: c.id, x: c.x, y: c.y }));

/**
 * 非最大値抑制(NMS)のステップ列を生成する。矩形バウンディングボックスのIoU判定の代わりに、
 * 候補点間のユークリッド距離を「重なりの近さ」の簡略化した指標として使う——
 * スコアの高い順に採用し、採用した点から一定半径以内の未処理候補を全て抑制する、という
 * 骨格はIoU版のバウンディングボックスNMSと全く同じである。
 */
export function nonMaximumSuppressionSteps(): GeometryFrame[] {
  const points = NMS_POINTS;
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);

  frames.push(
    frame(states, [], `${NMS_CANDIDATES.length}個の重複する候補点(スコア付き)から非最大値抑制で代表点だけを残す`),
  );

  let order = [...NMS_CANDIDATES].sort((a, b) => b.score - a.score);
  const kept: string[] = [];
  const suppressed = new Set<string>();

  while (order.length > 0) {
    const current = order[0];
    states[current.id] = "current";
    frames.push(frame(states, [], `残りの候補中スコア最大の点${current.id}(スコア${current.score})を採用する`));
    states[current.id] = "hull";
    kept.push(current.id);

    const rest = order.slice(1);
    const toSuppress = rest.filter((c) => Math.hypot(c.x - current.x, c.y - current.y) <= NMS_SUPPRESSION_RADIUS);
    for (const c of toSuppress) {
      suppressed.add(c.id);
      states[c.id] = "rejected";
    }
    frames.push(
      frame(
        states,
        [],
        toSuppress.length > 0
          ? `${current.id}から半径${NMS_SUPPRESSION_RADIUS}以内の候補(${toSuppress.map((c) => c.id).join(", ")})を重複として抑制`
          : `${current.id}の近傍に重複する候補はなかった`,
      ),
    );
    order = rest.filter((c) => !suppressed.has(c.id));
  }

  frames.push(
    frame(states, [], `計算完了。${NMS_CANDIDATES.length}個中${kept.length}個(${kept.join(", ")})を代表点として残した`),
  );
  return frames;
}

// ============================================================
// ハフ変換 (hough-transform)
// ============================================================

/** 直線x=3上に並ぶ5点(L1〜L5)+その直線から外れた2つの外れ値(N1, N2)。
 * 垂直線はy=mx+bでは表現できない(mが無限大になる)ため、極座標形式r=x・cosθ+y・sinθを
 * 使うハフ変換の利点を体感しやすい例として垂直線を選んでいる。 */
const HOUGH_POINTS_DATA: { id: string; x: number; y: number }[] = [
  { id: "L1", x: 3, y: 1 },
  { id: "L2", x: 3, y: 3 },
  { id: "L3", x: 3, y: 5 },
  { id: "L4", x: 3, y: 7 },
  { id: "L5", x: 3, y: 9 },
  { id: "N1", x: 1, y: 8 },
  { id: "N2", x: 8, y: 2 },
];

export const HOUGH_POINTS: GeometryPoint[] = HOUGH_POINTS_DATA.map((p) => ({ id: p.id, x: p.x, y: p.y }));

const HOUGH_THETA_STEPS = 180;
const HOUGH_R_BIN_SIZE = 0.5;

/**
 * ハフ変換のステップ列を生成する。各点が、通りうる全ての直線のパラメータ(r, θ)空間
 * (θを0〜180度で分割したアキュムレータ)へ投票する。同一直線上にある点は同じ(r, θ)の
 * ビンへ繰り返し投票するため、その得票数が積み上がる——最多得票のパラメータを、
 * 実際に投票した点(インライア)とともに検出された直線として報告する。
 */
export function houghTransformSteps(): GeometryFrame[] {
  const points = HOUGH_POINTS;
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);

  frames.push(
    frame(states, [], `${HOUGH_POINTS_DATA.length}個の点(直線状に並ぶ点+外れ値)から、ハフ変換で直線を検出する`),
  );

  const voteCount = new Map<string, number>();
  const voteParams = new Map<string, { rBin: number; theta: number }>();

  for (const p of HOUGH_POINTS_DATA) {
    states[p.id] = "current";
    for (let t = 0; t < HOUGH_THETA_STEPS; t++) {
      const theta = (Math.PI * t) / HOUGH_THETA_STEPS;
      const r = p.x * Math.cos(theta) + p.y * Math.sin(theta);
      const rBin = Math.round(r / HOUGH_R_BIN_SIZE);
      const key = `${rBin},${t}`;
      voteCount.set(key, (voteCount.get(key) ?? 0) + 1);
      voteParams.set(key, { rBin, theta });
    }
    frames.push(
      frame(states, [], `点${p.id}(${p.x}, ${p.y})が、通りうる全ての直線(${HOUGH_THETA_STEPS}方向)のパラメータ空間に投票`),
    );
    states[p.id] = "idle";
  }

  let bestKey = "";
  let bestVotes = -1;
  for (const [key, votes] of voteCount) {
    if (votes > bestVotes) {
      bestVotes = votes;
      bestKey = key;
    }
  }
  const best = voteParams.get(bestKey)!;
  const bestThetaDeg = (best.theta * 180) / Math.PI;
  const bestR = best.rBin * HOUGH_R_BIN_SIZE;
  frames.push(
    frame(
      states,
      [],
      `投票完了。最多得票のパラメータ(θ≈${bestThetaDeg.toFixed(0)}°, r≈${bestR.toFixed(1)})が${bestVotes}票を獲得`,
    ),
  );

  const inlierIds: string[] = [];
  for (const p of HOUGH_POINTS_DATA) {
    const r = p.x * Math.cos(best.theta) + p.y * Math.sin(best.theta);
    const rBin = Math.round(r / HOUGH_R_BIN_SIZE);
    if (rBin === best.rBin) inlierIds.push(p.id);
  }

  for (const p of HOUGH_POINTS_DATA) {
    states[p.id] = inlierIds.includes(p.id) ? "hull" : "rejected";
  }

  let segFrom = inlierIds[0] ?? "";
  let segTo = inlierIds[0] ?? "";
  let maxDist = -1;
  for (const a of inlierIds) {
    for (const b of inlierIds) {
      const pa = HOUGH_POINTS_DATA.find((p) => p.id === a)!;
      const pb = HOUGH_POINTS_DATA.find((p) => p.id === b)!;
      const d = Math.hypot(pa.x - pb.x, pa.y - pb.y);
      if (d > maxDist) {
        maxDist = d;
        segFrom = a;
        segTo = b;
      }
    }
  }

  const segments: GeometrySegment[] = inlierIds.length >= 2 ? [{ from: segFrom, to: segTo, state: "final" }] : [];
  frames.push(
    frame(
      states,
      segments,
      `このパラメータに投票した点(${inlierIds.join(", ")})が検出された直線上の点。それ以外(${HOUGH_POINTS_DATA.filter((p) => !inlierIds.includes(p.id)).map((p) => p.id).join(", ")})は外れ値として除外`,
    ),
  );

  return frames;
}

// ============================================================
// Andrewのモノトーンチェイン法(凸包) (andrews-monotone-chain)
// ============================================================

/**
 * Andrewのモノトーンチェイン法。点をx座標(同点ならy座標)で昇順ソートし、
 * 先頭から順に「下側の鎖」を、末尾から逆順に「上側の鎖」を、それぞれグラハムスキャンと
 * 同じ要領(直近2点との外積で左折にならなければpopする)で独立に構築する。
 * HULL_POINTSを使うグラハムスキャン・ジャービス行進法と同じ凸包(P0,P1,P2,P3,P4,P5,P6)に
 * 到達することを確認済み。
 */
export function andrewsMonotoneChainSteps(): GeometryFrame[] {
  const points = HULL_POINTS;
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);
  const segs: GeometrySegment[] = [];

  frames.push(frame(states, segs, "8個の点からAndrewのモノトーンチェイン法で凸包を構築する"));

  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  frames.push(
    frame(states, segs, `全ての点をx座標(同じxならy座標)の昇順でソートした: ${sorted.map((p) => p.id).join("→")}`),
  );

  // 下側の鎖(先頭から順に走査)
  const lower: GeometryPoint[] = [];
  for (const p of sorted) {
    states[p.id] = "current";
    frames.push(frame(states, segs, `下側の鎖: 点${p.id}を検討する`));
    while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      const removed = lower.pop()!;
      segs.pop();
      states[removed.id] = "rejected";
      frames.push(frame(states, segs, `${removed.id}では左折にならない(右折/直線)ため下側の鎖から除外`));
    }
    if (lower.length > 0) segs.push({ from: lower[lower.length - 1].id, to: p.id, state: "active" });
    lower.push(p);
    states[p.id] = "hull";
    frames.push(frame(states, segs, `${p.id}を下側の鎖に積む`));
  }
  frames.push(frame(states, segs, `下側の鎖が完成: ${lower.map((p) => p.id).join("→")}`));

  // 上側の鎖(末尾から逆順に走査)。可視化を分かりやすくするため点の状態を一旦リセットする。
  for (const p of points) states[p.id] = "idle";
  const upperSegs: GeometrySegment[] = [];
  const upper: GeometryPoint[] = [];
  const reversedSorted = [...sorted].reverse();
  for (const p of reversedSorted) {
    states[p.id] = "current";
    frames.push(frame(states, [...segs, ...upperSegs], `上側の鎖: 点${p.id}を検討する`));
    while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      const removed = upper.pop()!;
      upperSegs.pop();
      states[removed.id] = points.some((pt) => pt.id === removed.id) && lower.includes(removed) ? "hull" : "idle";
      frames.push(frame(states, [...segs, ...upperSegs], `${removed.id}では左折にならない(右折/直線)ため上側の鎖から除外`));
    }
    if (upper.length > 0) upperSegs.push({ from: upper[upper.length - 1].id, to: p.id, state: "active" });
    upper.push(p);
    states[p.id] = "hull";
    frames.push(frame(states, [...segs, ...upperSegs], `${p.id}を上側の鎖に積む`));
  }
  frames.push(frame(states, [...segs, ...upperSegs], `上側の鎖が完成: ${upper.map((p) => p.id).join("→")}`));

  // 両端の重複点(各鎖の始点・終点)を除いて連結する
  const hullSequence = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  const hullIds = new Set(hullSequence.map((p) => p.id));
  const finalSegs: GeometrySegment[] = hullSequence.map((p, i) => ({
    from: p.id,
    to: hullSequence[(i + 1) % hullSequence.length].id,
    state: "final",
  }));
  for (const p of points) states[p.id] = hullIds.has(p.id) ? "hull" : "rejected";
  frames.push(
    frame(
      states,
      finalSegs,
      `下側の鎖と上側の鎖(両端の重複点を除く)を連結して構築完了。凸包は${hullSequence.map((p) => p.id).join("→")}→${hullSequence[0].id}の${hullSequence.length}角形`,
    ),
  );

  return frames;
}

// ============================================================
// クイックハル(QuickHull) (quickhull)
// ============================================================

/**
 * クイックハル。最も左右の点A,Bを結ぶ直線で点集合を2グループに分け、各グループについて
 * 「直線から最も遠い点C」を見つけて凸包の頂点として確定し、三角形ABCの内部の点を除外しながら
 * 2つの部分問題(直線AC側・直線BC側)に再帰的に分割していく。HULL_POINTSに対して
 * グラハムスキャン・ジャービス行進法・モノトーンチェイン法と同じ凸包(P0〜P6の7角形、
 * 内側のP7は除外)に到達することを検証済み。
 */
export function quickhullSteps(): GeometryFrame[] {
  const points = HULL_POINTS;
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);
  const segs: GeometrySegment[] = [];
  const hullIds: string[] = [];

  frames.push(frame(states, segs, "8個の点からクイックハルで凸包を構築する"));

  const leftmost = points.reduce((min, p) => (p.x < min.x ? p : min));
  const rightmost = points.reduce((max, p) => (p.x > max.x ? p : max));
  states[leftmost.id] = "hull";
  states[rightmost.id] = "hull";
  hullIds.push(leftmost.id, rightmost.id);
  segs.push({ from: leftmost.id, to: rightmost.id, state: "active" });
  frames.push(
    frame(states, segs, `最も左の点${leftmost.id}と最も右の点${rightmost.id}を結ぶ直線で点集合を2グループに分割する`),
  );

  const upperGroup = points.filter((p) => crossProduct(leftmost, rightmost, p) > 0);
  const lowerGroup = points.filter((p) => crossProduct(leftmost, rightmost, p) < 0);

  function findHull(subset: GeometryPoint[], a: GeometryPoint, b: GeometryPoint, label: string): void {
    if (subset.length === 0) return;

    let farthest = subset[0];
    let farthestDist = Math.abs(crossProduct(a, b, farthest));
    for (const p of subset) {
      const d = Math.abs(crossProduct(a, b, p));
      if (d > farthestDist) {
        farthest = p;
        farthestDist = d;
      }
    }
    for (const p of subset) states[p.id] = "candidate";
    frames.push(
      frame(
        states,
        segs,
        `${label}: 直線${a.id}-${b.id}から最も遠い点${farthest.id}を見つける(この点は必ず凸包の頂点になる)`,
      ),
    );

    states[farthest.id] = "hull";
    hullIds.push(farthest.id);
    const parentEdgeIdx = segs.findIndex(
      (s) => (s.from === a.id && s.to === b.id) || (s.from === b.id && s.to === a.id),
    );
    if (parentEdgeIdx >= 0) segs.splice(parentEdgeIdx, 1);
    segs.push({ from: a.id, to: farthest.id, state: "active" }, { from: farthest.id, to: b.id, state: "active" });
    for (const p of subset) if (p.id !== farthest.id) states[p.id] = "idle";
    frames.push(frame(states, segs, `${farthest.id}を凸包の頂点として確定し、三角形${a.id}-${farthest.id}-${b.id}を作る`));

    const rest = subset.filter((p) => p.id !== farthest.id);
    const leftA = rest.filter((p) => crossProduct(a, farthest, p) > 0);
    const leftB = rest.filter((p) => crossProduct(farthest, b, p) > 0);
    const inside = rest.filter((p) => !leftA.includes(p) && !leftB.includes(p));
    if (inside.length > 0) {
      for (const p of inside) states[p.id] = "rejected";
      frames.push(
        frame(states, segs, `三角形の内部にある点(${inside.map((p) => p.id).join(", ")})は凸包に寄与しないため除外`),
      );
    }

    findHull(leftA, a, farthest, label);
    findHull(leftB, farthest, b, label);
  }

  findHull(upperGroup, leftmost, rightmost, "上側");
  findHull(lowerGroup, rightmost, leftmost, "下側");

  for (const seg of segs) seg.state = "final";
  frames.push(frame(states, segs, `構築完了。凸包の頂点: ${hullIds.join(", ")}`));

  return frames;
}

// ============================================================
// 最近点対問題 (closest-pair-of-points)
// ============================================================

export const CLOSEST_PAIR_POINTS: GeometryPoint[] = [
  { id: "P0", x: 0, y: 2 },
  { id: "P1", x: 1.5, y: 7 },
  { id: "P2", x: 2.5, y: 1 },
  { id: "P3", x: 3.9, y: 5 },
  { id: "P4", x: 4.1, y: 5.3 },
  { id: "P5", x: 6, y: 8 },
  { id: "P6", x: 7.5, y: 2 },
  { id: "P7", x: 9, y: 6 },
];

type ClosestPairResult = { a: GeometryPoint; b: GeometryPoint; dist: number };

function bruteForceClosestPair(pts: GeometryPoint[]): ClosestPairResult {
  let best: ClosestPairResult = { a: pts[0], b: pts[1], dist: Math.sqrt(dist2(pts[0], pts[1])) };
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = Math.sqrt(dist2(pts[i], pts[j]));
      if (d < best.dist) best = { a: pts[i], b: pts[j], dist: d };
    }
  }
  return best;
}

/**
 * 最近点対問題を分割統治で解く。x座標でソート済みの点列を左右に分割し、それぞれの最近点対を
 * 再帰的に求める。左右の最良距離dのうち小さい方を暫定候補とし、分割線からd未満の帯(strip)に
 * 入る点だけをy座標順に並べて追加チェックすることで、分割線をまたぐペアを見落とさずに
 * O(n log n)で最近点対を求める。P3-P4(距離0.36)が左右の分割線をまたぐ真の最近点対になるよう
 * データセットを設計しており、帯チェックが実際に必要になることを示す。
 */
export function closestPairOfPointsSteps(): GeometryFrame[] {
  const points = [...CLOSEST_PAIR_POINTS].sort((a, b) => a.x - b.x);
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);
  const segs: GeometrySegment[] = [];

  frames.push(frame(states, segs, `${points.length}個の点をx座標でソートし、分割統治で最近点対を求める`));

  function solve(pts: GeometryPoint[], depth: number): ClosestPairResult {
    for (const p of pts) states[p.id] = "candidate";
    frames.push(frame(states, segs, `深さ${depth}: ${pts.map((p) => p.id).join(",")}(${pts.length}点)を処理する`));

    if (pts.length <= 3) {
      const best = bruteForceClosestPair(pts);
      for (const p of pts) states[p.id] = "idle";
      frames.push(
        frame(
          states,
          segs,
          `深さ${depth}: 点数が少ないため総当りで最近点対を求める(${best.a.id}-${best.b.id}, 距離${best.dist.toFixed(2)})`,
        ),
      );
      return best;
    }

    const mid = Math.floor(pts.length / 2);
    const midX = pts[mid].x;
    const left = pts.slice(0, mid);
    const right = pts.slice(mid);
    frames.push(
      frame(
        states,
        segs,
        `深さ${depth}: x=${midX.toFixed(1)}付近で左半分(${left.map((p) => p.id).join(",")})と右半分(${right.map((p) => p.id).join(",")})に分割`,
      ),
    );

    const bestLeft = solve(left, depth + 1);
    const bestRight = solve(right, depth + 1);
    let best = bestLeft.dist <= bestRight.dist ? bestLeft : bestRight;
    for (const p of pts) states[p.id] = "candidate";
    frames.push(
      frame(
        states,
        segs,
        `深さ${depth}: 左の最良(${bestLeft.a.id}-${bestLeft.b.id}, ${bestLeft.dist.toFixed(2)})と右の最良(${bestRight.a.id}-${bestRight.b.id}, ${bestRight.dist.toFixed(2)})のうち小さい方 d=${best.dist.toFixed(2)} を暫定候補とする`,
      ),
    );

    const strip = pts.filter((p) => Math.abs(p.x - midX) < best.dist).sort((a, b) => a.y - b.y);
    for (const p of pts) states[p.id] = "idle";
    for (const p of strip) states[p.id] = "sweep";
    frames.push(
      frame(
        states,
        segs,
        `深さ${depth}: 分割線からd=${best.dist.toFixed(2)}以内の帯(strip)にある点(${strip.map((p) => p.id).join(",") || "なし"})だけを追加チェックする`,
      ),
    );

    for (let i = 0; i < strip.length; i++) {
      for (let j = i + 1; j < strip.length && strip[j].y - strip[i].y < best.dist; j++) {
        const d = Math.sqrt(dist2(strip[i], strip[j]));
        segs.push({ from: strip[i].id, to: strip[j].id, state: d < best.dist ? "active" : "rejected" });
        frames.push(frame(states, segs, `深さ${depth}: 帯内の${strip[i].id}と${strip[j].id}の距離${d.toFixed(2)}を確認`));
        if (d < best.dist) {
          best = { a: strip[i], b: strip[j], dist: d };
          frames.push(frame(states, segs, `深さ${depth}: 新しい最良距離 d=${d.toFixed(2)}(${strip[i].id}-${strip[j].id})に更新`));
        }
        segs.pop();
      }
    }

    for (const p of pts) states[p.id] = "idle";
    frames.push(frame(states, segs, `深さ${depth}: この範囲での最近点対は${best.a.id}-${best.b.id}(距離${best.dist.toFixed(2)})`));
    return best;
  }

  const result = solve(points, 0);

  states[result.a.id] = "hull";
  states[result.b.id] = "hull";
  segs.push({ from: result.a.id, to: result.b.id, state: "final" });
  frames.push(frame(states, segs, `構築完了。全体の最近点対は${result.a.id}-${result.b.id}(距離${result.dist.toFixed(2)})`));

  return frames;
}

// ============================================================
// ドロネー三角形分割 (delaunay-triangulation)
// ============================================================

export const DELAUNAY_POINTS: GeometryPoint[] = [
  { id: "D0", x: 1, y: 1 },
  { id: "D1", x: 8, y: 1.5 },
  { id: "D2", x: 9, y: 6 },
  { id: "D3", x: 4, y: 8 },
  { id: "D4", x: 1, y: 6 },
  { id: "D5", x: 5, y: 4 },
];

type DTriangle = { verts: [GeometryPoint, GeometryPoint, GeometryPoint] };

/** 三角形tの外接円の内部に点pが含まれるか(ドロネー条件の違反判定)。 */
function circumcircleContainsPoint(t: DTriangle, p: GeometryPoint): boolean {
  const [a, b, c] = t.verts;
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-9) return false;
  const a2 = a.x * a.x + a.y * a.y;
  const b2 = b.x * b.x + b.y * b.y;
  const c2 = c.x * c.x + c.y * c.y;
  const ux = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
  const uy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
  const r2 = (a.x - ux) ** 2 + (a.y - uy) ** 2;
  const pd2 = (p.x - ux) ** 2 + (p.y - uy) ** 2;
  return pd2 < r2 - 1e-9;
}

function triangleEdges(t: DTriangle): [GeometryPoint, GeometryPoint][] {
  const [a, b, c] = t.verts;
  return [
    [a, b],
    [b, c],
    [c, a],
  ];
}

function edgeKey(a: GeometryPoint, b: GeometryPoint): string {
  return [a.id, b.id].sort().join("-");
}

const DELAUNAY_SUPER_A: GeometryPoint = { id: "__super_a", x: -100, y: -100 };
const DELAUNAY_SUPER_B: GeometryPoint = { id: "__super_b", x: 100, y: -100 };
const DELAUNAY_SUPER_C: GeometryPoint = { id: "__super_c", x: 0, y: 200 };

function isSuperVertex(p: GeometryPoint): boolean {
  return p.id === DELAUNAY_SUPER_A.id || p.id === DELAUNAY_SUPER_B.id || p.id === DELAUNAY_SUPER_C.id;
}

/** 現在の三角形集合から、スーパートライアングルの頂点に触れない辺だけを重複なく取り出す(表示用)。 */
function visibleDelaunayEdges(triangles: DTriangle[]): GeometrySegment[] {
  const seen = new Set<string>();
  const segs: GeometrySegment[] = [];
  for (const t of triangles) {
    for (const [a, b] of triangleEdges(t)) {
      if (isSuperVertex(a) || isSuperVertex(b)) continue;
      const key = edgeKey(a, b);
      if (seen.has(key)) continue;
      seen.add(key);
      segs.push({ from: a.id, to: b.id, state: "active" });
    }
  }
  return segs;
}

/**
 * Bowyer-Watson法によるドロネー三角形分割。全点を包含する巨大な仮のスーパートライアングルから
 * 開始し、点を1つずつ追加するたびに「追加点を外接円の内部に含む三角形(ドロネー条件違反)」を
 * 全て削除し、その削除で生じた穴の境界を追加点へ接続して再三角形分割する。全点を追加し終えたら
 * スーパートライアングルの頂点に触れる三角形を除去して構築完了とする(表示上は最初から
 * スーパートライアングルに触れる辺を隠している)。
 */
export function delaunayTriangulationSteps(): GeometryFrame[] {
  const points = DELAUNAY_POINTS;
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);

  frames.push(frame(states, [], `${points.length}個の点から、Bowyer-Watson法でドロネー三角形分割を構築する`));

  let triangles: DTriangle[] = [{ verts: [DELAUNAY_SUPER_A, DELAUNAY_SUPER_B, DELAUNAY_SUPER_C] }];
  frames.push(frame(states, [], "全ての点を包含する巨大な仮の三角形(スーパートライアングル)を用意する(画面上には表示しない)"));

  for (const point of points) {
    states[point.id] = "current";
    frames.push(frame(states, visibleDelaunayEdges(triangles), `点${point.id}を追加する`));

    const badTriangles = triangles.filter((t) => circumcircleContainsPoint(t, point));

    const edgeCount = new Map<string, { edge: [GeometryPoint, GeometryPoint]; count: number }>();
    for (const t of badTriangles) {
      for (const e of triangleEdges(t)) {
        const key = edgeKey(e[0], e[1]);
        const existing = edgeCount.get(key);
        if (existing) existing.count++;
        else edgeCount.set(key, { edge: e, count: 1 });
      }
    }
    const boundary = [...edgeCount.values()].filter((x) => x.count === 1).map((x) => x.edge);

    frames.push(
      frame(
        states,
        visibleDelaunayEdges(triangles),
        `外接円が点${point.id}を内部に含む三角形が${badTriangles.length}個見つかった(ドロネー条件違反) → これらを削除する`,
      ),
    );

    triangles = triangles.filter((t) => !badTriangles.includes(t));
    for (const edge of boundary) {
      triangles.push({ verts: [edge[0], edge[1], point] });
    }

    states[point.id] = "hull";
    frames.push(
      frame(
        states,
        visibleDelaunayEdges(triangles),
        `削除で生じた穴の境界(${boundary.length}辺)を点${point.id}へ接続し、再三角形分割した`,
      ),
    );
  }

  triangles = triangles.filter((t) => !t.verts.some((v) => isSuperVertex(v)));
  frames.push(
    frame(
      states,
      visibleDelaunayEdges(triangles),
      `全ての点を追加し終えた。スーパートライアングルの頂点を含む三角形を除去し、構築完了(三角形${triangles.length}個)`,
    ),
  );

  return frames;
}

// ============================================================
// ボロノイ図 (voronoi-diagram)
// ============================================================

type Vec2Simple = { x: number; y: number };

const VORONOI_SITES: GeometryPoint[] = [
  { id: "S0", x: 2, y: 2 },
  { id: "S1", x: 8, y: 2 },
  { id: "S2", x: 5, y: 8 },
  { id: "S3", x: 2, y: 7 },
  { id: "S4", x: 8, y: 7 },
];

const VORONOI_BOX: Vec2Simple[] = [
  { x: -2, y: -2 },
  { x: 12, y: -2 },
  { x: 12, y: 12 },
  { x: -2, y: 12 },
];

/** 座標(小数第2位で丸め)をキーに、ボロノイ図の頂点(ボックスの角+実際の垂直二等分線の交点)へ
 * 一意のidを割り当てるレジストリ。GeometryVisualizerは固定データセットの点idしか描画できないため、
 * 計算過程で登場する全ての頂点を事前に1回シミュレートしてデータセットへ登録しておく。 */
const voronoiVertexLookup = new Map<string, string>();
const VORONOI_VERTICES: GeometryPoint[] = [];
function registerVoronoiVertex(v: Vec2Simple): string {
  const key = `${v.x.toFixed(2)},${v.y.toFixed(2)}`;
  const existing = voronoiVertexLookup.get(key);
  if (existing) return existing;
  const id = `VV${VORONOI_VERTICES.length}`;
  voronoiVertexLookup.set(key, id);
  VORONOI_VERTICES.push({ id, x: v.x, y: v.y });
  return id;
}

/** 点pが、siteとotherの垂直二等分線(A*x+B*y+C=0)に対しどちら側にあるかを符号で返す。
 * 値が0以下ならsiteに近い(またはちょうど等距離)側。 */
function halfPlaneValue(p: Vec2Simple, site: Vec2Simple, other: Vec2Simple): number {
  const A = 2 * (other.x - site.x);
  const B = 2 * (other.y - site.y);
  const C = site.x * site.x + site.y * site.y - other.x * other.x - other.y * other.y;
  return A * p.x + B * p.y + C;
}

/** Sutherland-Hodgman法で、多角形polyを「siteに近い側の半平面」に切り詰める。 */
function clipByBisector(poly: Vec2Simple[], site: Vec2Simple, other: Vec2Simple): Vec2Simple[] {
  if (poly.length === 0) return poly;
  const result: Vec2Simple[] = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const next = poly[(i + 1) % poly.length];
    const fCur = halfPlaneValue(cur, site, other);
    const fNext = halfPlaneValue(next, site, other);
    const curInside = fCur <= 1e-9;
    const nextInside = fNext <= 1e-9;
    if (curInside) result.push(cur);
    if (curInside !== nextInside && Math.abs(fCur - fNext) > 1e-12) {
      const t = fCur / (fCur - fNext);
      result.push({ x: cur.x + t * (next.x - cur.x), y: cur.y + t * (next.y - cur.y) });
    }
  }
  return result;
}

type VoronoiTraceStep = { siteId: string; polygonIds: string[]; description: string };

/** 各母点について、外側の大きな矩形を他の全母点との垂直二等分線で順に切り詰めていく
 * 過程を1回だけシミュレートし、そのトレースをモジュール読み込み時に確定させておく
 * (FABRIK_TRACE/CCD_SNAPSHOTSと同じ「事前計算してからSteps()で整形する」設計)。 */
const VORONOI_TRACE: VoronoiTraceStep[] = [];
for (const site of VORONOI_SITES) {
  let poly: Vec2Simple[] = VORONOI_BOX.map((v) => ({ ...v }));
  VORONOI_TRACE.push({
    siteId: site.id,
    polygonIds: poly.map(registerVoronoiVertex),
    description: `点${site.id}のボロノイ領域を求める: まず外側の境界(ボックス)全体を初期候補とする`,
  });
  for (const other of VORONOI_SITES) {
    if (other.id === site.id) continue;
    poly = clipByBisector(poly, site, other);
    VORONOI_TRACE.push({
      siteId: site.id,
      polygonIds: poly.map(registerVoronoiVertex),
      description: `${site.id}と${other.id}の垂直二等分線で切り詰める(${site.id}に近い側だけを残す)`,
    });
  }
}

export const VORONOI_DIAGRAM_POINTS: GeometryPoint[] = [...VORONOI_SITES, ...VORONOI_VERTICES];

/**
 * ボロノイ図を「各点ペアの垂直二等分線による半平面交差」で素朴に構築する。各母点について、
 * 画面全体を覆う大きな矩形から出発し、他の全ての母点との垂直二等分線で順番に切り詰めていくと、
 * 最終的にその母点のボロノイ領域(最も近い領域)の凸多角形が残る。フォーチュンのアルゴリズムより
 * 実装コストが低いが、計算量はO(n^2 log n)程度になる(nが小さい教材用途では問題にならない)。
 */
export function voronoiDiagramSteps(): GeometryFrame[] {
  const points = VORONOI_DIAGRAM_POINTS;
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);

  frames.push(
    frame(
      states,
      [],
      `${VORONOI_SITES.length}個の母点から、各点ペアの垂直二等分線による半平面交差でボロノイ図を構築する`,
    ),
  );

  const finalCellSegs: GeometrySegment[] = [];
  for (const site of VORONOI_SITES) {
    states[site.id] = "current";
    const stepsForSite = VORONOI_TRACE.filter((s) => s.siteId === site.id);
    for (const step of stepsForSite) {
      const segs: GeometrySegment[] = [];
      for (let i = 0; i < step.polygonIds.length; i++) {
        segs.push({
          from: step.polygonIds[i],
          to: step.polygonIds[(i + 1) % step.polygonIds.length],
          state: "active",
        });
      }
      frames.push(frame(states, [...finalCellSegs, ...segs], step.description));
    }
    const lastPolygon = stepsForSite[stepsForSite.length - 1].polygonIds;
    for (let i = 0; i < lastPolygon.length; i++) {
      finalCellSegs.push({ from: lastPolygon[i], to: lastPolygon[(i + 1) % lastPolygon.length], state: "final" });
    }
    states[site.id] = "hull";
    frames.push(frame(states, [...finalCellSegs], `${site.id}のボロノイ領域が確定した`));
  }

  frames.push(
    frame(states, finalCellSegs, `構築完了。${VORONOI_SITES.length}個の母点それぞれの勢力圏(ボロノイ領域)が全て確定した`),
  );

  return frames;
}

// ============================================================
// 多角形の三角形分割(耳切り法) (polygon-triangulation)
// ============================================================

/** L字型の凹六角形(頂点V3が反射頂点=凹んだ角)。反時計回り順。 */
export const POLY_TRIANGULATION_POINTS: GeometryPoint[] = [
  { id: "V0", x: 0, y: 0 },
  { id: "V1", x: 8, y: 0 },
  { id: "V2", x: 8, y: 4 },
  { id: "V3", x: 4, y: 4 },
  { id: "V4", x: 4, y: 8 },
  { id: "V5", x: 0, y: 8 },
];

/** 点pが三角形abcの内部(境界含む)にあるか。3つの符号付き面積(外積)が全て同符号かで判定する。 */
function pointInTriangle(p: GeometryPoint, a: GeometryPoint, b: GeometryPoint, c: GeometryPoint): boolean {
  const d1 = crossProduct(a, b, p);
  const d2 = crossProduct(b, c, p);
  const d3 = crossProduct(c, a, p);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function polygonSegsFromList(poly: GeometryPoint[], state: GeometrySegmentState): GeometrySegment[] {
  return poly.map((p, i) => ({ from: p.id, to: poly[(i + 1) % poly.length].id, state }));
}

/**
 * 耳切り法(Ear Clipping)による多角形の三角形分割。多角形の各頂点について、隣接2頂点との
 * 三角形が(a)凸である、(b)内部に他のどの頂点も含まない、の2条件を満たす「耳」を探し、
 * 見つけ次第その頂点を切り落として三角形として記録する。「2つの耳の定理」により、
 * 単純多角形であれば残り頂点が3を超える限り必ず耳が存在するため、n-2個の三角形が得られるまで
 * これを繰り返す。反射頂点(このデータセットではV3)は常に耳になれないことを実際に確認できる。
 */
export function polygonTriangulationSteps(): GeometryFrame[] {
  const original = POLY_TRIANGULATION_POINTS;
  const frames: GeometryFrame[] = [];
  const states = idleStates(original);
  let remaining = [...original];
  const triangleSegs: GeometrySegment[] = [];

  frames.push(
    frame(
      states,
      polygonSegsFromList(remaining, "final"),
      `${original.length}角形(凹みを含む単純多角形)を耳切り法で三角形分割する`,
    ),
  );

  while (remaining.length > 3) {
    let clippedIndex = -1;
    for (let i = 0; i < remaining.length; i++) {
      const n = remaining.length;
      const prev = remaining[(i - 1 + n) % n];
      const cur = remaining[i];
      const next = remaining[(i + 1) % n];
      states[cur.id] = "candidate";
      const convex = crossProduct(prev, cur, next) > 0;
      frames.push(
        frame(
          states,
          [...polygonSegsFromList(remaining, "final"), ...triangleSegs],
          `頂点${cur.id}を検討: 内角は${convex ? "180度未満(凸)" : "180度以上(凹、反射頂点)"}`,
        ),
      );
      if (!convex) {
        states[cur.id] = "idle";
        continue;
      }

      let containsOther = false;
      for (let j = 0; j < n; j++) {
        if (j === i || j === (i - 1 + n) % n || j === (i + 1) % n) continue;
        if (pointInTriangle(remaining[j], prev, cur, next)) {
          containsOther = true;
          break;
        }
      }
      if (containsOther) {
        frames.push(
          frame(
            states,
            [...polygonSegsFromList(remaining, "final"), ...triangleSegs],
            `三角形${prev.id}-${cur.id}-${next.id}の内部に他の頂点が含まれるため、${cur.id}は耳ではない`,
          ),
        );
        states[cur.id] = "idle";
        continue;
      }

      states[cur.id] = "rejected";
      triangleSegs.push(
        { from: prev.id, to: cur.id, state: "final" },
        { from: cur.id, to: next.id, state: "final" },
        { from: prev.id, to: next.id, state: "final" },
      );
      frames.push(
        frame(
          states,
          [...polygonSegsFromList(remaining, "final"), ...triangleSegs],
          `頂点${cur.id}は耳の条件を満たす(凸かつ内部に他の頂点を含まない) → 三角形${prev.id}-${cur.id}-${next.id}を切り出す`,
        ),
      );
      clippedIndex = i;
      break;
    }
    if (clippedIndex === -1) break; // 単純多角形であれば理論上到達しない安全策
    remaining = remaining.filter((_, idx) => idx !== clippedIndex);
  }

  triangleSegs.push(
    { from: remaining[0].id, to: remaining[1].id, state: "final" },
    { from: remaining[1].id, to: remaining[2].id, state: "final" },
    { from: remaining[2].id, to: remaining[0].id, state: "final" },
  );
  for (const p of original) states[p.id] = states[p.id] === "rejected" ? "rejected" : "hull";
  frames.push(
    frame(
      states,
      [...polygonSegsFromList(original, "final"), ...triangleSegs],
      `残った3頂点(${remaining.map((p) => p.id).join(",")})が最後の三角形となり、分割完了(${original.length - 2}個の三角形)`,
    ),
  );

  return frames;
}

// ============================================================
// 線分交差判定(走査線法) (line-sweep-intersection)
// ============================================================

export const LINE_SWEEP_POINTS: GeometryPoint[] = [
  { id: "A1", x: 0, y: 1 },
  { id: "A2", x: 10, y: 3 },
  { id: "B1", x: 1, y: 7 },
  { id: "B2", x: 9, y: 1 },
  { id: "C1", x: 2, y: 0.5 },
  { id: "C2", x: 4, y: 8 },
  { id: "D1", x: 6, y: 7.5 },
  { id: "D2", x: 9, y: 4 },
];

type SweepSegment = { id: string; left: GeometryPoint; right: GeometryPoint };

const LINE_SWEEP_SEGMENTS: SweepSegment[] = [
  { id: "A", left: LINE_SWEEP_POINTS[0], right: LINE_SWEEP_POINTS[1] },
  { id: "B", left: LINE_SWEEP_POINTS[2], right: LINE_SWEEP_POINTS[3] },
  { id: "C", left: LINE_SWEEP_POINTS[4], right: LINE_SWEEP_POINTS[5] },
  { id: "D", left: LINE_SWEEP_POINTS[6], right: LINE_SWEEP_POINTS[7] },
];

/** 走査線がx位置にあるときの、線分seg上のy座標(線形補間)。 */
function segYAt(seg: SweepSegment, x: number): number {
  const { left, right } = seg;
  if (right.x === left.x) return left.y;
  return left.y + ((right.y - left.y) * (x - left.x)) / (right.x - left.x);
}

/** 線分p1-p2とp3-p4が実際に交差する場合はその交点を返す(端点を含む閉区間で判定)。
 * 平行、または交差しない場合はnull。 */
function segmentIntersectionPoint(
  p1: GeometryPoint,
  p2: GeometryPoint,
  p3: GeometryPoint,
  p4: GeometryPoint,
): { x: number; y: number } | null {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(denom) < 1e-12) return null;
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
  const u = ((p1.x - p3.x) * (p1.y - p2.y) - (p1.y - p3.y) * (p1.x - p2.x)) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
}

type SweepStartEndEvent = { x: number; kind: "start" | "end"; seg: SweepSegment };
type SweepCrossEvent = { x: number; kind: "cross"; segA: SweepSegment; segB: SweepSegment };
type SweepEvent = SweepStartEndEvent | SweepCrossEvent;

/**
 * 走査線法(Sweep Line Algorithm)による線分交差判定。走査線と交差している線分の集合を
 * y座標順に保持し、(1)線分の始点で集合に追加、(2)線分の終点で集合から削除、
 * (3)2線分が実際に交差してy順序が入れ替わる瞬間、の3種類のイベントを座標順に処理する。
 * いずれのイベントでも「その時点で新たに隣接した線分同士」だけを確認することで、
 * 全ペア比較を避けるという走査線法の核心を再現する。交差イベントのx座標は、
 * 実際に2線分の交点を計算することで求めており(見た目だけのアニメーションではない)、
 * このデータセットでは A-B, A-C, B-C の3組が交差し、Dはどの線分とも交差しない。
 */
export function lineSweepIntersectionSteps(): GeometryFrame[] {
  const points = LINE_SWEEP_POINTS;
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);

  const startEndEvents: SweepStartEndEvent[] = [
    ...LINE_SWEEP_SEGMENTS.map((s): SweepStartEndEvent => ({ x: s.left.x, kind: "start", seg: s })),
    ...LINE_SWEEP_SEGMENTS.map((s): SweepStartEndEvent => ({ x: s.right.x, kind: "end", seg: s })),
  ];
  const crossEvents: SweepCrossEvent[] = [];
  for (let i = 0; i < LINE_SWEEP_SEGMENTS.length; i++) {
    for (let j = i + 1; j < LINE_SWEEP_SEGMENTS.length; j++) {
      const segA = LINE_SWEEP_SEGMENTS[i];
      const segB = LINE_SWEEP_SEGMENTS[j];
      const ip = segmentIntersectionPoint(segA.left, segA.right, segB.left, segB.right);
      if (ip) crossEvents.push({ x: ip.x, kind: "cross", segA, segB });
    }
  }
  const events: SweepEvent[] = [...startEndEvents, ...crossEvents].sort((a, b) => a.x - b.x);

  frames.push(
    frame(
      states,
      [],
      `${LINE_SWEEP_SEGMENTS.length}本の線分(${LINE_SWEEP_SEGMENTS.map((s) => s.id).join(",")})に対し、走査線を左から右へ動かしながら交差を調べる`,
    ),
  );

  const active: SweepSegment[] = [];
  const activeSegs = (): GeometrySegment[] =>
    active.map((s) => ({ from: s.left.id, to: s.right.id, state: "active" }));
  const markPointStates = () => {
    for (const p of points) states[p.id] = "idle";
    for (const s of active) {
      states[s.left.id] = "sweep";
      states[s.right.id] = "sweep";
    }
  };
  const crossingPairLabels: string[] = [];
  const intersectingSegIds = new Set<string>();

  for (const ev of events) {
    if (ev.kind === "start") {
      const y = segYAt(ev.seg, ev.x);
      let idx = active.findIndex((s) => segYAt(s, ev.x) > y);
      if (idx === -1) idx = active.length;
      active.splice(idx, 0, ev.seg);
      markPointStates();
      states[ev.seg.left.id] = "current";
      frames.push(
        frame(
          states,
          activeSegs(),
          `x=${ev.x.toFixed(1)}: 線分${ev.seg.id}の始点に到達。走査線と交差している線分の集合に追加する`,
        ),
      );

      const above = active[idx - 1];
      const below = active[idx + 1];
      if (above) {
        const crosses = segmentIntersectionPoint(above.left, above.right, ev.seg.left, ev.seg.right) !== null;
        frames.push(
          frame(states, activeSegs(), `上に隣接する線分${above.id}と${ev.seg.id}を比較: ${crosses ? "交差する" : "交差しない"}`),
        );
      }
      if (below) {
        const crosses = segmentIntersectionPoint(ev.seg.left, ev.seg.right, below.left, below.right) !== null;
        frames.push(
          frame(states, activeSegs(), `下に隣接する線分${ev.seg.id}と${below.id}を比較: ${crosses ? "交差する" : "交差しない"}`),
        );
      }
    } else if (ev.kind === "end") {
      const idx = active.findIndex((s) => s.id === ev.seg.id);
      const above = active[idx - 1];
      const below = active[idx + 1];
      active.splice(idx, 1);
      markPointStates();
      states[ev.seg.right.id] = "hull";
      frames.push(
        frame(
          states,
          activeSegs(),
          `x=${ev.x.toFixed(1)}: 線分${ev.seg.id}の終点に到達。走査線と交差している線分の集合から取り除く`,
        ),
      );

      if (above && below) {
        const crosses = segmentIntersectionPoint(above.left, above.right, below.left, below.right) !== null;
        frames.push(
          frame(states, activeSegs(), `取り除いたことで新たに隣接した${above.id}と${below.id}を比較: ${crosses ? "交差する" : "交差しない"}`),
        );
      }
    } else if (ev.kind === "cross") {
      const idxA = active.findIndex((s) => s.id === ev.segA.id);
      const idxB = active.findIndex((s) => s.id === ev.segB.id);
      const lo = Math.min(idxA, idxB);
      const hi = Math.max(idxA, idxB);
      [active[lo], active[hi]] = [active[hi], active[lo]];
      crossingPairLabels.push(`${ev.segA.id}-${ev.segB.id}`);
      intersectingSegIds.add(ev.segA.id);
      intersectingSegIds.add(ev.segB.id);
      markPointStates();
      states[ev.segA.left.id] = "current";
      states[ev.segB.left.id] = "current";
      const highlighted = activeSegs().map((s) => {
        const isPair =
          (s.from === ev.segA.left.id && s.to === ev.segA.right.id) ||
          (s.from === ev.segB.left.id && s.to === ev.segB.right.id);
        return isPair ? { ...s, state: "rejected" as GeometrySegmentState } : s;
      });
      frames.push(
        frame(states, highlighted, `x=${ev.x.toFixed(1)}: 線分${ev.segA.id}と${ev.segB.id}が実際に交差した! y座標の順序が入れ替わる`),
      );

      const newAbove = active[lo - 1];
      const newBelowAt = active[lo];
      if (newAbove) {
        const crosses = segmentIntersectionPoint(newAbove.left, newAbove.right, newBelowAt.left, newBelowAt.right) !== null;
        frames.push(
          frame(states, activeSegs(), `入れ替わりで新たに隣接した${newAbove.id}と${newBelowAt.id}を比較: ${crosses ? "交差する" : "交差しない"}`),
        );
      }
      const newAboveAt = active[hi];
      const newBelow = active[hi + 1];
      if (newBelow) {
        const crosses = segmentIntersectionPoint(newAboveAt.left, newAboveAt.right, newBelow.left, newBelow.right) !== null;
        frames.push(
          frame(states, activeSegs(), `入れ替わりで新たに隣接した${newAboveAt.id}と${newBelow.id}を比較: ${crosses ? "交差する" : "交差しない"}`),
        );
      }
    }
  }

  const finalSegs: GeometrySegment[] = LINE_SWEEP_SEGMENTS.map((s) => ({
    from: s.left.id,
    to: s.right.id,
    state: intersectingSegIds.has(s.id) ? "rejected" : "final",
  }));
  for (const s of LINE_SWEEP_SEGMENTS) {
    const st = intersectingSegIds.has(s.id) ? "rejected" : "hull";
    states[s.left.id] = st;
    states[s.right.id] = st;
  }
  frames.push(
    frame(
      states,
      finalSegs,
      `走査完了。交差する線分の組: ${crossingPairLabels.length > 0 ? crossingPairLabels.join(", ") : "なし"}`,
    ),
  );

  return frames;
}

// ============================================================
// 点の内外判定(レイキャスティング法) (point-in-polygon)
// ============================================================

/** L字型の凹六角形(V0〜V5)+ 判定対象の点Q。 */
export const POINT_IN_POLYGON_POINTS: GeometryPoint[] = [
  { id: "V0", x: 0, y: 0 },
  { id: "V1", x: 8, y: 0 },
  { id: "V2", x: 8, y: 4 },
  { id: "V3", x: 4, y: 4 },
  { id: "V4", x: 4, y: 8 },
  { id: "V5", x: 0, y: 8 },
  { id: "Q", x: 2, y: 6 },
];

/** 点qからx軸正方向へ伸ばした半直線が、辺a-bと交差するか(レイキャスティング法の標準判定式)。 */
function rayCrossesEdge(q: GeometryPoint, a: GeometryPoint, b: GeometryPoint): boolean {
  if (a.y > q.y === b.y > q.y) return false;
  const t = (q.y - a.y) / (b.y - a.y);
  const xIntersect = a.x + t * (b.x - a.x);
  return xIntersect > q.x;
}

/**
 * レイキャスティング法(奇偶則)による点の内外判定。判定したい点Qから任意の方向
 * (ここではx軸正方向)へ半直線を伸ばし、多角形の各辺と交差する回数を数える。
 * 交差回数が奇数なら内部、偶数なら外部と判定する。各辺との交差判定は実際の
 * 半直線・線分交差の式で計算しており、このデータセットではV3-V4の辺の1回だけが
 * 交差し(合計1回、奇数)、Qは多角形の内部にあると正しく判定される。
 */
export function pointInPolygonSteps(): GeometryFrame[] {
  const points = POINT_IN_POLYGON_POINTS;
  const polygon = points.slice(0, -1);
  const query = points[points.length - 1];
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);
  const polygonSegs: GeometrySegment[] = polygonSegsFromList(polygon, "final");

  states[query.id] = "current";
  frames.push(
    frame(
      states,
      polygonSegs,
      `点${query.id}が${polygon.length}角形の内側にあるかを、レイキャスティング法(半直線と辺の交差回数)で判定する`,
    ),
  );

  let crossingCount = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const crosses = rayCrossesEdge(query, a, b);
    if (crosses) crossingCount++;
    const segs = polygonSegs.map((s) => {
      const isEdge = (s.from === a.id && s.to === b.id) || (s.from === b.id && s.to === a.id);
      return isEdge ? { ...s, state: (crosses ? "active" : "rejected") as GeometrySegmentState } : s;
    });
    frames.push(
      frame(
        states,
        segs,
        `辺${a.id}-${b.id}: 点${query.id}からx軸正方向へ伸ばした半直線と${crosses ? `交差する(累計${crossingCount}回)` : "交差しない"}`,
      ),
    );
  }

  const isInside = crossingCount % 2 === 1;
  states[query.id] = isInside ? "hull" : "rejected";
  frames.push(
    frame(
      states,
      polygonSegs,
      `交差回数は${crossingCount}回(${isInside ? "奇数" : "偶数"}) → 点${query.id}は多角形の${isInside ? "内部" : "外部"}にある`,
    ),
  );

  return frames;
}

// ============================================================
// Boidsアルゴリズム (boids)
// ============================================================

type BoidState = { x: number; y: number; vx: number; vy: number };

const BOIDS_ARENA_W = 12;
const BOIDS_ARENA_H = 10;
const BOIDS_PERCEPTION_RADIUS = 3.5;
const BOIDS_SEPARATION_RADIUS = 1.3;
const BOIDS_W_SEPARATION = 1.4;
const BOIDS_W_ALIGNMENT = 1.5;
const BOIDS_W_COHESION = 0.6;
const BOIDS_STEER_STRENGTH = 0.15;
const BOIDS_MAX_SPEED = 0.7;
const BOIDS_TICKS_PER_SNAPSHOT = 6;
const BOIDS_SNAPSHOTS = 8;

/** 8体のエージェントを、バラバラな位置・進行方向から出発させる固定初期条件。 */
const BOIDS_INITIAL: BoidState[] = [
  { x: 1, y: 1, vx: 0.4, vy: 0.1 },
  { x: 10, y: 1.5, vx: -0.3, vy: 0.3 },
  { x: 2, y: 8.5, vx: 0.2, vy: -0.4 },
  { x: 9.5, y: 9, vx: -0.4, vy: -0.2 },
  { x: 5.5, y: 0.5, vx: 0.1, vy: 0.5 },
  { x: 6, y: 9.5, vx: -0.1, vy: -0.5 },
  { x: 0.5, y: 5, vx: 0.5, vy: -0.1 },
  { x: 11, y: 5, vx: -0.5, vy: 0.1 },
];
const BOIDS_COUNT = BOIDS_INITIAL.length;
const BOIDS_AGENT_LABELS = Array.from({ length: BOIDS_COUNT }, (_, i) => `b${i}`);

function boidsClampSpeed(vx: number, vy: number, maxSpeed: number): [number, number] {
  const speed = Math.hypot(vx, vy);
  if (speed <= maxSpeed || speed === 0) return [vx, vy];
  const scale = maxSpeed / speed;
  return [vx * scale, vy * scale];
}

/**
 * 分離(近すぎる仲間から離れる)・整列(近傍の平均進行方向に合わせる)・結合(近傍の重心に近づく)
 * の3ルールを、8近傍探索(知覚範囲BOIDS_PERCEPTION_RADIUS内の他エージェント)から実際に計算し、
 * 1ティック分の状態を更新する。壁に達したら反射させて画面内に留める。
 */
function boidsTick(states: BoidState[]): BoidState[] {
  const next: BoidState[] = states.map((s) => ({ ...s }));
  for (let i = 0; i < states.length; i++) {
    const self = states[i];
    let sepX = 0;
    let sepY = 0;
    let alignVx = 0;
    let alignVy = 0;
    let cohX = 0;
    let cohY = 0;
    let neighborCount = 0;

    for (let j = 0; j < states.length; j++) {
      if (i === j) continue;
      const other = states[j];
      const dx = other.x - self.x;
      const dy = other.y - self.y;
      const dist = Math.hypot(dx, dy);
      if (dist > BOIDS_PERCEPTION_RADIUS || dist === 0) continue;

      neighborCount++;
      alignVx += other.vx;
      alignVy += other.vy;
      cohX += other.x;
      cohY += other.y;

      if (dist < BOIDS_SEPARATION_RADIUS) {
        sepX -= dx / dist;
        sepY -= dy / dist;
      }
    }

    let ax = sepX * BOIDS_W_SEPARATION;
    let ay = sepY * BOIDS_W_SEPARATION;
    if (neighborCount > 0) {
      ax += (alignVx / neighborCount) * BOIDS_W_ALIGNMENT;
      ay += (alignVy / neighborCount) * BOIDS_W_ALIGNMENT;
      ax += (cohX / neighborCount - self.x) * BOIDS_W_COHESION;
      ay += (cohY / neighborCount - self.y) * BOIDS_W_COHESION;
    }

    let nvx = self.vx + ax * BOIDS_STEER_STRENGTH;
    let nvy = self.vy + ay * BOIDS_STEER_STRENGTH;
    [nvx, nvy] = boidsClampSpeed(nvx, nvy, BOIDS_MAX_SPEED);

    let nx = self.x + nvx;
    let ny = self.y + nvy;
    if (nx < 0 || nx > BOIDS_ARENA_W) nvx = -nvx;
    if (ny < 0 || ny > BOIDS_ARENA_H) nvy = -nvy;
    nx = Math.min(Math.max(self.x + nvx, 0), BOIDS_ARENA_W);
    ny = Math.min(Math.max(self.y + nvy, 0), BOIDS_ARENA_H);

    next[i] = { x: nx, y: ny, vx: nvx, vy: nvy };
  }
  return next;
}

/** 各エージェントの進行方向を単位ベクトル化し、その平均ベクトルの長さ(0=バラバラ、1=完全に同じ向き)を返す。 */
function boidsAlignmentScore(states: BoidState[]): number {
  let sumX = 0;
  let sumY = 0;
  for (const s of states) {
    const speed = Math.hypot(s.vx, s.vy) || 1;
    sumX += s.vx / speed;
    sumY += s.vy / speed;
  }
  return Math.hypot(sumX, sumY) / states.length;
}

function simulateBoidsSnapshots(): BoidState[][] {
  let states = BOIDS_INITIAL.map((s) => ({ ...s }));
  const snapshots: BoidState[][] = [states.map((s) => ({ ...s }))];
  for (let snap = 1; snap <= BOIDS_SNAPSHOTS; snap++) {
    for (let tick = 0; tick < BOIDS_TICKS_PER_SNAPSHOT; tick++) {
      states = boidsTick(states);
    }
    snapshots.push(states.map((s) => ({ ...s })));
  }
  return snapshots;
}

const BOIDS_SNAPSHOTS_DATA = simulateBoidsSnapshots();

/** 各エージェント×各スナップショット時刻ごとに1点を用意する(RVOと同じ「移動を離散的な点の系列として記録する」パターン)。 */
export const BOIDS_POINTS: GeometryPoint[] = BOIDS_SNAPSHOTS_DATA.flatMap((snapshot, snapIdx) =>
  snapshot.map((s, agentIdx) => ({ id: `${BOIDS_AGENT_LABELS[agentIdx]}_${snapIdx}`, x: s.x, y: s.y })),
);

/**
 * Boidsアルゴリズムのステップ列を生成する。8体のエージェントに分離・整列・結合の3ルールを
 * 実際に近傍探索した上で適用し(boidsTick())、BOIDS_TICKS_PER_SNAPSHOT回分をまとめて1スナップショットとして
 * 記録する。バラバラだった初期の進行方向が、局所規則の反復だけで徐々に揃っていく様子を、
 * 進行方向ベクトルの平均長(boidsAlignmentScore、0=バラバラ〜1=完全に同じ方向)の推移として示す。
 */
export function boidsSteps(): GeometryFrame[] {
  const points = BOIDS_POINTS;
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);
  const segs: GeometrySegment[] = [];

  const initialScore = boidsAlignmentScore(BOIDS_SNAPSHOTS_DATA[0]);
  for (let i = 0; i < BOIDS_COUNT; i++) states[`${BOIDS_AGENT_LABELS[i]}_0`] = "current";
  frames.push(
    frame(
      states,
      segs,
      `${BOIDS_COUNT}体のエージェントをバラバラな位置・進行方向で配置(進行方向の揃い度合い: ${initialScore.toFixed(2)})`,
    ),
  );

  for (let snap = 1; snap <= BOIDS_SNAPSHOTS; snap++) {
    for (let i = 0; i < BOIDS_COUNT; i++) {
      states[`${BOIDS_AGENT_LABELS[i]}_${snap - 1}`] = "hull";
      states[`${BOIDS_AGENT_LABELS[i]}_${snap}`] = "current";
      segs.push({
        from: `${BOIDS_AGENT_LABELS[i]}_${snap - 1}`,
        to: `${BOIDS_AGENT_LABELS[i]}_${snap}`,
        state: "active",
      });
    }
    const score = boidsAlignmentScore(BOIDS_SNAPSHOTS_DATA[snap]);
    frames.push(
      frame(
        states,
        segs,
        `${BOIDS_TICKS_PER_SNAPSHOT}ティック経過: 分離(近すぎる仲間を避ける)・整列(近傍の平均進行方向に合わせる)・結合(近傍の重心に寄る)の3ルールを適用(進行方向の揃い度合い: ${score.toFixed(2)})`,
      ),
    );
  }

  for (const s of segs) s.state = "final";
  const finalScore = boidsAlignmentScore(BOIDS_SNAPSHOTS_DATA[BOIDS_SNAPSHOTS]);
  frames.push(
    frame(
      states,
      segs,
      `計算完了。3つの単純な局所規則の繰り返しだけで、バラバラだった進行方向が揃い(${initialScore.toFixed(2)}→${finalScore.toFixed(2)})、群れらしい動きに収束した`,
    ),
  );

  return frames;
}

// ============================================================
// 粒子群最適化(PSO) (particle-swarm-optimization)
// ============================================================

const PSO_DOMAIN = 5;
const PSO_W = 0.6;
const PSO_C1 = 1.4;
const PSO_C2 = 1.4;
const PSO_ITERATIONS = 6;

/** 目的関数: 原点からの距離の2乗(原点が唯一の最小値を持つ単純な凸関数)。 */
function psoObjective(x: number, y: number): number {
  return x * x + y * y;
}

/** 7個の粒子を、探索空間の端寄りに散らした固定初期位置(初速度0)から出発させる。 */
const PSO_INITIAL: { x: number; y: number }[] = [
  { x: 4, y: 3 },
  { x: -4, y: 3.5 },
  { x: -3.5, y: -4 },
  { x: 3, y: -4.5 },
  { x: 0.5, y: 4.8 },
  { x: -4.8, y: -0.5 },
  { x: 4.5, y: -1 },
];
const PSO_COUNT = PSO_INITIAL.length;

type PsoParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bestX: number;
  bestY: number;
  bestValue: number;
};
type PsoSnapshot = { x: number; y: number }[];
type PsoBest = { x: number; y: number; value: number };

/**
 * PSOを実際に規定回数だけ反復実行し、各反復後の粒子位置(スナップショット)と
 * 群全体のベスト位置の履歴を返す。速度更新式 v = w*v + c1*r1*(pbest-x) + c2*r2*(gbest-x) は
 * 標準的なPSOの定式(r1,r2は各粒子・各反復ごとの共有スカラー乱数)そのもので、
 * 乱数は再現性のため固定シードの疑似乱数(seededRandom)を使う。
 */
function simulatePso(): { snapshots: PsoSnapshot[]; globalBestHistory: PsoBest[] } {
  const rng = seededRandom(4242);
  let particles: PsoParticle[] = PSO_INITIAL.map((p) => ({
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    bestX: p.x,
    bestY: p.y,
    bestValue: psoObjective(p.x, p.y),
  }));

  let globalBestX = particles[0].bestX;
  let globalBestY = particles[0].bestY;
  let globalBestValue = particles[0].bestValue;
  for (const p of particles) {
    if (p.bestValue < globalBestValue) {
      globalBestValue = p.bestValue;
      globalBestX = p.bestX;
      globalBestY = p.bestY;
    }
  }

  const snapshots: PsoSnapshot[] = [particles.map((p) => ({ x: p.x, y: p.y }))];
  const globalBestHistory: PsoBest[] = [{ x: globalBestX, y: globalBestY, value: globalBestValue }];

  for (let iter = 1; iter <= PSO_ITERATIONS; iter++) {
    particles = particles.map((p) => {
      const r1 = rng();
      const r2 = rng();
      const vx = PSO_W * p.vx + PSO_C1 * r1 * (p.bestX - p.x) + PSO_C2 * r2 * (globalBestX - p.x);
      const vy = PSO_W * p.vy + PSO_C1 * r1 * (p.bestY - p.y) + PSO_C2 * r2 * (globalBestY - p.y);
      const x = Math.min(Math.max(p.x + vx, -PSO_DOMAIN), PSO_DOMAIN);
      const y = Math.min(Math.max(p.y + vy, -PSO_DOMAIN), PSO_DOMAIN);
      const value = psoObjective(x, y);
      const improved = value < p.bestValue;
      return {
        x,
        y,
        vx,
        vy,
        bestX: improved ? x : p.bestX,
        bestY: improved ? y : p.bestY,
        bestValue: improved ? value : p.bestValue,
      };
    });

    for (const p of particles) {
      if (p.bestValue < globalBestValue) {
        globalBestValue = p.bestValue;
        globalBestX = p.bestX;
        globalBestY = p.bestY;
      }
    }
    snapshots.push(particles.map((p) => ({ x: p.x, y: p.y })));
    globalBestHistory.push({ x: globalBestX, y: globalBestY, value: globalBestValue });
  }

  return { snapshots, globalBestHistory };
}

const PSO_DATA = simulatePso();

export const PSO_POINTS: GeometryPoint[] = [
  { id: "target", x: 0, y: 0 },
  ...PSO_DATA.snapshots.flatMap((snapshot, snapIdx) =>
    snapshot.map((p, i) => ({ id: `p${i}_${snapIdx}`, x: p.x, y: p.y })),
  ),
];

/**
 * 粒子群最適化(PSO)のステップ列を生成する。目的関数f(x,y)=x²+y²(原点が唯一の最小値)を持つ
 * 探索空間上で、7個の粒子がsimulatePso()で計算した実際のPSO更新式に従って動く。
 * 各粒子は「自分がこれまで見つけた最良位置(pbest)」と「群全体のこれまでの最良位置(gbest、targetの近くに表示)」
 * の両方に引っ張られながら速度を更新するため、個体の記憶と集団の情報共有が組み合わさって
 * 徐々に最小値へ収束していく。
 */
export function particleSwarmOptimizationSteps(): GeometryFrame[] {
  const points = PSO_POINTS;
  const frames: GeometryFrame[] = [];
  const states = idleStates(points);
  const segs: GeometrySegment[] = [];

  states.target = "hull";
  for (let i = 0; i < PSO_COUNT; i++) states[`p${i}_0`] = "current";
  const initialBest = PSO_DATA.globalBestHistory[0];
  frames.push(
    frame(
      states,
      segs,
      `${PSO_COUNT}個の粒子を目的関数f(x,y)=x²+y²(原点targetが最小)の探索空間に配置。初期の群最良値=${initialBest.value.toFixed(2)}`,
    ),
  );

  for (let iter = 1; iter <= PSO_ITERATIONS; iter++) {
    for (let i = 0; i < PSO_COUNT; i++) {
      states[`p${i}_${iter - 1}`] = "hull";
      states[`p${i}_${iter}`] = "current";
      segs.push({ from: `p${i}_${iter - 1}`, to: `p${i}_${iter}`, state: "active" });
    }
    const best = PSO_DATA.globalBestHistory[iter];
    frames.push(
      frame(
        states,
        segs,
        `反復${iter}: 各粒子は自己の最良位置(pbest)と群全体の最良位置(gbest)の両方に引っ張られながら速度を更新(群最良値=${best.value.toFixed(3)})`,
      ),
    );
  }

  for (const s of segs) s.state = "final";
  const finalBest = PSO_DATA.globalBestHistory[PSO_ITERATIONS];
  frames.push(
    frame(
      states,
      segs,
      `計算完了。個体の記憶(pbest)と集団の情報共有(gbest)を両方利用する探索により、群最良値は${initialBest.value.toFixed(2)}→${finalBest.value.toFixed(3)}まで改善し、原点付近へ収束した`,
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
  "harris-corner-detection": { points: HARRIS_POINTS },
  "non-maximum-suppression": { points: NMS_POINTS },
  "hough-transform": { points: HOUGH_POINTS },
  boids: { points: BOIDS_POINTS },
  "particle-swarm-optimization": { points: PSO_POINTS },
  "andrews-monotone-chain": { points: HULL_POINTS },
  quickhull: { points: HULL_POINTS },
  "closest-pair-of-points": { points: CLOSEST_PAIR_POINTS },
  "delaunay-triangulation": { points: DELAUNAY_POINTS },
  "voronoi-diagram": { points: VORONOI_DIAGRAM_POINTS },
  "polygon-triangulation": { points: POLY_TRIANGULATION_POINTS },
  "line-sweep-intersection": { points: LINE_SWEEP_POINTS },
  "point-in-polygon": { points: POINT_IN_POLYGON_POINTS },
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
  "harris-corner-detection": harrisCornerDetectionSteps,
  "non-maximum-suppression": nonMaximumSuppressionSteps,
  "hough-transform": houghTransformSteps,
  boids: boidsSteps,
  "particle-swarm-optimization": particleSwarmOptimizationSteps,
  "andrews-monotone-chain": andrewsMonotoneChainSteps,
  quickhull: quickhullSteps,
  "closest-pair-of-points": closestPairOfPointsSteps,
  "delaunay-triangulation": delaunayTriangulationSteps,
  "voronoi-diagram": voronoiDiagramSteps,
  "polygon-triangulation": polygonTriangulationSteps,
  "line-sweep-intersection": lineSweepIntersectionSteps,
  "point-in-polygon": pointInPolygonSteps,
};
