import type { StateColorKey } from "./design-tokens";
import type { SearchFrame } from "./search-visualizers";

/**
 * 「値を1つずつ計算・推定していく」アルゴリズムの可視化(配列の棒グラフ+状態色の kind。SearchVisualizer が描画する)。
 * 棒は「Grundy数」「各点の平均経路長」「反復解の各成分」「各腕の推定値」など、アルゴリズムごとに意味が違う(説明文に書く)。
 * 色の意味: comparing=計算に使った値・候補 / pivot=いま計算している対象 / swapping=退けられた・減った値 / settled=確定した結果
 * 乱数を使うものは、固定シードの簡易な線形合同法で作る(決定的)。
 */

type Highlight = Partial<Record<number, StateColorKey>>;

function frame(array: number[], highlight: Highlight, description: string): SearchFrame {
  return { array: [...array], highlight, description };
}

/** 固定シードの擬似乱数(0以上1未満)。 */
export function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// ===========================================================================
// スプレイグ・グランディ: 一度に 1・3・4 個取れる石取りの Grundy 数
// ===========================================================================

export const GRUNDY_MOVES = [1, 3, 4];
export const GRUNDY_MAX = 20;

export function mex(values: Iterable<number>): number {
  const set = new Set(values);
  let m = 0;
  while (set.has(m)) m++;
  return m;
}

export function spragueGrundySteps(): SearchFrame[] {
  const g = Array<number>(GRUNDY_MAX + 1).fill(0);
  const done: Highlight = {};
  const frames = [
    frame(
      g,
      {},
      `一度に ${GRUNDY_MOVES.join("・")} 個のどれかを取る石取り(取れなくなった方が負け)。石が n 個の局面の Grundy 数 g(n) を、n=0 から順に「行ける先の g の集合に含まれない最小の非負整数(mex)」として求める。棒は g(n)`,
    ),
  ];
  g[0] = 0;
  done[0] = "settled";
  frames.push(frame(g, { ...done }, "n=0: 動ける手がない(行ける先が空)ので mex{} = 0。手番の者の負け"));
  for (let n = 1; n <= GRUNDY_MAX; n++) {
    const targets = GRUNDY_MOVES.filter((m) => n >= m).map((m) => n - m);
    const values = targets.map((t) => g[t]);
    const highlight: Highlight = { ...done, [n]: "pivot" };
    for (const t of targets) highlight[t] = "comparing";
    g[n] = mex(values);
    frames.push(
      frame(
        g,
        highlight,
        `n=${n}: 行ける先は ${targets.map((t) => `${t}(g=${g[t]})`).join("・")} → g の集合 {${[...new Set(values)].sort((a, b) => a - b).join(",")}} に含まれない最小の数 = ${g[n]}`,
      ),
    );
    done[n] = "settled";
  }
  const losing = g.map((v, n) => (v === 0 ? n : -1)).filter((n) => n >= 0);
  const all: Highlight = {};
  g.forEach((_, n) => (all[n] = "settled"));
  frames.push(
    frame(
      g,
      all,
      `完了: g(n)=0 の n(${losing.join("・")})が手番の者の負け。g は周期7で繰り返している。複数の山を同時に進めるなら、各山の g を XOR して 0 なら負け`,
    ),
  );
  return frames;
}

// ===========================================================================
// Isolation Forest(1次元の10点・8本の木): 棒=各点の平均経路長。外れ値は浅く孤立する
// ===========================================================================

export const ISOLATION_DATA = [10, 11, 12, 12.5, 13, 14, 15, 15.5, 16, 40];
export const ISOLATION_TREES = 8;
export const ISOLATION_SEED = 7;

/** n 点の二分探索木で、1点が見つかるまでの平均的な比較回数の補正項。 */
export function isolationC(n: number): number {
  return n <= 1 ? 0 : 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n;
}
export const ISOLATION_DEPTH_LIMIT = Math.ceil(Math.log2(ISOLATION_DATA.length));

