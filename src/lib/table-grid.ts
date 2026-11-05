import type { DPCell, DPCellState, DPFrame } from "./dp-visualizers.ts";

/**
 * 「列=要素やステップ、行=属性や状態」の属性表を組み立てる共通ヘルパ(DPテーブル型の可視化用)。
 * 貪欲法(greedy-visualizers.ts)・コンパイラ(compiler-visualizers.ts)などが共用する。
 */
export type Grid = {
  put: (row: number, col: number, value: DPCell["value"], state?: DPCellState) => void;
  mark: (row: number, col: number, state: DPCellState) => void;
  snap: (description: string) => DPFrame;
};

export function makeGrid(rows: number, cols: number): Grid {
  const cells: DPCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): DPCell => ({ value: null, state: "idle" })),
  );
  return {
    put: (row, col, value, state = "idle") => {
      cells[row][col] = { value, state };
    },
    mark: (row, col, state) => {
      cells[row][col] = { ...cells[row][col], state };
    },
    snap: (description) => ({ table: cells.map((row) => row.map((cell) => ({ ...cell }))), description }),
  };
}

export const range = (n: number) => Array.from({ length: n }, (_, i) => i);

