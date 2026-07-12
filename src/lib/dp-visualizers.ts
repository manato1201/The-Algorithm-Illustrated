export type DPCellState = "idle" | "comparing" | "pivot" | "settled";

export type DPCell = {
  value: number | null;
  state: DPCellState;
};

export type DPFrame = {
  table: DPCell[][];
  description: string;
};

export type DPItem = {
  name: string;
  weight: number;
  value: number;
};

export const KNAPSACK_ITEMS: DPItem[] = [
  { name: "A", weight: 2, value: 3 },
  { name: "B", weight: 3, value: 4 },
  { name: "C", weight: 4, value: 5 },
  { name: "D", weight: 5, value: 6 },
];

export const KNAPSACK_CAPACITY = 8;

/**
 * 0-1ナップサック問題のDPテーブル(dp[品物数][容量])を埋めていくステップ列を生成する。
 * comparing=参照している前段の結果、pivot=今まさに計算中のセル、settled=確定済みのセル。
 */
export function knapsackSteps(): DPFrame[] {
  const items = KNAPSACK_ITEMS;
  const n = items.length;
  const capacity = KNAPSACK_CAPACITY;
  const dp: (number | null)[][] = Array.from({ length: n + 1 }, () =>
    Array<number | null>(capacity + 1).fill(null),
  );
  for (let w = 0; w <= capacity; w++) dp[0][w] = 0;

  const settled = new Set<string>();
  for (let w = 0; w <= capacity; w++) settled.add(`0,${w}`);

  const frames: DPFrame[] = [];
  const snapshot = (
    extra: Map<string, "comparing" | "pivot">,
    description: string,
  ): DPFrame => {
    const table: DPCell[][] = dp.map((row, i) =>
      row.map((value, w) => {
        const cellKey = `${i},${w}`;
        const state: DPCellState =
          extra.get(cellKey) ?? (settled.has(cellKey) ? "settled" : "idle");
        return { value, state };
      }),
    );
    return { table, description };
  };

  frames.push(snapshot(new Map(), "初期状態(品物0個では、どの容量でも価値0)"));

  for (let i = 1; i <= n; i++) {
    const item = items[i - 1];
    for (let w = 0; w <= capacity; w++) {
      const highlight = new Map<string, "comparing" | "pivot">();
      highlight.set(`${i - 1},${w}`, "comparing");
      let best = dp[i - 1][w]!;
      if (item.weight <= w) {
        highlight.set(`${i - 1},${w - item.weight}`, "comparing");
        best = Math.max(best, dp[i - 1][w - item.weight]! + item.value);
      }
      frames.push(
        snapshot(
          highlight,
          `${item.name}(重さ${item.weight}/価値${item.value})を容量${w}で検討中`,
        ),
      );

      dp[i][w] = best;
      settled.add(`${i},${w}`);
      frames.push(
        snapshot(
          new Map([[`${i},${w}`, "pivot"]]),
          `dp[${i}][${w}] = ${best} を確定`,
        ),
      );
    }
  }

  frames.push(
    snapshot(
      new Map(),
      `計算完了。品物${items.map((it) => it.name).join("")}・容量${capacity}での最大価値は ${dp[n][capacity]}`,
    ),
  );

  return frames;
}

export const LCS_STRING_A = "ABCBDAB";
export const LCS_STRING_B = "BDCABA";

/**
 * 最長共通部分列(LCS)のDPテーブルを埋めていくステップ列を生成する。
 * 一致すれば左上(comparing)から+1、不一致なら上/左の大きい方(comparing)を引き継ぐ。
 * content/algorithms/lcs.md の例文と同じ文字列を使う。
 */
export function lcsSteps(): DPFrame[] {
  const a = LCS_STRING_A;
  const b = LCS_STRING_B;
  const n = a.length;
  const m = b.length;
  const dp: (number | null)[][] = Array.from({ length: n + 1 }, () =>
    Array<number | null>(m + 1).fill(null),
  );
  for (let i = 0; i <= n; i++) dp[i][0] = 0;
  for (let j = 0; j <= m; j++) dp[0][j] = 0;

  const settled = new Set<string>();
  for (let i = 0; i <= n; i++) settled.add(`${i},0`);
  for (let j = 0; j <= m; j++) settled.add(`0,${j}`);

  const frames: DPFrame[] = [];
  const snapshot = (
    extra: Map<string, "comparing" | "pivot">,
    description: string,
  ): DPFrame => {
    const table: DPCell[][] = dp.map((row, i) =>
      row.map((value, j) => {
        const cellKey = `${i},${j}`;
        const state: DPCellState = extra.get(cellKey) ?? (settled.has(cellKey) ? "settled" : "idle");
        return { value, state };
      }),
    );
    return { table, description };
  };

  frames.push(snapshot(new Map(), "初期状態(どちらかが空文字列なら共通部分列の長さは0)"));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const highlight = new Map<string, "comparing" | "pivot">();
      let value: number;
      if (a[i - 1] === b[j - 1]) {
        highlight.set(`${i - 1},${j - 1}`, "comparing");
        value = dp[i - 1][j - 1]! + 1;
        frames.push(snapshot(highlight, `"${a[i - 1]}" と "${b[j - 1]}" が一致 → 左上に+1`));
      } else {
        highlight.set(`${i - 1},${j}`, "comparing");
        highlight.set(`${i},${j - 1}`, "comparing");
        value = Math.max(dp[i - 1][j]!, dp[i][j - 1]!);
        frames.push(
          snapshot(highlight, `"${a[i - 1]}" と "${b[j - 1]}" が不一致 → 上と左の大きい方を引き継ぐ`),
        );
      }
      dp[i][j] = value;
      settled.add(`${i},${j}`);
      frames.push(snapshot(new Map([[`${i},${j}`, "pivot"]]), `dp[${i}][${j}] = ${value} を確定`));
    }
  }

  frames.push(snapshot(new Map(), `計算完了。最長共通部分列の長さは ${dp[n][m]}`));
  return frames;
}

