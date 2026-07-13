import type { StateColorKey } from "./design-tokens";

export type SortFrame = {
  array: number[];
  highlight: Partial<Record<number, StateColorKey>>;
  description: string;
};

function frame(
  array: number[],
  highlight: Partial<Record<number, StateColorKey>>,
  description: string,
): SortFrame {
  return { array: [...array], highlight, description };
}

/**
 * バブルソートのステップ列を生成する。
 * ui-design.md 2.2節の状態パレット(idle/comparing/swapping/settled)をそのままハイライトに使う。
 */
export function bubbleSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  const n = array.length;

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      frames.push(
        frame(
          array,
          { [j]: "comparing", [j + 1]: "comparing" },
          `${j + 1}番目と${j + 2}番目を比較`,
        ),
      );
      if (array[j] > array[j + 1]) {
        [array[j], array[j + 1]] = [array[j + 1], array[j]];
        frames.push(
          frame(
            array,
            { [j]: "swapping", [j + 1]: "swapping" },
            `${j + 1}番目と${j + 2}番目を交換`,
          ),
        );
      }
    }
    const highlight: Partial<Record<number, StateColorKey>> = {};
    for (let k = 0; k <= i; k++) highlight[n - 1 - k] = "settled";
    frames.push(frame(array, highlight, `末尾から${i + 1}個が確定`));
  }

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  array.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(array, allSettled, "ソート完了"));

  return frames;
}

/**
 * クイックソートのステップ列を生成する(Lomuto分割方式)。
 * pivotは専用の状態色(--state-pivot)でハイライトする。
 */
export function quickSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  const settled = new Set<number>();

  const markSettled = (): Partial<Record<number, StateColorKey>> => {
    const highlight: Partial<Record<number, StateColorKey>> = {};
    settled.forEach((idx) => {
      highlight[idx] = "settled";
    });
    return highlight;
  };

  const partition = (low: number, high: number): number => {
    const pivotValue = array[high];
    frames.push(
      frame(
        array,
        { ...markSettled(), [high]: "pivot" },
        `${high + 1}番目(値: ${pivotValue})を基準に選択`,
      ),
    );

    let i = low - 1;
    for (let j = low; j < high; j++) {
      frames.push(
        frame(
          array,
          { ...markSettled(), [high]: "pivot", [j]: "comparing" },
          `${j + 1}番目を基準と比較`,
        ),
      );
      if (array[j] < pivotValue) {
        i++;
        if (i !== j) {
          [array[i], array[j]] = [array[j], array[i]];
          frames.push(
            frame(
              array,
              { ...markSettled(), [high]: "pivot", [i]: "swapping", [j]: "swapping" },
              `${i + 1}番目と${j + 1}番目を交換`,
            ),
          );
        }
      }
    }
    [array[i + 1], array[high]] = [array[high], array[i + 1]];
    settled.add(i + 1);
    frames.push(frame(array, markSettled(), `基準を${i + 2}番目の位置に確定`));
    return i + 1;
  };

  const quickSort = (low: number, high: number) => {
    if (low < high) {
      const pivotIndex = partition(low, high);
      quickSort(low, pivotIndex - 1);
      quickSort(pivotIndex + 1, high);
    } else if (low === high) {
      settled.add(low);
      frames.push(frame(array, markSettled(), `${low + 1}番目が確定`));
    }
  };

  quickSort(0, array.length - 1);

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  array.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(array, allSettled, "ソート完了"));

  return frames;
}

/**
 * 挿入ソートのステップ列を生成する。
 * 取り出した要素をpivot、比較・交換をcomparing/swappingでハイライトする。
 */
export function insertionSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  const n = array.length;

  const markSorted = (upTo: number): Partial<Record<number, StateColorKey>> => {
    const highlight: Partial<Record<number, StateColorKey>> = {};
    for (let k = 0; k <= upTo; k++) highlight[k] = "settled";
    return highlight;
  };

  for (let i = 1; i < n; i++) {
    frames.push(
      frame(array, { ...markSorted(i - 1), [i]: "pivot" }, `${i + 1}番目(値: ${array[i]})を取り出す`),
    );
    let j = i;
    while (j > 0 && array[j - 1] > array[j]) {
      frames.push(
        frame(
          array,
          { ...markSorted(i - 1), [j - 1]: "comparing", [j]: "comparing" },
          `${j}番目と${j + 1}番目を比較`,
        ),
      );
      [array[j - 1], array[j]] = [array[j], array[j - 1]];
      frames.push(
        frame(
          array,
          { ...markSorted(i - 1), [j - 1]: "swapping", [j]: "swapping" },
          `${j}番目と${j + 1}番目を交換`,
        ),
      );
      j--;
    }
    frames.push(frame(array, markSorted(i), `先頭から${i + 1}個が整列済み`));
  }

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  array.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(array, allSettled, "ソート完了"));

  return frames;
}

/**
 * 選択ソートのステップ列を生成する。
 * 探索中の最小値候補をpivot、比較対象をcomparingでハイライトする。
 */
