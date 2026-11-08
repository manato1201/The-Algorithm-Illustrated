import type { StateColorKey } from "./design-tokens";
import type { SearchFrame } from "./search-visualizers";

/**
 * 競技プログラミングの定番テクニックの可視化(配列の棒グラフ+状態色の kind。SearchVisualizer が描画する)。
 * 棒は「差分配列」「BIT(フェニック木)の各要素」「並べ替え中の配列」「確率の表」など、アルゴリズムごとに意味が違う。
 * 色の意味: pivot=いま書き換える・注目する要素 / comparing=読んでいる要素・進行中 / swapping=引く・入れ替える・使い切る / settled=確定
 */

type Highlight = Partial<Record<number, StateColorKey>>;

function frame(
  array: number[],
  highlight: Highlight,
  description: string,
): SearchFrame {
  return { array: [...array], highlight, description };
}

// ===========================================================================
// いもす法: 区間への加算を、差分の2点更新+最後の累積和でまとめて処理する
// ===========================================================================

export const IMOS_N = 12;
/** 加算する区間 [l, r](両端を含む)。それぞれ +1。 */
export const IMOS_RANGES: [number, number][] = [
  [1, 5],
  [3, 8],
  [4, 10],
  [7, 11],
];

export function imosMethodSteps(): SearchFrame[] {
  const diff = Array<number>(IMOS_N + 1).fill(0);
  const frames = [
    frame(
      diff,
      {},
      `${IMOS_N}マスに、区間 ${IMOS_RANGES.map(([l, r]) => `[${l}, ${r}]`).join("・")} をそれぞれ +1 する。1マスずつ足さず、差分配列の2点(始点に+1・終点の次に−1)だけを書き換える`,
    ),
  ];
  for (const [l, r] of IMOS_RANGES) {
    diff[l] += 1;
    diff[r + 1] -= 1;
    frames.push(
      frame(
        diff,
        { [l]: "pivot", [r + 1]: "swapping" },
        `区間 [${l}, ${r}]: diff[${l}] に +1、diff[${r + 1}] に −1。区間の中のマスは触らない`,
      ),
    );
  }
  const settled: Highlight = {};
  for (let i = 1; i <= IMOS_N - 1; i++) {
    diff[i] += diff[i - 1];
    settled[i - 1] = "settled";
    frames.push(
      frame(
        diff,
        { ...settled, [i]: "pivot", [i - 1]: "comparing" },
        `累積和: マス${i} に 直前の値を足して ${diff[i]}(マス${i}を覆う区間の数)`,
      ),
    );
  }
  settled[IMOS_N - 1] = "settled";
  frames.push(
    frame(
      diff,
      { ...settled },
      `完了: 各マスの値が、そのマスを覆う区間の数。区間が ${IMOS_RANGES.length} つでも、書き換えは各区間につき2回+累積和1周で済む(O(N + 区間数))。右端の余分な要素は終点の次の番兵`,
    ),
  );
  return frames;
}

// ===========================================================================
// BIT(フェニック木)で転倒数を数える
// ===========================================================================

export const INVERSION_ARRAY = [5, 3, 8, 6, 2, 7, 1, 4];

/** BIT で数えた転倒数(i < j かつ a[i] > a[j] の組の数)。値は 1..n の順列。 */
export function inversionsByBit(a: readonly number[]): number {
  const n = a.length;
  const bit = Array<number>(n + 1).fill(0);
  let total = 0;
  a.forEach((x, i) => {
    let seen = 0;
    for (let j = x; j > 0; j -= j & -j) seen += bit[j];
    total += i - seen;
    for (let j = x; j <= n; j += j & -j) bit[j]++;
  });
  return total;
}

