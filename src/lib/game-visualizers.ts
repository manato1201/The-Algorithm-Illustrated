import type { StateColorKey } from "./design-tokens";
import type { SearchFrame } from "./search-visualizers";

/**
 * ゲーム(手続き型生成・ゲーム理論)の可視化。配列の棒グラフ+状態色の kind(SearchVisualizer が描画する)。
 * 棒は「地形の高さ」「ノイズの値」「プレイヤーごとの取り分」「戦略の割合」など、アルゴリズムごとに意味が違う。
 * 色の意味は共通: pivot=いま計算している対象 / comparing=計算に使っている値・計算済み / swapping=負の影響・減少 / settled=確定した結果
 * 乱数は固定シードのLCG(Math.randomは使わない)。
 */

type Highlight = Partial<Record<number, StateColorKey>>;

function frame(array: number[], highlight: Highlight, description: string): SearchFrame {
  return { array: [...array], highlight, description };
}

const r2 = (v: number) => Math.round(v * 100) / 100;

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// ===========================================================================
// 中点変位法: 棒=地形の高さ。区間の中点を「両端の平均 + 乱数のずれ」で決め、ずれを半分ずつにして細かくする
// ===========================================================================

export const MIDPOINT_SIZE = 17;
export const MIDPOINT_ENDS: [number, number] = [40, 60];
export const MIDPOINT_AMPLITUDE = 40;
export const MIDPOINT_SEED = 5;

/** 中点を決める順番([左端, 中点, 右端] の列)。区間を半分ずつにしていく。 */
export function midpointOrder(size = MIDPOINT_SIZE): { left: number; mid: number; right: number; level: number }[] {
  const order: { left: number; mid: number; right: number; level: number }[] = [];
  for (let step = size - 1, level = 1; step >= 2; step /= 2, level++) {
    for (let left = 0; left + step < size; left += step) {
      order.push({ left, mid: left + step / 2, right: left + step, level });
    }
  }
  return order;
}

export function midpointDisplacementSteps(): SearchFrame[] {
  const rng = lcg(MIDPOINT_SEED);
  const heights = Array<number>(MIDPOINT_SIZE).fill(0);
  heights[0] = MIDPOINT_ENDS[0];
  heights[MIDPOINT_SIZE - 1] = MIDPOINT_ENDS[1];
  const known: Highlight = { 0: "settled", [MIDPOINT_SIZE - 1]: "settled" };
  const frames = [frame(heights, { ...known }, `両端の高さ(${MIDPOINT_ENDS.join("と")})だけが決まっている。区間の中点を決めて、だんだん細かくしていく`)];
  for (const { left, mid, right, level } of midpointOrder()) {
    const amplitude = MIDPOINT_AMPLITUDE / 2 ** (level - 1);
    const shift = (rng() * 2 - 1) * amplitude;
    const average = (heights[left] + heights[right]) / 2;
    heights[mid] = r2(Math.min(100, Math.max(0, average + shift)));
    frames.push(
      frame(
        heights,
        { ...known, [left]: "comparing", [right]: "comparing", [mid]: "pivot" },
        `段階${level}: 点${left}と点${right}の平均${r2(average)}に、±${amplitude}以内のずれ${r2(shift)}を足して、点${mid}を${heights[mid]}にする`,
      ),
    );
    known[mid] = "settled";
  }
  frames.push(frame(heights, { ...known }, `完了: ${MIDPOINT_SIZE}点の地形ができた。段階が進むほどずれの幅が半分になり、大きな起伏の上に細かい凹凸が乗る`));
  return frames;
}

// ===========================================================================
// パーリンノイズ(1次元): 棒=ノイズの値。格子点ごとの勾配を、なめらかな重みで混ぜる
// ===========================================================================

export const PERLIN_CELLS = 4;
export const PERLIN_SAMPLES_PER_CELL = 8;
export const PERLIN_SEED = 9;

