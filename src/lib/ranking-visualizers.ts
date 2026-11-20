import type { StateColorKey } from "./design-tokens";
import type { SearchFrame } from "./search-visualizers";

/**
 * 情報検索の可視化のうち、配列の棒グラフ(SearchFrame)で描くもの(SimHash)。
 * 棒はビット位置ごとの重み付き合計。色の意味: comparing=足し込み中のビット / settled=指紋で1になったビット
 */

type Highlight = Partial<Record<number, StateColorKey>>;

function frame(array: number[], highlight: Highlight, description: string): SearchFrame {
  return { array: [...array], highlight, description };
}

// ===========================================================================
// SimHash: 棒=ビット位置ごとの重み付き合計。正なら1、負なら0
// ===========================================================================

export const SIMHASH_BITS = 8;
export const SIMHASH_DOC_A: [string, number][] = [
  ["graph", 3],
  ["sort", 2],
  ["tree", 1],
  ["search", 2],
];
export const SIMHASH_DOC_B: [string, number][] = [
  ["graph", 3],
  ["sort", 2],
  ["heap", 1],
  ["search", 2],
];

/** FNV-1a(32bit)の下位 SIMHASH_BITS ビット。 */
export function tokenHash(token: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash & ((1 << SIMHASH_BITS) - 1);
}
const bitsOf = (value: number) =>
  Array.from(
    { length: SIMHASH_BITS },
    (_, b) => (value >> (SIMHASH_BITS - 1 - b)) & 1,
  );

export function simhashFingerprint(
  tokens: readonly [string, number][],
): number[] {
  const sums = Array<number>(SIMHASH_BITS).fill(0);
  for (const [token, weight] of tokens) {
    bitsOf(tokenHash(token)).forEach((bit, b) => {
      sums[b] += bit === 1 ? weight : -weight;
    });
  }
  return sums;
}

export function simhashSteps(): SearchFrame[] {
  const sums = Array<number>(SIMHASH_BITS).fill(0);
  const all: Highlight = {};
  for (let b = 0; b < SIMHASH_BITS; b++) all[b] = "comparing";
  const frames = [
    frame(
      sums,
      {},
      `文書を重み付きの語(${SIMHASH_DOC_A.map(([t, w]) => `${t}:${w}`).join(" ")})に分け、各語の${SIMHASH_BITS}bitハッシュのビットごとに、1なら+重み・0なら−重みを足す`,
    ),
  ];
  for (const [token, weight] of SIMHASH_DOC_A) {
    const bits = bitsOf(tokenHash(token));
    bits.forEach((bit, b) => {
      sums[b] += bit === 1 ? weight : -weight;
    });
    frames.push(
      frame(
        sums,
        all,
        `語「${token}」(重み${weight})のハッシュ ${bits.join("")}: 1のビットに+${weight}、0のビットに−${weight}`,
      ),
    );
  }
  const fingerprint: number[] = sums.map((s) => (s > 0 ? 1 : 0));
  const finalMarks: Highlight = {};
  fingerprint.forEach((bit, b) => {
    if (bit === 1) finalMarks[b] = "settled";
  });
  const other: number[] = simhashFingerprint(SIMHASH_DOC_B).map((s) => (s > 0 ? 1 : 0));
  const distance = fingerprint.reduce(
    (sum, bit, b) => sum + (bit !== other[b] ? 1 : 0),
    0,
  );
  frames.push(
    frame(
      sums,
      finalMarks,
      `完了: 合計が正なら1、負なら0 → 指紋 ${fingerprint.join("")}。語1つ(tree→heap)だけ違う文書の指紋は ${other.join("")} で、ハミング距離は${distance}。似た文書は指紋も近い`,
    ),
  );
  return frames;
}

// ===========================================================================
// ウィルソンスコア: 棒=評価の割合(%)→ 信頼区間の下限(%)に置き換える。評価が少ない項目ほど大きく割り引かれる
// ===========================================================================

export const WILSON_ITEMS: { name: string; positive: number; total: number }[] = [
  { name: "A", positive: 2, total: 2 },
  { name: "B", positive: 9, total: 10 },
  { name: "C", positive: 45, total: 50 },
  { name: "D", positive: 180, total: 200 },
  { name: "E", positive: 920, total: 1000 },
  { name: "F", positive: 3, total: 5 },
];
export const WILSON_Z = 1.96;

export function wilsonLowerBound(positive: number, total: number, z = WILSON_Z): number {
  if (total === 0) return 0;
  const p = positive / total;
  const center = p + (z * z) / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
  return (center - margin) / (1 + (z * z) / total);
}

const round1 = (v: number) => Math.round(v * 10) / 10;

export function wilsonScoreSteps(): SearchFrame[] {
  const items = WILSON_ITEMS;
  const bars = items.map((it) => round1((it.positive / it.total) * 100));
  const frames = [
    frame(
      bars,
      {},
      `6つの項目の高評価の割合(%)。割合の順(${[...items].sort((a, b) => b.positive / b.total - a.positive / a.total || a.name.localeCompare(b.name)).map((it) => it.name).join(" > ")})だと、2件だけの満点の A が1位になる。評価の数も考えて、割合の信頼区間(95%)の下限に置き換える`,
    ),
  ];
  const done: Highlight = {};
  items.forEach((it, i) => {
    const lower = wilsonLowerBound(it.positive, it.total) * 100;
    bars[i] = round1(lower);
    frames.push(
      frame(
        bars,
        { ...done, [i]: "pivot" },
        `${it.name}: ${it.positive}/${it.total} = ${round1((it.positive / it.total) * 100)}% → 信頼区間の下限 ${round1(lower)}%(評価が${it.total}件なので ${round1((it.positive / it.total) * 100 - lower)} ポイント割り引く)`,
      ),
    );
    done[i] = "swapping";
  });
  const order = items.map((it, i) => ({ name: it.name, score: bars[i] })).sort((a, b) => b.score - a.score);
  const all: Highlight = {};
  items.forEach((_, i) => (all[i] = "settled"));
  frames.push(
    frame(
      bars,
      all,
      `完了: 下限の順は ${order.map((o) => `${o.name}(${o.score}%)`).join(" > ")}。1000件で92%の E が、2件だけの満点の A より上になった。評価が増えるほど、下限は観測した割合に近づく`,
    ),
  );
  return frames;
}

export const RANKING_VISUALIZERS: Record<string, () => SearchFrame[]> = {
  simhash: simhashSteps,
  "wilson-score-interval": wilsonScoreSteps,
};
