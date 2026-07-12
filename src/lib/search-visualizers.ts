import type { StateColorKey } from "./design-tokens";

export type SearchFrame = {
  array: number[];
  highlight: Partial<Record<number, StateColorKey>>;
  description: string;
};

function frame(
  array: number[],
  highlight: Partial<Record<number, StateColorKey>>,
  description: string,
): SearchFrame {
  return { array: [...array], highlight, description };
}

/**
 * 探索対象の固定配列(ソート済み)。SORT_VISUALIZERSの初期配列と同じ値をソートしたもの。
 * 二分探索・補間探索など「ソート済みであること」を前提とするアルゴリズムのために整列済みにしている。
 */
export const SEARCH_ARRAY = [
  3, 5, 8, 11, 15, 19, 23, 30, 34, 41, 45, 56, 59, 62, 68, 71, 77, 82, 88, 90,
];
export const SEARCH_TARGET = 62;

/** 線形探索。先頭から順番に1つずつ比較する、最も素朴で前提条件を必要としない探索。 */
export function linearSearchSteps(): SearchFrame[] {
  const array = SEARCH_ARRAY;
  const target = SEARCH_TARGET;
  const frames: SearchFrame[] = [
    frame(array, {}, `初期状態(検索対象: ${target})`),
  ];

  for (let i = 0; i < array.length; i++) {
    frames.push(
      frame(array, { [i]: "comparing" }, `${i + 1}番目(値${array[i]})を検査`),
    );
    if (array[i] === target) {
      frames.push(
        frame(array, { [i]: "settled" }, `値${target}を${i + 1}番目で発見`),
      );
      return frames;
    }
  }
  frames.push(frame(array, {}, `値${target}は見つかりませんでした`));
  return frames;
}