export const perlinFade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export function perlinGradients(): number[] {
  const rng = lcg(PERLIN_SEED);
  return Array.from({ length: PERLIN_CELLS + 1 }, () => rng() * 2 - 1);
}

export function perlinValue(gradients: readonly number[], index: number): number {
  const cell = Math.min(PERLIN_CELLS - 1, Math.floor(index / PERLIN_SAMPLES_PER_CELL));
  const t = index / PERLIN_SAMPLES_PER_CELL - cell;
  const left = gradients[cell] * t;
  const right = gradients[cell + 1] * (t - 1);
  const u = perlinFade(t);
  return left + (right - left) * u;
}

export function perlinNoiseSteps(): SearchFrame[] {
  const gradients = perlinGradients();
  const total = PERLIN_CELLS * PERLIN_SAMPLES_PER_CELL + 1;
  const values = Array<number>(total).fill(0);
  const frames = [frame(values, {}, `格子点${PERLIN_CELLS + 1}個にランダムな勾配(${gradients.map((g) => r2(g)).join(", ")})を置き、その間の値をなめらかに補間する。棒はノイズの値`)];
  const done: Highlight = {};
  for (let i = 0; i < total; i++) {
    const cell = Math.min(PERLIN_CELLS - 1, Math.floor(i / PERLIN_SAMPLES_PER_CELL));
    const t = i / PERLIN_SAMPLES_PER_CELL - cell;
    values[i] = r2(perlinValue(gradients, i));
    const onLattice = i % PERLIN_SAMPLES_PER_CELL === 0;
    frames.push(
      frame(
        values,
        { ...done, [i]: "pivot" },
        onLattice
          ? `位置${i}は格子点${i / PERLIN_SAMPLES_PER_CELL}の真上。距離が0なので、値は必ず0になる`
          : `位置${i}(格子${cell}の中、t=${r2(t)}): 左の勾配から${r2(gradients[cell] * t)}、右の勾配から${r2(gradients[cell + 1] * (t - 1))}。重み${r2(perlinFade(t))}で混ぜて${values[i]}`,
      ),
    );
    done[i] = onLattice ? "settled" : "comparing";
  }
  frames.push(frame(values, { ...done }, "完了: 格子点では必ず0を通り、その間をなめらかな曲線でつないだ連続的なノイズができた"));
  return frames;
}

// ===========================================================================
// ウォーリーノイズ(1次元): 棒=いちばん近い特徴点までの距離
// ===========================================================================

export const WORLEY_CELL = 8;
export const WORLEY_CELLS = 4;
export const WORLEY_SEED = 21;

export function worleyFeaturePoints(): number[] {
  const rng = lcg(WORLEY_SEED);
  return Array.from({ length: WORLEY_CELLS }, (_, c) => r2(c * WORLEY_CELL + rng() * WORLEY_CELL));
}

export function worleyNoiseSteps(): SearchFrame[] {
  const points = worleyFeaturePoints();
  const length = WORLEY_CELL * WORLEY_CELLS;
  const values = Array<number>(length).fill(0);
  const frames = [frame(values, {}, `各区画(幅${WORLEY_CELL})に特徴点を1つずつランダムに置く(位置 ${points.join(", ")})。棒は、いちばん近い特徴点までの距離`)];
  const done: Highlight = {};
  for (let x = 0; x < length; x++) {
    const cell = Math.floor(x / WORLEY_CELL);
    let nearest = -1;
    let distance = Infinity;
    for (let c = Math.max(0, cell - 1); c <= Math.min(WORLEY_CELLS - 1, cell + 1); c++) {
      const d = Math.abs(points[c] - x);
      if (d < distance) {
        distance = d;
        nearest = c;
      }
    }
    values[x] = r2(distance);
    frames.push(frame(values, { ...done, [x]: "pivot" }, `位置${x}: 自分の区画と両隣の特徴点だけを調べ、最も近い特徴点${nearest + 1}(位置${points[nearest]})までの距離は${values[x]}`));
    done[x] = distance < 1 ? "settled" : "comparing";
  }
  frames.push(frame(values, { ...done }, "完了: 特徴点の近く(距離1未満)は値が0に近い谷になり、特徴点から離れるほど山になる。細胞のような模様のもとになる"));
  return frames;
}