export function selectionSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  const n = array.length;

  const markSettledBefore = (i: number): Partial<Record<number, StateColorKey>> => {
    const highlight: Partial<Record<number, StateColorKey>> = {};
    for (let k = 0; k < i; k++) highlight[k] = "settled";
    return highlight;
  };

  for (let i = 0; i < n - 1; i++) {
    let minIndex = i;
    const settledSoFar = markSettledBefore(i);

    frames.push(
      frame(array, { ...settledSoFar, [minIndex]: "pivot" }, `${i + 1}番目以降の最小値を探索開始`),
    );
    for (let j = i + 1; j < n; j++) {
      frames.push(
        frame(
          array,
          { ...settledSoFar, [minIndex]: "pivot", [j]: "comparing" },
          `${j + 1}番目と現在の最小値(${array[minIndex]})を比較`,
        ),
      );
      if (array[j] < array[minIndex]) {
        minIndex = j;
        frames.push(
          frame(array, { ...settledSoFar, [minIndex]: "pivot" }, `最小値を${minIndex + 1}番目に更新`),
        );
      }
    }
    if (minIndex !== i) {
      [array[i], array[minIndex]] = [array[minIndex], array[i]];
      frames.push(
        frame(
          array,
          { ...settledSoFar, [i]: "swapping", [minIndex]: "swapping" },
          `${i + 1}番目と${minIndex + 1}番目を交換`,
        ),
      );
    }
    frames.push(frame(array, markSettledBefore(i + 1), `先頭から${i + 1}個が確定`));
  }

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  array.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(array, allSettled, "ソート完了"));

  return frames;
}

/**
 * マージソートのステップ列を生成する。
 * マージ中の比較をcomparing、書き込みをswappingでハイライトし、区間のマージ完了時にsettledへ切り替える。
 */
export function mergeSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  const settled = new Set<number>();

  const markSettled = (): Partial<Record<number, StateColorKey>> => {
    const highlight: Partial<Record<number, StateColorKey>> = {};
    settled.forEach((idx) => {
      highlight[idx] = "settled";
    });
    return highlight;
  };

  const merge = (left: number, mid: number, right: number) => {
    const leftPart = array.slice(left, mid + 1);
    const rightPart = array.slice(mid + 1, right + 1);
    let i = 0;
    let j = 0;
    let k = left;

    while (i < leftPart.length && j < rightPart.length) {
      frames.push(
        frame(
          array,
          { ...markSettled(), [left + i]: "comparing", [mid + 1 + j]: "comparing" },
          `${left + i + 1}番目と${mid + 1 + j + 1}番目を比較`,
        ),
      );
      if (leftPart[i] <= rightPart[j]) {
        array[k] = leftPart[i];
        i++;
      } else {
        array[k] = rightPart[j];
        j++;
      }
      frames.push(frame(array, { ...markSettled(), [k]: "swapping" }, `${k + 1}番目に書き込み`));
      k++;
    }
    while (i < leftPart.length) {
      array[k] = leftPart[i];
      frames.push(frame(array, { ...markSettled(), [k]: "swapping" }, `残りを${k + 1}番目にコピー`));
      i++;
      k++;
    }
    while (j < rightPart.length) {
      array[k] = rightPart[j];
      frames.push(frame(array, { ...markSettled(), [k]: "swapping" }, `残りを${k + 1}番目にコピー`));
      j++;
      k++;
    }
    for (let idx = left; idx <= right; idx++) settled.add(idx);
    frames.push(frame(array, markSettled(), `区間[${left + 1}, ${right + 1}]のマージが完了`));
  };

  const sort = (left: number, right: number) => {
    if (left >= right) {
      settled.add(left);
      return;
    }
    const mid = Math.floor((left + right) / 2);
    sort(left, mid);
    sort(mid + 1, right);
    merge(left, mid, right);
  };

  sort(0, array.length - 1);

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  array.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(array, allSettled, "ソート完了"));

  return frames;
}

/**
 * ヒープソートのステップ列を生成する。
 * 最大ヒープ構築フェーズと、根を末尾に追い出す抽出フェーズの2段構成。
 */
export function heapSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  const n = array.length;
  const settled = new Set<number>();

  const markSettled = (): Partial<Record<number, StateColorKey>> => {
    const highlight: Partial<Record<number, StateColorKey>> = {};
    settled.forEach((idx) => {
      highlight[idx] = "settled";
    });
    return highlight;
  };

  const siftDown = (heapSize: number, root: number) => {
    let largest = root;
    for (;;) {
      const left = 2 * largest + 1;
      const right = 2 * largest + 2;
      let candidate = largest;

      if (left < heapSize) {
        frames.push(
          frame(
            array,
            { ...markSettled(), [candidate]: "pivot", [left]: "comparing" },
            `${candidate + 1}番目と左の子${left + 1}番目を比較`,
          ),
        );
        if (array[left] > array[candidate]) candidate = left;
      }
      if (right < heapSize) {
        frames.push(
          frame(
            array,
            { ...markSettled(), [largest]: "pivot", [right]: "comparing" },
            `${largest + 1}番目と右の子${right + 1}番目を比較`,
          ),
        );
        if (array[right] > array[candidate]) candidate = right;
      }
      if (candidate === largest) break;

      [array[largest], array[candidate]] = [array[candidate], array[largest]];
      frames.push(
        frame(
          array,
          { ...markSettled(), [largest]: "swapping", [candidate]: "swapping" },
          `${largest + 1}番目と${candidate + 1}番目を交換`,
        ),
      );
      largest = candidate;
    }
  };

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    siftDown(n, i);
  }
  frames.push(frame(array, markSettled(), "最大ヒープの構築が完了"));

  for (let end = n - 1; end > 0; end--) {
    [array[0], array[end]] = [array[end], array[0]];
    settled.add(end);
    frames.push(
      frame(array, { ...markSettled(), 0: "swapping", [end]: "swapping" }, `最大値を${end + 1}番目に確定`),
    );
    siftDown(end, 0);
  }
  settled.add(0);

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  array.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(array, allSettled, "ソート完了"));

  return frames;
}

