import type { StateColorKey } from "./design-tokens";
import type { SearchFrame } from "./search-visualizers";

/**
 * 情報検索・ランキングの可視化(配列の棒グラフ+状態色の kind。SearchVisualizer が描画する)。
 * 棒は「文書ごとのスコア」「順位ごとの寄与」など、アルゴリズムごとに意味が違う(各関数の説明を参照)。
 * 色の意味は共通: pivot=いま計算している対象 / comparing=計算済み・候補 / swapping=割り引かれた・却下 / settled=確定した結果
 */

type Highlight = Partial<Record<number, StateColorKey>>;

function frame(
  array: number[],
  highlight: Highlight,
  description: string,
): SearchFrame {
  return { array: [...array], highlight, description };
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;

// ===========================================================================
// ベクトル空間モデル: 棒=クエリと各文書のコサイン類似度
// ===========================================================================

export const VSM_TERMS = ["graph", "sort", "search", "tree"];
export const VSM_QUERY = [1, 1, 0, 0];
export const VSM_DOCS = [
  [3, 0, 1, 0],
  [1, 2, 0, 1],
  [0, 3, 2, 0],
  [0, 0, 1, 4],
  [2, 2, 0, 0],
];

export function cosineSimilarity(
  a: readonly number[],
  b: readonly number[],
): number {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const norm = (x: readonly number[]) =>
    Math.sqrt(x.reduce((sum, v) => sum + v * v, 0));
  return dot / (norm(a) * norm(b));
}

export function vectorSpaceModelSteps(): SearchFrame[] {
  const scores = Array<number>(VSM_DOCS.length).fill(0);
  const frames = [
    frame(
      scores,
      {},
      `クエリ(${VSM_TERMS.map((t, i) => `${t}×${VSM_QUERY[i]}`).join(" ")})と各文書を、語の出現回数のベクトルにして比べる。棒はコサイン類似度`,
    ),
  ];
  const done: Highlight = {};
  VSM_DOCS.forEach((doc, i) => {
    const dot = doc.reduce((sum, v, k) => sum + v * VSM_QUERY[k], 0);
    scores[i] = r3(cosineSimilarity(VSM_QUERY, doc));
    frames.push(
      frame(
        scores,
        { ...done, [i]: "pivot" },
        `文書${i + 1} (${doc.join(",")}): 内積${dot} ÷ (|q|·|d|) = ${scores[i].toFixed(3)}。長さの違いを割って、向きの近さだけを見る`,
      ),
    );
    done[i] = "comparing";
  });
  const best = scores.indexOf(Math.max(...scores));
  frames.push(
    frame(
      scores,
      { [best]: "settled" },
      `完了: 文書${best + 1}が最もクエリの向きに近い(類似度${scores[best].toFixed(3)})`,
    ),
  );
  return frames;
}

// ===========================================================================
// nDCG: 棒=順位ごとの割引後の利得 rel / log2(順位+1)
// ===========================================================================

export const NDCG_RELEVANCE = [3, 2, 3, 0, 1, 2];

export function dcg(relevance: readonly number[]): number {
  return relevance.reduce((sum, rel, i) => sum + rel / Math.log2(i + 2), 0);
}

export function ndcgEvaluationSteps(): SearchFrame[] {
  const rel = NDCG_RELEVANCE;
  const gains = Array<number>(rel.length).fill(0);
  const frames = [
    frame(
      gains,
      {},
      `検索結果の上位から並べた適合度は ${rel.join("・")}(3=とても関連)。順位が下がるほど価値を割り引いて足す`,
    ),
  ];
  let running = 0;
  const done: Highlight = {};
  rel.forEach((r, i) => {
    gains[i] = r3(r / Math.log2(i + 2));
    running += r / Math.log2(i + 2);
    frames.push(
      frame(
        gains,
        { ...done, [i]: "pivot" },
        `${i + 1}位: 適合度${r} ÷ log2(${i + 2}) = ${gains[i].toFixed(3)}。DCGの累計は${running.toFixed(3)}`,
      ),
    );
    done[i] = "comparing";
  });
  const ideal = [...rel].sort((a, b) => b - a);
  const total = dcg(rel);
  const best = dcg(ideal);
  const all: Highlight = {};
  rel.forEach((_, i) => {
    all[i] = "settled";
  });
  frames.push(
    frame(
      gains,
      all,
      `完了: DCG ${total.toFixed(3)} ÷ 理想の並び(${ideal.join("・")})のDCG ${best.toFixed(3)} = nDCG ${(total / best).toFixed(3)}`,
    ),
  );
  return frames;
}

// ===========================================================================
// MMR: 棒=各候補の MMR スコア。似ている候補は、選んだものとの類似度で割り引く
// ===========================================================================

export const MMR_RELEVANCE = [0.9, 0.85, 0.8, 0.5, 0.4];
export const MMR_SIMILARITY = [
  [1, 0.95, 0.2, 0.3, 0.1],
  [0.95, 1, 0.25, 0.3, 0.15],
  [0.2, 0.25, 1, 0.1, 0.2],
  [0.3, 0.3, 0.1, 1, 0.4],
  [0.1, 0.15, 0.2, 0.4, 1],
];
export const MMR_LAMBDA = 0.6;
export const MMR_PICKS = 4;

/** MMR(d) = λ·関連度(d) − (1−λ)·(選択済みとの最大類似度)。 */
export function mmrScore(
  candidate: number,
  selected: readonly number[],
): number {
  const redundancy =
    selected.length === 0
      ? 0
      : Math.max(...selected.map((s) => MMR_SIMILARITY[candidate][s]));
  return MMR_LAMBDA * MMR_RELEVANCE[candidate] - (1 - MMR_LAMBDA) * redundancy;
}

export function mmrDiversityRerankingSteps(): SearchFrame[] {
  const n = MMR_RELEVANCE.length;
  const bars = MMR_RELEVANCE.map((r) => r3(MMR_LAMBDA * r));
  const frames = [
    frame(
      bars,
      {},
      `候補${n}件を関連度の高さだけでなく「すでに選んだものと似ていないか」も見て選ぶ(λ=${MMR_LAMBDA})。棒は各候補のMMRスコア`,
    ),
  ];
  const selected: number[] = [];
  for (let round = 1; round <= MMR_PICKS; round++) {
    const highlight: Highlight = {};
    selected.forEach((s) => {
      highlight[s] = "settled";
    });
    let best = -1;
    for (let c = 0; c < n; c++) {
      if (selected.includes(c)) continue;
      bars[c] = r3(mmrScore(c, selected));
      highlight[c] = "comparing";
      if (best === -1 || bars[c] > bars[best]) best = c;
    }
    highlight[best] = "pivot";
    const redundancy =
      selected.length === 0
        ? 0
        : Math.max(...selected.map((s) => MMR_SIMILARITY[best][s]));
    const demoted = [...Array(n).keys()].filter(
      (c) =>
        !selected.includes(c) &&
        c !== best &&
        MMR_RELEVANCE[c] > MMR_RELEVANCE[best],
    );
    frames.push(
      frame(
        bars,
        highlight,
        `${round}回目: 最大は候補${best + 1}(MMR ${bars[best].toFixed(3)}${selected.length > 0 ? `、選択済みとの最大類似度${redundancy}` : ""})。${demoted.length > 0 ? `候補${demoted.map((c) => c + 1).join("・")}は関連度が高いが、選んだものと似ているので割り引かれた` : ""}`,
      ),
    );
    selected.push(best);
  }
  const all: Highlight = {};
  selected.forEach((s) => {
    all[s] = "settled";
  });
  frames.push(
    frame(
      bars,
      all,
      `完了: 選んだ順は 候補${selected.map((s) => s + 1).join(" → ")}。関連度だけで並べた順(候補1→2→3→4)から、似た候補が後ろへ下がっている`,
    ),
  );
  return frames;
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
  "vector-space-model": vectorSpaceModelSteps,
  "ndcg-evaluation": ndcgEvaluationSteps,
  "mmr-diversity-reranking": mmrDiversityRerankingSteps,
  simhash: simhashSteps,
};