// ===========================================================================
// シャープレイ値: 棒=各プレイヤーの取り分(これまでの並び順の平均)
// ===========================================================================

export const SHAPLEY_PLAYERS = ["A", "B", "C"];
/** 連合ごとの価値(ビット0=A, ビット1=B, ビット2=C)。 */
export const SHAPLEY_VALUE: Record<number, number> = { 0: 0, 1: 10, 2: 20, 4: 30, 3: 40, 5: 50, 6: 60, 7: 90 };

export function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
}

export function shapleyValueSteps(): SearchFrame[] {
  const n = SHAPLEY_PLAYERS.length;
  const order = permutations([...Array(n).keys()]);
  const sums = Array<number>(n).fill(0);
  let processed = 0;
  const average = () => sums.map((s) => r2(s / Math.max(1, processed)));
  const frames = [frame(Array<number>(n).fill(0), {}, `3人の協力ゲーム。全員で組むと${SHAPLEY_VALUE[7]}の価値。参加順${order.length}通りのそれぞれで「その人が加わって増えた分」を数え、平均を取る`)];
  for (const perm of order) {
    let coalition = 0;
    const parts: string[] = [];
    const highlight: Highlight = {};
    for (const player of perm) {
      const marginal = SHAPLEY_VALUE[coalition | (1 << player)] - SHAPLEY_VALUE[coalition];
      sums[player] += marginal;
      coalition |= 1 << player;
      parts.push(`${SHAPLEY_PLAYERS[player]}:+${marginal}`);
      highlight[player] = "comparing";
    }
    processed++;
    frames.push(frame(average(), highlight, `参加順 ${perm.map((p) => SHAPLEY_PLAYERS[p]).join("→")}: 加わるたびの増加分は ${parts.join(" ")}。ここまで${processed}通りの平均を表示`));
  }
  const all: Highlight = {};
  for (let i = 0; i < n; i++) all[i] = "settled";
  const result = average();
  frames.push(frame(result, all, `完了: 取り分は ${result.map((v, i) => `${SHAPLEY_PLAYERS[i]}=${v}`).join(" ")}。合計${r2(result.reduce((a, b) => a + b, 0))}は全員の価値${SHAPLEY_VALUE[7]}と一致する`));
  return frames;
}

// ===========================================================================
// タカ・ハトゲーム: 棒=[タカの割合, ハトの割合](%)。うまくいく戦略が増える(複製子動学)
// ===========================================================================

export const HAWK_DOVE_V = 2;
export const HAWK_DOVE_C = 4;
export const HAWK_DOVE_RATE = 1.5;
export const HAWK_DOVE_START = 0.1;
export const HAWK_DOVE_GENERATIONS = 30;

/** タカの割合 p の次世代。タカの平均利得 − ハトの平均利得 = (V − p·C)/2。 */
export function hawkDoveNext(p: number): number {
  const hawk = p * ((HAWK_DOVE_V - HAWK_DOVE_C) / 2) + (1 - p) * HAWK_DOVE_V;
  const dove = (1 - p) * (HAWK_DOVE_V / 2);
  return p + HAWK_DOVE_RATE * p * (1 - p) * (hawk - dove);
}