/**
 * シェルソートのステップ列を生成する。
 * 間隔(gap)を徐々に狭めながら部分的な挿入ソートを繰り返す。
 */
export function shellSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const n = array.length;
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];

  for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
    frames.push(frame(array, {}, `間隔${gap}で部分的な挿入ソートを開始`));
    for (let i = gap; i < n; i++) {
      const temp = array[i];
      let j = i;
      while (j >= gap && array[j - gap] > temp) {
        frames.push(
          frame(array, { [j - gap]: "comparing", [j]: "comparing" }, `間隔${gap}: ${j - gap + 1}番目と${j + 1}番目を比較`),
        );
        array[j] = array[j - gap];
        frames.push(frame(array, { [j]: "swapping" }, `間隔${gap}: 値を${j + 1}番目へ移動`));
        j -= gap;
      }
      array[j] = temp;
    }
    frames.push(frame(array, {}, `間隔${gap}での整列が完了`));
  }

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  array.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(array, allSettled, "ソート完了"));
  return frames;
}

/**
 * コムソートのステップ列を生成する。
 * バブルソートの隣接交換を、縮小比1.3で狭める間隔比較に置き換えたもの。
 */
export function combSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const n = array.length;
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  let gap = n;
  let swapped = true;

  while (gap > 1 || swapped) {
    gap = Math.max(1, Math.floor(gap / 1.3));
    swapped = false;
    for (let i = 0; i + gap < n; i++) {
      frames.push(
        frame(array, { [i]: "comparing", [i + gap]: "comparing" }, `間隔${gap}で${i + 1}番目と${i + gap + 1}番目を比較`),
      );
      if (array[i] > array[i + gap]) {
        [array[i], array[i + gap]] = [array[i + gap], array[i]];
        swapped = true;
        frames.push(frame(array, { [i]: "swapping", [i + gap]: "swapping" }, "交換"));
      }
    }
  }

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  array.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(array, allSettled, "ソート完了"));
  return frames;
}

/**
 * カクテルシェイカーソートのステップ列を生成する。
 * バブルソートを左右交互に行い、両端から確定範囲を狭めていく。
 */
export function cocktailSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const n = array.length;
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  let start = 0;
  let end = n - 1;
  let swapped = true;

  while (swapped && start < end) {
    swapped = false;
    for (let i = start; i < end; i++) {
      frames.push(frame(array, { [i]: "comparing", [i + 1]: "comparing" }, `右方向: ${i + 1}番目と${i + 2}番目を比較`));
      if (array[i] > array[i + 1]) {
        [array[i], array[i + 1]] = [array[i + 1], array[i]];
        swapped = true;
        frames.push(frame(array, { [i]: "swapping", [i + 1]: "swapping" }, "交換"));
      }
    }
    if (!swapped) break;
    end--;
    swapped = false;
    for (let i = end - 1; i >= start; i--) {
      frames.push(frame(array, { [i]: "comparing", [i + 1]: "comparing" }, `左方向: ${i + 1}番目と${i + 2}番目を比較`));
      if (array[i] > array[i + 1]) {
        [array[i], array[i + 1]] = [array[i + 1], array[i]];
        swapped = true;
        frames.push(frame(array, { [i]: "swapping", [i + 1]: "swapping" }, "交換"));
      }
    }
    start++;
  }

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  array.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(array, allSettled, "ソート完了"));
  return frames;
}

/**
 * カウンティングソートのステップ列を生成する。
 * 比較を一切行わず、値の出現回数と累積和から各要素の最終位置を直接求める。
 * 出力配列は0を「未配置」として表示し、配置が進むごとにバーが現れる。
 */
export function countingSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  const minValue = Math.min(...array);
  const maxValue = Math.max(...array);
  const range = maxValue - minValue + 1;

  const count = new Array(range).fill(0);
  array.forEach((v) => count[v - minValue]++);
  frames.push(frame(array, {}, `値ごとの出現回数を数える(値の範囲: ${minValue}〜${maxValue})`));

  for (let i = 1; i < range; i++) count[i] += count[i - 1];
  frames.push(frame(array, {}, "累積和を取り、各値が出力配列のどの位置に入るかを求める"));

  const output = new Array(array.length).fill(0);
  const placed = new Array(array.length).fill(false);
  for (let i = array.length - 1; i >= 0; i--) {
    const value = array[i];
    const pos = --count[value - minValue];
    output[pos] = value;
    placed[pos] = true;
    const highlight: Partial<Record<number, StateColorKey>> = {};
    output.forEach((_, idx) => {
      if (placed[idx]) highlight[idx] = idx === pos ? "pivot" : "settled";
    });
    frames.push(frame([...output], highlight, `値${value}を出力配列の${pos + 1}番目に配置`));
  }

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  output.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(output, allSettled, "ソート完了(比較を使わないO(n+k)のアルゴリズム)"));
  return frames;
}

