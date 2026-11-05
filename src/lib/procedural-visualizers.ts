import type { StateColorKey } from "./design-tokens";
import type { SearchFrame } from "./search-visualizers";

/**
 * ゲームの手続き型生成(地形・ノイズ)の可視化。配列の棒グラフ+状態色の kind(SearchVisualizer が描画する)。
 * 棒は「地形の高さ」「ノイズの値」など。色の意味: pivot=いま計算している位置 / comparing=計算に使っている値・計算済み / settled=確定した結果
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

export const PROCEDURAL_VISUALIZERS: Record<string, () => SearchFrame[]> = {
  "midpoint-displacement": midpointDisplacementSteps,
  "perlin-noise": perlinNoiseSteps,
  "worley-noise": worleyNoiseSteps,
};