export type IsolationNode = {
  depth: number;
  members: number[];
  /** 分割値。葉なら null。 */
  split: number | null;
  left: number[];
  right: number[];
};

export type IsolationRun = {
  frames: SearchFrame[];
  /** 木ごとの全ノード(根から深さ優先の順)。 */
  trees: IsolationNode[][];
  /** 木ごと・点ごとの経路長(深さの上限で止まった葉は c(葉の点数) を足したもの)。 */
  depths: number[][];
  /** 点ごとの異常スコア 2^(−平均経路長 / c(点数))。 */
  scores: number[];
};

export function isolationForestRun(): IsolationRun {
  const data = ISOLATION_DATA;
  const n = data.length;
  const rng = makeRng(ISOLATION_SEED);
  const trees: IsolationNode[][] = [];
  const depths: number[][] = [];
  for (let t = 0; t < ISOLATION_TREES; t++) {
    const nodes: IsolationNode[] = [];
    const depthOf = Array<number>(n).fill(0);
    const build = (members: number[], depth: number) => {
      const values = members.map((i) => data[i]);
      const lo = Math.min(...values);
      const hi = Math.max(...values);
      if (depth >= ISOLATION_DEPTH_LIMIT || members.length <= 1 || lo === hi) {
        for (const i of members) depthOf[i] = depth + isolationC(members.length);
        nodes.push({ depth, members, split: null, left: [], right: [] });
        return;
      }
      const split = lo + rng() * (hi - lo);
      const left = members.filter((i) => data[i] < split);
      const right = members.filter((i) => data[i] >= split);
      nodes.push({ depth, members, split, left, right });
      build(left, depth + 1);
      build(right, depth + 1);
    };
    build(
      data.map((_, i) => i),
      0,
    );
    trees.push(nodes);
    depths.push(depthOf);
  }

  const mean = (upto: number) => data.map((_, i) => depths.slice(0, upto).reduce((s, d) => s + d[i], 0) / upto);
  const cn = isolationC(n);
  const scores = mean(ISOLATION_TREES).map((h) => 2 ** (-h / cn));
  const frames = [
    frame(
      Array<number>(n).fill(0),
      {},
      `10点(${data.join("・")})の中の外れ値を、ランダムな分割で探す。範囲の中でランダムな位置で切る操作を、点が1つだけになるまで(深さ${ISOLATION_DEPTH_LIMIT}まで)繰り返し、孤立するまでの深さ(経路長)を数える。棒は各点の、これまでの木での平均経路長`,
    ),
  ];
  for (let t = 0; t < ISOLATION_TREES; t++) {
    const avg = mean(t + 1);
    const shallow = Math.min(...depths[t]);
    const highlight: Highlight = {};
    depths[t].forEach((d, i) => (highlight[i] = d === shallow ? "pivot" : "comparing"));
    const root = trees[t][0];
    const first = root.split === null ? "" : `最初の分割値 ${root.split.toFixed(1)}(左${root.left.length}点・右${root.right.length}点)。`;
    const shallowPoints = depths[t].map((d, i) => (d === shallow ? data[i] : null)).filter((v) => v !== null);
    frames.push(frame(avg, highlight, `木${t + 1}: ${first}最も浅く孤立した点は ${shallowPoints.join("・")}(経路長 ${shallow.toFixed(1)})。平均を更新`));
  }
  const best = scores.indexOf(Math.max(...scores));
  const final = scores.map((s) => Math.round(s * 1000) / 10);
  const highlight: Highlight = {};
  scores.forEach((_, i) => (highlight[i] = i === best ? "pivot" : "settled"));
  frames.push(
    frame(
      final,
      highlight,
      `完了: 異常スコア s = 2^(−平均経路長/c(${n}))(棒は s×100)。値 ${data[best]} が最大の ${final[best]}。他の点は ${Math.min(...final.filter((_, i) => i !== best))}〜${Math.max(...final.filter((_, i) => i !== best))}。浅く孤立する点ほど異常`,
    ),
  );
  return { frames, trees, depths, scores };
}