/**
 * 基数ソートのステップ列を生成する。
 * 下位桁から上位桁へ、桁ごとの安定なカウンティングソートを繰り返す(LSD方式)。
 */
export function radixSortSteps(initial: number[]): SortFrame[] {
  const frames: SortFrame[] = [frame(initial, {}, "初期状態")];
  let current = [...initial];
  const maxValue = Math.max(...current);
  let exp = 1;
  let pass = 0;

  while (Math.floor(maxValue / exp) > 0) {
    pass++;
    const output = new Array(current.length).fill(0);
    const count = new Array(10).fill(0);
    current.forEach((v) => count[Math.floor(v / exp) % 10]++);
    for (let i = 1; i < 10; i++) count[i] += count[i - 1];
    for (let i = current.length - 1; i >= 0; i--) {
      const digit = Math.floor(current[i] / exp) % 10;
      output[--count[digit]] = current[i];
    }
    current = output;
    const highlight: Partial<Record<number, StateColorKey>> = {};
    current.forEach((_, idx) => {
      highlight[idx] = "comparing";
    });
    frames.push(frame([...current], highlight, `${pass}桁目(${exp}の位)を基準に安定ソート`));
    exp *= 10;
  }

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  current.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(current, allSettled, "ソート完了(桁ごとの安定ソートを繰り返すO(d・(n+k))のアルゴリズム)"));
  return frames;
}

/**
 * バケットソートのステップ列を生成する。
 * 値の範囲を等幅のバケツに振り分け、バケツ内を挿入ソートしてから結合する。
 */
export function bucketSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const n = array.length;
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  const maxValue = Math.max(...array);
  const minValue = Math.min(...array);
  const bucketCount = Math.max(1, Math.floor(Math.sqrt(n)));
  const bucketWidth = (maxValue - minValue + 1) / bucketCount;
  const buckets: number[][] = Array.from({ length: bucketCount }, () => []);

  array.forEach((v) => {
    const idx = Math.min(bucketCount - 1, Math.floor((v - minValue) / bucketWidth));
    buckets[idx].push(v);
  });
  frames.push(frame(array, {}, `値の範囲を${bucketCount}個のバケツに振り分ける`));

  const result: number[] = [];
  buckets.forEach((bucket, bIdx) => {
    bucket.sort((a, b) => a - b);
    result.push(...bucket);
    const display = [...result, ...new Array(n - result.length).fill(0)];
    const highlight: Partial<Record<number, StateColorKey>> = {};
    result.forEach((_, idx) => {
      highlight[idx] = "settled";
    });
    frames.push(frame(display, highlight, `バケツ${bIdx + 1}(${bucket.length}件)を挿入ソートして結合`));
  });

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  result.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(result, allSettled, "ソート完了(値が一様分布に近いほど高速なO(n+k)のアルゴリズム)"));
  return frames;
}

/**
 * サイクルソートのステップ列を生成する。
 * 各要素を最終的な位置へ直接書き込むことで、書き込み回数を理論上最小にする。
 */
export function cycleSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const n = array.length;
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  const settled = new Set<number>();

  const markSettled = (): Partial<Record<number, StateColorKey>> => {
    const highlight: Partial<Record<number, StateColorKey>> = {};
    settled.forEach((idx) => {
      highlight[idx] = "settled";
    });
    return highlight;
  };

  for (let cycleStart = 0; cycleStart < n - 1; cycleStart++) {
    let item = array[cycleStart];
    let pos = cycleStart;
    for (let i = cycleStart + 1; i < n; i++) {
      if (array[i] < item) pos++;
    }
    if (pos === cycleStart) {
      settled.add(cycleStart);
      continue;
    }
    while (item === array[pos]) pos++;
    [array[pos], item] = [item, array[pos]];
    settled.add(pos);
    frames.push(frame(array, { ...markSettled(), [pos]: "swapping" }, `値${item}を正しい位置${pos + 1}へ配置`));

    while (pos !== cycleStart) {
      pos = cycleStart;
      for (let i = cycleStart + 1; i < n; i++) {
        if (array[i] < item) pos++;
      }
      while (item === array[pos]) pos++;
      [array[pos], item] = [item, array[pos]];
      settled.add(pos);
      frames.push(frame(array, { ...markSettled(), [pos]: "swapping" }, `サイクルを継続、値${item}を位置${pos + 1}へ`));
    }
  }
  settled.add(n - 1);

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  array.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(array, allSettled, "ソート完了(書き込み回数が理論上最小になるアルゴリズム)"));
  return frames;
}

/**
 * パンケーキソートのステップ列を生成する。
 * 要素の交換ではなく、先頭からの「反転(フリップ)」操作だけでソートする。
 */
