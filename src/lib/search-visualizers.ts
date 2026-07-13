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

/** 山登り法・焼きなまし法のデモ用の地形(局所最適6が複数、大域最適15が1箇所)。 */
export const HILL_CLIMBING_LANDSCAPE = [3, 5, 4, 8, 6, 9, 12, 10, 7, 5, 3, 6, 11, 15, 13, 8];
export const HILL_CLIMBING_START = 4;

/**
 * 山登り法(Hill Climbing)のステップ列を生成する。現在地の両隣を見て、より高い方へ
 * 移動することだけを繰り返す。両隣とも現在地以下になったら、それ以上改善できないので停止する
 * ——この単純さゆえに、大域最適(地形全体で最も高い場所)ではなく、たまたま辿り着いた
 * 局所最適(周囲だけを見れば最も高いが、遠くに行けばもっと高い場所がある)で止まってしまう
 * ことがある弱点を、地形にあえて複数の山を用意することで体感できる。
 */
export function hillClimbingSteps(): SearchFrame[] {
  const landscape = HILL_CLIMBING_LANDSCAPE;
  let pos = HILL_CLIMBING_START;

  const frames: SearchFrame[] = [
    frame(landscape, { [pos]: "pivot" }, `山登り法を開始。開始位置=${pos}(高さ${landscape[pos]})`),
  ];

  for (;;) {
    const left = pos > 0 ? landscape[pos - 1] : -Infinity;
    const right = pos < landscape.length - 1 ? landscape[pos + 1] : -Infinity;
    const current = landscape[pos];

    if (left <= current && right <= current) {
      frames.push(
        frame(landscape, { [pos]: "settled" }, `両隣(${left === -Infinity ? "端" : left}, ${right === -Infinity ? "端" : right})とも現在地(${current})以下 → これ以上改善できないので停止`),
      );
      break;
    }

    const moveRight = right > left;
    const newPos = moveRight ? pos + 1 : pos - 1;
    frames.push(
      frame(
        landscape,
        { [pos]: "comparing", [newPos]: "comparing" },
        `${moveRight ? "右" : "左"}隣(高さ${landscape[newPos]})の方が現在地(高さ${current})より高い → 移動`,
      ),
    );
    pos = newPos;
    frames.push(frame(landscape, { [pos]: "pivot" }, `位置${pos}(高さ${landscape[pos]})に移動`));
  }

  frames.push(
    frame(
      landscape,
      { [pos]: "settled" },
      `計算完了。到達した位置=${pos}(高さ${landscape[pos]})。地形全体の最大値は${Math.max(...landscape)}(位置${landscape.indexOf(Math.max(...landscape))})なので、${landscape[pos] === Math.max(...landscape) ? "たまたま大域最適に到達できた" : "局所最適に陥り、大域最適を見逃した"}`,
    ),
  );

  return frames;
}

