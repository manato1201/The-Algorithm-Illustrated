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

export const SEARCH_VISUALIZERS: Record<string, () => SearchFrame[]> = {
  "linear-search": linearSearchSteps,
  "binary-search": binarySearchSteps,
  "ternary-search": ternarySearchSteps,
  "jump-search": jumpSearchSteps,
  "interpolation-search": interpolationSearchSteps,
  "exponential-search": exponentialSearchSteps,
  "fibonacci-search": fibonacciSearchSteps,
};