export function pancakeSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const n = array.length;
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  const settled = new Set<number>();

  const markSettled = (): Partial<Record<number, StateColorKey>> => {
    const highlight: Partial<Record<number, StateColorKey>> = {};
    settled.forEach((idx) => {
      highlight[idx] = "settled";
    });
    return highlight;
  };

  const flip = (end: number) => {
    let left = 0;
    let right = end;
    while (left < right) {
      [array[left], array[right]] = [array[right], array[left]];
      left++;
      right--;
    }
  };

  for (let size = n; size > 1; size--) {
    let maxIndex = 0;
    for (let i = 1; i < size; i++) {
      frames.push(
        frame(array, { ...markSettled(), [maxIndex]: "pivot", [i]: "comparing" }, `先頭${size}枚の中で最大値の位置を探索`),
      );
      if (array[i] > array[maxIndex]) maxIndex = i;
    }
    if (maxIndex !== size - 1) {
      if (maxIndex !== 0) {
        flip(maxIndex);
        frames.push(frame(array, markSettled(), "最大値を先頭に反転(フリップ)"));
      }
      flip(size - 1);
      frames.push(frame(array, markSettled(), `先頭${size}枚を反転し、最大値を${size}番目に移動`));
    }
    settled.add(size - 1);
  }
  settled.add(0);

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  array.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(array, allSettled, "ソート完了(要素の交換ではなく「反転」操作だけでソートする)"));
  return frames;
}

/**
 * イントロソートのステップ列を生成する(簡略版)。
 * クイックソートを基本としつつ、再帰の深さが2×log2(n)を超えたらヒープソートに切り替え、
 * 区間が小さくなったら挿入ソートに切り替える3方式のハイブリッド。
 */
export function introSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const n = array.length;
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  const settled = new Set<number>();
  const INSERTION_THRESHOLD = 8;
  const maxDepth = 2 * Math.floor(Math.log2(Math.max(n, 2)));

  const markSettled = (): Partial<Record<number, StateColorKey>> => {
    const highlight: Partial<Record<number, StateColorKey>> = {};
    settled.forEach((idx) => {
      highlight[idx] = "settled";
    });
    return highlight;
  };

  const insertionSortRange = (low: number, high: number) => {
    for (let i = low + 1; i <= high; i++) {
      let j = i;
      while (j > low && array[j - 1] > array[j]) {
        frames.push(
          frame(array, { ...markSettled(), [j - 1]: "comparing", [j]: "comparing" }, `挿入ソート: ${j}番目と${j + 1}番目を比較`),
        );
        [array[j - 1], array[j]] = [array[j], array[j - 1]];
        j--;
      }
    }
    frames.push(frame(array, markSettled(), `区間[${low + 1}, ${high + 1}]を挿入ソートで整列(小区間はここに切り替える)`));
  };

  const heapify = (low: number, high: number, root: number) => {
    let largest = root;
    for (;;) {
      const left = low + 2 * (largest - low) + 1;
      const right = low + 2 * (largest - low) + 2;
      let candidate = largest;
      if (left <= high && array[left] > array[candidate]) candidate = left;
      if (right <= high && array[right] > array[candidate]) candidate = right;
      if (candidate === largest) break;
      [array[largest], array[candidate]] = [array[candidate], array[largest]];
      frames.push(
        frame(
          array,
          { ...markSettled(), [largest]: "swapping", [candidate]: "swapping" },
          "ヒープ条件を保つよう交換(再帰が深すぎるためヒープソートに切り替え)",
        ),
      );
      largest = candidate;
    }
  };

  const heapSortRange = (low: number, high: number) => {
    const size = high - low + 1;
    for (let i = low + Math.floor(size / 2) - 1; i >= low; i--) heapify(low, high, i);
    for (let end = high; end > low; end--) {
      [array[low], array[end]] = [array[end], array[low]];
      frames.push(frame(array, { ...markSettled(), [low]: "swapping", [end]: "swapping" }, "最大値を末尾に確定"));
      heapify(low, end - 1, low);
    }
  };

  const partition = (low: number, high: number): number => {
    const pivotValue = array[high];
    let i = low - 1;
    for (let j = low; j < high; j++) {
      frames.push(frame(array, { ...markSettled(), [high]: "pivot", [j]: "comparing" }, `基準(${pivotValue})と${j + 1}番目を比較`));
      if (array[j] < pivotValue) {
        i++;
        if (i !== j) [array[i], array[j]] = [array[j], array[i]];
      }
    }
    [array[i + 1], array[high]] = [array[high], array[i + 1]];
    return i + 1;
  };

  const introSort = (low: number, high: number, depthLimit: number) => {
    const size = high - low + 1;
    if (size <= 1) {
      if (size === 1) settled.add(low);
      return;
    }
    if (size <= INSERTION_THRESHOLD) {
      insertionSortRange(low, high);
      for (let k = low; k <= high; k++) settled.add(k);
      return;
    }
    if (depthLimit === 0) {
      heapSortRange(low, high);
      for (let k = low; k <= high; k++) settled.add(k);
      return;
    }
    const pivotIndex = partition(low, high);
    settled.add(pivotIndex);
    frames.push(frame(array, markSettled(), `基準を${pivotIndex + 1}番目の位置に確定`));
    introSort(low, pivotIndex - 1, depthLimit - 1);
    introSort(pivotIndex + 1, high, depthLimit - 1);
  };

  introSort(0, n - 1, maxDepth);

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  array.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(
    frame(array, allSettled, "ソート完了(クイックソート+深すぎる再帰はヒープソート+小区間は挿入ソートのハイブリッド)"),
  );
  return frames;
}

