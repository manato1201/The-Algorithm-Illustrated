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

export const SORT_VISUALIZERS: Record<string, (initial: number[]) => SortFrame[]> = {
  "bubble-sort": bubbleSortSteps,
  "quick-sort": quickSortSteps,
  "insertion-sort": insertionSortSteps,
  "selection-sort": selectionSortSteps,
};