export function inversionCountBitSteps(): SearchFrame[] {
  const a = INVERSION_ARRAY;
  const n = a.length;
  const bit = Array<number>(n + 1).fill(0);
  const view = () => bit.slice(1);
  const frames = [
    frame(
      view(),
      {},
      `並び ${a.join(" ")} の転倒数(左にあって自分より大きい要素の数の合計)を、BIT(各値の個数を数える木)で数える。棒は BIT の各要素 1〜${n}`,
    ),
  ];
  let total = 0;
  a.forEach((x, i) => {
    let seen = 0;
    const visited: Highlight = {};
    for (let j = x; j > 0; j -= j & -j) {
      seen += bit[j];
      visited[j - 1] = "comparing";
    }
    const larger = i - seen;
    total += larger;
    frames.push(
      frame(
        view(),
        visited,
        `${i + 1}個目の ${x}: これまでの ${i} 個のうち ${x} 以下は ${seen} 個(BITの上の節をたどる)→ 自分より大きいものが ${larger} 個 → 転倒数の合計 ${total}`,
      ),
    );
    const updated: Highlight = {};
    for (let j = x; j <= n; j += j & -j) {
      bit[j]++;
      updated[j - 1] = "pivot";
    }
    frames.push(
      frame(
        view(),
        updated,
        `${x} を BIT に登録: 値 ${x} を含む節(${Object.keys(updated)
          .map((k) => Number(k) + 1)
          .join("・")})に +1`,
      ),
    );
  });
  const all: Highlight = {};
  for (let i = 0; i < n; i++) all[i] = "settled";
  frames.push(
    frame(
      view(),
      all,
      `完了: 転倒数は ${total}。各要素の処理は O(log n) で、全体で O(n log n)(総当たりの O(n²) より速い)`,
    ),
  );
  return frames;
}

// ===========================================================================
// Fisher-Yates シャッフル: 末尾から、残りの範囲のランダムな位置と入れ替える
// ===========================================================================

