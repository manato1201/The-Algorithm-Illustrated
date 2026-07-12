import { SHORTEST_PATH_EDGES, SHORTEST_PATH_NODES } from "./graph-visualizers";

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

export const COIN_CHANGE_COINS = [1, 3, 4];
export const COIN_CHANGE_AMOUNT = 6;

/**
 * 硬貨両替(最小枚数)のDPを1行のテーブルとして埋めていくステップ列を生成する。
 * coins=[1,3,4]・amount=6は「貪欲法だと4+1+1=3枚を選んでしまうが最適解は3+3=2枚」という
 * 貪欲法とDPの違いを示す古典的な反例になっている。
 */
export function coinChangeSteps(): DPFrame[] {
  const coins = COIN_CHANGE_COINS;
  const amount = COIN_CHANGE_AMOUNT;
  const dp: (number | null)[] = new Array(amount + 1).fill(null);
  dp[0] = 0;
  const settled = new Set<number>([0]);

  const frames: DPFrame[] = [];
  const snapshot = (extra: Map<number, "comparing" | "pivot">, description: string): DPFrame => {
    const row: DPCell[] = dp.map((value, i) => ({
      value,
      state: extra.get(i) ?? (settled.has(i) ? "settled" : "idle"),
    }));
    return { table: [row], description };
  };

  frames.push(snapshot(new Map(), "初期状態(金額0を作るのに必要な硬貨は0枚)"));

  for (let i = 1; i <= amount; i++) {
    let best: number | null = null;
    const highlight = new Map<number, "comparing" | "pivot">();
    for (const coin of coins) {
      if (coin > i) continue;
      const prev = dp[i - coin];
      highlight.set(i - coin, "comparing");
      if (prev !== null && (best === null || prev + 1 < best)) {
        best = prev + 1;
      }
    }
    frames.push(
      snapshot(highlight, `金額${i}: 使える硬貨(${coins.filter((c) => c <= i).join(",")})それぞれについて残り金額のdpを参照`),
    );
    dp[i] = best;
    settled.add(i);
    frames.push(snapshot(new Map([[i, "pivot"]]), `dp[${i}] = ${best ?? "到達不可"} を確定`));
  }

  frames.push(
    snapshot(
      new Map(),
      `計算完了。金額${amount}を作る最小硬貨枚数は${dp[amount]}枚(貪欲法(大きい硬貨優先)では4+1+1=3枚を選んでしまうが、実際の最適解は3+3=${dp[amount]}枚)`,
    ),
  );
  return frames;
}

export const ROD_CUTTING_PRICES = [1, 5, 8, 9, 10, 17, 17, 20];
export const ROD_CUTTING_LENGTH = 8;

/** 棒の切り出し問題のDPを1行のテーブルとして埋めていくステップ列を生成する。 */
export function rodCuttingSteps(): DPFrame[] {
  const prices = ROD_CUTTING_PRICES;
  const n = ROD_CUTTING_LENGTH;
  const dp: (number | null)[] = new Array(n + 1).fill(null);
  dp[0] = 0;
  const settled = new Set<number>([0]);

  const frames: DPFrame[] = [];
  const snapshot = (extra: Map<number, "comparing" | "pivot">, description: string): DPFrame => {
    const row: DPCell[] = dp.map((value, i) => ({
      value,
      state: extra.get(i) ?? (settled.has(i) ? "settled" : "idle"),
    }));
    return { table: [row], description };
  };

  frames.push(snapshot(new Map(), "初期状態(長さ0の棒の価値は0)"));

  for (let len = 1; len <= n; len++) {
    let best = -Infinity;
    const highlight = new Map<number, "comparing" | "pivot">();
    for (let cut = 1; cut <= len; cut++) {
      const remain = len - cut;
      highlight.set(remain, "comparing");
      const candidate = prices[cut - 1] + (dp[remain] ?? 0);
      if (candidate > best) best = candidate;
    }
    frames.push(snapshot(highlight, `長さ${len}: 最初の切り方(1〜${len})ごとに残り部分の最大価値を参照`));
    dp[len] = best;
    settled.add(len);
    frames.push(snapshot(new Map([[len, "pivot"]]), `dp[${len}] = ${best} を確定`));
  }

  frames.push(snapshot(new Map(), `計算完了。長さ${n}の棒から得られる最大価値は${dp[n]}`));
  return frames;
}