export const isolationForestSteps = (): SearchFrame[] => isolationForestRun().frames;

// ===========================================================================
// ガウス・ザイデル法: 棒=解ベクトルの4成分。更新したばかりの値をすぐ次の成分の計算に使う
// ===========================================================================

export const GS_MATRIX = [
  [10, -1, 2, 0],
  [-1, 11, -1, 3],
  [2, -1, 10, -1],
  [0, 3, -1, 8],
];
export const GS_RHS = [6, 25, -11, 15];
/** 厳密解(各式に代入して確かめられる)。 */
export const GS_EXACT = [1, 2, -1, 1];
export const GS_TOLERANCE = 1e-4;

export type GaussSeidelRun = { frames: SearchFrame[]; sweeps: number[][] };

export function gaussSeidelRun(): GaussSeidelRun {
  const n = GS_RHS.length;
  const x = Array<number>(n).fill(0);
  const sweeps: number[][] = [];
  const frames = [
    frame(
      x,
      {},
      `連立方程式 A·x = b(4元)を反復で解く。各式を x_i について解き直し、i=1,2,3,4 の順に更新する。更新したばかりの値を、後ろの成分の計算にすぐ使うのがガウス・ザイデル法。棒は x の4成分(初期値0)`,
    ),
  ];
  for (let sweep = 1; sweep <= 100; sweep++) {
    let change = 0;
    for (let i = 0; i < n; i++) {
      let s = 0;
      const highlight: Highlight = { [i]: "pivot" };
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        s += GS_MATRIX[i][j] * x[j];
        highlight[j] = "comparing";
      }
      const next = (GS_RHS[i] - s) / GS_MATRIX[i][i];
      change = Math.max(change, Math.abs(next - x[i]));
      x[i] = next;
      frames.push(
        frame(
          x,
          highlight,
          `${sweep}周目: x${i + 1} = (${GS_RHS[i]} − Σ他の項) / ${GS_MATRIX[i][i]} = ${next.toFixed(4)}(他の成分は ${i > 0 ? `x1〜x${i} は今回更新した新しい値、` : ""}${i < n - 1 ? `x${i + 2}〜x${n} は前回の値` : "すべて今回の新しい値"}を使う)`,
        ),
      );
    }
    sweeps.push([...x]);
    if (change < GS_TOLERANCE) break;
  }
  const error = Math.max(...x.map((v, i) => Math.abs(v - GS_EXACT[i])));
  const all: Highlight = {};
  x.forEach((_, i) => (all[i] = "settled"));
  frames.push(
    frame(
      x,
      all,
      `完了: ${sweeps.length}周で、1周の変化が ${GS_TOLERANCE} 未満になった。解は (${x.map((v) => v.toFixed(4)).join(", ")})、厳密解 (${GS_EXACT.join(", ")}) との最大の差は ${error.toExponential(1)}`,
    ),
  );
  return { frames, sweeps };
}

export const gaussSeidelSteps = (): SearchFrame[] => gaussSeidelRun().frames;

// ===========================================================================
// ストライドスケジューリング: 棒=各プロセスの pass 値。最小のプロセスを実行して歩幅だけ進める
// ===========================================================================

export const STRIDE_TICKETS: { name: string; tickets: number }[] = [
  { name: "A", tickets: 3 },
  { name: "B", tickets: 2 },
  { name: "C", tickets: 1 },
];
/** 歩幅 = STRIDE_L / チケット数(割り切れる小さな定数にして、表示を整数に保つ)。 */
export const STRIDE_L = 6;
export const STRIDE_QUANTA = 12;

export type StrideRun = { frames: SearchFrame[]; schedule: number[]; passes: number[][] };