/** 決定論的な乱数列を生成する線形合同法(LCG)。焼きなまし法の受理判定を再現可能にするために使う。 */
function createLcg(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

export const SIMULATED_ANNEALING_LANDSCAPE = HILL_CLIMBING_LANDSCAPE;
export const SIMULATED_ANNEALING_START = 4;
export const SIMULATED_ANNEALING_SEED = 92;
export const SIMULATED_ANNEALING_ITERATIONS = 20;

/**
 * 焼きなまし法(シミュレーテッド・アニーリング)のステップ列を生成する。山登り法と同じ地形・
 * 同じ開始位置を使い、違いを対比できるようにしている。改善する移動は必ず受理するが、
 * 悪化する移動も確率exp(Δ/温度)で受理することで、山登り法なら止まってしまう局所最適から
 * 抜け出せる可能性がある。温度を反復のたびに下げていく(冷却)ことで、序盤は探索的に、
 * 終盤は山登り法に近い挙動へと収束させる。乱数は再現性のため決定論的なLCGを使う。
 */
export function simulatedAnnealingSteps(): SearchFrame[] {
  const landscape = SIMULATED_ANNEALING_LANDSCAPE;
  const rng = createLcg(SIMULATED_ANNEALING_SEED);
  let pos = SIMULATED_ANNEALING_START;
  let best = pos;
  let temperature = 10;

  const frames: SearchFrame[] = [
    frame(
      landscape,
      { [pos]: "pivot" },
      `焼きなまし法を開始。開始位置=${pos}(高さ${landscape[pos]})、初期温度=${temperature}`,
    ),
  ];

  for (let iter = 1; iter <= SIMULATED_ANNEALING_ITERATIONS; iter++) {
    const goRight = rng() < 0.5;
    const candidate = goRight ? pos + 1 : pos - 1;
    if (candidate < 0 || candidate >= landscape.length) {
      temperature *= 0.85;
      continue;
    }

    const delta = landscape[candidate] - landscape[pos];
    let accepted: boolean;
    if (delta >= 0) {
      accepted = true;
    } else {
      const acceptProb = Math.exp(delta / temperature);
      accepted = rng() < acceptProb;
    }

    frames.push(
      frame(
        landscape,
        { [pos]: "comparing", [candidate]: "comparing" },
        `[反復${iter}] 温度${temperature.toFixed(2)}: 位置${candidate}(高さ${landscape[candidate]})を検討。差分Δ=${delta} → ${accepted ? "受理" : "却下"}${delta < 0 && accepted ? "(悪化するが確率的に受理)" : ""}`,
      ),
    );

    if (accepted) {
      pos = candidate;
      if (landscape[pos] > landscape[best]) best = pos;
      frames.push(frame(landscape, { [pos]: "pivot", [best]: "settled" }, `位置${pos}(高さ${landscape[pos]})に移動`));
    }

    temperature *= 0.85;
  }

  frames.push(
    frame(
      landscape,
      { [best]: "settled" },
      `計算完了(${SIMULATED_ANNEALING_ITERATIONS}回反復)。これまでで最も高かった位置=${best}(高さ${landscape[best]})。地形全体の最大値は${Math.max(...landscape)}`,
    ),
  );

  return frames;
}

export const TABU_SEARCH_LANDSCAPE = HILL_CLIMBING_LANDSCAPE;
export const TABU_SEARCH_START = HILL_CLIMBING_START;
export const TABU_SEARCH_TENURE = 1;

/**
 * タブーサーチ(禁断探索)のステップ列を生成する。山登り法・焼きなまし法と同じ地形・
 * 同じ開始位置を使う。両隣のうち「直近訪問した位置(タブーリストに載っている位置)」への
 * 移動を一定期間禁止し、それ以外で最も高い方へ必ず移動する——改善する保証はない
 * (時には悪化する移動を強制されることもある)が、直前の位置に後戻りできないことで
 * 山登り法なら停止してしまう局所最適(高さ12の山)を通り過ぎ、地形の奥にある大域最適
 * (高さ15)まで到達できることがある。両隣とも移動禁止になった時点で探索を終了する。
 */
export function tabuSearchSteps(): SearchFrame[] {
  const landscape = TABU_SEARCH_LANDSCAPE;
  const tenure = TABU_SEARCH_TENURE;
  let pos = TABU_SEARCH_START;
  let best = pos;
  const tabuList: number[] = [];

  const frames: SearchFrame[] = [
    frame(
      landscape,
      { [pos]: "pivot" },
      `タブーサーチを開始。開始位置=${pos}(高さ${landscape[pos]})、タブー期間=${tenure}`,
    ),
  ];

  for (;;) {
    const candidates = [pos - 1, pos + 1].filter(
      (p) => p >= 0 && p < landscape.length && !tabuList.includes(p),
    );

    if (candidates.length === 0) {
      frames.push(
        frame(
          landscape,
          { [pos]: "settled", ...Object.fromEntries(tabuList.map((t) => [t, "swapping" as StateColorKey])) },
          `両隣とも移動禁止(タブー)または範囲外 → これ以上進めないので停止`,
        ),
      );
      break;
    }

    const next = candidates.reduce((a, b) => (landscape[b] > landscape[a] ? b : a));
    const delta = landscape[next] - landscape[pos];

    frames.push(
      frame(
        landscape,
        {
          [pos]: "comparing",
          [next]: "comparing",
          ...Object.fromEntries(tabuList.map((t) => [t, "swapping" as StateColorKey])),
        },
        `位置${pos}(高さ${landscape[pos]})から位置${next}(高さ${landscape[next]})へ移動を検討 → Δ=${delta}${delta < 0 ? "(悪化するが、他に選べる非タブーの移動先がない)" : ""}`,
      ),
    );

    tabuList.push(pos);
    if (tabuList.length > tenure) tabuList.shift();
    pos = next;
    if (landscape[pos] > landscape[best]) best = pos;

    frames.push(
      frame(
        landscape,
        { [pos]: "pivot", [best]: "settled", ...Object.fromEntries(tabuList.map((t) => [t, "swapping" as StateColorKey])) },
        `位置${pos}(高さ${landscape[pos]})に移動。タブーリスト=[${tabuList.join(",")}]`,
      ),
    );
  }

  frames.push(
    frame(
      landscape,
      { [best]: "settled" },
      `計算完了。これまでで最も高かった位置=${best}(高さ${landscape[best]})。地形全体の最大値は${Math.max(...landscape)}(位置${landscape.indexOf(Math.max(...landscape))})なので、${landscape[best] === Math.max(...landscape) ? "大域最適に到達できた" : "大域最適には届かなかった"}`,
    ),
  );

  return frames;
}

export const GRADIENT_DESCENT_MIN_X = 3;
export const GRADIENT_DESCENT_START_X = -2;
export const GRADIENT_DESCENT_LEARNING_RATE = 0.3;
export const GRADIENT_DESCENT_ITERATIONS = 8;

function gradientDescentF(x: number): number {
  return (x - GRADIENT_DESCENT_MIN_X) ** 2 + 1;
}
function gradientDescentDerivative(x: number): number {
  return 2 * (x - GRADIENT_DESCENT_MIN_X);
}

/**
 * 勾配降下法のステップ列を生成する。損失関数f(x)=(x-3)²+1(最小値はx=3)に対し、
 * 「現在地の傾き(勾配)と逆方向に、学習率の分だけ動く」というルールだけを繰り返すと、
 * 傾きが急なところでは大きく、緩やかなところでは小さく動きながら最小値に近づいていく様子を
 * 可視化する。連続な関数をバーチャートに乗せるため、値の範囲をサンプリングした配列を
 * 「地形」として表示し、現在のxに最も近いサンプル位置をハイライトする。
 */
export function gradientDescentSteps(): SearchFrame[] {
  const sampleXs = Array.from({ length: 25 }, (_, i) => -3 + i * 0.5);
  const landscape = sampleXs.map((x) => gradientDescentF(x));
  const nearestIndex = (x: number) =>
    sampleXs.reduce(
      (best, sx, i) => (Math.abs(sx - x) < Math.abs(sampleXs[best] - x) ? i : best),
      0,
    );

  let x = GRADIENT_DESCENT_START_X;
  const frames: SearchFrame[] = [
    frame(
      landscape,
      { [nearestIndex(x)]: "pivot" },
      `勾配降下法を開始。f(x)=(x-${GRADIENT_DESCENT_MIN_X})²+1を最小化する。開始x=${x}、学習率=${GRADIENT_DESCENT_LEARNING_RATE}`,
    ),
  ];

  for (let iter = 1; iter <= GRADIENT_DESCENT_ITERATIONS; iter++) {
    const grad = gradientDescentDerivative(x);
    const nextX = x - GRADIENT_DESCENT_LEARNING_RATE * grad;
    frames.push(
      frame(
        landscape,
        { [nearestIndex(x)]: "comparing" },
        `[反復${iter}] x=${x.toFixed(3)}での勾配f'(x)=${grad.toFixed(3)}。x ← x - 学習率×勾配 = ${x.toFixed(3)} - ${GRADIENT_DESCENT_LEARNING_RATE}×${grad.toFixed(3)} = ${nextX.toFixed(3)}`,
      ),
    );
    x = nextX;
    frames.push(frame(landscape, { [nearestIndex(x)]: "pivot" }, `x=${x.toFixed(3)}に更新(f(x)=${gradientDescentF(x).toFixed(3)})`));
  }

  frames.push(
    frame(
      landscape,
      { [nearestIndex(x)]: "settled" },
      `計算完了(${GRADIENT_DESCENT_ITERATIONS}回反復)。x=${x.toFixed(3)}、f(x)=${gradientDescentF(x).toFixed(3)}(真の最小値はx=${GRADIENT_DESCENT_MIN_X}、f=1)`,
    ),
  );

  return frames;
}

export type KnnDataPoint = { value: number; label: string };
export const KNN_DATA: KnnDataPoint[] = [
  { value: 2, label: "A" },
  { value: 4, label: "A" },
  { value: 5, label: "B" },
  { value: 8, label: "B" },
  { value: 9, label: "A" },
  { value: 12, label: "B" },
  { value: 15, label: "A" },
];
export const KNN_QUERY = 7;
export const KNN_K = 3;

/**
 * k近傍法(k-NN)のステップ列を生成する。学習フェーズを持たず、予測したい点が来るたびに
 * 全データとの距離を計算し、最も近いk個を多数決させるだけの怠惰学習(lazy learning)。
 * ここでは1次元の値の距離(絶対値の差)で単純化しているが、実際には多次元のユークリッド距離
 * 等が使われることが多い、という点も踏まえて考えると理解しやすい。
 */
export function knnSteps(): SearchFrame[] {
  const data = KNN_DATA;
  const query = KNN_QUERY;
  const k = KNN_K;
  const values = data.map((d) => d.value);

  const frames: SearchFrame[] = [
    frame(values, {}, `k近傍法を開始。クエリ値=${query}、k=${k}。全データとの距離を計算する`),
  ];

  const distances = data.map((d, i) => ({ index: i, distance: Math.abs(d.value - query) }));
  distances.forEach(({ index, distance }) => {
    frames.push(
      frame(values, { [index]: "comparing" }, `データ[${index}]=${data[index].value}(ラベル${data[index].label})との距離 = |${data[index].value}-${query}| = ${distance}`),
    );
  });

  const sorted = [...distances].sort((a, b) => a.distance - b.distance || a.index - b.index);
  const nearestK = sorted.slice(0, k);
  const highlight: Partial<Record<number, StateColorKey>> = {};
  nearestK.forEach(({ index }) => {
    highlight[index] = "settled";
  });
  frames.push(
    frame(
      values,
      highlight,
      `距離が近い順にソートし、最も近い${k}個を選択: ${nearestK.map(({ index }) => `[${index}]=${data[index].value}(${data[index].label})`).join(", ")}`,
    ),
  );

  const votes = new Map<string, number>();
  nearestK.forEach(({ index }) => {
    const label = data[index].label;
    votes.set(label, (votes.get(label) ?? 0) + 1);
  });
  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1]);
  const predicted = ranked[0][0];

  frames.push(
    frame(
      values,
      highlight,
      `計算完了。多数決: ${ranked.map(([label, count]) => `${label}=${count}票`).join(", ")} → 予測ラベル = "${predicted}"`,
    ),
  );

  return frames;
}