/**
 * ボゴソートのステップ列を生成する。
 * ランダムシャッフルを繰り返し、偶然整列するまで待つ(期待計算量O((n+1)!))。
 * 要素数が多いと現実的な回数では終わらないため、デモでは試行回数に上限を設け、
 * 上限に達したら「打ち切って直接整列させる」ことでこのアルゴリズムの実用性のなさを可視化する。
 */
export function bogoSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  const isSorted = (arr: number[]) => arr.every((v, i) => i === 0 || arr[i - 1] <= v);
  const MAX_ATTEMPTS = 100;
  let attempts = 0;

  while (!isSorted(array) && attempts < MAX_ATTEMPTS) {
    attempts++;
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    const highlight: Partial<Record<number, StateColorKey>> = {};
    array.forEach((_, idx) => {
      highlight[idx] = "comparing";
    });
    frames.push(frame(array, highlight, `ランダムにシャッフル(${attempts}回目)。まだ整列していない`));
  }

  if (!isSorted(array)) {
    array.sort((a, b) => a - b);
    frames.push(
      frame(
        array,
        {},
        `${MAX_ATTEMPTS}回試行しても偶然揃わなかったため打ち切り、デモ用に直接整列(期待計算量はO((n+1)!)で、要素数が増えると現実的な時間では終わらないことを示している)`,
      ),
    );
  }

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  array.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(array, allSettled, "ソート完了"));
  return frames;
}

/**
 * 簡略化したTimSortのステップ列を生成する。
 * 実際のTimSortが持つギャロップモード等の高度な最適化は省略し、
 * 「小さな区間(ラン)を挿入ソート→マージソートで統合する」という核となる発想のみを可視化する。
 */
export function timSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const n = array.length;
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  const MIN_RUN = 4;
  const settled = new Set<number>();

  const markSettled = (): Partial<Record<number, StateColorKey>> => {
    const highlight: Partial<Record<number, StateColorKey>> = {};
    settled.forEach((idx) => {
      highlight[idx] = "settled";
    });
    return highlight;
  };

  const insertionSortRange = (low: number, high: number) => {
    for (let i = low + 1; i <= high; i++) {
      let j = i;
      while (j > low && array[j - 1] > array[j]) {
        frames.push(frame(array, { [j - 1]: "comparing", [j]: "comparing" }, `ラン内の挿入ソート: ${j}番目と${j + 1}番目を比較`));
        [array[j - 1], array[j]] = [array[j], array[j - 1]];
        j--;
      }
    }
    frames.push(frame(array, {}, `区間[${low + 1}, ${high + 1}]を「ラン」として整列(サイズ${MIN_RUN}以下は挿入ソートが高速)`));
  };

  for (let low = 0; low < n; low += MIN_RUN) {
    insertionSortRange(low, Math.min(low + MIN_RUN - 1, n - 1));
  }

  const merge = (left: number, mid: number, right: number) => {
    const leftPart = array.slice(left, mid + 1);
    const rightPart = array.slice(mid + 1, right + 1);
    let i = 0;
    let j = 0;
    let k = left;

    while (i < leftPart.length && j < rightPart.length) {
      frames.push(frame(array, { [left + i]: "comparing", [mid + 1 + j]: "comparing" }, "ラン同士をマージ中に比較"));
      if (leftPart[i] <= rightPart[j]) {
        array[k] = leftPart[i];
        i++;
      } else {
        array[k] = rightPart[j];
        j++;
      }
      frames.push(frame(array, { ...markSettled(), [k]: "swapping" }, `${k + 1}番目に書き込み`));
      k++;
    }
    while (i < leftPart.length) {
      array[k] = leftPart[i];
      frames.push(frame(array, { ...markSettled(), [k]: "swapping" }, "残りをコピー"));
      i++;
      k++;
    }
    while (j < rightPart.length) {
      array[k] = rightPart[j];
      frames.push(frame(array, { ...markSettled(), [k]: "swapping" }, "残りをコピー"));
      j++;
      k++;
    }
    for (let idx = left; idx <= right; idx++) settled.add(idx);
    frames.push(frame(array, markSettled(), `区間[${left + 1}, ${right + 1}]のマージ完了`));
  };

  let width = MIN_RUN;
  while (width < n) {
    for (let left = 0; left < n; left += 2 * width) {
      const mid = Math.min(left + width - 1, n - 1);
      const right = Math.min(left + 2 * width - 1, n - 1);
      if (mid < right) merge(left, mid, right);
    }
    width *= 2;
  }

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  array.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(array, allSettled, "ソート完了(簡略化したTimSort: 小さな「ラン」を挿入ソートし、マージソートで統合する)"));
  return frames;
}

/**
 * ノームソートのステップ列を生成する。
 * 挿入ソートと同じ考え方を、配列の先頭から位置ポインタを前後させるだけの単純なループで実現する。
 */
