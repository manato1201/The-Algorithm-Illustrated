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

export const RANKING_VISUALIZERS: Record<string, () => SearchFrame[]> = {
  simhash: simhashSteps,
};