export const FISHER_YATES_SIZE = 10;
export const FISHER_YATES_SEED = 77;

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** 選択列 choices[k](i = n−1−k のときの j、0 ≤ j ≤ i)を使って、配列を並べ替える。 */
export function fisherYatesWith(
  array: readonly number[],
  choices: readonly number[],
): number[] {
  const a = [...array];
  for (let i = a.length - 1, k = 0; i >= 1; i--, k++) {
    const j = choices[k];
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function fisherYatesChoices(): number[] {
  const rng = lcg(FISHER_YATES_SEED);
  const choices: number[] = [];
  for (let i = FISHER_YATES_SIZE - 1; i >= 1; i--)
    choices.push(Math.floor(rng() * (i + 1)));
  return choices;
}

export function fisherYatesShuffleSteps(): SearchFrame[] {
  const a = Array.from({ length: FISHER_YATES_SIZE }, (_, i) => i + 1);
  const choices = fisherYatesChoices();
  const frames = [
    frame(
      a,
      {},
      `1〜${FISHER_YATES_SIZE}の並びを、末尾 i から順に「0〜i のランダムな位置 j」と入れ替えて混ぜる。入れ替えた末尾は、もう動かさない`,
    ),
  ];
  const settled: Highlight = {};
  for (let i = a.length - 1, k = 0; i >= 1; i--, k++) {
    const j = choices[k];
    frames.push(
      frame(
        a,
        { ...settled, [i]: "pivot", [j]: i === j ? "pivot" : "comparing" },
        `i=${i}: 0〜${i} から j=${j} を選ぶ${i === j ? "(自分自身。そのまま)" : `。a[${i}]=${a[i]} と a[${j}]=${a[j]} を入れ替える`}`,
      ),
    );
    [a[i], a[j]] = [a[j], a[i]];
    settled[i] = "settled";
    if (i !== j)
      frames.push(
        frame(
          a,
          { ...settled, [j]: "swapping" },
          `a[${i}] は ${a[i]} に確定。a[${j}] には ${a[j]} が来た`,
        ),
      );
  }
  settled[0] = "settled";
  frames.push(
    frame(
      a,
      { ...settled },
      `完了: ${a.join(" ")}。選び方は 10×9×…×2 = ${choices.reduce((p, _, k) => p * (FISHER_YATES_SIZE - k), 1)} 通りで、どの並びもちょうど1通りずつ対応するので、一様に混ざる(各並びが同じ確率)`,
    ),
  );
  return frames;
}

// ===========================================================================
// エイリアス法(Vose): 確率 p の離散分布を、O(1) で抽選できる表にする
// ===========================================================================

export const ALIAS_PROBABILITIES = [0.05, 0.1, 0.15, 0.2, 0.2, 0.3];

/** Vose のエイリアス法の表。prob[i] = 「列 i を選んだとき、i そのものを返す確率」、alias[i] = そうでないときに返す相手。 */
export function aliasTables(p: readonly number[]): {
  prob: number[];
  alias: number[];
} {
  const n = p.length;
  const scaled = p.map((x) => x * n);
  const prob = Array<number>(n).fill(1);
  const alias = Array.from({ length: n }, (_, i) => i);
  const small: number[] = [];
  const large: number[] = [];
  scaled.forEach((x, i) => (x < 1 ? small : large).push(i));
  while (small.length > 0 && large.length > 0) {
    const s = small.pop()!;
    const l = large.pop()!;
    prob[s] = scaled[s];
    alias[s] = l;
    scaled[l] = scaled[l] + scaled[s] - 1;
    (scaled[l] < 1 ? small : large).push(l);
  }
  return { prob, alias };
}

export function aliasMethodSteps(): SearchFrame[] {
  const p = ALIAS_PROBABILITIES;
  const n = p.length;
  const scaled = p.map((x) => Math.round(x * n * 1e9) / 1e9);
  const frames = [
    frame(
      scaled,
      {},
      `確率 ${p.join("・")} を n=${n} 倍した値(棒)。1 未満の列は「足りない」、1 より大きい列は「余っている」。余りを足りない列に分け与えて、全列をちょうど 1 にそろえる`,
    ),
  ];
  const small: number[] = [];
  const large: number[] = [];
  scaled.forEach((x, i) => (x < 1 ? small : large).push(i));
  const done: Highlight = {};
  while (small.length > 0 && large.length > 0) {
    const s = small.pop()!;
    const l = large.pop()!;
    frames.push(
      frame(
        scaled,
        { ...done, [s]: "pivot", [l]: "comparing" },
        `足りない列 ${s}(${scaled[s].toFixed(2)})に、余っている列 ${l}(${scaled[l].toFixed(2)})から ${(1 - scaled[s]).toFixed(2)} を分けてもらう。列 ${s} の相手(alias)は列 ${l}`,
      ),
    );
    const give = 1 - scaled[s];
    scaled[l] = Math.round((scaled[l] - give) * 1e9) / 1e9;
    done[s] = "settled";
    frames.push(
      frame(
        scaled,
        { ...done, [l]: "swapping" },
        `列 ${s} は確率 ${scaled[s].toFixed(2)} で自分、残りは列 ${l} を返す表に確定。列 ${l} は ${scaled[l].toFixed(2)} に減った`,
      ),
    );
    (scaled[l] < 1 ? small : large).push(l);
  }
  const all: Highlight = {};
  for (let i = 0; i < n; i++) all[i] = "settled";
  frames.push(
    frame(
      scaled.map((x, i) => (done[i] === "settled" ? x : 1)),
      all,
      `完了: 抽選は「列を一様に選び、確率 prob で自分、そうでなければ alias を返す」の2回の乱数だけ(O(1))。棒は各列の prob(1 の列は常に自分)`,
    ),
  );
  return frames;
}

export const CONTEST_VISUALIZERS: Record<string, () => SearchFrame[]> = {
  "imos-method": imosMethodSteps,
  "inversion-count-bit": inversionCountBitSteps,
  "fisher-yates-shuffle": fisherYatesShuffleSteps,
  "alias-method": aliasMethodSteps,
};