export function gnomeSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  const n = array.length;
  let pos = 0;

  while (pos < n) {
    if (pos === 0) {
      pos++;
      continue;
    }
    frames.push(
      frame(array, { [pos - 1]: "comparing", [pos]: "comparing" }, `${pos}番目と${pos + 1}番目を比較`),
    );
    if (array[pos - 1] <= array[pos]) {
      pos++;
    } else {
      [array[pos - 1], array[pos]] = [array[pos], array[pos - 1]];
      frames.push(
        frame(array, { [pos - 1]: "swapping", [pos]: "swapping" }, `${pos}番目と${pos + 1}番目を交換し、1つ手前へ戻る`),
      );
      pos--;
    }
  }

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  array.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(array, allSettled, "ソート完了"));
  return frames;
}

/**
 * 奇偶転置ソート(ブリックソート)のステップ列を生成する。
 * 奇数位置・偶数位置の隣接比較を交互に繰り返し、交換が起きなくなったら終了する。
 */
export function oddEvenSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  const n = array.length;
  let sorted = false;

  while (!sorted) {
    sorted = true;
    for (let i = 1; i < n - 1; i += 2) {
      frames.push(
        frame(array, { [i]: "comparing", [i + 1]: "comparing" }, `奇数フェーズ: ${i + 1}番目と${i + 2}番目を比較`),
      );
      if (array[i] > array[i + 1]) {
        [array[i], array[i + 1]] = [array[i + 1], array[i]];
        sorted = false;
        frames.push(frame(array, { [i]: "swapping", [i + 1]: "swapping" }, "奇数フェーズ: 交換"));
      }
    }
    for (let i = 0; i < n - 1; i += 2) {
      frames.push(
        frame(array, { [i]: "comparing", [i + 1]: "comparing" }, `偶数フェーズ: ${i + 1}番目と${i + 2}番目を比較`),
      );
      if (array[i] > array[i + 1]) {
        [array[i], array[i + 1]] = [array[i + 1], array[i]];
        sorted = false;
        frames.push(frame(array, { [i]: "swapping", [i + 1]: "swapping" }, "偶数フェーズ: 交換"));
      }
    }
  }

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  array.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(array, allSettled, "ソート完了(奇数フェーズ・偶数フェーズの交互反復)"));
  return frames;
}

/**
 * ペイシェンスソートのステップ列を生成する。
 * カードゲームのソリティアと同じ要領で「山(パイル)」に配り、その後k路マージで統合する。
 * 山の構築自体は補助配列上の処理のため、元の配列に対する走査位置だけをハイライトする。
 * マージ段階は出力配列を0で初期化してから確定した値が現れる形で表現する(bucket-sort等と同じパターン)。
 */
export function patienceSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  const n = array.length;

  const piles: number[][] = [];
  for (let i = 0; i < n; i++) {
    const value = array[i];
    let target = -1;
    for (let p = 0; p < piles.length; p++) {
      if (piles[p][piles[p].length - 1] >= value) {
        target = p;
        break;
      }
    }
    if (target === -1) {
      piles.push([value]);
      target = piles.length - 1;
    } else {
      piles[target].push(value);
    }
    frames.push(
      frame(array, { [i]: "comparing" }, `${i + 1}番目(値${value})をパイル${target + 1}(現在${piles.length}個)へ配置`),
    );
  }

  const output = new Array(n).fill(0);
  for (let step = 0; step < n; step++) {
    let bestPile = -1;
    let bestValue = Infinity;
    for (let p = 0; p < piles.length; p++) {
      if (piles[p].length === 0) continue;
      const top = piles[p][piles[p].length - 1];
      if (top < bestValue) {
        bestValue = top;
        bestPile = p;
      }
    }
    piles[bestPile].pop();
    output[step] = bestValue;
    frames.push(
      frame(output, { [step]: "settled" }, `パイル${bestPile + 1}の頂上(値${bestValue})を${step + 1}番目に確定`),
    );
  }

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  output.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(output, allSettled, "ソート完了(各パイルは常に増加列。頂上を比較し続けるk路マージ)"));
  return frames;
}

/**
 * トーナメントソート(勝ち抜き木ソート)のステップ列を生成する。
 * 葉に要素を並べた完全二分木を作り、各内部ノードに勝者(より小さい値)を伝播させる。
 * 根から最小値を1つずつ取り出し、取り出した葉を+infにして経路だけ勝者を再計算する。
 */
export function tournamentSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  const n = array.length;

  let size = 1;
  while (size < n) size *= 2;

  type Node = { value: number; idx: number };
  const INF: Node = { value: Infinity, idx: -1 };
  const nodes: Node[] = new Array(2 * size).fill(INF);
  for (let i = 0; i < size; i++) {
    nodes[size + i] = i < n ? { value: array[i], idx: i } : INF;
  }
  for (let k = size - 1; k >= 1; k--) {
    const left = nodes[2 * k];
    const right = nodes[2 * k + 1];
    nodes[k] = left.value <= right.value ? left : right;
  }

  const output = new Array(n).fill(0);
  for (let step = 0; step < n; step++) {
    const winner = nodes[1];
    output[step] = winner.value;
    frames.push(
      frame(output, { [step]: "settled" }, `トーナメントの勝者(値${winner.value})を${step + 1}番目に確定`),
    );

    let pos = size + winner.idx;
    nodes[pos] = INF;
    pos = Math.floor(pos / 2);
    while (pos >= 1) {
      const left = nodes[2 * pos];
      const right = nodes[2 * pos + 1];
      nodes[pos] = left.value <= right.value ? left : right;
      pos = Math.floor(pos / 2);
    }
  }

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  output.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(output, allSettled, "ソート完了(勝ち抜き木を根から1つずつ取り出す選択ソートの一種)"));
  return frames;
}