export const SUBSET_SUM_NUMBERS = [3, 34, 4, 12, 5, 2];
export const SUBSET_SUM_TARGET = 9;

/**
 * 部分和問題のDPテーブルを埋めていくステップ列を生成する。
 * セルの値は1=達成可能・0=不可のブール値として表示する。
 */
export function subsetSumSteps(): DPFrame[] {
  const nums = SUBSET_SUM_NUMBERS;
  const target = SUBSET_SUM_TARGET;
  const n = nums.length;
  const dp: (number | null)[][] = Array.from({ length: n + 1 }, () => new Array(target + 1).fill(null));
  for (let i = 0; i <= n; i++) dp[i][0] = 1;
  for (let s = 1; s <= target; s++) dp[0][s] = 0;

  const settled = new Set<string>();
  for (let i = 0; i <= n; i++) settled.add(`${i},0`);
  for (let s = 0; s <= target; s++) settled.add(`0,${s}`);

  const frames: DPFrame[] = [];
  const snapshot = (extra: Map<string, "comparing" | "pivot">, description: string): DPFrame => {
    const table: DPCell[][] = dp.map((row, i) =>
      row.map((value, s) => {
        const key = `${i},${s}`;
        return { value, state: extra.get(key) ?? (settled.has(key) ? "settled" : "idle") };
      }),
    );
    return { table, description };
  };

  frames.push(snapshot(new Map(), "初期状態(和0は常に達成可能=1、要素0個では和1以上は達成不可=0)"));

  for (let i = 1; i <= n; i++) {
    const num = nums[i - 1];
    for (let s = 1; s <= target; s++) {
      const highlight = new Map<string, "comparing" | "pivot">();
      highlight.set(`${i - 1},${s}`, "comparing");
      let achievable = dp[i - 1][s] === 1;
      if (num <= s) {
        highlight.set(`${i - 1},${s - num}`, "comparing");
        achievable = achievable || dp[i - 1][s - num] === 1;
      }
      frames.push(snapshot(highlight, `数値${num}を和${s}の達成に使うかどうかを検討`));
      dp[i][s] = achievable ? 1 : 0;
      settled.add(`${i},${s}`);
      frames.push(
        snapshot(new Map([[`${i},${s}`, "pivot"]]), `dp[${i}][${s}] = ${achievable ? "1(達成可能)" : "0(不可)"} を確定`),
      );
    }
  }

  frames.push(
    snapshot(
      new Map(),
      `計算完了。{${nums.join(",")}}の部分集合で和${target}は${dp[n][target] === 1 ? "達成可能" : "達成不可"}`,
    ),
  );
  return frames;
}

export const LIS_ARRAY = [10, 9, 2, 5, 3, 7, 101, 18];

/** 最長増加部分列(LIS)のDPを1行のテーブルとして埋めていくステップ列を生成する。 */
export function lisSteps(): DPFrame[] {
  const arr = LIS_ARRAY;
  const n = arr.length;
  const dp: (number | null)[] = new Array(n).fill(null);
  const settled = new Set<number>();

  const frames: DPFrame[] = [];
  const snapshot = (extra: Map<number, "comparing" | "pivot">, description: string): DPFrame => {
    const row: DPCell[] = dp.map((value, i) => ({
      value,
      state: extra.get(i) ?? (settled.has(i) ? "settled" : "idle"),
    }));
    return { table: [row], description };
  };

  frames.push(snapshot(new Map(), "初期状態"));

  for (let i = 0; i < n; i++) {
    let best = 1;
    const highlight = new Map<number, "comparing" | "pivot">();
    for (let j = 0; j < i; j++) {
      highlight.set(j, "comparing");
      if (arr[j] < arr[i] && (dp[j] ?? 0) + 1 > best) {
        best = (dp[j] ?? 0) + 1;
      }
    }
    if (i > 0) {
      frames.push(snapshot(highlight, `array[${i}]=${arr[i]}: 手前の要素のうち自分より小さい値の最長長を探す`));
    }
    dp[i] = best;
    settled.add(i);
    frames.push(snapshot(new Map([[i, "pivot"]]), `dp[${i}] = ${best}(array[${i}]=${arr[i]}で終わる最長増加部分列の長さ)を確定`));
  }

  const maxLen = Math.max(...(dp as number[]));
  frames.push(snapshot(new Map(), `計算完了。最長増加部分列の長さは${maxLen}`));
  return frames;
}