export const MANACHER_TEXT = "babad";

function manacherTransform(s: string): string {
  return `^#${s.split("").join("#")}#$`;
}

/**
 * マナカーのアルゴリズムのステップ列を生成する。文字の間に区切り記号(#)を挿入することで
 * 奇数長・偶数長の palindrome を同じロジックで扱えるようにした上で、
 * 「これまでに見つかった中で最も右まで届く回文の中心C・右端R」を覚えておき、
 * 新しい中心iがRより内側にあれば、その鏡像位置の半径を初期値として使い回すことで
 * 無駄な比較を省略する。この工夫により、素朴な中心展開法のO(n²)ではなく
 * O(n)で文字列中の最長回文部分文字列を求められる。
 */
export function manacherSteps(): SearchFrame[] {
  const s = MANACHER_TEXT;
  const t = manacherTransform(s);
  const n = t.length;
  const P = new Array(n).fill(0);
  let C = 0;
  let R = 0;

  const frames: SearchFrame[] = [
    frame(P.slice(1, n - 1), {}, `マナカーのアルゴリズムを開始。文字列"${s}"を"${t}"に変換(#で区切ることで奇数/偶数長を統一的に扱う)`),
  ];

  for (let i = 1; i < n - 1; i++) {
    const mirror = 2 * C - i;
    if (i < R) P[i] = Math.min(R - i, P[mirror]);
    while (t[i + P[i] + 1] === t[i - P[i] - 1]) P[i]++;
    if (i + P[i] > R) {
      C = i;
      R = i + P[i];
    }
    frames.push(
      frame(
        P.slice(1, n - 1),
        { [i - 1]: "pivot" },
        `位置${i}(文字'${t[i]}')の回文半径P[${i}]=${P[i]}を確定(中心C=${C}, 右端R=${R})`,
      ),
    );
  }

  const maxLen = Math.max(...P);
  const centerIndex = P.indexOf(maxLen);
  const start = (centerIndex - maxLen - 1) / 2;
  const longestPalindrome = s.slice(start, start + maxLen);

  const finalHighlight: Partial<Record<number, StateColorKey>> = {};
  finalHighlight[centerIndex - 1] = "settled";
  frames.push(
    frame(
      P.slice(1, n - 1),
      finalHighlight,
      `計算完了。最長回文部分文字列は"${longestPalindrome}"(長さ${maxLen}、開始位置${start})`,
    ),
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
  "hill-climbing": hillClimbingSteps,
  "simulated-annealing": simulatedAnnealingSteps,
  "tabu-search": tabuSearchSteps,
  "gradient-descent": gradientDescentSteps,
  knn: knnSteps,
  manacher: manacherSteps,
};