/** 二分探索。ソート済み配列の中央値と比較し、探索範囲を毎回半分に絞り込む。 */
export function binarySearchSteps(): SearchFrame[] {
  const array = SEARCH_ARRAY;
  const target = SEARCH_TARGET;
  const frames: SearchFrame[] = [
    frame(array, {}, `初期状態(検索対象: ${target})`),
  ];
  let low = 0;
  let high = array.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const highlight: Partial<Record<number, StateColorKey>> = {
      [mid]: "pivot",
    };
    for (let i = low; i <= high; i++) if (i !== mid) highlight[i] = "comparing";
    frames.push(
      frame(
        array,
        highlight,
        `探索範囲[${low + 1}, ${high + 1}]の中央${mid + 1}番目(値${array[mid]})を検査`,
      ),
    );

    if (array[mid] === target) {
      frames.push(
        frame(array, { [mid]: "settled" }, `値${target}を${mid + 1}番目で発見`),
      );
      return frames;
    } else if (array[mid] < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  frames.push(frame(array, {}, `値${target}は見つかりませんでした`));
  return frames;
}

/** 三分探索。範囲を三等分する2点を比較し、範囲を1/3ずつ絞り込む。 */
export function ternarySearchSteps(): SearchFrame[] {
  const array = SEARCH_ARRAY;
  const target = SEARCH_TARGET;
  const frames: SearchFrame[] = [
    frame(array, {}, `初期状態(検索対象: ${target})`),
  ];
  let low = 0;
  let high = array.length - 1;

  while (low <= high) {
    const third = Math.floor((high - low) / 3);
    const mid1 = low + third;
    const mid2 = high - third;
    frames.push(
      frame(
        array,
        { [mid1]: "pivot", [mid2]: "pivot" },
        `探索範囲[${low + 1}, ${high + 1}]を三等分し、${mid1 + 1}番目と${mid2 + 1}番目を検査`,
      ),
    );

    if (array[mid1] === target) {
      frames.push(
        frame(
          array,
          { [mid1]: "settled" },
          `値${target}を${mid1 + 1}番目で発見`,
        ),
      );
      return frames;
    }
    if (array[mid2] === target) {
      frames.push(
        frame(
          array,
          { [mid2]: "settled" },
          `値${target}を${mid2 + 1}番目で発見`,
        ),
      );
      return frames;
    }
    if (target < array[mid1]) {
      high = mid1 - 1;
    } else if (target > array[mid2]) {
      low = mid2 + 1;
    } else {
      low = mid1 + 1;
      high = mid2 - 1;
    }
  }
  frames.push(frame(array, {}, `値${target}は見つかりませんでした`));
  return frames;
}

/** ジャンプ探索。√nおきにブロック境界を飛び越えて対象ブロックを特定し、その中だけ線形探索する。 */
export function jumpSearchSteps(): SearchFrame[] {
  const array = SEARCH_ARRAY;
  const target = SEARCH_TARGET;
  const n = array.length;
  const frames: SearchFrame[] = [
    frame(array, {}, `初期状態(検索対象: ${target})`),
  ];
  const step = Math.floor(Math.sqrt(n));
  let prev = 0;
  let curr = step;

  while (curr < n && array[Math.min(curr, n - 1)] < target) {
    const idx = Math.min(curr, n - 1);
    frames.push(
      frame(
        array,
        { [idx]: "comparing" },
        `ブロック境界${idx + 1}番目(値${array[idx]})まで√n刻みでジャンプ`,
      ),
    );
    prev = curr;
    curr += step;
  }
  const highEnd = Math.min(curr, n - 1);
  frames.push(
    frame(
      array,
      { [prev]: "pivot", [highEnd]: "pivot" },
      `対象を含みうるブロック[${prev + 1}, ${highEnd + 1}]を特定、線形探索に切り替え`,
    ),
  );

  for (let i = prev; i <= highEnd; i++) {
    frames.push(
      frame(
        array,
        { [i]: "comparing" },
        `${i + 1}番目(値${array[i]})を線形に検査`,
      ),
    );
    if (array[i] === target) {
      frames.push(
        frame(array, { [i]: "settled" }, `値${target}を${i + 1}番目で発見`),
      );
      return frames;
    }
  }
  frames.push(frame(array, {}, `値${target}は見つかりませんでした`));
  return frames;
}

/** 補間探索。値の分布から「次に見るべき位置」を線形補間で推定する(数値が一様分布に近いほど高速)。 */
export function interpolationSearchSteps(): SearchFrame[] {
  const array = SEARCH_ARRAY;
  const target = SEARCH_TARGET;
  const frames: SearchFrame[] = [
    frame(array, {}, `初期状態(検索対象: ${target})`),
  ];
  let low = 0;
  let high = array.length - 1;

  while (low <= high && target >= array[low] && target <= array[high]) {
    if (array[high] === array[low]) {
      if (array[low] === target) {
        frames.push(
          frame(
            array,
            { [low]: "settled" },
            `値${target}を${low + 1}番目で発見`,
          ),
        );
        return frames;
      }
      break;
    }
    const pos =
      low +
      Math.floor(
        ((target - array[low]) * (high - low)) / (array[high] - array[low]),
      );
    const clampedPos = Math.max(low, Math.min(high, pos));
    frames.push(
      frame(
        array,
        { [clampedPos]: "pivot" },
        `値の分布から推定した位置${clampedPos + 1}番目(値${array[clampedPos]})を検査`,
      ),
    );

    if (array[clampedPos] === target) {
      frames.push(
        frame(
          array,
          { [clampedPos]: "settled" },
          `値${target}を${clampedPos + 1}番目で発見`,
        ),
      );
      return frames;
    } else if (array[clampedPos] < target) {
      low = clampedPos + 1;
    } else {
      high = clampedPos - 1;
    }
  }
  frames.push(frame(array, {}, `値${target}は見つかりませんでした`));
  return frames;
}

/** 指数探索。範囲を2倍ずつ広げて対象を含む範囲を特定してから、その範囲内を二分探索する。 */
export function exponentialSearchSteps(): SearchFrame[] {
  const array = SEARCH_ARRAY;
  const target = SEARCH_TARGET;
  const n = array.length;
  const frames: SearchFrame[] = [
    frame(array, {}, `初期状態(検索対象: ${target})`),
  ];

  if (array[0] === target) {
    frames.push(frame(array, { 0: "settled" }, `値${target}を1番目で発見`));
    return frames;
  }

  let bound = 1;
  while (bound < n && array[bound] <= target) {
    frames.push(
      frame(
        array,
        { [bound]: "comparing" },
        `範囲を2倍に拡大しながら${bound + 1}番目(値${array[bound]})を検査`,
      ),
    );
    bound *= 2;
  }

  let low = Math.floor(bound / 2);
  let high = Math.min(bound, n - 1);
  frames.push(
    frame(
      array,
      { [low]: "pivot", [high]: "pivot" },
      `対象を含む範囲[${low + 1}, ${high + 1}]を特定、二分探索に切り替え`,
    ),
  );

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    frames.push(
      frame(
        array,
        { [mid]: "pivot" },
        `二分探索: ${mid + 1}番目(値${array[mid]})を検査`,
      ),
    );
    if (array[mid] === target) {
      frames.push(
        frame(array, { [mid]: "settled" }, `値${target}を${mid + 1}番目で発見`),
      );
      return frames;
    } else if (array[mid] < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  frames.push(frame(array, {}, `値${target}は見つかりませんでした`));
  return frames;
}

/** フィボナッチ探索。二分探索と似ているが、除算ではなくフィボナッチ数の加減算だけで分割位置を求める。 */
export function fibonacciSearchSteps(): SearchFrame[] {
  const array = SEARCH_ARRAY;
  const target = SEARCH_TARGET;
  const n = array.length;
  const frames: SearchFrame[] = [
    frame(array, {}, `初期状態(検索対象: ${target})`),
  ];

  let fibM2 = 0;
  let fibM1 = 1;
  let fibM = fibM2 + fibM1;
  while (fibM < n) {
    fibM2 = fibM1;
    fibM1 = fibM;
    fibM = fibM2 + fibM1;
  }

  let offset = -1;
  while (fibM > 1) {
    const i = Math.min(offset + fibM2, n - 1);
    frames.push(
      frame(
        array,
        { [i]: "pivot" },
        `フィボナッチ数を使って位置${i + 1}番目(値${array[i]})を検査`,
      ),
    );

    if (array[i] < target) {
      fibM = fibM1;
      fibM1 = fibM2;
      fibM2 = fibM - fibM1;
      offset = i;
    } else if (array[i] > target) {
      fibM = fibM2;
      fibM1 = fibM1 - fibM2;
      fibM2 = fibM - fibM1;
    } else {
      frames.push(
        frame(array, { [i]: "settled" }, `値${target}を${i + 1}番目で発見`),
      );
      return frames;
    }
  }
  if (fibM1 && offset + 1 < n && array[offset + 1] === target) {
    frames.push(
      frame(
        array,
        { [offset + 1]: "settled" },
        `値${target}を${offset + 2}番目で発見`,
      ),
    );
    return frames;
  }
  frames.push(frame(array, {}, `値${target}は見つかりませんでした`));
  return frames;
}

/** カダンのアルゴリズム用の配列(正負が混在する値)。最大部分配列の和は6([4,-1,2,1]の区間)。 */
export const KADANE_ARRAY = [-2, 1, -3, 4, -1, 2, 1, -5, 4];

/**
 * カダンのアルゴリズム(最大部分配列問題)のステップ列を生成する。
 * 「直前までの部分和が負なら捨てて今の要素から新しく始める、そうでなければ足し続ける」
 * という局所的な判断だけを繰り返すのに、結果的に全体最適な答えに到達する
 * ——貪欲法とDPの境界にあるとされる所以を、都度更新される最大値の推移で確認できる。
 */
export function kadaneSteps(): SearchFrame[] {
  const array = KADANE_ARRAY;
  const frames: SearchFrame[] = [
    frame(array, {}, "初期状態。カダンのアルゴリズムで最大部分配列の和を求める"),
  ];

  let currentSum = array[0];
  let maxSum = array[0];
  let currentStart = 0;
  let bestStart = 0;
  let bestEnd = 0;
  frames.push(
    frame(
      array,
      { 0: "comparing" },
      `1番目(値${array[0]})から開始。現在の部分和=${currentSum}、最大値=${maxSum}`,
    ),
  );

  for (let i = 1; i < array.length; i++) {
    if (currentSum < 0) {
      currentSum = array[i];
      currentStart = i;
      frames.push(
        frame(
          array,
          { [i]: "comparing" },
          `直前までの部分和が負なので破棄し、${i + 1}番目(値${array[i]})から新しく部分配列を開始`,
        ),
      );
    } else {
      currentSum += array[i];
      frames.push(
        frame(
          array,
          { [i]: "comparing" },
          `${i + 1}番目(値${array[i]})を部分配列に追加。現在の部分和=${currentSum}`,
        ),
      );
    }

    if (currentSum > maxSum) {
      maxSum = currentSum;
      bestStart = currentStart;
      bestEnd = i;
      const highlight: Partial<Record<number, StateColorKey>> = {};
      for (let k = bestStart; k <= bestEnd; k++) highlight[k] = "pivot";
      frames.push(
        frame(array, highlight, `新しい最大値を更新: ${maxSum}(区間[${bestStart}, ${bestEnd}])`),
      );
    }
  }

  const finalHighlight: Partial<Record<number, StateColorKey>> = {};
  for (let k = bestStart; k <= bestEnd; k++) finalHighlight[k] = "settled";
  frames.push(
    frame(array, finalHighlight, `計算完了。最大部分配列の和は${maxSum}(区間[${bestStart}, ${bestEnd}])`),
  );
  return frames;
}

/** エラトステネスの篩で素数を求める範囲(2〜30)。素数は2,3,5,7,11,13,17,19,23,29の10個。 */
export const SIEVE_LIMIT = 30;

/**
 * エラトステネスの篩のステップ列を生成する。
 * 素数pを1つ見つけるたびに、p*p以上のpの倍数を一括で合成数としてマークしていく
 * (p*p未満のpの倍数は、それより小さい素数によって既にマーク済みであることが保証されている)。
 * 個別に割り切れるか判定するのではなく「まとめて篩い落とす」操作の積み重ねで
 * 範囲内の素数が一括で求まる様子を可視化する。
 */
export function sieveOfEratosthenesSteps(): SearchFrame[] {
  const array = Array.from({ length: SIEVE_LIMIT - 1 }, (_, i) => i + 2);
  const isComposite = new Array(SIEVE_LIMIT + 1).fill(false);
  const indexOf = new Map<number, number>();
  array.forEach((v, idx) => indexOf.set(v, idx));

  const compositeHighlight = (): Partial<Record<number, StateColorKey>> => {
    const highlight: Partial<Record<number, StateColorKey>> = {};
    array.forEach((v, idx) => {
      if (isComposite[v]) highlight[idx] = "swapping";
    });
    return highlight;
  };

  const frames: SearchFrame[] = [
    frame(array, {}, `初期状態(2〜${SIEVE_LIMIT}が素数の候補)`),
  ];

  for (let p = 2; p * p <= SIEVE_LIMIT; p++) {
    if (isComposite[p]) continue;
    const highlight = compositeHighlight();
    highlight[indexOf.get(p)!] = "pivot";
    frames.push(
      frame(array, highlight, `${p}はまだ合成数としてマークされていない → 素数。${p}の倍数を篩い落とす`),
    );

    for (let m = p * p; m <= SIEVE_LIMIT; m += p) {
      isComposite[m] = true;
    }
    const afterHighlight = compositeHighlight();
    frames.push(
      frame(
        array,
        afterHighlight,
        `${p * p}以上の${p}の倍数を合成数としてマーク(${p * p}未満の${p}の倍数はより小さい素数で既にマーク済み)`,
      ),
    );
  }

  const finalHighlight: Partial<Record<number, StateColorKey>> = {};
  array.forEach((v, idx) => {
    finalHighlight[idx] = isComposite[v] ? "swapping" : "settled";
  });
  const primes = array.filter((v) => !isComposite[v]);
  frames.push(
    frame(array, finalHighlight, `完了。2〜${SIEVE_LIMIT}の素数: ${primes.join(", ")}`),
  );
  return frames;
}

/** フェニック木(Binary Indexed Tree)のデモ用データ(8要素、負の値も含む)。 */
export const FENWICK_DATA = [3, 2, -1, 6, 5, 4, -3, 3];
export const FENWICK_QUERY_INDEX = 6;

function fenwickLowbit(x: number): number {
  return x & -x;
}

/**
 * フェニック木(Binary Indexed Tree)の構築と累積和クエリのステップ列を生成する。
 * 内部の配列は1-indexedで、更新はidx += lowbit(idx)、クエリはidx -= lowbit(idx)という
 * ビット演算だけでO(log n)個の位置だけを辿る。セグメント木よりも省メモリ・省コードで
 * 「点更新+区間(累積)和」を実現できるのが最大の特徴。
 */
export function fenwickTreeSteps(): SearchFrame[] {
  const n = FENWICK_DATA.length;
  const bit = new Array(n + 1).fill(0);
  const displayArray = () => bit.slice(1);

  const frames: SearchFrame[] = [
    frame(displayArray(), {}, `フェニック木(Binary Indexed Tree)を構築開始。元データ: [${FENWICK_DATA.join(", ")}]`),
  ];

  for (let i = 1; i <= n; i++) {
    const delta = FENWICK_DATA[i - 1];
    let idx = i;
    const touched: number[] = [];
    while (idx <= n) {
      bit[idx] += delta;
      touched.push(idx);
      idx += fenwickLowbit(idx);
    }
    const highlight: Partial<Record<number, StateColorKey>> = {};
    touched.forEach((t) => {
      highlight[t - 1] = "pivot";
    });
    frames.push(
      frame(
        displayArray(),
        highlight,
        `データ[${i - 1}]=${delta}を反映: 位置${touched.map((t) => t - 1).join(" → ")}を更新(各位置にlowbit(i)を足して次の更新先へジャンプ)`,
      ),
    );
  }

  frames.push(frame(displayArray(), {}, "構築完了。ここから累積和クエリ(prefix sum)を実行する"));

  let queryIdx = FENWICK_QUERY_INDEX;
  let sum = 0;
  const queryTouched: number[] = [];
  while (queryIdx > 0) {
    sum += bit[queryIdx];
    queryTouched.push(queryIdx);
    queryIdx -= fenwickLowbit(queryIdx);
  }
  const queryHighlight: Partial<Record<number, StateColorKey>> = {};
  queryTouched.forEach((t) => {
    queryHighlight[t - 1] = "comparing";
  });
  frames.push(
    frame(
      displayArray(),
      queryHighlight,
      `累積和クエリ: 1〜${FENWICK_QUERY_INDEX}番目の合計を求める。位置${queryTouched.map((t) => t - 1).join(" → ")}を辿って加算(各位置からlowbit(i)を引いて次の位置へ)`,
    ),
  );

  const finalHighlight: Partial<Record<number, StateColorKey>> = {};
  queryTouched.forEach((t) => {
    finalHighlight[t - 1] = "settled";
  });
  frames.push(frame(displayArray(), finalHighlight, `計算完了。累積和(1〜${FENWICK_QUERY_INDEX}番目) = ${sum}`));

  return frames;
}

export const BLOOM_FILTER_SIZE = 16;
export const BLOOM_FILTER_INSERT_ITEMS = [5, 12, 23];
export const BLOOM_FILTER_QUERY_ITEMS = [12, 8, 7];

function bloomHashes(x: number, size: number): number[] {
  return [x % size, (x * 3 + 7) % size, (x * 5 + 11) % size];
}

/**
 * ブルームフィルタのステップ列を生成する。ビット配列に対して複数のハッシュ関数(ここでは3つ)
 * で計算した位置のビットを立てるだけで要素を「追加」し、クエリ時は全てのハッシュ位置の
 * ビットが立っているかを見るだけで「含まれている可能性」を判定する。
 * 1つでもビットが0なら確実に未追加(偽陰性はゼロ)だが、全てのビットが1でも
 * 他の要素のハッシュ位置と偶然重なっただけの場合がある(偽陽性はありうる)
 * ——この非対称性が、正確な集合ではなく「メンバーシップの確率的近似」と呼ばれる理由。
 */
export function bloomFilterSteps(): SearchFrame[] {
  const size = BLOOM_FILTER_SIZE;
  const bits = new Array(size).fill(0);

  const frames: SearchFrame[] = [
    frame(bits, {}, `ブルームフィルタを開始。ビット配列(サイズ${size})を全て0で初期化`),
  ];

  for (const item of BLOOM_FILTER_INSERT_ITEMS) {
    const positions = bloomHashes(item, size);
    const highlight: Partial<Record<number, StateColorKey>> = {};
    positions.forEach((p) => {
      highlight[p] = "pivot";
    });
    frames.push(
      frame([...bits], highlight, `要素${item}を追加: 3つのハッシュ関数で位置${positions.join(", ")}を計算`),
    );
    positions.forEach((p) => {
      bits[p] = 1;
    });
    frames.push(frame([...bits], highlight, `位置${positions.join(", ")}のビットを1に立てる`));
  }

  frames.push(frame([...bits], {}, `追加完了。追加した要素: ${BLOOM_FILTER_INSERT_ITEMS.join(", ")}`));

  for (const item of BLOOM_FILTER_QUERY_ITEMS) {
    const positions = bloomHashes(item, size);
    const highlight: Partial<Record<number, StateColorKey>> = {};
    positions.forEach((p) => {
      highlight[p] = "comparing";
    });
    frames.push(frame([...bits], highlight, `要素${item}をクエリ: 位置${positions.join(", ")}を確認`));

    const allSet = positions.every((p) => bits[p] === 1);
    const isActuallyInserted = BLOOM_FILTER_INSERT_ITEMS.includes(item);
    const resultHighlight: Partial<Record<number, StateColorKey>> = {};
    positions.forEach((p) => {
      resultHighlight[p] = allSet ? "settled" : "swapping";
    });
    let verdict: string;
    if (!allSet) {
      verdict = "少なくとも1つのビットが0 → 確実に未追加(偽陰性は絶対に起きない)";
    } else if (isActuallyInserted) {
      verdict = "全てのビットが1 → 追加済みの可能性が高いと判定(実際に追加済みなので正しい判定=真陽性)";
    } else {
      verdict = "全てのビットが1 → 追加済みの可能性が高いと判定(しかし実際は未追加 = 偽陽性!他の要素のハッシュ位置と偶然重なった)";
    }
    frames.push(frame([...bits], resultHighlight, `要素${item}: ${verdict}`));
  }

  frames.push(
    frame([...bits], {}, "計算完了。ブルームフィルタは「偽陰性はゼロ、偽陽性はありうる」集合メンバーシップの確率的データ構造"),
  );

  return frames;
}

export const SEARCH_VISUALIZERS: Record<string, () => SearchFrame[]> = {
  "linear-search": linearSearchSteps,
  "binary-search": binarySearchSteps,
  "ternary-search": ternarySearchSteps,
  "jump-search": jumpSearchSteps,
  "interpolation-search": interpolationSearchSteps,
  "exponential-search": exponentialSearchSteps,
  "fibonacci-search": fibonacciSearchSteps,
  kadane: kadaneSteps,
  "sieve-of-eratosthenes": sieveOfEratosthenesSteps,
  "fenwick-tree": fenwickTreeSteps,
  "bloom-filter": bloomFilterSteps,
};