export const LPS_STRING = "BBABCBCAB";

/**
 * 最長回文部分列のDPテーブルを埋めていくステップ列を生成する。
 * LCS/編集距離と違い、同じ文字列の区間[i,j]を対象にした区間DP(dp[i][j])。
 */
export function longestPalindromicSubsequenceSteps(): DPFrame[] {
  const s = LPS_STRING;
  const n = s.length;
  const dp: (number | null)[][] = Array.from({ length: n }, () => new Array(n).fill(null));
  for (let i = 0; i < n; i++) dp[i][i] = 1;
  const settled = new Set<string>();
  for (let i = 0; i < n; i++) settled.add(`${i},${i}`);

  const frames: DPFrame[] = [];
  const snapshot = (extra: Map<string, "comparing" | "pivot">, description: string): DPFrame => {
    const table: DPCell[][] = dp.map((row, i) =>
      row.map((value, j) => {
        const key = `${i},${j}`;
        return { value, state: extra.get(key) ?? (settled.has(key) ? "settled" : "idle") };
      }),
    );
    return { table, description };
  };

  frames.push(snapshot(new Map(), "初期状態(長さ1の区間は常に回文なので長さ1)"));

  for (let length = 2; length <= n; length++) {
    for (let i = 0; i <= n - length; i++) {
      const j = i + length - 1;
      const highlight = new Map<string, "comparing" | "pivot">();
      let value: number;
      if (s[i] === s[j]) {
        if (length === 2) {
          value = 2;
        } else {
          highlight.set(`${i + 1},${j - 1}`, "comparing");
          value = (dp[i + 1][j - 1] ?? 0) + 2;
        }
        frames.push(snapshot(highlight, `s[${i}]="${s[i]}"とs[${j}]="${s[j]}"が一致 → 内側の区間+2`));
      } else {
        highlight.set(`${i + 1},${j}`, "comparing");
        highlight.set(`${i},${j - 1}`, "comparing");
        value = Math.max(dp[i + 1][j] ?? 0, dp[i][j - 1] ?? 0);
        frames.push(snapshot(highlight, `s[${i}]="${s[i]}"とs[${j}]="${s[j]}"が不一致 → 内側区間の大きい方を引き継ぐ`));
      }
      dp[i][j] = value;
      settled.add(`${i},${j}`);
      frames.push(snapshot(new Map([[`${i},${j}`, "pivot"]]), `dp[${i}][${j}] = ${value}(区間長${length})を確定`));
    }
  }

  frames.push(snapshot(new Map(), `計算完了。"${s}"の最長回文部分列の長さは${dp[0][n - 1]}`));
  return frames;
}

export const FLOYD_WARSHALL_NODE_IDS = SHORTEST_PATH_NODES.map((n) => n.id);

/**
 * フロイド・ワーシャル法(全頂点対最短距離)を、経由地DPのテーブルとして生成する。
 * bellman-ford.mdと同じ有向グラフ(負の辺1本含む)を使い回す。
 * dist[i][j]=nullは「まだ到達経路が見つかっていない」ことを表す(=∞、テーブル上は空欄)。
 */