export function hawkDoveSteps(): SearchFrame[] {
  let p = HAWK_DOVE_START;
  const bars = () => [r2(p * 100), r2((1 - p) * 100)];
  const frames = [frame(bars(), { 0: "pivot", 1: "comparing" }, `資源の価値V=${HAWK_DOVE_V}、闘争のコストC=${HAWK_DOVE_C}。タカ(戦う)が${r2(p * 100)}%の集団から始める。平均利得が高い戦略の割合が増える`)];
  for (let g = 1; g <= HAWK_DOVE_GENERATIONS; g++) {
    const before = p;
    p = hawkDoveNext(p);
    frames.push(
      frame(bars(), { 0: p > before ? "pivot" : "swapping", 1: "comparing" }, `第${g}世代: タカの割合 ${r2(before * 100)}% → ${r2(p * 100)}%(${p > before ? "タカのほうが得なので増える" : "タカのほうが損なので減る"})`),
    );
  }
  frames.push(frame(bars(), { 0: "settled", 1: "settled" }, `完了: タカの割合が V/C = ${HAWK_DOVE_V / HAWK_DOVE_C}(${(HAWK_DOVE_V / HAWK_DOVE_C) * 100}%)付近に落ち着いた。これ以上、どちらの戦略も得をしない混合状態(進化的に安定)`));
  return frames;
}

// ===========================================================================
// しっぺ返し戦略: 棒=[しっぺ返し(対 常に裏切り), 常に裏切り, しっぺ返し(対 しっぺ返し), しっぺ返し]の累計得点
// ===========================================================================

export const TFT_ROUNDS = 10;
/** 囚人のジレンマの得点: 裏切る側が協力側を出し抜く T=5 / 互いに協力 R=3 / 互いに裏切り P=1 / 出し抜かれる S=0 */
export const PAYOFF = { T: 5, R: 3, P: 1, S: 0 };

export function payoff(mine: "C" | "D", theirs: "C" | "D"): number {
  if (mine === "C") return theirs === "C" ? PAYOFF.R : PAYOFF.S;
  return theirs === "C" ? PAYOFF.T : PAYOFF.P;
}

export function titForTatSteps(): SearchFrame[] {
  const totals = [0, 0, 0, 0];
  const frames = [frame(totals, {}, `しっぺ返し(最初は協力、以後は相手の前回の手をまねる)を、常に裏切る相手と、しっぺ返し同士で${TFT_ROUNDS}回戦わせる。棒は累計得点`)];
  type Move = "C" | "D";
  let tftVsAllD: Move = "C";
  let tftA: Move = "C";
  let tftB: Move = "C";
  for (let round = 1; round <= TFT_ROUNDS; round++) {
    const m1 = tftVsAllD;
    totals[0] += payoff(m1, "D");
    totals[1] += payoff("D", m1);
    const a: Move = tftA;
    const b: Move = tftB;
    totals[2] += payoff(a, b);
    totals[3] += payoff(b, a);
    frames.push(
      frame(
        totals,
        { 0: m1 === "C" ? "comparing" : "swapping", 1: "comparing", 2: a === "C" && b === "C" ? "settled" : "swapping", 3: a === "C" && b === "C" ? "settled" : "swapping" },
        `${round}回戦: 対・常に裏切り → しっぺ返し${m1 === "C" ? "は協力して出し抜かれる" : "は裏切りで応戦"}。対・しっぺ返し → ${a === "C" && b === "C" ? "お互いに協力" : "裏切り"}`,
      ),
    );
    tftVsAllD = "D";
    tftA = b;
    tftB = a;
  }
  frames.push(
    frame(
      totals,
      { 0: "swapping", 1: "comparing", 2: "settled", 3: "settled" },
      `完了: 常に裏切る相手には最初の1回だけ出し抜かれ(${totals[0]}対${totals[1]}点)、しっぺ返し同士は毎回協力して${totals[2]}点ずつ。協力できる相手とは大きく稼ぐ`,
    ),
  );
  return frames;
}

export const GAME_VISUALIZERS: Record<string, () => SearchFrame[]> = {
  "midpoint-displacement": midpointDisplacementSteps,
  "perlin-noise": perlinNoiseSteps,
  "worley-noise": worleyNoiseSteps,
  "shapley-value": shapleyValueSteps,
  "hawk-dove-game": hawkDoveSteps,
  "tit-for-tat-iterated-prisoners-dilemma": titForTatSteps,
};