export function strideRun(): StrideRun {
  const procs = STRIDE_TICKETS;
  const stride = procs.map((p) => STRIDE_L / p.tickets);
  const pass = procs.map(() => 0);
  const schedule: number[] = [];
  const passes: number[][] = [];
  const counts = procs.map(() => 0);
  const total = procs.reduce((s, p) => s + p.tickets, 0);
  const frames = [
    frame(
      pass,
      {},
      `3つのプロセス(チケット ${procs.map((p) => `${p.name}=${p.tickets}`).join("・")})に、チケット比どおりにCPU時間を配る。歩幅 = ${STRIDE_L} ÷ チケット数(${procs.map((p, i) => `${p.name}=${stride[i]}`).join("・")})。棒は pass 値で、最小のプロセスを実行して歩幅だけ進める(乱数は使わない)`,
    ),
  ];
  for (let q = 1; q <= STRIDE_QUANTA; q++) {
    const chosen = pass.reduce((best, v, i) => (v < pass[best] ? i : best), 0);
    const highlight: Highlight = {};
    pass.forEach((_, i) => (highlight[i] = i === chosen ? "pivot" : "comparing"));
    const before = pass[chosen];
    pass[chosen] += stride[chosen];
    counts[chosen]++;
    schedule.push(chosen);
    passes.push([...pass]);
    frames.push(
      frame(
        pass,
        highlight,
        `時間枠${q}: pass 値が最小の ${procs[chosen].name}(${before})を実行 → ${procs[chosen].name} の pass を歩幅 ${stride[chosen]} だけ進めて ${pass[chosen]}。ここまでの回数 ${procs.map((p, i) => `${p.name}=${counts[i]}`).join("・")}(理想は ${procs.map((p) => `${p.name}=${((q * p.tickets) / total).toFixed(1)}`).join("・")})`,
      ),
    );
  }
  const all: Highlight = {};
  pass.forEach((_, i) => (all[i] = "settled"));
  frames.push(
    frame(
      pass,
      all,
      `完了: ${STRIDE_QUANTA}枠の割り当ては ${procs.map((p, i) => `${p.name}=${counts[i]}回`).join("・")}で、チケット比 ${procs.map((p) => p.tickets).join(":")} のとおり。どの時点でも、理想の配分からのずれは1枠未満。宝くじスケジューリングのような乱数の偏りがない`,
    ),
  );
  return { frames, schedule, passes };
}

export const strideSchedulingSteps = (): SearchFrame[] => strideRun().frames;

// ===========================================================================
// UCB1(多腕バンディット): 棒=各腕のUCBスコア = 平均 + √(2·ln n / 回数)。最大の腕を引く
// ===========================================================================

export const BANDIT_PROBS = [0.3, 0.5, 0.7];
export const BANDIT_ROUNDS = 40;
export const BANDIT_SEED = 3;

export type BanditHistory = { arm: number; reward: number }[];
export type BanditRun = { frames: SearchFrame[]; history: BanditHistory };

export function ucb1Run(): BanditRun {
  const k = BANDIT_PROBS.length;
  const rng = makeRng(BANDIT_SEED);
  const counts = Array<number>(k).fill(0);
  const means = Array<number>(k).fill(0);
  const history: BanditHistory = [];
  const frames = [
    frame(
      Array<number>(k).fill(0),
      {},
      `当たり確率が分からない3つの腕(真の確率は ${BANDIT_PROBS.join("・")}。アルゴリズムは知らない)を ${BANDIT_ROUNDS} 回引く。各腕の「平均 + √(2·ln n / 回数)」(UCBスコア)が最大の腕を選ぶ。回数が少ない腕ほど上積みが大きく、自然に試される。棒は引く前のUCBスコア`,
    ),
  ];
  for (let t = 1; t <= BANDIT_ROUNDS; t++) {
    let arm: number;
    let scores: number[];
    let description: string;
    if (t <= k) {
      arm = t - 1;
      scores = Array<number>(k).fill(0);
      description = `ラウンド${t}: まだ引いていない腕${arm + 1}を先に1回引く(回数0ではスコアが定義できないため)`;
    } else {
      scores = means.map((m, i) => m + Math.sqrt((2 * Math.log(t)) / counts[i]));
      arm = scores.indexOf(Math.max(...scores));
      description = `ラウンド${t}: UCBスコア ${scores.map((s) => s.toFixed(2)).join(" / ")} → 最大の腕${arm + 1}を引く`;
    }
    const highlight: Highlight = {};
    scores.forEach((_, i) => (highlight[i] = i === arm ? "pivot" : "comparing"));
    const reward = rng() < BANDIT_PROBS[arm] ? 1 : 0;
    counts[arm]++;
    means[arm] += (reward - means[arm]) / counts[arm];
    history.push({ arm, reward });
    frames.push(
      frame(scores, highlight, `${description}。報酬 ${reward} → 腕${arm + 1}の平均は ${means[arm].toFixed(2)}(${counts[arm]}回)`),
    );
  }
  const all: Highlight = {};
  means.forEach((_, i) => (all[i] = "settled"));
  frames.push(
    frame(
      means,
      all,
      `完了: 引いた回数は 腕1=${counts[0]}・腕2=${counts[1]}・腕3=${counts[2]}。棒は各腕の平均報酬の推定値(真の確率 ${BANDIT_PROBS.join("・")})。当たりやすい腕に集中しつつ、他の腕も忘れずに試している`,
    ),
  );
  return { frames, history };
}