export function floydWarshallSteps(): DPFrame[] {
  const nodeIds = FLOYD_WARSHALL_NODE_IDS;
  const n = nodeIds.length;
  const dist: (number | null)[][] = Array.from({ length: n }, () => new Array(n).fill(null));
  for (let i = 0; i < n; i++) dist[i][i] = 0;
  for (const edge of SHORTEST_PATH_EDGES) {
    const i = nodeIds.indexOf(edge.from);
    const j = nodeIds.indexOf(edge.to);
    dist[i][j] = edge.weight;
  }

  const frames: DPFrame[] = [];
  const snapshot = (extra: Map<string, "comparing" | "pivot">, description: string): DPFrame => {
    const table: DPCell[][] = dist.map((row, i) =>
      row.map((value, j) => {
        const key = `${i},${j}`;
        return { value, state: extra.get(key) ?? "idle" };
      }),
    );
    return { table, description };
  };

  frames.push(snapshot(new Map(), "初期状態(直接つながっている頂点間の距離のみ設定、対角は0、空欄は未到達=∞)"));

  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] === null || dist[k][j] === null) continue;
        const through = dist[i][k]! + dist[k][j]!;
        if (dist[i][j] === null || through < dist[i][j]!) {
          const highlight = new Map<string, "comparing" | "pivot">([
            [`${i},${k}`, "comparing"],
            [`${k},${j}`, "comparing"],
          ]);
          dist[i][j] = through;
          highlight.set(`${i},${j}`, "pivot");
          frames.push(snapshot(highlight, `経由地${nodeIds[k]}を使うと${nodeIds[i]}→${nodeIds[j]}が短縮: ${through}`));
        }
      }
    }
    frames.push(snapshot(new Map(), `経由地${nodeIds[k]}を使った更新が完了`));
  }

  frames.push(snapshot(new Map(), "計算完了。全頂点対間の最短距離が確定"));
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
  "coin-change": {
    chips: [`硬貨: ${COIN_CHANGE_COINS.join(", ")}`, `目標金額: ${COIN_CHANGE_AMOUNT}`],
    cornerLabel: "最小枚数 \\ 金額",
    rowHeaders: ["枚数"],
    colHeaders: Array.from({ length: COIN_CHANGE_AMOUNT + 1 }, (_, i) => String(i)),
  },
  "rod-cutting": {
    chips: [`長さごとの価格: ${ROD_CUTTING_PRICES.join(", ")}`, `棒の長さ: ${ROD_CUTTING_LENGTH}`],
    cornerLabel: "最大価値 \\ 長さ",
    rowHeaders: ["価値"],
    colHeaders: Array.from({ length: ROD_CUTTING_LENGTH + 1 }, (_, i) => String(i)),
  },
  "subset-sum": {
    chips: [`数値集合: {${SUBSET_SUM_NUMBERS.join(",")}}`, `目標和: ${SUBSET_SUM_TARGET}(1=達成可能/0=不可)`],
    cornerLabel: "個数 \\ 和",
    rowHeaders: ["∅", ...SUBSET_SUM_NUMBERS.map(String)],
    colHeaders: Array.from({ length: SUBSET_SUM_TARGET + 1 }, (_, s) => String(s)),
  },
  lis: {
    chips: [`配列: [${LIS_ARRAY.join(", ")}]`],
    cornerLabel: "LIS長 \\ 値",
    rowHeaders: ["長さ"],
    colHeaders: LIS_ARRAY.map(String),
  },
  "longest-palindromic-subsequence": {
    chips: [`対象文字列: "${LPS_STRING}"`],
    cornerLabel: "i \\ j",
    rowHeaders: LPS_STRING.split(""),
    colHeaders: LPS_STRING.split(""),
  },
  "floyd-warshall": {
    chips: [`頂点: ${FLOYD_WARSHALL_NODE_IDS.join(", ")}`, "bellman-ford.mdと同じ有向グラフ(負の辺1本含む)"],
    cornerLabel: "始点 \\ 終点",
    rowHeaders: FLOYD_WARSHALL_NODE_IDS,
    colHeaders: FLOYD_WARSHALL_NODE_IDS,
  },
};

export const DP_VISUALIZERS: Record<string, () => DPFrame[]> = {
  "knapsack-dp": knapsackSteps,
  lcs: lcsSteps,
  "edit-distance": editDistanceSteps,
  "coin-change": coinChangeSteps,
  "rod-cutting": rodCuttingSteps,
  "subset-sum": subsetSumSteps,
  lis: lisSteps,
  "longest-palindromic-subsequence": longestPalindromicSubsequenceSteps,
  "floyd-warshall": floydWarshallSteps,
};