/**
 * 鳩の巣ソートのステップ列を生成する。
 * 値の範囲ぶんの「巣」を用意し、各要素を対応する巣へ配ってから巣の順に取り出す。
 * カウンティングソートと近い構造だが、巣ごとに実際の値のリストを保持する点が異なる。
 */
export function pigeonholeSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  const n = array.length;
  const minValue = Math.min(...array);
  const maxValue = Math.max(...array);
  const holeCount = maxValue - minValue + 1;
  const holes: number[][] = Array.from({ length: holeCount }, () => []);

  for (let i = 0; i < n; i++) {
    const h = array[i] - minValue;
    holes[h].push(array[i]);
    frames.push(frame(array, { [i]: "comparing" }, `${i + 1}番目(値${array[i]})を巣${h + 1}へ配置`));
  }

  const output = new Array(n).fill(0);
  let pos = 0;
  for (let h = 0; h < holeCount; h++) {
    for (const value of holes[h]) {
      output[pos] = value;
      frames.push(frame(output, { [pos]: "settled" }, `巣${h + 1}から値${value}を${pos + 1}番目に確定`));
      pos++;
    }
  }

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  output.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(output, allSettled, "ソート完了"));
  return frames;
}

/**
 * フラッシュソートのステップ列を生成する(簡略版)。
 * 値の範囲を線形写像でm個のクラスに分類し、クラス順に並べ替える(粗い配置)。
 * 実際のFlashsortは配列内で循環置換を使いin-placeに分類するが、ここでは
 * クラスごとの補助配列に振り分けてから連結する形に単純化している(イントロソート・TimSortと同じ簡略化方針)。
 * 分類だけではクラス内が未整列のため、仕上げに挿入ソート(ほぼ整列済みなのでO(n)に近い)を適用する。
 */
export function flashSortSteps(initial: number[]): SortFrame[] {
  const array = [...initial];
  const frames: SortFrame[] = [frame(array, {}, "初期状態")];
  const n = array.length;
  const minValue = Math.min(...array);
  const maxValue = Math.max(...array);

  if (minValue === maxValue) {
    const allSame: Partial<Record<number, StateColorKey>> = {};
    array.forEach((_, idx) => {
      allSame[idx] = "settled";
    });
    frames.push(frame(array, allSame, "全要素が同値のためソート完了"));
    return frames;
  }

  const m = Math.max(2, Math.floor(0.42 * n));
  const classOf = (v: number) => Math.min(m - 1, Math.floor(((m - 1) * (v - minValue)) / (maxValue - minValue)));

  const classes: number[][] = Array.from({ length: m }, () => []);
  for (let i = 0; i < n; i++) {
    const c = classOf(array[i]);
    classes[c].push(array[i]);
    frames.push(frame(array, { [i]: "comparing" }, `${i + 1}番目(値${array[i]})をクラス${c + 1}/${m}へ分類`));
  }

  const output: number[] = [];
  for (let c = 0; c < m; c++) output.push(...classes[c]);
  frames.push(frame(output, {}, "クラス順に並べ替え(粗い配置。クラス内はまだ未整列)"));

  for (let i = 1; i < n; i++) {
    const key = output[i];
    let p = i - 1;
    while (p >= 0 && output[p] > key) {
      output[p + 1] = output[p];
      p--;
    }
    output[p + 1] = key;
    frames.push(frame(output, { [p + 1]: "swapping" }, `仕上げの挿入ソートで${p + 2}番目に確定`));
  }

  const allSettled: Partial<Record<number, StateColorKey>> = {};
  output.forEach((_, idx) => {
    allSettled[idx] = "settled";
  });
  frames.push(frame(output, allSettled, "ソート完了"));
  return frames;
}

export const SORT_VISUALIZERS: Record<string, (initial: number[]) => SortFrame[]> = {
  "bubble-sort": bubbleSortSteps,
  "quick-sort": quickSortSteps,
  "insertion-sort": insertionSortSteps,
  "selection-sort": selectionSortSteps,
  "merge-sort": mergeSortSteps,
  "heap-sort": heapSortSteps,
  "shell-sort": shellSortSteps,
  "comb-sort": combSortSteps,
  "cocktail-sort": cocktailSortSteps,
  "counting-sort": countingSortSteps,
  "radix-sort": radixSortSteps,
  "bucket-sort": bucketSortSteps,
  "cycle-sort": cycleSortSteps,
  "pancake-sort": pancakeSortSteps,
  "intro-sort": introSortSteps,
  bogosort: bogoSortSteps,
  "tim-sort": timSortSteps,
  "gnome-sort": gnomeSortSteps,
  "odd-even-sort": oddEvenSortSteps,
  "patience-sorting": patienceSortSteps,
  "tournament-sort": tournamentSortSteps,
  "pigeonhole-sort": pigeonholeSortSteps,
  flashsort: flashSortSteps,
};
