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

export const SORT_VISUALIZERS: Record<string, (initial: number[]) => SortFrame[]> = {
  "bubble-sort": bubbleSortSteps,
  "quick-sort": quickSortSteps,
};