export const ucb1Steps = (): SearchFrame[] => ucb1Run().frames;

// ===========================================================================
// トンプソンサンプリング: 棒=各腕の事後分布 Beta(当たり+1, はずれ+1) から引いた標本。最大の腕を引く
// ===========================================================================

/** Marsaglia-Tsang 法の Gamma(shape, 1) と、それを使った Beta(a, b) の標本。乱数は引数の一様乱数から。 */
export function makeBetaSampler(rng: () => number): (a: number, b: number) => number {
  const normal = () => Math.sqrt(-2 * Math.log(rng() + 1e-12)) * Math.cos(2 * Math.PI * rng());
  const gamma = (shape: number): number => {
    if (shape < 1) return gamma(shape + 1) * rng() ** (1 / shape);
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    for (;;) {
      const x = normal();
      const v = (1 + c * x) ** 3;
      if (v <= 0) continue;
      const u = rng();
      if (Math.log(u + 1e-300) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v;
    }
  };
  return (a, b) => {
    const x = gamma(a);
    return x / (x + gamma(b));
  };
}

export type ThompsonRun = BanditRun & { samples: number[][] };

export function thompsonRun(): ThompsonRun {
  const k = BANDIT_PROBS.length;
  const rng = makeRng(BANDIT_SEED + 100);
  const beta = makeBetaSampler(rng);
  const wins = Array<number>(k).fill(1);
  const losses = Array<number>(k).fill(1);
  const history: BanditHistory = [];
  const samples: number[][] = [];
  const posterior = () => wins.map((w, i) => `${(w / (w + losses[i])).toFixed(2)}`).join(" / ");
  const frames = [
    frame(
      Array<number>(k).fill(0),
      {},
      `当たり確率が分からない3つの腕(真の確率は ${BANDIT_PROBS.join("・")}。アルゴリズムは知らない)を ${BANDIT_ROUNDS} 回引く。各腕の当たり確率を、これまでの結果から作った分布 Beta(当たり+1, はずれ+1) で持ち、毎回そこから標本を1つずつ引いて、最大の腕を選ぶ。棒は引いた標本`,
    ),
  ];
  for (let t = 1; t <= BANDIT_ROUNDS; t++) {
    const drawn = wins.map((w, i) => beta(w, losses[i]));
    const arm = drawn.indexOf(Math.max(...drawn));
    const reward = rng() < BANDIT_PROBS[arm] ? 1 : 0;
    const highlight: Highlight = {};
    drawn.forEach((_, i) => (highlight[i] = i === arm ? "pivot" : "comparing"));
    samples.push(drawn);
    history.push({ arm, reward });
    wins[arm] += reward;
    losses[arm] += 1 - reward;
    frames.push(
      frame(
        drawn,
        highlight,
        `ラウンド${t}: 標本 ${drawn.map((s) => s.toFixed(2)).join(" / ")} → 最大の腕${arm + 1}を引く。報酬 ${reward} → 腕${arm + 1}の分布が Beta(${wins[arm]}, ${losses[arm]}) に(各腕の事後平均 ${posterior()})`,
      ),
    );
  }
  const means = wins.map((w, i) => w / (w + losses[i]));
  const all: Highlight = {};
  means.forEach((_, i) => (all[i] = "settled"));
  const pulls = [0, 1, 2].map((a) => history.filter((h) => h.arm === a).length);
  frames.push(
    frame(
      means,
      all,
      `完了: 引いた回数は 腕1=${pulls[0]}・腕2=${pulls[1]}・腕3=${pulls[2]}。棒は各腕の事後平均(真の確率 ${BANDIT_PROBS.join("・")})。データが少ない腕は分布が広く、たまたま高い標本を引いて試される。探索の量を決めるパラメータは要らない`,
    ),
  );
  return { frames, history, samples };
}

export const thompsonSamplingSteps = (): SearchFrame[] => thompsonRun().frames;

// ===========================================================================
// ブレゼンハムの線分描画: 棒=各 x 列で塗るピクセルの y。誤差項(整数)の符号で y を進めるか決める
// ===========================================================================

export const BRESENHAM_LINE = { x0: 0, y0: 0, x1: 15, y1: 6 };

export function bresenhamPoints(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const points: [number, number][] = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    points.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
  return points;
}

export function bresenhamSteps(): SearchFrame[] {
  const { x0, y0, x1, y1 } = BRESENHAM_LINE;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const columns = dx + 1;
  const bars = Array<number>(columns).fill(0);
  const done: Highlight = {};
  const frames = [
    frame(
      bars,
      {},
      `(${x0}, ${y0}) から (${x1}, ${y1}) への線分を、x の列ごとに「塗る行 y」で決める(棒=y)。理想の線は y = ${dy}/${dx}·x。浮動小数点は使わず、誤差項 e = 2·Δy·x − 2·Δx·y + Δx を整数で更新し、e の符号で y を進めるかを決める`,
    ),
  ];
  let y = y0;
  let e = 2 * dy - dx;
  for (let x = x0; x <= x1; x++) {
    bars[x - x0] = y;
    const ideal = (dy * (x - x0)) / dx + y0;
    const step = e > 0 && x < x1;
    frames.push(
      frame(
        bars,
        { ...done, [x - x0]: "pivot" },
        `x=${x}: y=${y} を塗る(理想の y=${ideal.toFixed(2)}、ずれ ${(y - ideal).toFixed(2)})。誤差 e=${e} ${step ? `> 0 なので、次の列では y を1つ進め、e を ${e} + 2(Δy−Δx) = ${e + 2 * (dy - dx)} に` : x < x1 ? `≤ 0 なので、次の列も同じ y。e を ${e} + 2Δy = ${e + 2 * dy} に` : "(終点)"}`,
      ),
    );
    done[x - x0] = "settled";
    if (e > 0) {
      y++;
      e -= 2 * dx;
    }
    e += 2 * dy;
  }
  frames.push(
    frame(
      bars,
      { ...done },
      `完了: ${columns}個のピクセルを、整数の加減算と符号の判定だけで選んだ。どの列でも、理想の線からのずれは半ピクセル以内。始点・終点を厳密に通る`,
    ),
  );
  return frames;
}

export const ESTIMATE_VISUALIZERS: Record<string, () => SearchFrame[]> = {
  "sprague-grundy-nim": spragueGrundySteps,
  "isolation-forest": isolationForestSteps,
  "gauss-seidel-method": gaussSeidelSteps,
  "stride-scheduling": strideSchedulingSteps,
  "ucb1-bandit": ucb1Steps,
  "thompson-sampling": thompsonSamplingSteps,
  "bresenham-line-algorithm": bresenhamSteps,
};