export const EDIT_DISTANCE_STRING_A = "KITTEN";
export const EDIT_DISTANCE_STRING_B = "SITTING";

/**
 * 編集距離(レーベンシュタイン距離)のDPテーブルを埋めていくステップ列を生成する。
 * 一致すれば操作不要で左上を引き継ぎ、不一致なら置換・削除・挿入の最小+1を選ぶ。
 */
export function editDistanceSteps(): DPFrame[] {
  const a = EDIT_DISTANCE_STRING_A;
  const b = EDIT_DISTANCE_STRING_B;
  const n = a.length;
  const m = b.length;
  const dp: (number | null)[][] = Array.from({ length: n + 1 }, () =>
    Array<number | null>(m + 1).fill(null),
  );
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  const settled = new Set<string>();
  for (let i = 0; i <= n; i++) settled.add(`${i},0`);
  for (let j = 0; j <= m; j++) settled.add(`0,${j}`);

  const frames: DPFrame[] = [];
  const snapshot = (
    extra: Map<string, "comparing" | "pivot">,
    description: string,
  ): DPFrame => {
    const table: DPCell[][] = dp.map((row, i) =>
      row.map((value, j) => {
        const cellKey = `${i},${j}`;
        const state: DPCellState = extra.get(cellKey) ?? (settled.has(cellKey) ? "settled" : "idle");
        return { value, state };
      }),
    );
    return { table, description };
  };

  frames.push(snapshot(new Map(), "初期状態(空文字列との距離は文字数分の挿入/削除)"));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const highlight = new Map<string, "comparing" | "pivot">();
      let value: number;
      if (a[i - 1] === b[j - 1]) {
        highlight.set(`${i - 1},${j - 1}`, "comparing");
        value = dp[i - 1][j - 1]!;
        frames.push(snapshot(highlight, `"${a[i - 1]}" と "${b[j - 1]}" が一致 → 操作不要で左上を引き継ぐ`));
      } else {
        highlight.set(`${i - 1},${j - 1}`, "comparing");
        highlight.set(`${i - 1},${j}`, "comparing");
        highlight.set(`${i},${j - 1}`, "comparing");
        value = 1 + Math.min(dp[i - 1][j - 1]!, dp[i - 1][j]!, dp[i][j - 1]!);
        frames.push(
          snapshot(highlight, `"${a[i - 1]}" と "${b[j - 1]}" が不一致 → 置換・削除・挿入の最小+1`),
        );
      }
      dp[i][j] = value;
      settled.add(`${i},${j}`);
      frames.push(snapshot(new Map([[`${i},${j}`, "pivot"]]), `dp[${i}][${j}] = ${value} を確定`));
    }
  }

  frames.push(snapshot(new Map(), `計算完了。編集距離は ${dp[n][m]}`));
  return frames;
}

export type DPTableMeta = {
  /** テーブル上の情報チップ(品物一覧や対象文字列など)。 */
  chips: string[];
  cornerLabel: string;
  rowHeaders: string[];
  colHeaders: string[];
};

export const DP_TABLE_META: Record<string, DPTableMeta> = {
  "knapsack-dp": {
    chips: [
      ...KNAPSACK_ITEMS.map((item) => `${item.name}: 重さ${item.weight} / 価値${item.value}`),
      `容量: ${KNAPSACK_CAPACITY}`,
    ],
    cornerLabel: "品物 \\ 容量",
    rowHeaders: ["∅", ...KNAPSACK_ITEMS.map((item) => item.name)],
    colHeaders: Array.from({ length: KNAPSACK_CAPACITY + 1 }, (_, w) => String(w)),
  },
  lcs: {
    chips: [`文字列1: "${LCS_STRING_A}"`, `文字列2: "${LCS_STRING_B}"`],
    cornerLabel: "∅ \\ ∅",
    rowHeaders: ["∅", ...LCS_STRING_A.split("")],
    colHeaders: ["∅", ...LCS_STRING_B.split("")],
  },
  "edit-distance": {
    chips: [`変形前: "${EDIT_DISTANCE_STRING_A}"`, `変形後: "${EDIT_DISTANCE_STRING_B}"`],
    cornerLabel: "∅ \\ ∅",
    rowHeaders: ["∅", ...EDIT_DISTANCE_STRING_A.split("")],
    colHeaders: ["∅", ...EDIT_DISTANCE_STRING_B.split("")],
  },
};

export const DP_VISUALIZERS: Record<string, () => DPFrame[]> = {
  "knapsack-dp": knapsackSteps,
  lcs: lcsSteps,
  "edit-distance": editDistanceSteps,
};
