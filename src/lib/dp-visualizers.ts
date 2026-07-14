import { SHORTEST_PATH_EDGES, SHORTEST_PATH_NODES } from "./graph-visualizers.ts";

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

export const SPARSE_TABLE_ARRAY = [7, 2, 3, 0, 5, 10, 3, 12, 18];
const SPARSE_TABLE_N = SPARSE_TABLE_ARRAY.length;
const SPARSE_TABLE_K = Math.floor(Math.log2(SPARSE_TABLE_N)) + 1;

/**
 * 区間最小値クエリ(RMQ)のためのSparse Table構築を、k×iの2次元テーブルとして可視化する。
 * dp[k][i] = 開始位置iから長さ2^kの区間の最小値。長さ2^kの区間は、長さ2^(k-1)の2つの区間の
 * 最小値を比較するだけで求まる(区間が重なっていても正しい、というべき乗区間分割の性質を利用)。
 */
export function sparseTableSteps(): DPFrame[] {
  const arr = SPARSE_TABLE_ARRAY;
  const n = SPARSE_TABLE_N;
  const K = SPARSE_TABLE_K;
  const dp: (number | null)[][] = Array.from({ length: K }, () => new Array(n).fill(null));
  for (let i = 0; i < n; i++) dp[0][i] = arr[i];
  const settled = new Set<string>();
  for (let i = 0; i < n; i++) settled.add(`0,${i}`);

  const frames: DPFrame[] = [];
  const snapshot = (extra: Map<string, "comparing" | "pivot">, description: string): DPFrame => {
    const table: DPCell[][] = dp.map((row, k) =>
      row.map((value, i) => {
        const key = `${k},${i}`;
        return { value, state: extra.get(key) ?? (settled.has(key) ? "settled" : "idle") };
      }),
    );
    return { table, description };
  };

  frames.push(snapshot(new Map(), "初期状態(k=0の行は各要素そのもの、長さ2^0=1の区間の最小値)"));

  for (let k = 1; k < K; k++) {
    const half = 1 << (k - 1);
    for (let i = 0; i + (1 << k) <= n; i++) {
      const highlight = new Map<string, "comparing" | "pivot">([
        [`${k - 1},${i}`, "comparing"],
        [`${k - 1},${i + half}`, "comparing"],
      ]);
      const value = Math.min(dp[k - 1][i]!, dp[k - 1][i + half]!);
      frames.push(snapshot(highlight, `長さ${1 << k}の区間(開始位置${i})は、長さ${half}の2つの区間の最小値を比較`));
      dp[k][i] = value;
      settled.add(`${k},${i}`);
      frames.push(snapshot(new Map([[`${k},${i}`, "pivot"]]), `dp[${k}][${i}] = ${value} を確定`));
    }
  }

  frames.push(
    snapshot(new Map(), "計算完了。任意の区間の最小値をO(1)で問い合わせ可能な前計算テーブルが完成(問い合わせ時は2つの2冪区間でカバーする)"),
  );
  return frames;
}

export const MATRIX_DIMENSIONS = [30, 35, 15, 5, 10, 20, 25];

/**
 * 行列連鎖乗算の区間DPを、dp[i][j](行列i〜jをまとめて掛けるための最小スカラー乗算回数)として可視化する。
 * 区間DPという点では最長回文部分列と同じ骨格だが、参照するのは「左右の内側区間」ではなく
 * 「分割点kで2つに割った左右の区間+その分割点でのコスト」という点が異なる。
 * CLRSの教科書的な次元列(30,35,15,5,10,20,25、行列6個)を使用。
 */
export function matrixChainSteps(): DPFrame[] {
  const dims = MATRIX_DIMENSIONS;
  const n = dims.length - 1;
  const dp: (number | null)[][] = Array.from({ length: n }, () => new Array(n).fill(null));
  for (let i = 0; i < n; i++) dp[i][i] = 0;
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

  frames.push(snapshot(new Map(), "初期状態(行列1個だけの区間は乗算不要なのでコスト0)"));

  for (let length = 2; length <= n; length++) {
    for (let i = 0; i <= n - length; i++) {
      const j = i + length - 1;
      let best = Infinity;
      let bestK = i;
      const highlight = new Map<string, "comparing" | "pivot">();
      for (let k = i; k < j; k++) {
        highlight.set(`${i},${k}`, "comparing");
        highlight.set(`${k + 1},${j}`, "comparing");
        const cost = (dp[i][k] ?? 0) + (dp[k + 1][j] ?? 0) + dims[i] * dims[k + 1] * dims[j + 1];
        if (cost < best) {
          best = cost;
          bestK = k;
        }
      }
      frames.push(snapshot(highlight, `区間[A${i + 1}..A${j + 1}]: 分割点をA${i + 1}〜A${j}の間で全て試し、最小コストを探す`));
      dp[i][j] = best;
      settled.add(`${i},${j}`);
      frames.push(
        snapshot(new Map([[`${i},${j}`, "pivot"]]), `dp[${i}][${j}] = ${best}(分割点: A${bestK + 1}とA${bestK + 2}の間)を確定`),
      );
    }
  }

  frames.push(snapshot(new Map(), `計算完了。行列A1〜A${n}をまとめて掛けるのに必要な最小スカラー乗算回数は${dp[0][n - 1]}`));
  return frames;
}

export const EGG_DROP_EGGS = 2;
export const EGG_DROP_FLOORS = 10;

/**
 * 卵落とし問題のDPを可視化する。dp[e][f]=卵e+1個・床f階での最悪ケース最小試行回数
 * (行インデックス0が卵1個に対応するよう1引いてずらしている)。
 * xの階から落として「割れた場合」(卵が1個減り、下のf-x階を卵e個で探索)と
 * 「割れなかった場合」(卵は減らず、上のf-x階を卵e+1個で探索)の悪い方を、
 * 全てのxについて試して最小になるものを選ぶ。
 */
export function eggDropSteps(): DPFrame[] {
  const eggs = EGG_DROP_EGGS;
  const floors = EGG_DROP_FLOORS;
  const dp: (number | null)[][] = Array.from({ length: eggs }, () => new Array(floors + 1).fill(null));
  for (let f = 0; f <= floors; f++) dp[0][f] = f;
  for (let e = 0; e < eggs; e++) dp[e][0] = 0;
  const settled = new Set<string>();
  for (let f = 0; f <= floors; f++) settled.add(`0,${f}`);
  for (let e = 0; e < eggs; e++) settled.add(`${e},0`);

  const frames: DPFrame[] = [];
  const snapshot = (extra: Map<string, "comparing" | "pivot">, description: string): DPFrame => {
    const table: DPCell[][] = dp.map((row, e) =>
      row.map((value, f) => {
        const key = `${e},${f}`;
        return { value, state: extra.get(key) ?? (settled.has(key) ? "settled" : "idle") };
      }),
    );
    return { table, description };
  };

  frames.push(snapshot(new Map(), "初期状態(卵1個なら1階ずつ確かめるのでf階はf回、床0階なら0回)"));

  for (let e = 1; e < eggs; e++) {
    for (let f = 1; f <= floors; f++) {
      let best = Infinity;
      const highlight = new Map<string, "comparing" | "pivot">();
      for (let x = 1; x <= f; x++) {
        highlight.set(`${e - 1},${x - 1}`, "comparing");
        highlight.set(`${e},${f - x}`, "comparing");
        const worstCase = 1 + Math.max(dp[e - 1][x - 1] ?? 0, dp[e][f - x] ?? 0);
        if (worstCase < best) best = worstCase;
      }
      frames.push(
        snapshot(highlight, `卵${e + 1}個・床${f}階: x階から落とす場合を全て試し、割れた/割れなかった場合の悪い方が最小になるxを探す`),
      );
      dp[e][f] = best;
      settled.add(`${e},${f}`);
      frames.push(snapshot(new Map([[`${e},${f}`, "pivot"]]), `dp[${e}][${f}] = ${best} を確定`));
    }
  }

  frames.push(snapshot(new Map(), `計算完了。卵${eggs}個・床${floors}階での最悪ケース最小試行回数は${dp[eggs - 1][floors]}`));
  return frames;
}

export const LONGEST_COMMON_SUBSTRING_A = "ABABC";
export const LONGEST_COMMON_SUBSTRING_B = "BABCA";

/**
 * 最長共通部分文字列のステップ列を生成する。LCS(最長共通部分列)と同じ2次元DPテーブルを使うが、
 * 漸化式が異なる: 文字が一致すれば左上に+1する点は同じでも、不一致なら「連続性」が途切れるため
 * 0にリセットする(LCSのように上や左の値を引き継がない)。テーブル中の最大値とその位置から
 * 実際の部分文字列を復元する。本来は接尾辞配列/接尾辞木を使うとO(n+m)で解けるが、
 * ここでは仕組みが見えやすいDPベースの素朴な解法(O(nm))を可視化している。
 */
export function longestCommonSubstringSteps(): DPFrame[] {
  const a = LONGEST_COMMON_SUBSTRING_A;
  const b = LONGEST_COMMON_SUBSTRING_B;
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

  frames.push(snapshot(new Map(), "初期状態(どちらかが空文字列なら共通部分文字列の長さは0)"));

  let maxLen = 0;
  let maxEndI = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const highlight = new Map<string, "comparing" | "pivot">();
      let value: number;
      if (a[i - 1] === b[j - 1]) {
        highlight.set(`${i - 1},${j - 1}`, "comparing");
        value = dp[i - 1][j - 1]! + 1;
        frames.push(
          snapshot(highlight, `"${a[i - 1]}" と "${b[j - 1]}" が一致 → 左上に+1(連続する共通部分の長さ)`),
        );
      } else {
        value = 0;
        frames.push(snapshot(highlight, `"${a[i - 1]}" と "${b[j - 1]}" が不一致 → 連続が途切れるので0にリセット`));
      }
      dp[i][j] = value;
      settled.add(`${i},${j}`);
      if (value > maxLen) {
        maxLen = value;
        maxEndI = i;
      }
      frames.push(
        snapshot(
          new Map([[`${i},${j}`, "pivot"]]),
          `dp[${i}][${j}] = ${value} を確定` + (value === maxLen && value > 0 ? `(現在の最長: ${maxLen})` : ""),
        ),
      );
    }
  }

  const substring = a.slice(maxEndI - maxLen, maxEndI);
  frames.push(snapshot(new Map(), `計算完了。最長共通部分文字列は "${substring}"(長さ${maxLen})`));
  return frames;
}

export type IntervalSchedulingItem = { label: string; start: number; end: number };
export const INTERVAL_SCHEDULING_INTERVALS: IntervalSchedulingItem[] = [
  { label: "A", start: 1, end: 3 },
  { label: "B", start: 2, end: 4 },
  { label: "C", start: 3, end: 5 },
  { label: "D", start: 0, end: 7 },
  { label: "E", start: 5, end: 9 },
  { label: "F", start: 8, end: 10 },
];

/**
 * 区間スケジューリング問題(貪欲法)のステップ列を生成する。終了時刻の早い順に区間をソートし、
 * 「直前に採用した区間の終了時刻以降に開始する区間だけを採用する」という単純な規則を
 * 1回通すだけで、両立可能な区間の最大数が求まることを可視化する
 * (終了時刻が早い区間を優先することで、後続の区間を選ぶ余地を最大限残せるのが根拠)。
 */
export function intervalSchedulingSteps(): DPFrame[] {
  const sorted = [...INTERVAL_SCHEDULING_INTERVALS].sort((x, y) => x.end - y.end);
  const n = sorted.length;
  const table: (number | null)[][] = [
    sorted.map((iv) => iv.start),
    sorted.map((iv) => iv.end),
    sorted.map(() => null),
  ];
  const state: DPCellState[][] = [
    sorted.map(() => "settled"),
    sorted.map(() => "settled"),
    sorted.map(() => "idle"),
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(`区間を終了時刻の早い順にソート: ${sorted.map((iv) => `${iv.label}(${iv.start}-${iv.end})`).join(", ")}`),
  );

  let lastEnd = -Infinity;
  let selectedCount = 0;
  for (let c = 0; c < n; c++) {
    state[2][c] = "comparing";
    frames.push(
      snapshot(
        `区間${sorted[c].label}(開始${sorted[c].start}・終了${sorted[c].end})を検討(直前に採用した区間の終了時刻: ${lastEnd === -Infinity ? "なし" : lastEnd})`,
      ),
    );

    if (sorted[c].start >= lastEnd) {
      table[2][c] = 1;
      state[2][c] = "pivot";
      lastEnd = sorted[c].end;
      selectedCount++;
      frames.push(snapshot(`区間${sorted[c].label}を採用(開始時刻が直前の終了時刻以降)。採用済み${selectedCount}件`));
    } else {
      table[2][c] = 0;
      state[2][c] = "idle";
      frames.push(snapshot(`区間${sorted[c].label}を棄却(直前に採用した区間と重なる)`));
    }
  }

  const selectedLabels = sorted.filter((_, c) => table[2][c] === 1).map((iv) => iv.label);
  frames.push(snapshot(`計算完了。採用した区間: ${selectedLabels.join(", ")}(最大${selectedCount}件が両立可能)`));
  return frames;
}

export const EUCLIDEAN_A = 48;
export const EUCLIDEAN_B = 18;

/**
 * ユークリッドの互除法のステップ列を生成する。「aをbで割った余りをrとすると、
 * gcd(a,b)=gcd(b,r)」という性質を使い、(a,b)を(b, a mod b)に置き換える操作を
 * bが0になるまで繰り返すだけで最大公約数が求まる。
 */
export function euclideanAlgorithmSteps(): DPFrame[] {
  const pairs: [number, number][] = [];
  {
    let a = EUCLIDEAN_A;
    let b = EUCLIDEAN_B;
    pairs.push([a, b]);
    while (b !== 0) {
      const r = a % b;
      a = b;
      b = r;
      pairs.push([a, b]);
    }
  }
  const cols = pairs.length;
  const table: (number | null)[][] = [new Array(cols).fill(null), new Array(cols).fill(null)];
  const state: DPCellState[][] = [new Array(cols).fill("idle"), new Array(cols).fill("idle")];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(snapshot(`ユークリッドの互除法を開始。gcd(${EUCLIDEAN_A}, ${EUCLIDEAN_B})を求める`));

  for (let c = 0; c < cols; c++) {
    table[0][c] = pairs[c][0];
    table[1][c] = pairs[c][1];
    state[0][c] = "pivot";
    state[1][c] = "pivot";
    if (c === 0) {
      frames.push(snapshot(`初期状態: a=${pairs[0][0]}, b=${pairs[0][1]}`));
    } else {
      frames.push(
        snapshot(
          `${pairs[c - 1][0]} mod ${pairs[c - 1][1]} = ${pairs[c][1]} → 新しい(a, b) = (${pairs[c][0]}, ${pairs[c][1]})`,
        ),
      );
    }
    state[0][c] = "settled";
    state[1][c] = "settled";
  }

  frames.push(snapshot(`計算完了。b=0になったのでgcd(${EUCLIDEAN_A}, ${EUCLIDEAN_B}) = ${pairs[cols - 1][0]}`));
  return frames;
}

export const EXTENDED_EUCLIDEAN_A = 35;
export const EXTENDED_EUCLIDEAN_B = 15;

/**
 * 拡張ユークリッドの互除法のステップ列を生成する。gcdを求める通常の互除法と並行して、
 * ax + by = gcd(a,b) を満たす係数(x,y)も更新していく。各反復で商q=⌊r0/r1⌋を使い、
 * r,s,t(それぞれgcd候補・xの係数・yの係数)を「2つ前の値からq×1つ前の値を引く」形で更新する。
 */
export function extendedEuclideanSteps(): DPFrame[] {
  type Row = { r: number; s: number; t: number };
  const rows: Row[] = [];
  {
    let r0 = EXTENDED_EUCLIDEAN_A;
    let r1 = EXTENDED_EUCLIDEAN_B;
    let s0 = 1;
    let s1 = 0;
    let t0 = 0;
    let t1 = 1;
    rows.push({ r: r0, s: s0, t: t0 });
    rows.push({ r: r1, s: s1, t: t1 });
    while (r1 !== 0) {
      const q = Math.floor(r0 / r1);
      const r2 = r0 - q * r1;
      const s2 = s0 - q * s1;
      const t2 = t0 - q * t1;
      rows.push({ r: r2, s: s2, t: t2 });
      r0 = r1;
      r1 = r2;
      s0 = s1;
      s1 = s2;
      t0 = t1;
      t1 = t2;
    }
  }
  const cols = rows.length;
  const table: (number | null)[][] = [
    new Array(cols).fill(null),
    new Array(cols).fill(null),
    new Array(cols).fill(null),
  ];
  const state: DPCellState[][] = [
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `拡張ユークリッドの互除法を開始。${EXTENDED_EUCLIDEAN_A}s + ${EXTENDED_EUCLIDEAN_B}t = gcd(${EXTENDED_EUCLIDEAN_A}, ${EXTENDED_EUCLIDEAN_B}) を満たす(s,t)を、gcdの計算と同時に求める`,
    ),
  );

  for (let c = 0; c < cols; c++) {
    table[0][c] = rows[c].r;
    table[1][c] = rows[c].s;
    table[2][c] = rows[c].t;
    state[0][c] = "pivot";
    state[1][c] = "pivot";
    state[2][c] = "pivot";
    if (c < 2) {
      frames.push(snapshot(`初期化: r=${rows[c].r}, s=${rows[c].s}, t=${rows[c].t}`));
    } else {
      const q = Math.floor(rows[c - 2].r / rows[c - 1].r);
      frames.push(
        snapshot(
          `商q=⌊${rows[c - 2].r}/${rows[c - 1].r}⌋=${q}を使い、r,s,tをそれぞれ「2つ前の値-q×1つ前の値」で更新: r=${rows[c].r}, s=${rows[c].s}, t=${rows[c].t}`,
        ),
      );
    }
    state[0][c] = "settled";
    state[1][c] = "settled";
    state[2][c] = "settled";
  }

  const gcdRowIndex = cols - 2;
  const gcd = rows[gcdRowIndex].r;
  const s = rows[gcdRowIndex].s;
  const t = rows[gcdRowIndex].t;
  frames.push(
    snapshot(
      `計算完了。gcd(${EXTENDED_EUCLIDEAN_A}, ${EXTENDED_EUCLIDEAN_B}) = ${gcd}、${EXTENDED_EUCLIDEAN_A}×(${s}) + ${EXTENDED_EUCLIDEAN_B}×(${t}) = ${gcd}`,
    ),
  );
  return frames;
}

export const MOD_EXP_BASE = 7;
export const MOD_EXP_EXPONENT = 13;
export const MOD_EXP_MODULUS = 11;

/**
 * 繰り返し二乗法(高速べき乗)のステップ列を生成する。指数を2進展開し、下位ビットから
 * 「ビットが1なら結果に現在の底を掛ける、そうでなければ何もしない」を行った後、
 * 底を2乗して次のビットに備える、を繰り返すことで、素朴な繰り返し掛け算のO(n)回ではなく
 * O(log n)回の掛け算で巨大なべき乗剰余を計算できる。RSA等の暗号処理の基盤になっている。
 */
export function modularExponentiationSteps(): DPFrame[] {
  type Row = { bit: number; baseUsed: number; result: number };
  const rows: Row[] = [];
  {
    let e = MOD_EXP_EXPONENT;
    let b = MOD_EXP_BASE % MOD_EXP_MODULUS;
    let result = 1;
    while (e > 0) {
      const bit = e & 1;
      const baseUsed = b;
      if (bit === 1) result = (result * b) % MOD_EXP_MODULUS;
      rows.push({ bit, baseUsed, result });
      b = (b * b) % MOD_EXP_MODULUS;
      e = e >> 1;
    }
  }

  const cols = rows.length;
  const table: (number | null)[][] = [
    new Array(cols).fill(null),
    new Array(cols).fill(null),
    new Array(cols).fill(null),
  ];
  const state: DPCellState[][] = [
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `繰り返し二乗法を開始。${MOD_EXP_BASE}^${MOD_EXP_EXPONENT} mod ${MOD_EXP_MODULUS} を求める(指数を2進展開し、下位ビットから処理)`,
    ),
  );

  for (let c = 0; c < cols; c++) {
    table[0][c] = rows[c].bit;
    table[1][c] = rows[c].baseUsed;
    table[2][c] = rows[c].result;
    state[0][c] = "pivot";
    state[1][c] = "pivot";
    state[2][c] = "pivot";
    frames.push(
      snapshot(
        `ビット${rows[c].bit}: ${
          rows[c].bit === 1 ? `1なので結果に底${rows[c].baseUsed}を掛ける` : "0なのでスキップ"
        } → result=${rows[c].result}(次に備えて底を2乗)`,
      ),
    );
    state[0][c] = "settled";
    state[1][c] = "settled";
    state[2][c] = "settled";
  }

  frames.push(
    snapshot(`計算完了。${MOD_EXP_BASE}^${MOD_EXP_EXPONENT} mod ${MOD_EXP_MODULUS} = ${rows[cols - 1].result}`),
  );
  return frames;
}

export const RUSSIAN_PEASANT_A = 17;
export const RUSSIAN_PEASANT_B = 34;

/**
 * ロシア農民の乗算法のステップ列を生成する。aを半分に(端数切り捨て)、bを倍にしていき、
 * aが奇数のときだけその時点のbを累積和に加える。これは2進数表現に基づく仕組みで、
 * aを2進展開したときの各ビットに対応する「bを2倍した値」を、ビットが1の位置だけ
 * 足し合わせているのと同じ計算になっている。
 */
export function russianPeasantMultiplicationSteps(): DPFrame[] {
  type Row = { a: number; b: number; isOdd: number; sum: number };
  const rows: Row[] = [];
  {
    let a = RUSSIAN_PEASANT_A;
    let b = RUSSIAN_PEASANT_B;
    let sum = 0;
    while (a > 0) {
      const isOdd = a % 2 === 1 ? 1 : 0;
      if (isOdd === 1) sum += b;
      rows.push({ a, b, isOdd, sum });
      a = Math.floor(a / 2);
      b = b * 2;
    }
  }

  const cols = rows.length;
  const table: (number | null)[][] = [
    new Array(cols).fill(null),
    new Array(cols).fill(null),
    new Array(cols).fill(null),
    new Array(cols).fill(null),
  ];
  const state: DPCellState[][] = [
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(`ロシア農民の乗算法を開始。${RUSSIAN_PEASANT_A} × ${RUSSIAN_PEASANT_B} を求める`),
  );

  for (let c = 0; c < cols; c++) {
    table[0][c] = rows[c].a;
    table[1][c] = rows[c].b;
    table[2][c] = rows[c].isOdd;
    table[3][c] = rows[c].sum;
    state[0][c] = "pivot";
    state[1][c] = "pivot";
    state[2][c] = "pivot";
    state[3][c] = "pivot";
    frames.push(
      snapshot(
        `a=${rows[c].a}は${rows[c].isOdd === 1 ? "奇数なのでb=" + rows[c].b + "を累積和に加算" : "偶数なのでスキップ"} → 累積和=${rows[c].sum}(次はaを半分に、bを2倍に)`,
      ),
    );
    state[0][c] = "settled";
    state[1][c] = "settled";
    state[2][c] = "settled";
    state[3][c] = "settled";
  }

  frames.push(
    snapshot(`計算完了。aが0になったので終了。${RUSSIAN_PEASANT_A} × ${RUSSIAN_PEASANT_B} = ${rows[cols - 1].sum}`),
  );
  return frames;
}

export const CRT_MODULI = [3, 5, 7];
export const CRT_REMAINDERS = [2, 3, 2];

function crtModInverse(a: number, m: number): number {
  const aMod = ((a % m) + m) % m;
  for (let x = 1; x < m; x++) {
    if ((aMod * x) % m === 1) return x;
  }
  return 1;
}

/**
 * 中国剰余定理(CRT)のステップ列を生成する。x≡a_i (mod n_i)という複数の合同式から、
 * 全ての式を同時に満たすxをN=Π n_i を法として復元する。各iについて
 * N_i=N/n_i(自分以外の法の積)を計算し、N_iのn_iを法とする逆元を求め、
 * a_i×N_i×逆元 を合計してNで割った余りが答えになる
 * (N_iはn_i以外の法で割り切れるので、他の合同式への影響を持たずにi番目の条件だけを満たせる)。
 */
export function chineseRemainderTheoremSteps(): DPFrame[] {
  const n = CRT_MODULI.length;
  const N = CRT_MODULI.reduce((p, c) => p * c, 1);

  type Row = { ni: number; ai: number; Ni: number; inv: number; term: number; cumulative: number };
  const rows: Row[] = [];
  let cumulative = 0;
  for (let i = 0; i < n; i++) {
    const ni = CRT_MODULI[i];
    const ai = CRT_REMAINDERS[i];
    const Ni = N / ni;
    const inv = crtModInverse(Ni, ni);
    const term = (ai * Ni * inv) % N;
    cumulative = (cumulative + term) % N;
    rows.push({ ni, ai, Ni, inv, term, cumulative });
  }

  const cols = n;
  const table: (number | null)[][] = Array.from({ length: 6 }, () => new Array(cols).fill(null));
  const state: DPCellState[][] = Array.from({ length: 6 }, () => new Array(cols).fill("idle"));

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `中国剰余定理を開始。x≡${CRT_REMAINDERS.map((a, i) => `${a}(mod ${CRT_MODULI[i]})`).join(", x≡")} を満たすxを、N=${N}を法として求める`,
    ),
  );

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < 6; r++) state[r][c] = "comparing";
    table[0][c] = rows[c].ni;
    table[1][c] = rows[c].ai;
    frames.push(snapshot(`i=${c + 1}: n_i=${rows[c].ni}, a_i=${rows[c].ai}`));

    table[2][c] = rows[c].Ni;
    frames.push(snapshot(`N_i = N/n_i = ${N}/${rows[c].ni} = ${rows[c].Ni}(自分以外の法の積)`));

    table[3][c] = rows[c].inv;
    frames.push(snapshot(`N_iのn_iを法とする逆元を求める: ${rows[c].Ni}⁻¹ mod ${rows[c].ni} = ${rows[c].inv}`));

    table[4][c] = rows[c].term;
    table[5][c] = rows[c].cumulative;
    for (let r = 0; r < 6; r++) state[r][c] = "pivot";
    frames.push(
      snapshot(
        `項 = a_i×N_i×逆元 mod N = ${rows[c].ai}×${rows[c].Ni}×${rows[c].inv} mod ${N} = ${rows[c].term}。累積和 = ${rows[c].cumulative}`,
      ),
    );
    for (let r = 0; r < 6; r++) state[r][c] = "settled";
  }

  frames.push(snapshot(`計算完了。x = ${rows[cols - 1].cumulative}(mod ${N})が全ての合同式を満たす`));
  return frames;
}

export const DH_PRIME = 23;
export const DH_GENERATOR = 5;
export const DH_ALICE_SECRET = 6;
export const DH_BOB_SECRET = 15;

function dhModPow(base: number, exp: number, mod: number): number {
  let result = 1;
  let b = base % mod;
  let e = exp;
  while (e > 0) {
    if (e & 1) result = (result * b) % mod;
    b = (b * b) % mod;
    e = e >> 1;
  }
  return result;
}

/**
 * ディフィー・ヘルマン鍵共有のステップ列を生成する。AliceとBobは公開されたp(素数)とg(原始根)
 * だけを使い、それぞれ非公開の秘密鍵a,bから公開鍵A=g^a mod p、B=g^b mod pを計算して交換する。
 * その後、相手の公開鍵に自分の秘密鍵でべき乗する(B^a mod p、A^b mod p)ことで、
 * 互いに同じ共有鍵に到達できる(g^(ab) mod pが両者の計算の本質であるため)。
 * 盗聴者はp,g,A,Bを見ることはできるが、離散対数問題(g^x mod pからxを逆算する問題)の
 * 困難さにより、aやbを求めることは計算量的に困難——これが安全性の根拠になっている。
 */
export function diffieHellmanSteps(): DPFrame[] {
  const p = DH_PRIME;
  const g = DH_GENERATOR;
  const aSecret = DH_ALICE_SECRET;
  const bSecret = DH_BOB_SECRET;

  const table: (number | null)[][] = [
    [null, null, null],
    [null, null, null],
  ];
  const state: DPCellState[][] = [
    ["idle", "idle", "idle"],
    ["idle", "idle", "idle"],
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(`ディフィー・ヘルマン鍵共有を開始。公開パラメータ: 素数p=${p}, 原始根g=${g}(盗聴者もこの2つは知っている)`),
  );

  table[0][0] = aSecret;
  state[0][0] = "pivot";
  frames.push(snapshot(`Aliceが秘密鍵a=${aSecret}を選ぶ(誰にも公開しない)`));
  state[0][0] = "settled";

  table[1][0] = bSecret;
  state[1][0] = "pivot";
  frames.push(snapshot(`Bobが秘密鍵b=${bSecret}を選ぶ(誰にも公開しない)`));
  state[1][0] = "settled";

  const A = dhModPow(g, aSecret, p);
  table[0][1] = A;
  state[0][1] = "pivot";
  frames.push(snapshot(`Aliceが公開鍵A = g^a mod p = ${g}^${aSecret} mod ${p} = ${A} を計算し、公開通信路に送る`));
  state[0][1] = "settled";

  const B = dhModPow(g, bSecret, p);
  table[1][1] = B;
  state[1][1] = "pivot";
  frames.push(snapshot(`Bobが公開鍵B = g^b mod p = ${g}^${bSecret} mod ${p} = ${B} を計算し、公開通信路に送る`));
  state[1][1] = "settled";

  const sharedFromAlice = dhModPow(B, aSecret, p);
  table[0][2] = sharedFromAlice;
  state[0][2] = "pivot";
  frames.push(snapshot(`Aliceが共有鍵 = B^a mod p = ${B}^${aSecret} mod ${p} = ${sharedFromAlice} を計算`));
  state[0][2] = "settled";

  const sharedFromBob = dhModPow(A, bSecret, p);
  table[1][2] = sharedFromBob;
  state[1][2] = "pivot";
  frames.push(snapshot(`Bobが共有鍵 = A^b mod p = ${A}^${bSecret} mod ${p} = ${sharedFromBob} を計算`));
  state[1][2] = "settled";

  frames.push(
    snapshot(
      `計算完了。両者とも同じ共有鍵${sharedFromAlice}に到達した(盗聴者はp,g,A,Bが見えても、離散対数問題の困難さによりa,bを求められない)`,
    ),
  );
  return frames;
}

export const MILLER_RABIN_N = 561;
export const MILLER_RABIN_WITNESSES = [2, 3, 5, 7];

function millerRabinModPow(base: number, exp: number, mod: number): number {
  let result = 1;
  let b = base % mod;
  let e = exp;
  while (e > 0) {
    if (e & 1) result = (result * b) % mod;
    b = (b * b) % mod;
    e = Math.floor(e / 2);
  }
  return result;
}

/**
 * ミラー・ラビン素数判定法のステップ列を生成する。判定対象n=561は実はカーマイケル数
 * (3×11×17の合成数でありながら、素朴なフェルマーテストではほぼ全ての底で「素数らしい」
 * 結果になってしまう厄介な例)。ミラー・ラビン法はn-1=2^r×dと分解した上で、
 * 各証人aについてa^d mod nが1かn-1でなければ、r-1回まで2乗を繰り返してn-1が
 * 現れるかを追加でチェックする——この追加チェックにより、フェルマーテストが見逃す
 * カーマイケル数も高い確率で合成数と見抜けるようになる。
 */
export function millerRabinSteps(): DPFrame[] {
  const n = MILLER_RABIN_N;
  const witnesses = MILLER_RABIN_WITNESSES;

  let d = n - 1;
  let r = 0;
  while (d % 2 === 0) {
    d = d / 2;
    r++;
  }

  type Row = { a: number; verdict: number; note: string };
  const rows: Row[] = [];
  for (const a of witnesses) {
    let x = millerRabinModPow(a, d, n);
    let isProbablyPrime = x === 1 || x === n - 1;
    let note: string;
    if (isProbablyPrime) {
      note = `a^d mod n = ${x}(1またはn-1) → このaでは合成数と判定できない`;
    } else {
      let composite = true;
      for (let i = 0; i < r - 1; i++) {
        x = (x * x) % n;
        if (x === n - 1) {
          composite = false;
          break;
        }
      }
      isProbablyPrime = !composite;
      note = composite
        ? "2乗を繰り返してもn-1が現れない → 合成数の確実な証拠"
        : "2乗の過程でn-1が出現 → このaでは合成数と判定できない";
    }
    rows.push({ a, verdict: isProbablyPrime ? 1 : 0, note });
  }

  const cols = witnesses.length;
  const table: (number | null)[][] = [new Array(cols).fill(null), new Array(cols).fill(null)];
  const state: DPCellState[][] = [new Array(cols).fill("idle"), new Array(cols).fill("idle")];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r2) => row.map((value, c) => ({ value, state: state[r2][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `ミラー・ラビン素数判定法を開始。n=${n}を判定する(n-1=${n - 1}=2^${r}×${d}に分解)。nは実はカーマイケル数(561=3×11×17)で、素朴なフェルマーテストでは合成数と見抜けない厄介な例`,
    ),
  );

  let foundComposite = false;
  for (let c = 0; c < cols; c++) {
    table[0][c] = rows[c].a;
    table[1][c] = rows[c].verdict;
    state[0][c] = "pivot";
    state[1][c] = "pivot";
    frames.push(snapshot(`証人a=${rows[c].a}でテスト: ${rows[c].note}`));
    state[0][c] = "settled";
    state[1][c] = "settled";
    if (rows[c].verdict === 0) foundComposite = true;
  }

  frames.push(
    snapshot(
      foundComposite
        ? `計算完了。少なくとも1つの証人が合成数の確実な証拠を示したため、n=${n}は合成数と判定(実際に3×11×17=561)`
        : `計算完了。試した証人${witnesses.join(",")}では合成数と判定できなかった(証人を増やすとより高い確率で判定できる)`,
    ),
  );
  return frames;
}

export const POLLARDS_RHO_N = 8051;

function pollardsRhoF(x: number, n: number): number {
  return (x * x + 1) % n;
}

function pollardsRhoGcd(a: number, b: number): number {
  let x = a;
  let y = b;
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x;
}

/**
 * ポラードのロー法のステップ列を生成する。f(x)=x²+1 mod nという疑似乱数列を
 * 遅いポインタ(1歩ずつ)と速いポインタ(2歩ずつ)で辿り、gcd(|x-y|, n)が1より
 * 大きくなった時点でnの非自明な約数が見つかる。数列がいずれ循環すること
 * (フロイドの循環検出法と同じ考え方)を利用して、素因数分解の困難さの根拠である
 * 「大きな数の約数を総当たりで探すのは非現実的」という前提を、確率的な近道で突破する。
 */
export function pollardsRhoSteps(): DPFrame[] {
  const n = POLLARDS_RHO_N;
  type Row = { x: number; y: number; d: number };
  const rows: Row[] = [];
  let x = 2;
  let y = 2;
  let d = 1;
  while (d === 1) {
    x = pollardsRhoF(x, n);
    y = pollardsRhoF(pollardsRhoF(y, n), n);
    d = pollardsRhoGcd(Math.abs(x - y), n);
    rows.push({ x, y, d });
  }

  const cols = rows.length;
  const table: (number | null)[][] = [
    new Array(cols).fill(null),
    new Array(cols).fill(null),
    new Array(cols).fill(null),
  ];
  const state: DPCellState[][] = [
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `ポラードのロー法を開始。n=${n}の非自明な約数を、f(x)=x²+1 mod nによる疑似乱数列とフロイドの循環検出法(遅い/速いポインタ)で見つける`,
    ),
  );

  for (let c = 0; c < cols; c++) {
    table[0][c] = rows[c].x;
    table[1][c] = rows[c].y;
    table[2][c] = rows[c].d;
    state[0][c] = "pivot";
    state[1][c] = "pivot";
    state[2][c] = "pivot";
    frames.push(
      snapshot(
        `反復${c + 1}: x(遅い)=f(x)=${rows[c].x}、y(速い)=f(f(y))=${rows[c].y}、gcd(|x-y|, n)=${rows[c].d}` +
          (rows[c].d > 1 ? " → 1より大きいので約数を発見" : ""),
      ),
    );
    state[0][c] = "settled";
    state[1][c] = "settled";
    state[2][c] = "settled";
  }

  const factor = rows[cols - 1].d;
  frames.push(snapshot(`計算完了。n=${n}=${factor}×${n / factor}(発見した約数: ${factor})`));
  return frames;
}

export const KARATSUBA_X = 1234;
export const KARATSUBA_Y = 5678;

/**
 * カラツバ法のステップ列を生成する。2つの数をそれぞれ上位・下位の桁に分割すると、
 * 素朴には4回の掛け算(ac, ad, bc, bd)が必要に見えるが、
 * (a+b)(c+d) = ac + ad + bc + bd という恒等式を使えば、
 * ad+bc = (a+b)(c+d) - ac - bd として3回の掛け算(ac, bd, (a+b)(c+d))だけで
 * 済ませられる。この「掛け算1回を足し算数回で置き換える」発想の繰り返し(再帰適用)により、
 * 素朴な筆算のO(n²)よりも高速なO(n^1.585)を達成する(このデモは分割を1段だけ行う簡略版)。
 */
export function karatsubaSteps(): DPFrame[] {
  const x = KARATSUBA_X;
  const y = KARATSUBA_Y;
  const half = 2;
  const base = 10 ** half;
  const a = Math.floor(x / base);
  const b = x % base;
  const c = Math.floor(y / base);
  const d = y % base;

  const ac = a * c;
  const bd = b * d;
  const sumProduct = (a + b) * (c + d);
  const adbc = sumProduct - ac - bd;
  const result = ac * base * base + adbc * base + bd;

  const cols = 9;
  const table: (number | null)[][] = [new Array(cols).fill(null)];
  const state: DPCellState[][] = [new Array(cols).fill("idle")];
  const values = [a, b, c, d, ac, bd, sumProduct, adbc, result];
  const descriptions = [
    `${x}を上位${half}桁と下位${half}桁に分割: a=${a}`,
    `${x}を上位${half}桁と下位${half}桁に分割: b=${b}`,
    `${y}を上位${half}桁と下位${half}桁に分割: c=${c}`,
    `${y}を上位${half}桁と下位${half}桁に分割: d=${d}`,
    `1回目の掛け算: a×c = ${a}×${c} = ${ac}`,
    `2回目の掛け算: b×d = ${b}×${d} = ${bd}`,
    `3回目の掛け算: (a+b)×(c+d) = ${a + b}×${c + d} = ${sumProduct}`,
    `ad+bc = (a+b)(c+d) - ac - bd = ${sumProduct} - ${ac} - ${bd} = ${adbc}(4回目の掛け算を避けられるのがカラツバ法の要点)`,
    `結果 = ac×10^${2 * half} + (ad+bc)×10^${half} + bd = ${result}`,
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c2) => ({ value, state: state[r][c2] }))),
    description,
  });

  frames.push(
    snapshot(`カラツバ法を開始。${x} × ${y} を、桁を半分に割って3回の掛け算(愚直な方法の4回より少ない)で計算する`),
  );

  for (let c2 = 0; c2 < cols; c2++) {
    table[0][c2] = values[c2];
    state[0][c2] = "pivot";
    frames.push(snapshot(descriptions[c2]));
    state[0][c2] = "settled";
  }

  frames.push(snapshot(`計算完了。${x} × ${y} = ${result}`));
  return frames;
}

export const RSA_P = 61;
export const RSA_Q = 53;
export const RSA_E = 17;
export const RSA_MESSAGE = 65;

function rsaModPow(base: number, exp: number, mod: number): number {
  let result = 1;
  let b = base % mod;
  let e = exp;
  while (e > 0) {
    if (e & 1) result = (result * b) % mod;
    b = (b * b) % mod;
    e = Math.floor(e / 2);
  }
  return result;
}

function rsaModInverse(e: number, phi: number): number {
  for (let d = 1; d < phi; d++) {
    if ((e * d) % phi === 1) return d;
  }
  return 1;
}

/**
 * RSA暗号の鍵生成・暗号化・復号のステップ列を生成する(Wikipedia等でよく引用される
 * 教科書的な小さい数値例)。2つの素数p,qの積n=pqは公開されるが、pとq自体は秘密にされる。
 * n(数百桁の大きさが実用)を素因数分解してpとqを求めるのが計算量的に極めて困難という
 * 事実こそが、公開鍵(n,e)を知っていても秘密鍵dを算出できない安全性の根拠になっている。
 */
export function rsaSteps(): DPFrame[] {
  const p = RSA_P;
  const q = RSA_Q;
  const e = RSA_E;
  const m = RSA_MESSAGE;
  const n = p * q;
  const phi = (p - 1) * (q - 1);
  const d = rsaModInverse(e, phi);
  const c = rsaModPow(m, e, n);
  const decrypted = rsaModPow(c, d, n);

  const cols = 9;
  const table: (number | null)[][] = [new Array(cols).fill(null)];
  const state: DPCellState[][] = [new Array(cols).fill("idle")];
  const values = [p, q, n, phi, e, d, m, c, decrypted];
  const descriptions = [
    `2つの素数を選ぶ: p=${p}`,
    `2つの素数を選ぶ: q=${q}`,
    `n = p×q = ${p}×${q} = ${n}(公開鍵の一部。素因数分解の困難さが安全性の根拠)`,
    `φ(n) = (p-1)×(q-1) = ${p - 1}×${q - 1} = ${phi}(オイラーのトーシェント関数)`,
    `公開鍵の指数e=${e}を選ぶ(gcd(e,φ(n))=1を満たす)`,
    `秘密鍵d = eのφ(n)を法とする逆元 = ${d}(e×d mod φ(n) = 1)`,
    `平文m=${m}を用意`,
    `暗号化: c = m^e mod n = ${m}^${e} mod ${n} = ${c}(公開鍵(n,e)だけで計算可能)`,
    `復号: m' = c^d mod n = ${c}^${d} mod ${n} = ${decrypted}(秘密鍵dを知る者だけが計算可能)`,
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c2) => ({ value, state: state[r][c2] }))),
    description,
  });

  frames.push(snapshot("RSA暗号を開始。2つの素数の積の素因数分解が困難であることを安全性の根拠とする"));

  for (let c2 = 0; c2 < cols; c2++) {
    table[0][c2] = values[c2];
    state[0][c2] = "pivot";
    frames.push(snapshot(descriptions[c2]));
    state[0][c2] = "settled";
  }

  frames.push(snapshot(`計算完了。復号結果m'=${decrypted}は元の平文m=${m}と一致(暗号化→復号で元に戻ることを確認)`));
  return frames;
}

export const LUCAS_LEHMER_P = 7;

/**
 * ルーカス・レーマー・テストのステップ列を生成する。メルセンヌ数M=2^p-1が素数かどうかを、
 * s_0=4から始まる数列 s_{i+1}=(s_i²-2) mod M をp-2回繰り返し、最終的にs_{p-2}が0になるか
 * どうかだけで判定する。一般の素数判定より遥かに少ない計算量で判定できるため、
 * 発見されている最大級の素数の多くはメルセンヌ素数(このテストで発見)が占めている。
 */
export function lucasLehmerSteps(): DPFrame[] {
  const p = LUCAS_LEHMER_P;
  const M = 2 ** p - 1;
  const iterations = p - 2;

  const sValues: number[] = [4];
  let s = 4;
  for (let i = 0; i < iterations; i++) {
    s = (s * s - 2) % M;
    sValues.push(s);
  }

  const cols = sValues.length;
  const table: (number | null)[][] = [new Array(cols).fill(null)];
  const state: DPCellState[][] = [new Array(cols).fill("idle")];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `ルーカス・レーマー・テストを開始。M=2^${p}-1=${M}がメルセンヌ素数かどうかを、s_0=4から始めるs_{i+1}=(s_i²-2) mod Mの数列で判定する(s_${iterations}=0ならMは素数)`,
    ),
  );

  for (let c = 0; c < cols; c++) {
    table[0][c] = sValues[c];
    state[0][c] = "pivot";
    frames.push(snapshot(c === 0 ? "s_0 = 4" : `s_${c} = (s_${c - 1}² - 2) mod ${M} = ${sValues[c]}`));
    state[0][c] = "settled";
  }

  const finalS = sValues[sValues.length - 1];
  frames.push(
    snapshot(
      `計算完了。s_${iterations} = ${finalS}。${finalS === 0 ? `0になったのでM=${M}はメルセンヌ素数` : `0にならなかったのでM=${M}はメルセンヌ素数ではない`}`,
    ),
  );
  return frames;
}

export const BSGS_P = 23;
export const BSGS_G = 5;
export const BSGS_H = 8;

function bsgsModPow(base: number, exp: number, mod: number): number {
  let result = 1;
  let b = base % mod;
  let e = exp;
  while (e > 0) {
    if (e & 1) result = (result * b) % mod;
    b = (b * b) % mod;
    e = Math.floor(e / 2);
  }
  return result;
}

function bsgsModInverse(a: number, m: number): number {
  const aMod = ((a % m) + m) % m;
  for (let x = 1; x < m; x++) {
    if ((aMod * x) % m === 1) return x;
  }
  return 1;
}

/**
 * Baby-step Giant-step法のステップ列を生成する。g^x≡h (mod p) を満たす離散対数xを、
 * 素朴な総当たりのO(p)ではなくO(√p)で求める。m=⌈√(p-1)⌉として、
 * まずg^j(j=0..m-1)を全て表に記録しておき(ベビーステップ)、
 * 次にh×(g^-m)^i(i=0..m-1)を順に計算してベビーステップの表と一致するものを探す
 * (ジャイアントステップ)。x=i×m+jという形で表せることを利用した、時間と空間を
 * トレードオフする中間一致法(meet-in-the-middle)の代表例。
 */
export function babyStepGiantStepSteps(): DPFrame[] {
  const p = BSGS_P;
  const g = BSGS_G;
  const h = BSGS_H;
  const m = Math.ceil(Math.sqrt(p - 1));

  const babySteps: number[] = [];
  for (let j = 0; j < m; j++) babySteps.push(bsgsModPow(g, j, p));

  const factor = bsgsModInverse(bsgsModPow(g, m, p), p);
  let y = h;
  const giantSteps: number[] = [y];
  let foundX: number | null = null;
  let foundI = -1;
  let foundJ = -1;
  for (let i = 0; i < m; i++) {
    const j = babySteps.indexOf(giantSteps[i]);
    if (j !== -1) {
      foundX = i * m + j;
      foundI = i;
      foundJ = j;
      break;
    }
    y = (y * factor) % p;
    giantSteps.push(y);
  }

  const cols = m;
  const table: (number | null)[][] = [
    new Array(cols).fill(null),
    new Array(cols).fill(null),
    new Array(cols).fill(null),
    new Array(cols).fill(null),
  ];
  const state: DPCellState[][] = [
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `Baby-step Giant-step法を開始。g^x ≡ h (mod p) を満たすxを、g=${g}, h=${h}, p=${p}について求める(m=⌈√(p-1)⌉=${m})`,
    ),
  );

  for (let j = 0; j < m; j++) {
    table[0][j] = j;
    table[1][j] = babySteps[j];
    state[0][j] = "pivot";
    state[1][j] = "pivot";
    frames.push(snapshot(`ベビーステップ: g^${j} mod ${p} = ${babySteps[j]} をテーブルに記録`));
    state[0][j] = "settled";
    state[1][j] = "settled";
  }

  for (let i = 0; i < giantSteps.length; i++) {
    table[2][i] = i;
    table[3][i] = giantSteps[i];
    state[2][i] = "pivot";
    state[3][i] = "pivot";
    const j = babySteps.indexOf(giantSteps[i]);
    frames.push(
      snapshot(
        `ジャイアントステップ: y_${i} = h×factor^${i} mod ${p} = ${giantSteps[i]}` +
          (j !== -1 ? ` → ベビーステップ表のj=${j}と一致!` : " → ベビーステップ表に見つからず、次へ"),
      ),
    );
    state[2][i] = "settled";
    state[3][i] = "settled";
  }

  frames.push(
    snapshot(
      `計算完了。x = i×m + j = ${foundI}×${m} + ${foundJ} = ${foundX}(検算: ${g}^${foundX} mod ${p} = ${bsgsModPow(g, foundX ?? 0, p)})`,
    ),
  );
  return frames;
}

export const FERMAT_N = 341;
export const FERMAT_WITNESSES = [2, 3, 7];

function fermatModPow(base: number, exp: number, mod: number): number {
  let result = 1;
  let b = base % mod;
  let e = exp;
  while (e > 0) {
    if (e & 1) result = (result * b) % mod;
    b = (b * b) % mod;
    e = Math.floor(e / 2);
  }
  return result;
}

/**
 * フェルマーの小定理を利用した素数判定法のステップ列を生成する。n=341は最小の
 * 「フェルマー擬素数」(底2について a^(n-1)≡1 mod nが成り立ってしまう合成数、
 * 実際は11×31)。複数の底で試すことで見抜ける場合もあるが、341自身は底2では
 * 素数と誤判定される典型例として選んでいる(このデモでは底3,7を加えて誤りを暴く)。
 */
export function fermatPrimalityTestSteps(): DPFrame[] {
  const n = FERMAT_N;
  const witnesses = FERMAT_WITNESSES;
  const results = witnesses.map((a) => fermatModPow(a, n - 1, n));

  const cols = witnesses.length;
  const table: (number | null)[][] = [new Array(cols).fill(null), new Array(cols).fill(null)];
  const state: DPCellState[][] = [new Array(cols).fill("idle"), new Array(cols).fill("idle")];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `フェルマーの小定理による素数判定を開始。n=${n}について、複数の底aでa^(n-1) mod n = 1が成り立つか調べる(実はn=341=11×31の合成数)`,
    ),
  );

  let allPassed = true;
  for (let c = 0; c < cols; c++) {
    table[0][c] = witnesses[c];
    table[1][c] = results[c];
    state[0][c] = "pivot";
    state[1][c] = "pivot";
    const passed = results[c] === 1;
    if (!passed) allPassed = false;
    frames.push(
      snapshot(
        `底a=${witnesses[c]}: a^(n-1) mod n = ${results[c]}` +
          (passed ? "(1なので素数の可能性あり、フェルマーテストを通過)" : "(1ではないので合成数の確実な証拠)"),
      ),
    );
    state[0][c] = "settled";
    state[1][c] = "settled";
  }

  frames.push(
    snapshot(
      allPassed
        ? `計算完了。試した底${witnesses.join(",")}全てで通過したが、n=341は実は11×31の合成数(フェルマー擬素数と呼ばれる誤判定の典型例)`
        : `計算完了。少なくとも1つの底で不合格となったため、n=${n}は合成数と判定(実際に11×31=341)`,
    ),
  );
  return frames;
}

export const POLLARDS_P_MINUS_1_N = 1961;
export const POLLARDS_P_MINUS_1_BOUND = 8;

function pollardsPM1Gcd(a: number, b: number): number {
  let x = a;
  let y = b;
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x;
}

/**
 * ポラードのp-1法のステップ列を生成する。nの素因数pについて「p-1が小さな素数の
 * 積(B-smooth)である」という性質を持つ場合に有効な手法——a=2から始め、
 * 2からBまでの各kについてa=a^k mod nと累乗していくと、指数部分にはk=2..Bの
 * 積が積み上がっていく。p-1がこの積を割り切っていれば、フェルマーの小定理により
 * a^(p-1)≡1 mod pとなるため、gcd(a-1, n)が1より大きくなりnの非自明な約数が求まる。
 */
export function pollardsPMinus1Steps(): DPFrame[] {
  const n = POLLARDS_P_MINUS_1_N;
  const bound = POLLARDS_P_MINUS_1_BOUND;

  let a = 2;
  type Row = { k: number; a: number; d: number };
  const rows: Row[] = [];
  let foundFactor: number | null = null;
  for (let k = 2; k <= bound; k++) {
    a = fermatModPow(a, k, n);
    const d = pollardsPM1Gcd(a - 1, n);
    rows.push({ k, a, d });
    if (d > 1 && d < n && foundFactor === null) foundFactor = d;
  }

  const cols = rows.length;
  const table: (number | null)[][] = [
    new Array(cols).fill(null),
    new Array(cols).fill(null),
    new Array(cols).fill(null),
  ];
  const state: DPCellState[][] = [
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `ポラードのp-1法を開始。n=${n}の非自明な約数を、a=2からa←a^k mod n(k=2..${bound})と累乗していくことで探す`,
    ),
  );

  for (let c = 0; c < cols; c++) {
    table[0][c] = rows[c].k;
    table[1][c] = rows[c].a;
    table[2][c] = rows[c].d;
    state[0][c] = "pivot";
    state[1][c] = "pivot";
    state[2][c] = "pivot";
    frames.push(
      snapshot(
        `k=${rows[c].k}: a ← a^${rows[c].k} mod n = ${rows[c].a}、gcd(a-1, n) = ${rows[c].d}` +
          (rows[c].d > 1 && rows[c].d < n ? " → 1より大きく nより小さいので約数を発見" : ""),
      ),
    );
    state[0][c] = "settled";
    state[1][c] = "settled";
    state[2][c] = "settled";
  }

  frames.push(
    snapshot(
      foundFactor !== null
        ? `計算完了。n=${n}=${foundFactor}×${n / foundFactor}(発見した約数: ${foundFactor}、p-1=${foundFactor - 1}が${bound}までの数の積で割り切れる小さな素因数を持っていたため見つかった)`
        : `計算完了。境界B=${bound}までの試行では約数が見つからなかった(Bを大きくすると発見できる可能性が上がる)`,
    ),
  );
  return frames;
}

export const TONELLI_SHANKS_N = 10;
export const TONELLI_SHANKS_P = 13;

/**
 * トネリ・シャンクスのアルゴリズムのステップ列を生成する。奇素数pを法として
 * x²≡n (mod p)となる平方根xを求める——p-1を2^S×Qという形に分解し(Qは奇数)、
 * 非剰余(平方剰余でない数)zを1つ見つけて補助数列を作ることで、S=1の単純なケース
 * (p≡3 mod 4なら x=n^((p+1)/4) で済む)より一般的なpについても平方根を計算できる。
 */
export function tonelliShanksSteps(): DPFrame[] {
  const n = TONELLI_SHANKS_N;
  const p = TONELLI_SHANKS_P;

  let Q = p - 1;
  let S = 0;
  while (Q % 2 === 0) {
    Q /= 2;
    S++;
  }

  let z = 2;
  while (fermatModPow(z, (p - 1) / 2, p) !== p - 1) z++;

  let M = S;
  let c = fermatModPow(z, Q, p);
  let t = fermatModPow(n, Q, p);
  let R = fermatModPow(n, (Q + 1) / 2, p);

  type Row = { M: number; c: number; t: number; R: number };
  const rows: Row[] = [{ M, c, t, R }];

  while (t !== 1) {
    let i = 0;
    let temp = t;
    while (temp !== 1) {
      temp = (temp * temp) % p;
      i++;
    }
    const b = fermatModPow(c, 2 ** (M - i - 1), p);
    M = i;
    c = (b * b) % p;
    t = (t * c) % p;
    R = (R * b) % p;
    rows.push({ M, c, t, R });
  }

  const cols = rows.length;
  const table: (number | null)[][] = [
    new Array(cols).fill(null),
    new Array(cols).fill(null),
    new Array(cols).fill(null),
    new Array(cols).fill(null),
  ];
  const state: DPCellState[][] = [
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c2) => ({ value, state: state[r][c2] }))),
    description,
  });

  frames.push(
    snapshot(
      `トネリ・シャンクスのアルゴリズムを開始。x²≡${n} (mod ${p})を満たすxを求める(p-1=${p - 1}=2^${S}×${Q}、非剰余z=${z})`,
    ),
  );

  for (let idx = 0; idx < cols; idx++) {
    table[0][idx] = rows[idx].M;
    table[1][idx] = rows[idx].c;
    table[2][idx] = rows[idx].t;
    table[3][idx] = rows[idx].R;
    state[0][idx] = "pivot";
    state[1][idx] = "pivot";
    state[2][idx] = "pivot";
    state[3][idx] = "pivot";
    frames.push(
      snapshot(
        `反復${idx}: M=${rows[idx].M}, c=${rows[idx].c}, t=${rows[idx].t}, R=${rows[idx].R}` +
          (rows[idx].t === 1 ? " → t=1に到達、Rが答え" : ""),
      ),
    );
    state[0][idx] = "settled";
    state[1][idx] = "settled";
    state[2][idx] = "settled";
    state[3][idx] = "settled";
  }

  const finalR = rows[rows.length - 1].R;
  frames.push(
    snapshot(`計算完了。x=${finalR}(検算: ${finalR}² mod ${p} = ${(finalR * finalR) % p}、n=${n}と一致)`),
  );
  return frames;
}

export const MONTGOMERY_A = 7;
export const MONTGOMERY_B = 15;
export const MONTGOMERY_N = 17;

function montgomeryExtGcd(a: number, m: number): number {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1, 0];
  while (r !== 0) {
    const q = Math.floor(old_r / r);
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return ((old_s % m) + m) % m;
}

/**
 * モンゴメリ乗算のステップ列を生成する。a×b mod nを計算する際、通常の剰余演算
 * (除算)を避け、基数R(nと互いに素、通常2の冪)を使った「モンゴメリ表現」
 * a'=a×R mod n に変換してから乗算・簡約することで、除算命令を使わずに
 * 乗算とビットシフトだけで剰余計算ができる——RSA等の公開鍵暗号で大量に発生する
 * べき乗剰余演算を高速化する実務上重要なテクニック。
 */
export function montgomeryMultiplicationSteps(): DPFrame[] {
  const a = MONTGOMERY_A;
  const b = MONTGOMERY_B;
  const n = MONTGOMERY_N;
  const R = 32;

  const aMont = (a * R) % n;
  const bMont = (b * R) % n;
  const product = aMont * bMont;
  const nInverse = montgomeryExtGcd(n, R);
  const rInverse = montgomeryExtGcd(R, n);
  const m = (product * ((R - nInverse) % R)) % R;
  const t = (product + m * n) / R;
  const resultMont = t >= n ? t - n : t;
  const result = (resultMont * rInverse) % n;
  const expected = (a * b) % n;

  const cols = 8;
  const table: (number | null)[][] = [new Array(cols).fill(null)];
  const state: DPCellState[][] = [new Array(cols).fill("idle")];
  const values = [aMont, bMont, product, m, t, resultMont, result, expected];
  const descriptions = [
    `a=${a}をモンゴメリ表現に変換: a' = a×R mod n = ${a}×${R} mod ${n} = ${aMont}`,
    `b=${b}をモンゴメリ表現に変換: b' = b×R mod n = ${b}×${R} mod ${n} = ${bMont}`,
    `モンゴメリ表現同士を単純に乗算(まだ簡約前): a'×b' = ${aMont}×${bMont} = ${product}`,
    `REDC簡約の準備: m = (a'b')×(-n)^-1 mod R = ${m}`,
    `t = (a'b' + m×n) / R = ${t}(除算はRが2の冪なのでビットシフトで実現可能)`,
    `t≥nならnを引く: モンゴメリ表現での積 = ${resultMont}`,
    `モンゴメリ表現から通常表現に戻す: 結果 = ${resultMont}×R^-1 mod n = ${result}`,
    `検算: 通常のa×b mod n = ${a}×${b} mod ${n} = ${expected}(一致)`,
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `モンゴメリ乗算を開始。a=${a}, b=${b}, n=${n}について、除算を使わずa×b mod nを計算する(基数R=${R})`,
    ),
  );

  for (let c = 0; c < cols; c++) {
    table[0][c] = values[c];
    state[0][c] = "pivot";
    frames.push(snapshot(descriptions[c]));
    state[0][c] = "settled";
  }

  frames.push(snapshot(`計算完了。モンゴメリ乗算の結果${result}は通常計算の結果${expected}と一致`));
  return frames;
}

export const ELGAMAL_P = 23;
export const ELGAMAL_G = 5;
export const ELGAMAL_X = 6;
export const ELGAMAL_K = 3;
export const ELGAMAL_M = 10;

/**
 * ElGamal暗号のステップ列を生成する。離散対数問題の困難さを安全性の根拠とする
 * 公開鍵暗号方式——秘密鍵xから公開鍵y=g^x mod pを計算し、暗号化のたびに
 * 新しい乱数kを選んでc1=g^k mod p、c2=m×y^k mod pという2つの値を暗号文とする。
 * 同じ平文でも毎回異なるkを使うため暗号文が変わる(確率的暗号化)点がRSAと異なる。
 */
export function elgamalEncryptionSteps(): DPFrame[] {
  const p = ELGAMAL_P;
  const g = ELGAMAL_G;
  const x = ELGAMAL_X;
  const k = ELGAMAL_K;
  const m = ELGAMAL_M;

  const y = fermatModPow(g, x, p);
  const c1 = fermatModPow(g, k, p);
  const s = fermatModPow(y, k, p);
  const c2 = (m * s) % p;
  const sInverse = montgomeryExtGcd(s, p);
  const decrypted = (c2 * sInverse) % p;

  const cols = 7;
  const table: (number | null)[][] = [new Array(cols).fill(null)];
  const state: DPCellState[][] = [new Array(cols).fill("idle")];
  const values = [y, c1, s, c2, sInverse, decrypted, m];
  const descriptions = [
    `公開鍵を生成: y = g^x mod p = ${g}^${x} mod ${p} = ${y}(秘密鍵x=${x}は公開しない)`,
    `暗号化(1): 乱数k=${k}を選び c1 = g^k mod p = ${g}^${k} mod ${p} = ${c1}`,
    `暗号化(2): 共有シークレット s = y^k mod p = ${y}^${k} mod ${p} = ${s}`,
    `暗号化(3): c2 = m×s mod p = ${m}×${s} mod ${p} = ${c2}(暗号文は(c1,c2)=(${c1},${c2}))`,
    `復号(1): 秘密鍵xを使い s' = c1^x mod p = ${c1}^${x} mod ${p} = ${s}(暗号化時のsと一致するsの逆元を求める)`,
    `復号(2): m' = c2×s'^-1 mod p = ${c2}×${sInverse} mod ${p} = ${decrypted}`,
    `検算: 元の平文m=${m}`,
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `ElGamal暗号を開始。p=${p}, g=${g}を公開パラメータとして、平文m=${m}を暗号化・復号する`,
    ),
  );

  for (let c = 0; c < cols; c++) {
    table[0][c] = values[c];
    state[0][c] = "pivot";
    frames.push(snapshot(descriptions[c]));
    state[0][c] = "settled";
  }

  frames.push(snapshot(`計算完了。復号結果m'=${decrypted}は元の平文m=${m}と一致`));
  return frames;
}

export type ECPoint = { x: number; y: number } | null;
export const EC_A = 2;
export const EC_B = 2;
export const EC_P = 17;
export const EC_BASE_POINT: ECPoint = { x: 5, y: 1 };
export const EC_SCALAR = 9;

function ecModInverse(a: number, m: number): number {
  const aMod = ((a % m) + m) % m;
  for (let x = 1; x < m; x++) {
    if ((aMod * x) % m === 1) return x;
  }
  return 1;
}

function ecAdd(P: ECPoint, Q: ECPoint, a: number, p: number): ECPoint {
  if (P === null) return Q;
  if (Q === null) return P;
  let lambda: number;
  if (P.x === Q.x && P.y === Q.y) {
    lambda = ((3 * P.x * P.x + a) * ecModInverse(2 * P.y, p)) % p;
  } else {
    if (P.x === Q.x) return null;
    lambda = ((Q.y - P.y) * ecModInverse(Q.x - P.x, p)) % p;
  }
  lambda = ((lambda % p) + p) % p;
  const xR = ((lambda * lambda - P.x - Q.x) % p + p) % p;
  const yR = ((lambda * (P.x - xR) - P.y) % p + p) % p;
  return { x: xR, y: yR };
}

/**
 * 楕円曲線暗号における「スカラー倍算」kPのステップ列を生成する。曲線
 * y²=x³+ax+b (mod p)上の点Pに対し、P+P+...+P(k回)を素朴に繰り返すのではなく、
 * モジュラー累乗のdouble-and-add法と同じ発想で、2倍算と加算をkの2進数表現に
 * 沿って組み合わせることでO(log k)回の演算に抑える。離散対数問題(kPからkを
 * 逆算する困難さ)がECCの安全性の根拠になっている。
 */
export function ellipticCurveCryptographySteps(): DPFrame[] {
  const a = EC_A;
  const p = EC_P;
  const P = EC_BASE_POINT;
  const k = EC_SCALAR;

  type Row = { bit: number; result: ECPoint; doubled: ECPoint };
  const rows: Row[] = [];
  let result: ECPoint = null;
  let addend: ECPoint = P;
  let kBits = k;
  while (kBits > 0) {
    const bit = kBits & 1;
    if (bit === 1) result = ecAdd(result, addend, a, p);
    addend = ecAdd(addend, addend, a, p);
    rows.push({ bit, result, doubled: addend });
    kBits = Math.floor(kBits / 2);
  }

  const cols = rows.length;
  const fmt = (pt: ECPoint) => (pt === null ? 0 : pt.x * 1000 + pt.y);
  const table: (number | null)[][] = [
    new Array(cols).fill(null),
    new Array(cols).fill(null),
    new Array(cols).fill(null),
  ];
  const state: DPCellState[][] = [
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `楕円曲線スカラー倍算を開始。曲線y²=x³+${a}x+${EC_B} (mod ${p})上の点P=(${P?.x},${P?.y})について、k=${k}倍のkPをdouble-and-add法で計算する(2進数表現: ${k.toString(2)})`,
    ),
  );

  for (let c = 0; c < cols; c++) {
    table[0][c] = rows[c].bit;
    table[1][c] = fmt(rows[c].result);
    table[2][c] = fmt(rows[c].doubled);
    state[0][c] = "pivot";
    state[1][c] = "pivot";
    state[2][c] = "pivot";
    const r = rows[c].result;
    frames.push(
      snapshot(
        `ビット${c}=${rows[c].bit}: ` +
          (rows[c].bit === 1 ? `結果に加算 → result=(${r?.x},${r?.y})` : "このビットは0なので加算はスキップ") +
          `、次に使う点を2倍にする`,
      ),
    );
    state[0][c] = "settled";
    state[1][c] = "settled";
    state[2][c] = "settled";
  }

  const finalResult = rows[cols - 1].result;
  frames.push(snapshot(`計算完了。${k}P = (${finalResult?.x}, ${finalResult?.y})`));
  return frames;
}

export const TOOM_COOK_X = 123456;
export const TOOM_COOK_Y = 654321;

/**
 * Toom-Cook法(Toom-3)のステップ列を生成する。カラツバ法が2分割・3回の掛け算
 * だったのに対し、Toom-3は数を3つの部分(次数2の多項式の係数)に分割し、
 * 5つの評価点(0, 1, -1, 2, ∞)での多項式値を計算して5回の掛け算で済ませ、
 * 補間によって元の積を復元する——分割数を増やすほど漸近的な計算量が改善する
 * (一般化したToom-k法の考え方が、後のFFTベースの乗算にもつながる)。
 */
export function toomCookMultiplicationSteps(): DPFrame[] {
  const x = TOOM_COOK_X;
  const y = TOOM_COOK_Y;
  const base = 100;
  const m2 = Math.floor(x / (base * base));
  const m1 = Math.floor((x % (base * base)) / base);
  const m0 = x % base;
  const n2 = Math.floor(y / (base * base));
  const n1 = Math.floor((y % (base * base)) / base);
  const n0 = y % base;

  const evalPoly = (a2: number, a1: number, a0: number, t: number) => a2 * t * t + a1 * t + a0;

  const p0x = evalPoly(m2, m1, m0, 0);
  const p1x = evalPoly(m2, m1, m0, 1);
  const pm1x = evalPoly(m2, m1, m0, -1);
  const p2x = evalPoly(m2, m1, m0, 2);
  const pinfx = m2;

  const p0y = evalPoly(n2, n1, n0, 0);
  const p1y = evalPoly(n2, n1, n0, 1);
  const pm1y = evalPoly(n2, n1, n0, -1);
  const p2y = evalPoly(n2, n1, n0, 2);
  const pinfy = n2;

  const r0 = p0x * p0y;
  const r1 = p1x * p1y;
  const rm1 = pm1x * pm1y;
  const r2 = p2x * p2y;
  const rinf = pinfx * pinfy;

  const result = x * y;

  const cols = 5;
  const table: (number | null)[][] = [new Array(cols).fill(null), new Array(cols).fill(null)];
  const state: DPCellState[][] = [new Array(cols).fill("idle"), new Array(cols).fill("idle")];
  const points = ["0", "1", "-1", "2", "∞"];
  const xVals = [p0x, p1x, pm1x, p2x, pinfx];
  const yVals = [p0y, p1y, pm1y, p2y, pinfy];
  const productVals = [r0, r1, rm1, r2, rinf];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `Toom-Cook法(Toom-3)を開始。${x} × ${y} を、各数を3つの部分(基数${base}進表現、m2=${m2},m1=${m1},m0=${m0} / n2=${n2},n1=${n1},n0=${n0})に分割し、5つの評価点での乗算に帰着させる`,
    ),
  );

  for (let c = 0; c < cols; c++) {
    table[0][c] = xVals[c];
    table[1][c] = yVals[c];
    state[0][c] = "pivot";
    state[1][c] = "pivot";
    frames.push(
      snapshot(
        `評価点t=${points[c]}: 分割多項式を評価してP(${points[c]})×Q(${points[c]}) = ${xVals[c]}×${yVals[c]} = ${productVals[c]}(この積が1回の掛け算に相当)`,
      ),
    );
    state[0][c] = "settled";
    state[1][c] = "settled";
  }

  frames.push(
    snapshot(
      `計算完了。5つの評価点での積から補間して元の桁位置に組み立てると、${x} × ${y} = ${result}(素朴な筆算のO(n²)よりも高速なO(n^1.465)を漸近的に達成)`,
    ),
  );
  return frames;
}

export const GAUSSIAN_ELIMINATION_MATRIX: number[][] = [
  [2, 1, -1, 8],
  [-3, -1, 2, -11],
  [-2, 1, 2, -3],
];

/**
 * ガウスの消去法のステップ列を生成する。連立一次方程式を拡大係数行列で表し、
 * 各列について「ピボット行より下の行から、ピボットとの倍率を引いて0にする」
 * 前進消去を繰り返すことで上三角行列に変形し、最後に後退代入で解を求める。
 */
export function gaussianEliminationSteps(): DPFrame[] {
  const n = GAUSSIAN_ELIMINATION_MATRIX.length;
  const mat = GAUSSIAN_ELIMINATION_MATRIX.map((row) => [...row]);

  const frames: DPFrame[] = [];
  const state: DPCellState[][] = mat.map((row) => row.map(() => "idle" as DPCellState));
  const snapshot = (description: string): DPFrame => ({
    table: mat.map((row, r) => row.map((value, c) => ({ value: Number(value.toFixed(3)), state: state[r][c] }))),
    description,
  });

  frames.push(snapshot(`ガウスの消去法を開始。拡大係数行列を前進消去で上三角化する`));

  for (let pivot = 0; pivot < n; pivot++) {
    for (let r = 0; r < n + 1; r++) state[pivot][r] = "pivot";
    frames.push(snapshot(`${pivot + 1}行目をピボット行とする(ピボット値=${mat[pivot][pivot].toFixed(3)})`));
    for (let row = pivot + 1; row < n; row++) {
      const factor = mat[row][pivot] / mat[pivot][pivot];
      for (let col = pivot; col < n + 1; col++) {
        mat[row][col] -= factor * mat[pivot][col];
      }
      state[row][pivot] = "settled";
      frames.push(
        snapshot(`${row + 1}行目 -= (${factor.toFixed(3)}) × ${pivot + 1}行目 → ${row + 1}行目の${pivot + 1}列目が0になる`),
      );
    }
    for (let r = 0; r < n + 1; r++) state[pivot][r] = "settled";
  }

  const x = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = mat[row][n];
    for (let col = row + 1; col < n; col++) sum -= mat[row][col] * x[col];
    x[row] = sum / mat[row][row];
  }

  frames.push(snapshot(`後退代入で解を求める: (x,y,z) = (${x.map((v) => v.toFixed(3)).join(", ")})`));
  return frames;
}

export const LU_DECOMPOSITION_MATRIX: number[][] = [
  [4, 3, 2],
  [8, 9, 5],
  [4, 5, 7],
];

/**
 * LU分解(Doolittle法、ピボット交換なし)のステップ列を生成する。行列Aを
 * 下三角行列L(対角成分は1)と上三角行列Uの積に分解する。ガウスの消去法と
 * 同じ前進消去の過程で使った倍率をLに、消去後の行をUにそのまま記録することで、
 * 「一度の消去計算でLとUの両方が同時に得られる」という関係を可視化する。
 */
export function luDecompositionSteps(): DPFrame[] {
  const n = LU_DECOMPOSITION_MATRIX.length;
  const A = LU_DECOMPOSITION_MATRIX;
  const L: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const U: number[][] = A.map((row) => [...row]);

  const combined: number[][] = Array.from({ length: n }, () => new Array(n).fill(null as unknown as number));
  const state: DPCellState[][] = Array.from({ length: n }, () => new Array(n).fill("idle" as DPCellState));

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: combined.map((row, r) =>
      row.map((value, c) => ({ value: value === null ? null : Number(value.toFixed(3)), state: state[r][c] })),
    ),
    description,
  });

  frames.push(snapshot(`LU分解を開始。A(3×3)を下三角L(対角=1)と上三角Uに分解する(1つのマス目にL[i][j](i>j)かU[i][j](i≤j)を記録)`));

  for (let i = 0; i < n; i++) {
    combined[i][i] = U[i][i];
    state[i][i] = "pivot";
    for (let j = i + 1; j < n; j++) {
      combined[i][j] = U[i][j];
      state[i][j] = "pivot";
    }
    frames.push(snapshot(`U[${i}]行目を確定: [${U[i].map((v) => v.toFixed(2)).join(", ")}]`));
    for (let r = i; r <= n; r++) if (r < n) state[i][r] = "settled";

    for (let k = i + 1; k < n; k++) {
      const factor = U[k][i] / U[i][i];
      L[k][i] = factor;
      combined[k][i] = factor;
      state[k][i] = "pivot";
      frames.push(snapshot(`L[${k}][${i}] = U[${k}][${i}]/U[${i}][${i}] = ${factor.toFixed(3)}(この倍率で${k}行目を消去する)`));
      state[k][i] = "settled";
      for (let col = i; col < n; col++) U[k][col] -= factor * U[i][col];
    }
  }

  const reconstructed: number[][] = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => {
      let sum = 0;
      for (let k = 0; k < n; k++) sum += L[r][k] * U[k][c];
      return Number(sum.toFixed(3));
    }),
  );
  const matches = reconstructed.every((row, r) => row.every((v, c) => Math.abs(v - A[r][c]) < 1e-6));

  frames.push(
    snapshot(
      `計算完了。L×U${matches ? "は元のA行列と一致(検算OK)" : "の検算に誤差あり"}`,
    ),
  );
  return frames;
}

export const LEAST_SQUARES_POINTS: { x: number; y: number }[] = [
  { x: 1, y: 2 },
  { x: 2, y: 3 },
  { x: 3, y: 5 },
  { x: 4, y: 4 },
  { x: 5, y: 6 },
];

/**
 * 最小二乗法による直線回帰のステップ列を生成する。データ点群に対し、
 * 残差の2乗和を最小化する直線y=mx+bを、正規方程式(Σx, Σy, Σx², Σxyから
 * 導かれる連立方程式)を解くことで直接求める——反復法を使わずに閉じた式で
 * 最適解に到達できる、最小二乗法の特徴を表す。
 */
export function leastSquaresSteps(): DPFrame[] {
  const points = LEAST_SQUARES_POINTS;
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const b = (sumY - m * sumX) / n;
  const residualSumSquares = points.reduce((s, p) => s + (p.y - (m * p.x + b)) ** 2, 0);

  const cols = 7;
  const table: (number | null)[][] = [new Array(cols).fill(null)];
  const state: DPCellState[][] = [new Array(cols).fill("idle")];
  const values = [sumX, sumY, sumXY, sumX2, Number(m.toFixed(4)), Number(b.toFixed(4)), Number(residualSumSquares.toFixed(4))];
  const descriptions = [
    `Σx = ${sumX}`,
    `Σy = ${sumY}`,
    `Σxy = ${sumXY}`,
    `Σx² = ${sumX2}`,
    `傾き m = (nΣxy - ΣxΣy) / (nΣx² - (Σx)²) = ${m.toFixed(4)}`,
    `切片 b = (Σy - mΣx) / n = ${b.toFixed(4)}`,
    `残差平方和 = ${residualSumSquares.toFixed(4)}(この直線が全ての直線の中で残差平方和を最小にする)`,
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(`最小二乗法による直線回帰を開始。${n}個のデータ点に最も当てはまる直線y=mx+bを求める`),
  );

  for (let c = 0; c < cols; c++) {
    table[0][c] = values[c];
    state[0][c] = "pivot";
    frames.push(snapshot(descriptions[c]));
    state[0][c] = "settled";
  }

  frames.push(snapshot(`計算完了。y = ${m.toFixed(4)}x + ${b.toFixed(4)}`));
  return frames;
}

export const POWER_ITERATION_MATRIX: number[][] = [
  [2, 1],
  [1, 2],
];
export const POWER_ITERATION_INITIAL: number[] = [1, 0];
export const POWER_ITERATION_STEPS = 6;

/**
 * べき乗法のステップ列を生成する。行列Aとランダムな初期ベクトルv0から始め、
 * v_{k+1} = A v_k / ||A v_k|| を繰り返すと、v_kは支配的固有値(絶対値最大の固有値)
 * に対応する固有ベクトルの方向に収束していく——レイリー商 v^T A v によって
 * 固有値自体の推定値も同時に得られる、反復法による固有値計算の基本形。
 */
export function powerIterationSteps(): DPFrame[] {
  const A = POWER_ITERATION_MATRIX;
  let v = [...POWER_ITERATION_INITIAL];
  const iterations = POWER_ITERATION_STEPS;

  type Row = { vx: number; vy: number; eigenvalueEstimate: number };
  const rows: Row[] = [];
  for (let iter = 0; iter < iterations; iter++) {
    const av = [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]];
    const norm = Math.sqrt(av[0] * av[0] + av[1] * av[1]);
    v = [av[0] / norm, av[1] / norm];
    const avNext = [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]];
    const eigenvalueEstimate = v[0] * avNext[0] + v[1] * avNext[1];
    rows.push({ vx: Number(v[0].toFixed(4)), vy: Number(v[1].toFixed(4)), eigenvalueEstimate: Number(eigenvalueEstimate.toFixed(4)) });
  }

  const cols = rows.length;
  const table: (number | null)[][] = [
    new Array(cols).fill(null),
    new Array(cols).fill(null),
    new Array(cols).fill(null),
  ];
  const state: DPCellState[][] = [
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(`べき乗法を開始。行列A=[[2,1],[1,2]]の支配的固有値・固有ベクトルを、v0=(1,0)から反復して求める`),
  );

  for (let c = 0; c < cols; c++) {
    table[0][c] = rows[c].vx;
    table[1][c] = rows[c].vy;
    table[2][c] = rows[c].eigenvalueEstimate;
    state[0][c] = "pivot";
    state[1][c] = "pivot";
    state[2][c] = "pivot";
    frames.push(
      snapshot(`反復${c + 1}: v=(${rows[c].vx}, ${rows[c].vy})(正規化済み)、固有値推定=${rows[c].eigenvalueEstimate}`),
    );
    state[0][c] = "settled";
    state[1][c] = "settled";
    state[2][c] = "settled";
  }

  frames.push(
    snapshot(`計算完了。支配的固有値≈3(真の固有値は3と1)、固有ベクトルは(1,1)/√2の方向に収束`),
  );
  return frames;
}

export const CONVOLUTION_SIGNAL: number[] = [1, 2, 3];
export const CONVOLUTION_KERNEL: number[] = [0, 1, 0.5];

/**
 * 離散畳み込みのステップ列を生成する。信号列とカーネル列について、カーネルを
 * 反転させながら信号上をスライドさせ、重なった位置同士の積の総和を出力の
 * 各点とする——信号処理におけるフィルタリングやCNNの畳み込み層の基礎となる演算。
 */
export function discreteConvolutionSteps(): DPFrame[] {
  const signal = CONVOLUTION_SIGNAL;
  const kernel = CONVOLUTION_KERNEL;
  const outputLength = signal.length + kernel.length - 1;
  const output: number[] = [];
  const terms: string[] = [];

  for (let i = 0; i < outputLength; i++) {
    let sum = 0;
    const parts: string[] = [];
    for (let k = 0; k < kernel.length; k++) {
      const signalIndex = i - k;
      if (signalIndex >= 0 && signalIndex < signal.length) {
        sum += signal[signalIndex] * kernel[k];
        parts.push(`s[${signalIndex}]×k[${k}]`);
      }
    }
    output.push(Number(sum.toFixed(3)));
    terms.push(parts.join(" + "));
  }

  const cols = outputLength;
  const table: (number | null)[][] = [new Array(cols).fill(null)];
  const state: DPCellState[][] = [new Array(cols).fill("idle")];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `離散畳み込みを開始。信号[${signal.join(", ")}]とカーネル[${kernel.join(", ")}]の畳み込みを計算する`,
    ),
  );

  for (let c = 0; c < cols; c++) {
    table[0][c] = output[c];
    state[0][c] = "pivot";
    frames.push(snapshot(`出力[${c}] = ${terms[c]} = ${output[c]}`));
    state[0][c] = "settled";
  }

  frames.push(snapshot(`計算完了。畳み込み結果 = [${output.join(", ")}]`));
  return frames;
}

export const QR_DECOMPOSITION_A1: [number, number] = [3, 4];
export const QR_DECOMPOSITION_A2: [number, number] = [1, 0];

/**
 * QR分解(グラム・シュミット法)のステップ列を生成する。行列の列ベクトルを
 * 直交化していくことで、元の行列Aを直交行列Q(各列が単位直交ベクトル)と
 * 上三角行列Rの積に分解する——最小二乗法の数値的に安定した解法や、
 * 固有値計算(QRアルゴリズム)の基礎として使われる。
 */
export function qrDecompositionSteps(): DPFrame[] {
  const a1 = QR_DECOMPOSITION_A1;
  const a2 = QR_DECOMPOSITION_A2;

  const r11 = Math.sqrt(a1[0] ** 2 + a1[1] ** 2);
  const q1: [number, number] = [a1[0] / r11, a1[1] / r11];
  const r12 = a2[0] * q1[0] + a2[1] * q1[1];
  const a2Orth: [number, number] = [a2[0] - r12 * q1[0], a2[1] - r12 * q1[1]];
  const r22 = Math.sqrt(a2Orth[0] ** 2 + a2Orth[1] ** 2);
  const q2: [number, number] = [a2Orth[0] / r22, a2Orth[1] / r22];

  const cols = 6;
  const table: (number | null)[][] = [new Array(cols).fill(null), new Array(cols).fill(null)];
  const state: DPCellState[][] = [new Array(cols).fill("idle"), new Array(cols).fill("idle")];
  const rowA = [Number(r11.toFixed(4)), Number(q1[0].toFixed(4)), Number(r12.toFixed(4)), Number(a2Orth[0].toFixed(4)), Number(r22.toFixed(4)), Number(q2[0].toFixed(4))];
  const rowB = [0, Number(q1[1].toFixed(4)), 0, Number(a2Orth[1].toFixed(4)), 0, Number(q2[1].toFixed(4))];
  const descriptions = [
    `r11 = ||a1|| = √(${a1[0]}²+${a1[1]}²) = ${r11.toFixed(4)}`,
    `q1 = a1 / r11 = (${q1[0].toFixed(4)}, ${q1[1].toFixed(4)})(a1方向の単位ベクトル)`,
    `r12 = a2・q1 = ${r12.toFixed(4)}(a2のq1方向への射影の大きさ)`,
    `a2からq1成分を除去: a2' = a2 - r12×q1 = (${a2Orth[0].toFixed(4)}, ${a2Orth[1].toFixed(4)})`,
    `r22 = ||a2'|| = ${r22.toFixed(4)}`,
    `q2 = a2' / r22 = (${q2[0].toFixed(4)}, ${q2[1].toFixed(4)})(q1と直交する単位ベクトル)`,
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(`QR分解(グラム・シュミット法)を開始。列ベクトルa1=(${a1[0]},${a1[1]}), a2=(${a2[0]},${a2[1]})を直交化する`),
  );

  for (let c = 0; c < cols; c++) {
    table[0][c] = rowA[c];
    table[1][c] = rowB[c];
    state[0][c] = "pivot";
    state[1][c] = "pivot";
    frames.push(snapshot(descriptions[c]));
    state[0][c] = "settled";
    state[1][c] = "settled";
  }

  frames.push(
    snapshot(`計算完了。Q=[[${q1[0].toFixed(3)},${q2[0].toFixed(3)}],[${q1[1].toFixed(3)},${q2[1].toFixed(3)}]], R=[[${r11.toFixed(3)},${r12.toFixed(3)}],[0,${r22.toFixed(3)}]]`),
  );
  return frames;
}

export const MULTIVARIATE_NEWTON_START: [number, number] = [1, 1];
export const MULTIVARIATE_NEWTON_ITERATIONS = 5;

function multivariateNewtonF(x: number, y: number): [number, number] {
  return [x * x + y * y - 4, x - y];
}

/**
 * 多変数ニュートン法のステップ列を生成する。連立非線形方程式F(x,y)=0を、
 * 1変数の場合の「接線」を「ヤコビ行列による線形近似」に一般化して解く——
 * 各反復でヤコビ行列の逆行列を使い、次の推定値 = 現在の推定値 - J^-1 F(現在の推定値)
 * を計算することを繰り返し、2次収束で真の解に近づく。
 */
export function multivariateNewtonMethodSteps(): DPFrame[] {
  let x = MULTIVARIATE_NEWTON_START[0];
  let y = MULTIVARIATE_NEWTON_START[1];
  const iterations = MULTIVARIATE_NEWTON_ITERATIONS;

  type Row = { x: number; y: number; f1: number; f2: number };
  const rows: Row[] = [{ x: Number(x.toFixed(5)), y: Number(y.toFixed(5)), f1: 0, f2: 0 }];

  for (let iter = 0; iter < iterations; iter++) {
    const [f1, f2] = multivariateNewtonF(x, y);
    const j = [
      [2 * x, 2 * y],
      [1, -1],
    ];
    const det = j[0][0] * j[1][1] - j[0][1] * j[1][0];
    const jInv = [
      [j[1][1] / det, -j[0][1] / det],
      [-j[1][0] / det, j[0][0] / det],
    ];
    const dx = jInv[0][0] * f1 + jInv[0][1] * f2;
    const dy = jInv[1][0] * f1 + jInv[1][1] * f2;
    x = x - dx;
    y = y - dy;
    const [newF1, newF2] = multivariateNewtonF(x, y);
    rows.push({
      x: Number(x.toFixed(5)),
      y: Number(y.toFixed(5)),
      f1: Number(newF1.toFixed(5)),
      f2: Number(newF2.toFixed(5)),
    });
  }

  const cols = rows.length;
  const table: (number | null)[][] = [
    new Array(cols).fill(null),
    new Array(cols).fill(null),
    new Array(cols).fill(null),
    new Array(cols).fill(null),
  ];
  const state: DPCellState[][] = [
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `多変数ニュートン法を開始。連立方程式 x²+y²-4=0, x-y=0 を、初期値(${MULTIVARIATE_NEWTON_START[0]},${MULTIVARIATE_NEWTON_START[1]})から解く(真の解: x=y=√2≈1.41421)`,
    ),
  );

  for (let c = 0; c < cols; c++) {
    table[0][c] = rows[c].x;
    table[1][c] = rows[c].y;
    table[2][c] = rows[c].f1;
    table[3][c] = rows[c].f2;
    state[0][c] = "pivot";
    state[1][c] = "pivot";
    state[2][c] = "pivot";
    state[3][c] = "pivot";
    frames.push(
      snapshot(
        c === 0
          ? `初期値: x=${rows[c].x}, y=${rows[c].y}`
          : `反復${c}: x=${rows[c].x}, y=${rows[c].y}(F=(${rows[c].f1}, ${rows[c].f2}))`,
      ),
    );
    state[0][c] = "settled";
    state[1][c] = "settled";
    state[2][c] = "settled";
    state[3][c] = "settled";
  }

  const finalRow = rows[rows.length - 1];
  frames.push(snapshot(`計算完了。x=${finalRow.x}, y=${finalRow.y}(√2≈1.41421と一致)`));
  return frames;
}

export const NEEDLEMAN_WUNSCH_A = "GCATGCU";
export const NEEDLEMAN_WUNSCH_B = "GATTACA";
export const NEEDLEMAN_WUNSCH_MATCH = 1;
export const NEEDLEMAN_WUNSCH_MISMATCH = -1;
export const NEEDLEMAN_WUNSCH_GAP = -2;

/**
 * Needleman-Wunsch法(大域アラインメント)のDPテーブルを可視化する。編集距離が
 * 「操作回数の最小化」だったのに対し、こちらは「一致+ミスマッチ+ギャップの
 * スコアの最大化」を目的とする——配列全体を端から端まで対応づける大域的な
 * アラインメントを、2本の配列の全ての位置の組で最適スコアを積み上げて求める。
 */
export function needlemanWunschSteps(): DPFrame[] {
  const a = NEEDLEMAN_WUNSCH_A;
  const b = NEEDLEMAN_WUNSCH_B;
  const match = NEEDLEMAN_WUNSCH_MATCH;
  const mismatch = NEEDLEMAN_WUNSCH_MISMATCH;
  const gap = NEEDLEMAN_WUNSCH_GAP;
  const n = a.length;
  const m = b.length;
  const dp: (number | null)[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null));
  for (let i = 0; i <= n; i++) dp[i][0] = i * gap;
  for (let j = 0; j <= m; j++) dp[0][j] = j * gap;

  const settled = new Set<string>();
  for (let i = 0; i <= n; i++) settled.add(`${i},0`);
  for (let j = 0; j <= m; j++) settled.add(`0,${j}`);

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

  frames.push(
    snapshot(new Map(), `Needleman-Wunsch法を開始。配列A="${a}"とB="${b}"の大域アラインメントを求める(一致=+${match}、不一致=${mismatch}、ギャップ=${gap})`),
  );

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const highlight = new Map<string, "comparing" | "pivot">();
      highlight.set(`${i - 1},${j - 1}`, "comparing");
      highlight.set(`${i - 1},${j}`, "comparing");
      highlight.set(`${i},${j - 1}`, "comparing");
      const diag = dp[i - 1][j - 1]! + (a[i - 1] === b[j - 1] ? match : mismatch);
      const up = dp[i - 1][j]! + gap;
      const left = dp[i][j - 1]! + gap;
      const value = Math.max(diag, up, left);
      frames.push(
        snapshot(
          highlight,
          `dp[${i}][${j}]候補: 斜め(${a[i - 1]}対${b[j - 1]})=${diag}, 上(ギャップ)=${up}, 左(ギャップ)=${left} → 最大を採用`,
        ),
      );
      dp[i][j] = value;
      settled.add(`${i},${j}`);
      frames.push(snapshot(new Map([[`${i},${j}`, "pivot"]]), `dp[${i}][${j}] = ${value} を確定`));
    }
  }

  frames.push(snapshot(new Map(), `計算完了。最適な大域アラインメントスコアは${dp[n][m]}`));
  return frames;
}

export const SMITH_WATERMAN_A = "ACACACTA";
export const SMITH_WATERMAN_B = "AGCACACA";
export const SMITH_WATERMAN_MATCH = 2;
export const SMITH_WATERMAN_MISMATCH = -1;
export const SMITH_WATERMAN_GAP = -1;

/**
 * Smith-Waterman法(局所アラインメント)のDPテーブルを可視化する。Needleman-Wunsch法
 * との違いはただ1つ——スコアが負になったら0にリセットする(それ以上遡らず新しい
 * アラインメントの開始点とみなす)——だけだが、この工夫により配列全体ではなく
 * 「最もよく似た部分配列同士」を見つけ出せるようになる。
 */
export function smithWatermanSteps(): DPFrame[] {
  const a = SMITH_WATERMAN_A;
  const b = SMITH_WATERMAN_B;
  const match = SMITH_WATERMAN_MATCH;
  const mismatch = SMITH_WATERMAN_MISMATCH;
  const gap = SMITH_WATERMAN_GAP;
  const n = a.length;
  const m = b.length;
  const dp: (number | null)[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null));
  for (let i = 0; i <= n; i++) dp[i][0] = 0;
  for (let j = 0; j <= m; j++) dp[0][j] = 0;

  const settled = new Set<string>();
  for (let i = 0; i <= n; i++) settled.add(`${i},0`);
  for (let j = 0; j <= m; j++) settled.add(`0,${j}`);

  let maxScore = 0;
  let maxI = 0;
  let maxJ = 0;

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

  frames.push(
    snapshot(new Map(), `Smith-Waterman法を開始。配列A="${a}"とB="${b}"の局所アラインメントを求める(一致=+${match}、不一致=${mismatch}、ギャップ=${gap}、負のスコアは0にリセット)`),
  );

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const highlight = new Map<string, "comparing" | "pivot">();
      highlight.set(`${i - 1},${j - 1}`, "comparing");
      highlight.set(`${i - 1},${j}`, "comparing");
      highlight.set(`${i},${j - 1}`, "comparing");
      const diag = dp[i - 1][j - 1]! + (a[i - 1] === b[j - 1] ? match : mismatch);
      const up = dp[i - 1][j]! + gap;
      const left = dp[i][j - 1]! + gap;
      const value = Math.max(0, diag, up, left);
      frames.push(
        snapshot(
          highlight,
          `dp[${i}][${j}]候補: 斜め(${a[i - 1]}対${b[j - 1]})=${diag}, 上=${up}, 左=${left}, 0 → 最大を採用(負なら0)`,
        ),
      );
      dp[i][j] = value;
      settled.add(`${i},${j}`);
      if (value > maxScore) {
        maxScore = value;
        maxI = i;
        maxJ = j;
      }
      frames.push(snapshot(new Map([[`${i},${j}`, "pivot"]]), `dp[${i}][${j}] = ${value} を確定`));
    }
  }

  frames.push(
    snapshot(
      new Map([[`${maxI},${maxJ}`, "pivot"]]),
      `計算完了。最高スコア${maxScore}がdp[${maxI}][${maxJ}]で見つかった(この位置が最もよく似た部分配列の終端)`,
    ),
  );
  return frames;
}

export const NUSSINOV_RNA = "GGGAAAUCC";

function nussinovCanPair(x: string, y: string): boolean {
  return (x === "G" && y === "C") || (x === "C" && y === "G") || (x === "A" && y === "U") || (x === "U" && y === "A");
}

/**
 * ヌッシノフのアルゴリズムのステップ列を生成する。RNA配列が取りうる二次構造
 * (どの塩基とどの塩基が水素結合でペアを組むか)のうち、ペア数が最大になる構造を
 * 区間DPで求める——行列連鎖乗算と同じ「区間を分割点で2つに割る」骨格を持つが、
 * 分割点で新たに1つの塩基対ができるかどうかも同時に考慮する点が異なる。
 */
export function nussinovAlgorithmSteps(): DPFrame[] {
  const rna = NUSSINOV_RNA;
  const n = rna.length;
  const dp: (number | null)[][] = Array.from({ length: n }, () => new Array(n).fill(null));
  for (let i = 0; i < n; i++) dp[i][i] = 0;
  if (n > 1) for (let i = 0; i < n - 1; i++) dp[i + 1][i] = 0;
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

  frames.push(snapshot(new Map(), `ヌッシノフのアルゴリズムを開始。RNA配列"${rna}"が形成できる最大の塩基対数を区間DPで求める(G-C, A-Uのみペア可)`));

  for (let length = 2; length <= n; length++) {
    for (let i = 0; i <= n - length; i++) {
      const j = i + length - 1;
      const highlight = new Map<string, "comparing" | "pivot">();
      let best = dp[i + 1] ? dp[i + 1][j] ?? 0 : 0;
      highlight.set(`${i + 1},${j}`, "comparing");
      for (let k = i + 1; k <= j; k++) {
        if (nussinovCanPair(rna[i], rna[k])) {
          const inner = k > i + 1 ? dp[i + 1][k - 1] ?? 0 : 0;
          const outer = k < j ? dp[k + 1][j] ?? 0 : 0;
          highlight.set(`${i + 1},${k - 1}`, "comparing");
          if (k < j) highlight.set(`${k + 1},${j}`, "comparing");
          const candidate = inner + 1 + outer;
          if (candidate > best) best = candidate;
        }
      }
      frames.push(
        snapshot(
          highlight,
          `区間[${i},${j}](塩基${rna[i]}..${rna[j]}): 塩基${rna[i]}を対合させないか、対合可能な位置kで対合させるかを全て試す`,
        ),
      );
      dp[i][j] = best;
      settled.add(`${i},${j}`);
      frames.push(snapshot(new Map([[`${i},${j}`, "pivot"]]), `dp[${i}][${j}] = ${best} を確定`));
    }
  }

  frames.push(snapshot(new Map(), `計算完了。RNA配列"${rna}"が形成できる最大塩基対数は${dp[0][n - 1]}`));
  return frames;
}

export const MSA_SEQUENCES = ["ACGT", "AGT", "ACT"];
export const MSA_MATCH = 1;
export const MSA_MISMATCH = -1;
export const MSA_GAP = -2;

function msaAlign(a: string, b: string): { aligned: string; bAligned: string; score: number } {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i * MSA_GAP;
  for (let j = 0; j <= m; j++) dp[0][j] = j * MSA_GAP;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag = dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? MSA_MATCH : MSA_MISMATCH);
      const up = dp[i - 1][j] + MSA_GAP;
      const left = dp[i][j - 1] + MSA_GAP;
      dp[i][j] = Math.max(diag, up, left);
    }
  }
  let i = n;
  let j = m;
  let aligned = "";
  let bAligned = "";
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? MSA_MATCH : MSA_MISMATCH)) {
      aligned = a[i - 1] + aligned;
      bAligned = b[j - 1] + bAligned;
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + MSA_GAP) {
      aligned = a[i - 1] + aligned;
      bAligned = "-" + bAligned;
      i--;
    } else {
      aligned = "-" + aligned;
      bAligned = b[j - 1] + bAligned;
      j--;
    }
  }
  return { aligned, bAligned, score: dp[n][m] };
}

/**
 * 多重配列アラインメント(簡略版の段階的アラインメント)のステップ列を生成する。
 * 3本以上の配列を同時に最適アラインメントするのはNP困難なため、実務では
 * 「まず最も似た2本をNeedleman-Wunsch法で整列し、その結果に3本目を追加で
 * 整列する」という段階的(progressive)な近似手法が広く使われる。
 */
export function multipleSequenceAlignmentSteps(): DPFrame[] {
  const [seq1, seq2, seq3] = MSA_SEQUENCES;
  const pair12 = msaAlign(seq1, seq2);
  const consensus = pair12.aligned;
  const pairConsensus3 = msaAlign(consensus.replace(/-/g, ""), seq3);

  const cols = 6;
  const table: (number | null)[][] = [new Array(cols).fill(null)];
  const state: DPCellState[][] = [new Array(cols).fill("idle")];
  const values = [pair12.score, 0, 0, pairConsensus3.score, 0, 0];
  const descriptions = [
    `段階1: 配列1="${seq1}"と配列2="${seq2}"をNeedleman-Wunsch法で整列。スコア=${pair12.score}`,
    `整列結果: "${pair12.aligned}" / "${pair12.bAligned}"`,
    `段階2: 段階1の結果(ギャップ除去後)と配列3="${seq3}"を同様に整列する準備`,
    `配列3="${seq3}"との整列。スコア=${pairConsensus3.score}`,
    `整列結果: "${pairConsensus3.aligned}" / "${pairConsensus3.bAligned}"`,
    `3本の配列を段階的に整列する多重配列アラインメントが完成`,
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `多重配列アラインメント(段階的手法)を開始。3本の配列["${seq1}", "${seq2}", "${seq3}"]を段階的に整列する`,
    ),
  );

  for (let c = 0; c < cols; c++) {
    table[0][c] = values[c];
    state[0][c] = "pivot";
    frames.push(snapshot(descriptions[c]));
    state[0][c] = "settled";
  }

  frames.push(
    snapshot(
      `計算完了。配列1="${seq1}", 配列2="${seq2}"の整列: "${pair12.aligned}"/"${pair12.bAligned}"、続いて配列3="${seq3}"を整列: "${pairConsensus3.aligned}"/"${pairConsensus3.bAligned}"`,
    ),
  );
  return frames;
}

export const VITERBI_STATES = ["Rainy", "Sunny"];
export const VITERBI_OBSERVATIONS = ["walk", "shop", "clean"];
export const VITERBI_START_PROB: Record<string, number> = { Rainy: 0.6, Sunny: 0.4 };
export const VITERBI_TRANS_PROB: Record<string, Record<string, number>> = {
  Rainy: { Rainy: 0.7, Sunny: 0.3 },
  Sunny: { Rainy: 0.4, Sunny: 0.6 },
};
export const VITERBI_EMIT_PROB: Record<string, Record<string, number>> = {
  Rainy: { walk: 0.1, shop: 0.4, clean: 0.5 },
  Sunny: { walk: 0.6, shop: 0.3, clean: 0.1 },
};

/**
 * ビタビ法のステップ列を生成する(Wikipediaの「天気(隠れ状態)と行動(観測)」の
 * 教科書的な例)。隠れマルコフモデルにおいて、観測列(行動の並び)から最も
 * 尤もらしい隠れ状態列(天気の並び)を、各時刻・各状態について「そこに至る
 * 経路のうち最大確率」だけを記録するDPで求める——全経路を総当たりするO(状態数^時刻数)を
 * O(状態数²×時刻数)まで削減する。
 */
export function viterbiAlgorithmSteps(): DPFrame[] {
  const states = VITERBI_STATES;
  const obs = VITERBI_OBSERVATIONS;
  const n = states.length;
  const t = obs.length;
  const dp: (number | null)[][] = Array.from({ length: n }, () => new Array(t).fill(null));
  const backptr: number[][] = Array.from({ length: n }, () => new Array(t).fill(0));
  const state: DPCellState[][] = Array.from({ length: n }, () => new Array(t).fill("idle" as DPCellState));

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: dp.map((row, i) => row.map((value, c) => ({ value: value === null ? null : Number(value.toFixed(5)), state: state[i][c] }))),
    description,
  });

  frames.push(
    snapshot(`ビタビ法を開始。観測列[${obs.join(",")}]から最も尤もらしい隠れ状態列(天気)を求める`),
  );

  for (let s = 0; s < n; s++) {
    dp[s][0] = VITERBI_START_PROB[states[s]] * VITERBI_EMIT_PROB[states[s]][obs[0]];
    state[s][0] = "pivot";
  }
  frames.push(snapshot(`時刻0(観測"${obs[0]}"): 各状態の初期確率 = 開始確率×出力確率`));
  for (let s = 0; s < n; s++) state[s][0] = "settled";

  for (let time = 1; time < t; time++) {
    for (let s = 0; s < n; s++) {
      let best = -Infinity;
      let bestPrev = 0;
      for (let prev = 0; prev < n; prev++) {
        const candidate = dp[prev][time - 1]! * VITERBI_TRANS_PROB[states[prev]][states[s]];
        if (candidate > best) {
          best = candidate;
          bestPrev = prev;
        }
      }
      const value = best * VITERBI_EMIT_PROB[states[s]][obs[time]];
      dp[s][time] = value;
      backptr[s][time] = bestPrev;
      state[s][time] = "pivot";
      frames.push(
        snapshot(
          `時刻${time}(観測"${obs[time]}"), 状態${states[s]}: 直前の最良状態は${states[bestPrev]} → 確率=${value.toFixed(5)}`,
        ),
      );
      state[s][time] = "settled";
    }
  }

  let bestFinal = 0;
  for (let s = 1; s < n; s++) if (dp[s][t - 1]! > dp[bestFinal][t - 1]!) bestFinal = s;
  const path: number[] = [bestFinal];
  for (let time = t - 1; time > 0; time--) path.unshift(backptr[path[0]][time]);
  const pathNames = path.map((i) => states[i]);

  frames.push(
    snapshot(`計算完了。最も尤もらしい状態列は[${pathNames.join(", ")}](確率=${dp[bestFinal][t - 1]!.toFixed(5)})`),
  );
  return frames;
}

/**
 * 前向き・後ろ向きアルゴリズムのステップ列を生成する。ビタビ法が「最良の1本の
 * 経路」だけを求めるのに対し、前向き・後ろ向きアルゴリズムは「全ての経路の
 * 確率を足し合わせた周辺確率」を求める——前向き変数α(過去から現在まで)と
 * 後ろ向き変数β(未来から現在まで)を独立に計算し、両者の積から各時刻・各状態の
 * 事後確率を得る(ビタビ法と同じHMMパラメータを再利用)。
 */
export function forwardBackwardAlgorithmSteps(): DPFrame[] {
  const states = VITERBI_STATES;
  const obs = VITERBI_OBSERVATIONS;
  const n = states.length;
  const t = obs.length;

  const alpha: number[][] = Array.from({ length: n }, () => new Array(t).fill(0));
  const beta: number[][] = Array.from({ length: n }, () => new Array(t).fill(0));

  for (let s = 0; s < n; s++) alpha[s][0] = VITERBI_START_PROB[states[s]] * VITERBI_EMIT_PROB[states[s]][obs[0]];
  for (let time = 1; time < t; time++) {
    for (let s = 0; s < n; s++) {
      let sum = 0;
      for (let prev = 0; prev < n; prev++) sum += alpha[prev][time - 1] * VITERBI_TRANS_PROB[states[prev]][states[s]];
      alpha[s][time] = sum * VITERBI_EMIT_PROB[states[s]][obs[time]];
    }
  }

  for (let s = 0; s < n; s++) beta[s][t - 1] = 1;
  for (let time = t - 2; time >= 0; time--) {
    for (let s = 0; s < n; s++) {
      let sum = 0;
      for (let next = 0; next < n; next++) {
        sum += VITERBI_TRANS_PROB[states[s]][states[next]] * VITERBI_EMIT_PROB[states[next]][obs[time + 1]] * beta[next][time + 1];
      }
      beta[s][time] = sum;
    }
  }

  const rows = 2 * n;
  const dp: (number | null)[][] = Array.from({ length: rows }, () => new Array(t).fill(null));
  const state: DPCellState[][] = Array.from({ length: rows }, () => new Array(t).fill("idle" as DPCellState));

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: dp.map((row, i) => row.map((value, c) => ({ value: value === null ? null : Number(value.toFixed(5)), state: state[i][c] }))),
    description,
  });

  frames.push(snapshot(`前向き・後ろ向きアルゴリズムを開始。観測列[${obs.join(",")}]についてα(前向き)とβ(後ろ向き)を計算する`));

  for (let time = 0; time < t; time++) {
    for (let s = 0; s < n; s++) {
      dp[s][time] = alpha[s][time];
      state[s][time] = "pivot";
    }
    frames.push(snapshot(`時刻${time}のα(前向き変数): ${states.map((name, s) => `α[${name}]=${alpha[s][time].toFixed(5)}`).join(", ")}`));
    for (let s = 0; s < n; s++) state[s][time] = "settled";
  }

  for (let time = t - 1; time >= 0; time--) {
    for (let s = 0; s < n; s++) {
      dp[n + s][time] = beta[s][time];
      state[n + s][time] = "pivot";
    }
    frames.push(snapshot(`時刻${time}のβ(後ろ向き変数): ${states.map((name, s) => `β[${name}]=${beta[s][time].toFixed(5)}`).join(", ")}`));
    for (let s = 0; s < n; s++) state[n + s][time] = "settled";
  }

  const totalProb = alpha.reduce((sum, row) => sum + row[t - 1], 0);
  const posteriorLast = states.map((name, s) => `${name}=${((alpha[s][t - 1] * beta[s][t - 1]) / totalProb).toFixed(4)}`);
  frames.push(
    snapshot(`計算完了。全観測列の確率(周辺尤度)=${totalProb.toFixed(5)}。最終時刻の事後確率: ${posteriorLast.join(", ")}`),
  );
  return frames;
}

export const CKY_SENTENCE = ["the", "dog", "chases", "the", "cat"];
type CkyRule = { lhs: string; rhs: [string, string] };
const CKY_BINARY_RULES: CkyRule[] = [
  { lhs: "S", rhs: ["NP", "VP"] },
  { lhs: "VP", rhs: ["V", "NP"] },
  { lhs: "NP", rhs: ["Det", "N"] },
];
const CKY_LEXICON: Record<string, string[]> = {
  the: ["Det"],
  dog: ["N"],
  cat: ["N"],
  chases: ["V"],
};

/**
 * CYKアルゴリズムのステップ列を生成する。文脈自由文法をチョムスキー標準形
 * (全ての規則が「非終端記号2つ」か「終端記号1つ」)に変形しておけば、
 * 文の構文解析を区間DPに帰着できる——dp[i][j]に「単語i〜jの範囲を導出できる
 * 非終端記号の集合」を記録し、分割点で2つの区間を組み合わせられる規則を
 * 全て試すことで、文全体がSから導出可能かを判定する。
 */
export function ckyAlgorithmSteps(): DPFrame[] {
  const words = CKY_SENTENCE;
  const n = words.length;
  const table: Set<string>[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => new Set<string>()));
  const dp: (number | null)[][] = Array.from({ length: n }, () => new Array(n).fill(null));
  const state: DPCellState[][] = Array.from({ length: n }, () => new Array(n).fill("idle" as DPCellState));
  const settled = new Set<string>();

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: dp.map((row, i) => row.map((value, c) => ({ value, state: state[i][c] }))),
    description,
  });

  frames.push(snapshot(`CYKアルゴリズムを開始。文"${words.join(" ")}"がチョムスキー標準形の文法から導出可能か区間DPで調べる`));

  for (let i = 0; i < n; i++) {
    table[i][i] = new Set(CKY_LEXICON[words[i]] ?? []);
    dp[i][i] = table[i][i].size;
    state[i][i] = "pivot";
    frames.push(snapshot(`単語"${words[i]}"(位置${i}): 語彙規則から非終端記号{${[...table[i][i]].join(",")}}を得る`));
    state[i][i] = "settled";
    settled.add(`${i},${i}`);
  }

  for (let length = 2; length <= n; length++) {
    for (let i = 0; i <= n - length; i++) {
      const j = i + length - 1;
      const found = new Set<string>();
      for (let k = i; k < j; k++) {
        for (const rule of CKY_BINARY_RULES) {
          if (table[i][k].has(rule.rhs[0]) && table[k + 1][j].has(rule.rhs[1])) {
            found.add(rule.lhs);
          }
        }
      }
      table[i][j] = found;
      dp[i][j] = found.size;
      state[i][j] = "pivot";
      frames.push(
        snapshot(
          `区間[${i},${j}](単語${i}〜${j}): 分割点を全て試し、非終端記号{${[...found].join(",") || "なし"}}を得る`,
        ),
      );
      state[i][j] = "settled";
      settled.add(`${i},${j}`);
    }
  }

  const canDerive = table[0][n - 1].has("S");
  frames.push(
    snapshot(
      `計算完了。文全体[0,${n - 1}]は${canDerive ? "" : "非"}終端記号Sを含む → この文は文法${canDerive ? "に適合する(構文的に正しい)" : "に適合しない"}`,
    ),
  );
  return frames;
}

export const CRF_SENTENCE = ["time", "flies"];
export const CRF_TAGS = ["N", "V"];
export const CRF_EMISSION_SCORE: Record<string, Record<string, number>> = {
  time: { N: 2.0, V: 0.5 },
  flies: { N: 0.8, V: 1.5 },
};
export const CRF_TRANSITION_SCORE: Record<string, Record<string, number>> = {
  N: { N: 0.2, V: 1.0 },
  V: { N: 1.0, V: 0.1 },
};
export const CRF_START_SCORE: Record<string, number> = { N: 1.0, V: 0.3 };

/**
 * 線形鎖条件付き確率場(CRF)のステップ列を生成する。ビタビ法(生成モデルである
 * HMMの確率の積)と全く同じ「各時刻・各状態でそこに至る最良スコアだけを残す」
 * というDPの骨格を使うが、CRFは個々の特徴量に対する重み(スコア、確率である
 * 必要はなく負の値も取りうる)の和を最大化する識別モデルである点が異なる。
 */
export function conditionalRandomFieldSteps(): DPFrame[] {
  const words = CRF_SENTENCE;
  const tags = CRF_TAGS;
  const n = tags.length;
  const t = words.length;
  const dp: (number | null)[][] = Array.from({ length: n }, () => new Array(t).fill(null));
  const backptr: number[][] = Array.from({ length: n }, () => new Array(t).fill(0));
  const state: DPCellState[][] = Array.from({ length: n }, () => new Array(t).fill("idle" as DPCellState));

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: dp.map((row, i) => row.map((value, c) => ({ value: value === null ? null : Number(value.toFixed(3)), state: state[i][c] }))),
    description,
  });

  frames.push(snapshot(`CRFによる系列ラベリングを開始。単語列[${words.join(",")}]に最もスコアが高いタグ列(品詞)を求める`));

  for (let s = 0; s < n; s++) {
    dp[s][0] = CRF_START_SCORE[tags[s]] + CRF_EMISSION_SCORE[words[0]][tags[s]];
    state[s][0] = "pivot";
  }
  frames.push(snapshot(`時刻0(単語"${words[0]}"): 各タグのスコア = 開始スコア + 出力スコア`));
  for (let s = 0; s < n; s++) state[s][0] = "settled";

  for (let time = 1; time < t; time++) {
    for (let s = 0; s < n; s++) {
      let best = -Infinity;
      let bestPrev = 0;
      for (let prev = 0; prev < n; prev++) {
        const candidate = dp[prev][time - 1]! + CRF_TRANSITION_SCORE[tags[prev]][tags[s]];
        if (candidate > best) {
          best = candidate;
          bestPrev = prev;
        }
      }
      const value = best + CRF_EMISSION_SCORE[words[time]][tags[s]];
      dp[s][time] = value;
      backptr[s][time] = bestPrev;
      state[s][time] = "pivot";
      frames.push(
        snapshot(`時刻${time}(単語"${words[time]}"), タグ${tags[s]}: 直前の最良タグは${tags[bestPrev]} → スコア=${value.toFixed(3)}`),
      );
      state[s][time] = "settled";
    }
  }

  let bestFinal = 0;
  for (let s = 1; s < n; s++) if (dp[s][t - 1]! > dp[bestFinal][t - 1]!) bestFinal = s;
  const path: number[] = [bestFinal];
  for (let time = t - 1; time > 0; time--) path.unshift(backptr[path[0]][time]);
  const pathNames = path.map((i) => tags[i]);

  frames.push(snapshot(`計算完了。最もスコアが高いタグ列は[${pathNames.join(", ")}](スコア=${dp[bestFinal][t - 1]!.toFixed(3)})`));
  return frames;
}

export const OBST_KEYS = ["k1", "k2", "k3", "k4"];
export const OBST_FREQ = [4, 2, 6, 3];

/**
 * 最適二分探索木のステップ列を生成する。各キーの検索頻度が分かっている時、
 * 「頻繁に探索されるキーほど根に近い浅い位置に置く」ように木の形を工夫すると、
 * 平均探索コストを最小化できる——行列連鎖乗算と同じ「区間を分割点で2つに割る」
 * 区間DPの骨格に、根として選んだキー自身の頻度と両側の部分木のコストの和を
 * 最小化するという条件を組み合わせている。
 */
export function optimalBinarySearchTreeSteps(): DPFrame[] {
  const keys = OBST_KEYS;
  const freq = OBST_FREQ;
  const n = keys.length;
  const prefixSum = [0];
  for (const f of freq) prefixSum.push(prefixSum[prefixSum.length - 1] + f);

  const dp: (number | null)[][] = Array.from({ length: n }, () => new Array(n).fill(null));
  for (let i = 0; i < n; i++) dp[i][i] = freq[i];
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

  frames.push(
    snapshot(new Map(), `最適二分探索木を開始。キー[${keys.join(",")}]、検索頻度[${freq.join(",")}]について、平均探索コストが最小になる木の形を求める`),
  );

  for (let length = 2; length <= n; length++) {
    for (let i = 0; i <= n - length; i++) {
      const j = i + length - 1;
      const rangeSum = prefixSum[j + 1] - prefixSum[i];
      let best = Infinity;
      let bestRoot = i;
      const highlight = new Map<string, "comparing" | "pivot">();
      for (let r = i; r <= j; r++) {
        const left = r > i ? dp[i][r - 1] ?? 0 : 0;
        const right = r < j ? dp[r + 1][j] ?? 0 : 0;
        if (r > i) highlight.set(`${i},${r - 1}`, "comparing");
        if (r < j) highlight.set(`${r + 1},${j}`, "comparing");
        const cost = left + right + rangeSum;
        if (cost < best) {
          best = cost;
          bestRoot = r;
        }
      }
      frames.push(snapshot(highlight, `区間[${keys[i]}..${keys[j]}]: 根の候補を全て試す(頻度の合計=${rangeSum})`));
      dp[i][j] = best;
      settled.add(`${i},${j}`);
      frames.push(snapshot(new Map([[`${i},${j}`, "pivot"]]), `dp[${i}][${j}] = ${best}(根=${keys[bestRoot]}のとき最小)を確定`));
    }
  }

  frames.push(snapshot(new Map(), `計算完了。キー[${keys.join(",")}]の最適な二分探索木の平均探索コストは${dp[0][n - 1]}`));
  return frames;
}

export const PALINDROME_PARTITIONING_STRING = "aabbc";

/**
 * 回文分割(最小カット数)のステップ列を生成する。文字列を「回文である部分文字列」
 * だけに分割する時、必要なカット数(分割の切れ目の数)を最小化する問題——
 * まず区間DPで「部分文字列s[i..j]が回文かどうか」を全ての区間について前計算し
 * (この可視化ではその判定テーブルを表示)、その情報を使って1次元DPで最小カット数を求める。
 */
export function palindromePartitioningSteps(): DPFrame[] {
  const s = PALINDROME_PARTITIONING_STRING;
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

  frames.push(snapshot(new Map(), `回文分割を開始。文字列"${s}"を回文の部分文字列だけに分割するための最小カット数を求める(まず全区間が回文かどうかを判定)`));

  const isPalindrome: boolean[][] = Array.from({ length: n }, () => new Array(n).fill(false));
  for (let i = 0; i < n; i++) isPalindrome[i][i] = true;

  for (let length = 2; length <= n; length++) {
    for (let i = 0; i <= n - length; i++) {
      const j = i + length - 1;
      const highlight = new Map<string, "comparing" | "pivot">();
      const endsMatch = s[i] === s[j];
      let value = 0;
      if (endsMatch) {
        if (length === 2) {
          value = 1;
        } else {
          highlight.set(`${i + 1},${j - 1}`, "comparing");
          value = isPalindrome[i + 1][j - 1] ? 1 : 0;
        }
      }
      isPalindrome[i][j] = value === 1;
      frames.push(
        snapshot(
          highlight,
          `区間[${i},${j}]("${s.slice(i, j + 1)}"): 両端"${s[i]}"と"${s[j]}"が${endsMatch ? "一致" : "不一致"}` +
            (endsMatch && length > 2 ? `、内側が回文${isPalindrome[i + 1][j - 1] ? "" : "でない"}か確認` : ""),
        ),
      );
      dp[i][j] = value;
      settled.add(`${i},${j}`);
      frames.push(snapshot(new Map([[`${i},${j}`, "pivot"]]), `dp[${i}][${j}] = ${value}(回文${value === 1 ? "である" : "でない"})を確定`));
    }
  }

  const cuts = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    if (isPalindrome[0][i]) {
      cuts[i] = 0;
    } else {
      let best = Infinity;
      for (let k = 0; k < i; k++) {
        if (isPalindrome[k + 1][i] && cuts[k] + 1 < best) best = cuts[k] + 1;
      }
      cuts[i] = best;
    }
  }

  frames.push(snapshot(new Map(), `計算完了。回文判定テーブルから求めた最小カット数は${cuts[n - 1]}(文字列"${s}"を${cuts[n - 1] + 1}個の回文に分割できる)`));
  return frames;
}

export const BURST_BALLOONS_NUMS = [3, 1, 5, 8];

/**
 * 風船割りゲーム(burst-balloons)のステップ列を生成する。風船iを割ると
 * (その時点で隣り合っている風船の値の積)のコインが得られ、風船が減ると
 * 隣接関係が変わる——「最後に割る風船」を区間の外側の境界として固定して考える
 * (逆に「最初に割る風船」を全探索すると隣接関係の管理が破綻する)という
 * 発想の転換が、この区間DPを可能にする鍵になっている。
 */
export function burstBalloonsDpSteps(): DPFrame[] {
  const nums = [1, ...BURST_BALLOONS_NUMS, 1];
  const n = nums.length;
  const dp: (number | null)[][] = Array.from({ length: n }, () => new Array(n).fill(null));
  for (let i = 0; i < n - 1; i++) dp[i][i + 1] = 0;
  const settled = new Set<string>();
  for (let i = 0; i < n - 1; i++) settled.add(`${i},${i + 1}`);

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

  frames.push(
    snapshot(
      new Map(),
      `風船割りゲームを開始。風船[${BURST_BALLOONS_NUMS.join(",")}](両端に番兵の1を追加)を全て割って得られる最大コインを求める`,
    ),
  );

  for (let length = 2; length < n; length++) {
    for (let i = 0; i < n - length; i++) {
      const j = i + length;
      let best = 0;
      let bestK = i + 1;
      const highlight = new Map<string, "comparing" | "pivot">();
      for (let k = i + 1; k < j; k++) {
        highlight.set(`${i},${k}`, "comparing");
        highlight.set(`${k},${j}`, "comparing");
        const coins = (dp[i][k] ?? 0) + (dp[k][j] ?? 0) + nums[i] * nums[k] * nums[j];
        if (coins > best) {
          best = coins;
          bestK = k;
        }
      }
      frames.push(
        snapshot(highlight, `区間(${i},${j})(番兵除く風船${i}〜${j - 2}番目): 最後に割る風船kを全て試す`),
      );
      dp[i][j] = best;
      settled.add(`${i},${j}`);
      frames.push(
        snapshot(new Map([[`${i},${j}`, "pivot"]]), `dp[${i}][${j}] = ${best}(最後に割る風船=元の${bestK}番目)を確定`),
      );
    }
  }

  frames.push(snapshot(new Map(), `計算完了。全ての風船を割って得られる最大コインは${dp[0][n - 1]}`));
  return frames;
}

export type LRUOperation = { type: "put" | "get"; key: number; value?: number };
export const LRU_CAPACITY = 3;
export const LRU_OPERATIONS: LRUOperation[] = [
  { type: "put", key: 1, value: 10 },
  { type: "put", key: 2, value: 20 },
  { type: "put", key: 3, value: 30 },
  { type: "get", key: 1 },
  { type: "put", key: 4, value: 40 },
  { type: "get", key: 2 },
  { type: "get", key: 3 },
];

/**
 * LRUキャッシュのステップ列を生成する。キーを「MRU(直近アクセス)→LRU(最も古い)」順に
 * 並べたリストとして管理し、put/getいずれの操作でも対象キーをリストの先頭(MRU)に
 * 移動させる。容量を超えるputが発生した場合はリスト末尾(LRU)のキーを追い出す。
 * 「双方向連結リスト+ハッシュマップ」という実装がO(1)を実現する仕組みそのものよりも、
 * 「アクセスされた順に並べ替え、はみ出た分を末尾から削る」という操作の意味を可視化することに重点を置く。
 */
export function lruCacheSteps(): DPFrame[] {
  const capacity = LRU_CAPACITY;
  let order: number[] = [];
  const values = new Map<number, number>();

  const cols = capacity;
  const table: (number | null)[][] = [new Array(cols).fill(null)];
  const state: DPCellState[][] = [new Array(cols).fill("idle")];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  const syncTable = () => {
    for (let c = 0; c < cols; c++) {
      table[0][c] = c < order.length ? order[c] : null;
    }
  };

  frames.push(snapshot(`LRUキャッシュ(容量${capacity})を開始。左から順にMRU(直近アクセス)→LRU(最も古い)`));

  for (const op of LRU_OPERATIONS) {
    if (op.type === "put") {
      const existed = order.includes(op.key);
      if (existed) {
        order = order.filter((k) => k !== op.key);
      }
      if (!existed && order.length >= capacity) {
        const evicted = order.pop()!;
        values.delete(evicted);
        syncTable();
        for (let c = 0; c < cols; c++) state[0][c] = "idle";
        frames.push(
          snapshot(`put(${op.key}, ${op.value}): 容量超過のためLRU(最も使われていない)のキー${evicted}を追い出す`),
        );
      }
      order.unshift(op.key);
      values.set(op.key, op.value!);
      syncTable();
      for (let c = 0; c < cols; c++) state[0][c] = c === 0 ? "pivot" : "idle";
      frames.push(snapshot(`put(${op.key}, ${op.value}): キー${op.key}をMRU位置に配置`));
    } else {
      const hit = order.includes(op.key);
      if (hit) {
        order = order.filter((k) => k !== op.key);
        order.unshift(op.key);
        syncTable();
        for (let c = 0; c < cols; c++) state[0][c] = c === 0 ? "settled" : "idle";
        frames.push(snapshot(`get(${op.key}): ヒット(値=${values.get(op.key)})。アクセスしたのでMRU位置に移動`));
      } else {
        syncTable();
        for (let c = 0; c < cols; c++) state[0][c] = "idle";
        frames.push(snapshot(`get(${op.key}): ミス(キャッシュに存在しない、または既に追い出された)`));
      }
    }
  }

  frames.push(snapshot(`計算完了。最終的なキャッシュ内容(MRU→LRU): [${order.join(", ")}]`));
  return frames;
}

export const TFIDF_DOCUMENTS = [
  ["the", "cat", "sat"],
  ["the", "dog", "sat"],
  ["the", "cat", "ran"],
];
export const TFIDF_TERMS = ["the", "cat", "dog", "sat", "ran"];

/**
 * TF-IDFのステップ列を生成する。TF(単語の出現頻度)は「その文書内でよく出る単語ほど重要」、
 * IDF(逆文書頻度)は「多くの文書に出現する単語ほど重要度が低い(=ありふれた単語)」という
 * 逆方向の直感を数式にしたもので、両者を掛け合わせることで「この文書に特徴的な単語」を
 * 数値化できる。全文書に登場する"the"はIDF=0になり、重要度が完全に打ち消される様子が見える。
 */
export function tfidfSteps(): DPFrame[] {
  const docs = TFIDF_DOCUMENTS;
  const terms = TFIDF_TERMS;
  const n = docs.length;

  const tf = terms.map((term) => docs.map((doc) => doc.filter((w) => w === term).length));
  const df = terms.map((_, ti) => tf[ti].filter((c) => c > 0).length);
  const idf = df.map((d) => Math.log(n / d));

  const cols = n + 1 + n;
  const table: (number | null)[][] = terms.map(() => new Array(cols).fill(null));
  const state: DPCellState[][] = terms.map(() => new Array(cols).fill("idle"));

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(`TF-IDFを開始。文書: ${docs.map((d, i) => `文書${i + 1}="${d.join(" ")}"`).join(", ")}`),
  );

  terms.forEach((term, ti) => {
    for (let d = 0; d < n; d++) {
      table[ti][d] = tf[ti][d];
      state[ti][d] = "pivot";
    }
    frames.push(snapshot(`"${term}"のTF(各文書での出現回数): [${tf[ti].join(", ")}]`));
    for (let d = 0; d < n; d++) state[ti][d] = "settled";

    table[ti][n] = idf[ti];
    state[ti][n] = "pivot";
    frames.push(
      snapshot(`"${term}"のIDF = log(文書数/出現文書数) = log(${n}/${df[ti]}) = ${idf[ti].toFixed(3)}`),
    );
    state[ti][n] = "settled";

    for (let d = 0; d < n; d++) {
      const value = Number((tf[ti][d] * idf[ti]).toFixed(3));
      table[ti][n + 1 + d] = value;
      state[ti][n + 1 + d] = "pivot";
    }
    frames.push(
      snapshot(
        `"${term}"のTF-IDF(各文書) = TF×IDF: [${table[ti].slice(n + 1).map((v) => v).join(", ")}]`,
      ),
    );
    for (let d = 0; d < n; d++) state[ti][n + 1 + d] = "settled";
  });

  frames.push(snapshot('計算完了。"the"はIDF=0(全文書に出現するため重要度が完全に打ち消される)ことに注目'));
  return frames;
}

export const BM25_DOCUMENTS = [
  ["the", "cat", "sat"],
  ["the", "dog", "sat"],
  ["the", "cat", "ran"],
];
export const BM25_QUERY = ["cat", "sat"];
export const BM25_K1 = 1.5;
export const BM25_B = 0.75;

/**
 * BM25(Okapi BM25)のステップ列を生成する。TF-IDFと同じ「珍しい単語ほど重視する」考え方を
 * 土台にしつつ、(1) 単語の出現回数が増えるほど寄与を頭打ちにする飽和項、
 * (2) 文書が平均より長い場合はその分出現回数が水増しされやすいことを補正する長さ正規化項、
 * の2つを加えることで、検索エンジンの実用ランキングとして広く使われている。
 */
export function bm25Steps(): DPFrame[] {
  const docs = BM25_DOCUMENTS;
  const query = BM25_QUERY;
  const n = docs.length;
  const k1 = BM25_K1;
  const b = BM25_B;
  const avgdl = docs.reduce((s, d) => s + d.length, 0) / n;

  const idfOf = (term: string) => {
    const df = docs.filter((d) => d.includes(term)).length;
    return Math.log((n - df + 0.5) / (df + 0.5) + 1);
  };

  const cols = n;
  const rowLabels = ["文書長", ...query.map((q) => `"${q}"の寄与`), "BM25スコア合計"];
  const table: (number | null)[][] = rowLabels.map(() => new Array(cols).fill(null));
  const state: DPCellState[][] = rowLabels.map(() => new Array(cols).fill("idle"));

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(`BM25を開始。クエリ="${query.join(" ")}"、文書: ${docs.map((d, i) => `文書${i + 1}="${d.join(" ")}"`).join(", ")}`),
  );

  for (let d = 0; d < n; d++) {
    table[0][d] = docs[d].length;
    state[0][d] = "settled";
  }
  frames.push(snapshot(`各文書の長さ: [${docs.map((d) => d.length).join(", ")}](平均長avgdl=${avgdl.toFixed(2)})`));

  const totals = new Array(n).fill(0);
  query.forEach((term, qi) => {
    const idf = idfOf(term);
    for (let d = 0; d < n; d++) {
      const f = docs[d].filter((w) => w === term).length;
      const norm = 1 - b + (b * docs[d].length) / avgdl;
      const contribution = f === 0 ? 0 : (idf * (f * (k1 + 1))) / (f + k1 * norm);
      const rounded = Number(contribution.toFixed(3));
      table[1 + qi][d] = rounded;
      state[1 + qi][d] = "pivot";
      totals[d] += rounded;
    }
    frames.push(
      snapshot(
        `"${term}"の寄与(IDF=${idf.toFixed(3)}を各文書の出現回数・長さで重み付け): [${table[1 + qi].join(", ")}]`,
      ),
    );
    for (let d = 0; d < n; d++) state[1 + qi][d] = "settled";
  });

  for (let d = 0; d < n; d++) {
    table[rowLabels.length - 1][d] = Number(totals[d].toFixed(3));
    state[rowLabels.length - 1][d] = "settled";
  }
  const ranked = totals
    .map((score, i) => ({ score, doc: i + 1 }))
    .sort((a, b2) => b2.score - a.score);
  frames.push(
    snapshot(
      `計算完了。BM25スコア合計: [${totals.map((t) => t.toFixed(3)).join(", ")}]。ランキング: ${ranked.map((r) => `文書${r.doc}(${r.score.toFixed(3)})`).join(" > ")}`,
    ),
  );

  return frames;
}

export type RRFRankList = Record<string, number>;
export const RRF_KEYWORD_RANKS: RRFRankList = { A: 1, B: 3, C: 2, D: 5, E: 4 };
export const RRF_VECTOR_RANKS: RRFRankList = { A: 2, B: 1, C: 4, D: 3, E: 5 };
export const RRF_K = 60;
export const RRF_DOCS = ["A", "B", "C", "D", "E"];

/**
 * RRF(Reciprocal Rank Fusion)のステップ列を生成する。キーワード検索とベクトル検索のように、
 * スコアの尺度が全く異なる複数の検索結果を統合したいとき、スコアそのものではなく
 * 「順位の逆数」だけを使うことで単位を揃える必要がなくなる。定数k(通常60)を順位に足すことで、
 * 上位の順位差が過度に強調されすぎないよう緩和している。
 */
export function rrfSteps(): DPFrame[] {
  const docs = RRF_DOCS;
  const k = RRF_K;
  const cols = docs.length;
  const rowLabels = ["キーワード検索順位", "ベクトル検索順位", "RRFスコア"];
  const table: (number | null)[][] = rowLabels.map(() => new Array(cols).fill(null));
  const state: DPCellState[][] = rowLabels.map(() => new Array(cols).fill("idle"));

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(snapshot(`RRFを開始。定数k=${k}。2つの検索結果(キーワード検索・ベクトル検索)の順位を統合する`));

  docs.forEach((doc, i) => {
    table[0][i] = RRF_KEYWORD_RANKS[doc];
    state[0][i] = "pivot";
  });
  frames.push(snapshot(`キーワード検索の順位: ${docs.map((d) => `${d}=${RRF_KEYWORD_RANKS[d]}位`).join(", ")}`));
  docs.forEach((_, i) => {
    state[0][i] = "settled";
  });

  docs.forEach((doc, i) => {
    table[1][i] = RRF_VECTOR_RANKS[doc];
    state[1][i] = "pivot";
  });
  frames.push(snapshot(`ベクトル検索の順位: ${docs.map((d) => `${d}=${RRF_VECTOR_RANKS[d]}位`).join(", ")}`));
  docs.forEach((_, i) => {
    state[1][i] = "settled";
  });

  const scores: number[] = [];
  docs.forEach((doc, i) => {
    const score = 1 / (k + RRF_KEYWORD_RANKS[doc]) + 1 / (k + RRF_VECTOR_RANKS[doc]);
    const rounded = Number(score.toFixed(4));
    scores.push(rounded);
    table[2][i] = rounded;
    state[2][i] = "pivot";
    frames.push(
      snapshot(
        `${doc}のRRFスコア = 1/(k+キーワード順位) + 1/(k+ベクトル順位) = 1/(${k}+${RRF_KEYWORD_RANKS[doc]}) + 1/(${k}+${RRF_VECTOR_RANKS[doc]}) = ${rounded}`,
      ),
    );
    state[2][i] = "settled";
  });

  const ranked = docs
    .map((doc, i) => ({ doc, score: scores[i] }))
    .sort((a, b2) => b2.score - a.score);
  frames.push(snapshot(`計算完了。統合ランキング: ${ranked.map((r) => `${r.doc}(${r.score})`).join(" > ")}`));

  return frames;
}

export type PerceptronSample = { x1: number; x2: number; label: number };
/** ANDゲート(線形分離可能な最も基本的な例)。パーセプトロンは必ずこれを学習できる。 */
export const PERCEPTRON_DATA: PerceptronSample[] = [
  { x1: 0, x2: 0, label: 0 },
  { x1: 0, x2: 1, label: 0 },
  { x1: 1, x2: 0, label: 0 },
  { x1: 1, x2: 1, label: 1 },
];
export const PERCEPTRON_LEARNING_RATE = 1;
export const PERCEPTRON_EPOCHS = 6;

/**
 * パーセプトロンのステップ列を生成する。入力の重み付き和(+バイアス)が0を超えるかどうかで
 * 2値分類し、予測が間違っていた場合だけ「正解ラベルと予測の差×学習率」を重みに加える、
 * という単純な更新規則を繰り返す。線形分離可能なデータ(ANDゲートのように、1本の直線で
 * 2クラスを分けられるデータ)に対しては、この更新を繰り返せば必ず有限回で完全分類できる
 * (パーセプトロン収束定理)ことが理論的に保証されている。
 */
export function perceptronSteps(): DPFrame[] {
  const data = PERCEPTRON_DATA;
  const lr = PERCEPTRON_LEARNING_RATE;

  let w1 = 0;
  let w2 = 0;
  let bias = 0;

  type Row = { w1: number; w2: number; bias: number; pred: number; updated: number };
  const rows: Row[] = [];
  for (let epoch = 0; epoch < PERCEPTRON_EPOCHS; epoch++) {
    for (const sample of data) {
      const z = w1 * sample.x1 + w2 * sample.x2 + bias;
      const pred = z > 0 ? 1 : 0;
      const error = sample.label - pred;
      if (error !== 0) {
        w1 += lr * error * sample.x1;
        w2 += lr * error * sample.x2;
        bias += lr * error;
      }
      rows.push({ w1, w2, bias, pred, updated: error !== 0 ? 1 : 0 });
    }
  }

  const cols = rows.length;
  const table: (number | null)[][] = [
    new Array(cols).fill(null),
    new Array(cols).fill(null),
    new Array(cols).fill(null),
    new Array(cols).fill(null),
  ];
  const state: DPCellState[][] = [
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
    new Array(cols).fill("idle"),
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(`パーセプトロンを開始。ANDゲート(線形分離可能)を学習する。学習率=${lr}、初期重み(w1,w2,bias)=(0,0,0)`),
  );

  let step = 0;
  for (let epoch = 0; epoch < PERCEPTRON_EPOCHS; epoch++) {
    for (const sample of data) {
      const row = rows[step];
      table[0][step] = row.w1;
      table[1][step] = row.w2;
      table[2][step] = row.bias;
      table[3][step] = row.pred;
      state[0][step] = "pivot";
      state[1][step] = "pivot";
      state[2][step] = "pivot";
      state[3][step] = "pivot";
      frames.push(
        snapshot(
          `[エポック${epoch + 1}] 入力(${sample.x1},${sample.x2})、正解=${sample.label}、予測=${row.pred} → ${row.updated ? "誤り、重みを更新" : "正解、更新なし"}(更新後 w1=${row.w1}, w2=${row.w2}, bias=${row.bias})`,
        ),
      );
      state[0][step] = "settled";
      state[1][step] = "settled";
      state[2][step] = "settled";
      state[3][step] = "settled";
      step++;
    }
  }

  const finalRow = rows[rows.length - 1];
  const allCorrect = data.every((sample) => {
    const z = finalRow.w1 * sample.x1 + finalRow.w2 * sample.x2 + finalRow.bias;
    return (z > 0 ? 1 : 0) === sample.label;
  });
  frames.push(
    snapshot(
      `計算完了(${PERCEPTRON_EPOCHS}エポック)。最終的な重み(w1,w2,bias)=(${finalRow.w1},${finalRow.w2},${finalRow.bias})は、全4サンプルを${allCorrect ? "正しく分類できる" : "まだ正しく分類できていない"}`,
    ),
  );

  return frames;
}

export const BACKPROP_X = 1;
export const BACKPROP_TARGET = 1;
export const BACKPROP_LEARNING_RATE = 0.5;
export const BACKPROP_EPOCHS = 10;
export const BACKPROP_INITIAL_W1 = 0.5;
export const BACKPROP_INITIAL_B1 = 0;
export const BACKPROP_INITIAL_W2 = 0.5;
export const BACKPROP_INITIAL_B2 = 0;

function backpropSigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/**
 * 誤差逆伝播法(バックプロパゲーション)のステップ列を生成する。x→隠れ層(シグモイド)→出力、
 * という最小のネットワーク(重み2つ・バイアス2つ)を例に、連鎖律を使って
 * 「出力の誤差 → 出力層の重みの勾配」「出力の誤差 → 隠れ層の出力への影響 → 活性化関数の微分
 * → 隠れ層の重みの勾配」という順に、出力から入力へ向かって勾配を伝播させていく様子を
 * 可視化する。この「連鎖律を逆向きにたどる」という発想により、ネットワークがどれだけ深くても
 * 全ての重みの勾配を1回の順伝播+1回の逆伝播だけで計算できる。
 */
export function backpropagationSteps(): DPFrame[] {
  const x = BACKPROP_X;
  const target = BACKPROP_TARGET;
  const lr = BACKPROP_LEARNING_RATE;

  let w1 = BACKPROP_INITIAL_W1;
  let b1 = BACKPROP_INITIAL_B1;
  let w2 = BACKPROP_INITIAL_W2;
  let b2 = BACKPROP_INITIAL_B2;

  type Row = { w1: number; b1: number; w2: number; b2: number; yhat: number; loss: number };
  const rows: Row[] = [];

  for (let epoch = 0; epoch < BACKPROP_EPOCHS; epoch++) {
    const z1 = w1 * x + b1;
    const h = backpropSigmoid(z1);
    const yhat = w2 * h + b2;
    const loss = 0.5 * (target - yhat) ** 2;

    const dLdyhat = yhat - target;
    const dLdw2 = dLdyhat * h;
    const dLdb2 = dLdyhat;
    const dLdh = dLdyhat * w2;
    const dLdz1 = dLdh * h * (1 - h);
    const dLdw1 = dLdz1 * x;
    const dLdb1 = dLdz1;

    w1 -= lr * dLdw1;
    b1 -= lr * dLdb1;
    w2 -= lr * dLdw2;
    b2 -= lr * dLdb2;

    rows.push({
      w1: Number(w1.toFixed(4)),
      b1: Number(b1.toFixed(4)),
      w2: Number(w2.toFixed(4)),
      b2: Number(b2.toFixed(4)),
      yhat: Number(yhat.toFixed(4)),
      loss: Number(loss.toFixed(4)),
    });
  }

  const cols = rows.length;
  const rowLabels = ["w1", "b1", "w2", "b2", "y_hat(順伝播の出力)", "損失"];
  const table: (number | null)[][] = rowLabels.map(() => new Array(cols).fill(null));
  const state: DPCellState[][] = rowLabels.map(() => new Array(cols).fill("idle"));

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `誤差逆伝播法を開始。x=${x}→隠れ層h=sigmoid(w1×x+b1)→出力y_hat=w2×h+b2という最小ネットワークを、目標値y=${target}に近づける`,
    ),
  );

  for (let epoch = 0; epoch < BACKPROP_EPOCHS; epoch++) {
    const row = rows[epoch];
    const values = [row.w1, row.b1, row.w2, row.b2, row.yhat, row.loss];
    for (let r = 0; r < rowLabels.length; r++) {
      table[r][epoch] = values[r];
      state[r][epoch] = "pivot";
    }
    frames.push(
      snapshot(
        `[エポック${epoch + 1}] 順伝播でy_hat=${row.yhat}を計算、損失=${row.loss}。連鎖律で逆伝播した勾配を使って重みを更新: w1=${row.w1}, b1=${row.b1}, w2=${row.w2}, b2=${row.b2}`,
      ),
    );
    for (let r = 0; r < rowLabels.length; r++) state[r][epoch] = "settled";
  }

  const finalRow = rows[rows.length - 1];
  frames.push(
    snapshot(
      `計算完了(${BACKPROP_EPOCHS}エポック)。y_hat=${finalRow.yhat}は目標値${target}に近づき、損失は${rows[0].loss}から${finalRow.loss}まで減少した`,
    ),
  );

  return frames;
}

export type NaiveBayesSample = { f1: number; f2: number; label: number };
export const NAIVE_BAYES_DATA: NaiveBayesSample[] = [
  { f1: 1, f2: 1, label: 1 },
  { f1: 1, f2: 0, label: 1 },
  { f1: 0, f2: 1, label: 0 },
  { f1: 0, f2: 0, label: 0 },
  { f1: 1, f2: 1, label: 1 },
  { f1: 0, f2: 0, label: 0 },
];
export const NAIVE_BAYES_QUERY = { f1: 1, f2: 0 };

/**
 * ナイーブベイズのステップ列を生成する。「特徴同士は互いに独立」という(現実には成り立たない
 * ことが多い)強い仮定を置くことで、ベイズの定理 P(class|特徴群) ∝ P(class)×Π P(特徴i|class)
 * の右辺を、特徴ごとの条件付き確率の掛け算だけで計算できるようにする。学習データに一度も
 * 出現しない組み合わせで確率が0になり他の特徴の情報も台無しにしてしまう問題を防ぐため、
 * ラプラススムージング(全てのカウントに1を足す)を使う。
 */
export function naiveBayesSteps(): DPFrame[] {
  const data = NAIVE_BAYES_DATA;
  const query = NAIVE_BAYES_QUERY;
  const classes = [0, 1];
  const n = data.length;

  const countClass = (c: number) => data.filter((d) => d.label === c).length;
  const countFeature = (feature: "f1" | "f2", value: number, c: number) =>
    data.filter((d) => d[feature] === value && d.label === c).length;

  const cols = classes.length;
  const rowLabels = ["P(class)", "P(f1=query値|class)", "P(f2=query値|class)", "事後確率(比例値)"];
  const table: (number | null)[][] = rowLabels.map(() => new Array(cols).fill(null));
  const state: DPCellState[][] = rowLabels.map(() => new Array(cols).fill("idle"));

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `ナイーブベイズを開始。クエリ(f1=${query.f1}, f2=${query.f2})のクラスを予測する(訓練データ${n}件、ラプラススムージングを使用)`,
    ),
  );

  const pClass: number[] = [];
  classes.forEach((c, ci) => {
    const p = Number((countClass(c) / n).toFixed(4));
    pClass.push(p);
    table[0][ci] = p;
    state[0][ci] = "pivot";
  });
  frames.push(snapshot(`P(class) = クラスの訓練データ中の割合: ${classes.map((c, i) => `class=${c}: ${pClass[i]}`).join(", ")}`));
  classes.forEach((_, ci) => {
    state[0][ci] = "settled";
  });

  const pF1: number[] = [];
  classes.forEach((c, ci) => {
    const p = Number(((countFeature("f1", query.f1, c) + 1) / (countClass(c) + 2)).toFixed(4));
    pF1.push(p);
    table[1][ci] = p;
    state[1][ci] = "pivot";
  });
  frames.push(
    snapshot(
      `P(f1=${query.f1}|class) = (該当件数+1)/(クラス件数+2)(ラプラススムージング): ${classes.map((c, i) => `class=${c}: ${pF1[i]}`).join(", ")}`,
    ),
  );
  classes.forEach((_, ci) => {
    state[1][ci] = "settled";
  });

  const pF2: number[] = [];
  classes.forEach((c, ci) => {
    const p = Number(((countFeature("f2", query.f2, c) + 1) / (countClass(c) + 2)).toFixed(4));
    pF2.push(p);
    table[2][ci] = p;
    state[2][ci] = "pivot";
  });
  frames.push(
    snapshot(
      `P(f2=${query.f2}|class) = (該当件数+1)/(クラス件数+2)(ラプラススムージング): ${classes.map((c, i) => `class=${c}: ${pF2[i]}`).join(", ")}`,
    ),
  );
  classes.forEach((_, ci) => {
    state[2][ci] = "settled";
  });

  const posterior: number[] = [];
  classes.forEach((c, ci) => {
    const p = Number((pClass[ci] * pF1[ci] * pF2[ci]).toFixed(5));
    posterior.push(p);
    table[3][ci] = p;
    state[3][ci] = "pivot";
  });
  frames.push(
    snapshot(
      `事後確率(比例値) = P(class)×P(f1|class)×P(f2|class): ${classes.map((c, i) => `class=${c}: ${posterior[i]}`).join(", ")}(独立性の仮定のおかげで単純な掛け算で済む)`,
    ),
  );
  classes.forEach((_, ci) => {
    state[3][ci] = "settled";
  });

  const predicted = classes[posterior.indexOf(Math.max(...posterior))];
  frames.push(snapshot(`計算完了。事後確率が最大のクラス = ${predicted} と予測`));

  return frames;
}

export const GA_POPULATION_INITIAL = [3, 10, 17, 24, 29, 6];
export const GA_GENERATIONS = 5;
export const GA_TARGET = 15;
export const GA_SEED = 7;

function gaFitness(x: number): number {
  return -((x - GA_TARGET) ** 2) + 100;
}

function gaCreateLcg(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

/**
 * 遺伝的アルゴリズムのステップ列を生成する。目的関数f(x)=-(x-15)²+100(x=15で最大値100)を
 * 最大化する個体を、選択(上位個体を優先的に親に選ぶ)・交叉(2つの親のビット列を組み合わせる)・
 * 突然変異(低確率でビットを反転)という3つの操作を繰り返す集団で探索する。
 * 上位2個体をそのまま次世代に残す「エリート主義」により、世代を重ねても
 * 最良適応度が絶対に悪化しないことが保証されている。
 */
export function geneticAlgorithmSteps(): DPFrame[] {
  const rng = gaCreateLcg(GA_SEED);
  let population = [...GA_POPULATION_INITIAL];

  const rows = population.length;
  const cols = GA_GENERATIONS + 1;
  const table: (number | null)[][] = Array.from({ length: rows }, () => new Array(cols).fill(null));
  const state: DPCellState[][] = Array.from({ length: rows }, () => new Array(cols).fill("idle"));

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  const recordGeneration = (gen: number) => {
    population.forEach((x, i) => {
      table[i][gen] = x;
      state[i][gen] = "pivot";
    });
  };

  recordGeneration(0);
  frames.push(
    snapshot(
      `遺伝的アルゴリズムを開始。f(x)=-(x-${GA_TARGET})²+100を最大化する個体xを進化させる。初期集団: [${population.join(", ")}]`,
    ),
  );
  population.forEach((_, i) => {
    state[i][0] = "settled";
  });

  for (let gen = 1; gen <= GA_GENERATIONS; gen++) {
    const scored = population.map((x) => ({ x, fitness: gaFitness(x) })).sort((a, b) => b.fitness - a.fitness);
    const elites = scored.slice(0, 2).map((s) => s.x);

    const nextPop: number[] = [...elites];
    while (nextPop.length < population.length) {
      const p1 = scored[Math.floor(rng() * 3)].x;
      const p2 = scored[Math.floor(rng() * 3)].x;
      const crossPoint = 2;
      const mask = (1 << crossPoint) - 1;
      let child = (p1 & ~mask) | (p2 & mask);
      if (rng() < 0.3) {
        const bit = Math.floor(rng() * 5);
        child = child ^ (1 << bit);
      }
      child = Math.max(0, Math.min(31, child));
      nextPop.push(child);
    }
    population = nextPop;
    recordGeneration(gen);
    const best = Math.max(...population.map(gaFitness));
    frames.push(
      snapshot(
        `世代${gen}: 上位2個体(エリート)をそのまま継承、残り4個体は上位3個体からの交叉+突然変異で生成。集団: [${population.join(", ")}](最良適応度=${best})`,
      ),
    );
    population.forEach((_, i) => {
      state[i][gen] = "settled";
    });
  }

  const finalBest = Math.max(...population.map(gaFitness));
  const initialBest = Math.max(...GA_POPULATION_INITIAL.map(gaFitness));
  frames.push(
    snapshot(`計算完了(${GA_GENERATIONS}世代)。最良適応度: 初期集団=${initialBest} → 最終世代=${finalBest}(エリート主義により悪化しない)`),
  );

  return frames;
}

export const MONTE_CARLO_SEED = 123;
export const MONTE_CARLO_CHECKPOINTS = [20, 40, 60, 80, 100, 140, 180, 220, 260, 300];

function monteCarloCreateLcg(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

/**
 * モンテカルロ法のステップ列を生成する。1辺2の正方形(面積4)の中に、
 * 半径1の四分円(面積π)をランダムな点を大量に打ち込んで近似する古典的な例。
 * 「点が四分円の内側に入った割合×4」が円周率πの推定値になる
 * (四分円の面積/正方形の面積 = π/4 という比が、打ち込んだ点の比率で近似できるため)。
 * サンプル数を増やすほど推定値が真の値に近づいていく大数の法則を体感できる。
 */
export function monteCarloSteps(): DPFrame[] {
  const rng = monteCarloCreateLcg(MONTE_CARLO_SEED);
  const checkpoints = MONTE_CARLO_CHECKPOINTS;
  const totalSamples = checkpoints[checkpoints.length - 1];

  let insideCount = 0;
  const estimates: number[] = [];
  let nextCheckpointIdx = 0;

  for (let i = 1; i <= totalSamples; i++) {
    const x = rng();
    const y = rng();
    if (x * x + y * y <= 1) insideCount++;
    if (nextCheckpointIdx < checkpoints.length && i === checkpoints[nextCheckpointIdx]) {
      estimates.push(Number(((insideCount / i) * 4).toFixed(4)));
      nextCheckpointIdx++;
    }
  }

  const cols = checkpoints.length;
  const rowLabels = ["累計サンプル数", "円周率の推定値"];
  const table: (number | null)[][] = rowLabels.map(() => new Array(cols).fill(null));
  const state: DPCellState[][] = rowLabels.map(() => new Array(cols).fill("idle"));

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `モンテカルロ法を開始。1辺2の正方形に入る半径1の四分円を使い、点を打ち込んだ割合からπを推定する(打ち込む点の総数: ${totalSamples})`,
    ),
  );

  checkpoints.forEach((cp, i) => {
    table[0][i] = cp;
    table[1][i] = estimates[i];
    state[0][i] = "pivot";
    state[1][i] = "pivot";
    frames.push(
      snapshot(`累計${cp}点打ち込んだ時点でのπの推定値 = (円内の点/総点数)×4 = ${estimates[i]}`),
    );
    state[0][i] = "settled";
    state[1][i] = "settled";
  });

  const finalEstimate = estimates[estimates.length - 1];
  frames.push(
    snapshot(
      `計算完了。${totalSamples}点でのπの推定値 = ${finalEstimate}(真の値 ${Math.PI.toFixed(4)} との誤差 = ${Math.abs(finalEstimate - Math.PI).toFixed(4)})`,
    ),
  );

  return frames;
}

export const TSP_BITDP_CITIES = 4;
export const TSP_BITDP_DIST: number[][] = [
  [0, 10, 15, 20],
  [10, 0, 35, 25],
  [15, 35, 0, 30],
  [20, 25, 30, 0],
];

/**
 * 巡回セールスマン問題(ビットマスクDP)のステップ列を生成する。訪問済み都市の集合を
 * ビットマスクで表し、dp[訪問済み集合][現在地]=その状態に至る最小コストとして、
 * 全ての(部分集合, 現在地)の組み合わせについて動的計画法で解く。
 * 素朴な全探索(全順列 (n-1)! 通り)よりも大幅に少ないO(n²×2ⁿ)で厳密な最適解が求まる
 * (nが小さいうちだけ現実的だが、bitDP特有の「集合を整数として扱う」考え方の好例)。
 */
export function tspBitDpSteps(): DPFrame[] {
  const n = TSP_BITDP_CITIES;
  const dist = TSP_BITDP_DIST;
  const fullMask = (1 << n) - 1;
  const dp: (number | null)[][] = Array.from({ length: 1 << n }, () => new Array<number | null>(n).fill(null));
  const cellState: DPCellState[][] = Array.from({ length: 1 << n }, () => new Array<DPCellState>(n).fill("idle"));
  dp[1][0] = 0;
  cellState[1][0] = "settled";

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: dp.map((row, r) => row.map((value, c) => ({ value, state: cellState[r][c] }))),
    description,
  });

  frames.push(snapshot(`巡回セールスマン問題(ビットマスクDP)を開始。都市0を出発し全都市を1回ずつ訪問して都市0に戻る最短経路を求める。dp[1][0]=0(都市0のみ訪問済み、現在地0)で初期化`));

  for (let mask = 1; mask <= fullMask; mask++) {
    for (let i = 0; i < n; i++) {
      if (dp[mask][i] === null) continue;
      if (!(mask & (1 << i))) continue;
      for (let j = 0; j < n; j++) {
        if (mask & (1 << j)) continue;
        const nextMask = mask | (1 << j);
        const candidate = dp[mask][i]! + dist[i][j];
        if (dp[nextMask][j] === null || candidate < dp[nextMask][j]!) {
          dp[nextMask][j] = candidate;
          cellState[nextMask][j] = "pivot";
          frames.push(
            snapshot(
              `dp[${nextMask}][${j}] = dp[${mask}][${i}] + dist(${i},${j}) = ${dp[mask][i]} + ${dist[i][j]} = ${candidate} に更新(集合${nextMask.toString(2).padStart(n, "0")}を訪問済み、現在地${j})`,
            ),
          );
          cellState[nextMask][j] = "settled";
        }
      }
    }
  }

  let best = Infinity;
  let bestLast = -1;
  for (let i = 1; i < n; i++) {
    if (dp[fullMask][i] === null) continue;
    const total = dp[fullMask][i]! + dist[i][0];
    if (total < best) {
      best = total;
      bestLast = i;
    }
  }

  frames.push(
    snapshot(`計算完了。全都市訪問後に都市0へ戻る最小コスト = ${best}(最後に訪れた都市は${bestLast})`),
  );

  return frames;
}

export type MinhashSet = { name: string; elements: number[] };
export const MINHASH_SET_A: MinhashSet = { name: "集合A", elements: [1, 2, 3, 4, 5] };
export const MINHASH_SET_B: MinhashSet = { name: "集合B", elements: [3, 4, 5, 6, 7] };
export const MINHASH_HASH_PARAMS: [number, number][] = [
  [1, 0],
  [3, 1],
  [5, 2],
  [7, 3],
];
export const MINHASH_PRIME = 11;

/**
 * MinHash(局所性鋭敏型ハッシュの一種)のステップ列を生成する。2つの集合の類似度
 * (Jaccard係数=共通要素数/和集合の要素数)を、集合の全要素を比較する代わりに、
 * 複数のハッシュ関数それぞれについて「集合内の最小ハッシュ値」(MinHash)だけを
 * 記録した短い署名で近似する。異なる2つの集合が同じMinHash値を持つ確率は、
 * 理論的にちょうどJaccard係数に等しくなることが証明されており、
 * ハッシュ関数の数を増やすほど推定精度が上がる(このデモは4個だけなので粗い近似になる)。
 */
export function minhashLshSteps(): DPFrame[] {
  const setA = MINHASH_SET_A;
  const setB = MINHASH_SET_B;
  const hashParams = MINHASH_HASH_PARAMS;
  const p = MINHASH_PRIME;

  const hashOf = (a: number, b: number, x: number) => (a * x + b) % p;

  const cols = hashParams.length;
  const rowLabels = [`${setA.name}のMinHash`, `${setB.name}のMinHash`, "一致(1)/不一致(0)"];
  const table: (number | null)[][] = rowLabels.map(() => new Array(cols).fill(null));
  const state: DPCellState[][] = rowLabels.map(() => new Array(cols).fill("idle"));

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  const trueJaccard =
    setA.elements.filter((x) => setB.elements.includes(x)).length /
    new Set([...setA.elements, ...setB.elements]).size;

  frames.push(
    snapshot(
      `MinHashを開始。${setA.name}={${setA.elements.join(",")}}, ${setB.name}={${setB.elements.join(",")}}(真のJaccard係数=${trueJaccard.toFixed(3)})を${hashParams.length}個のハッシュ関数で近似する`,
    ),
  );

  let matches = 0;
  hashParams.forEach(([a, b], i) => {
    const minA = Math.min(...setA.elements.map((x) => hashOf(a, b, x)));
    const minB = Math.min(...setB.elements.map((x) => hashOf(a, b, x)));
    table[0][i] = minA;
    table[1][i] = minB;
    const match = minA === minB ? 1 : 0;
    table[2][i] = match;
    matches += match;
    state[0][i] = "pivot";
    state[1][i] = "pivot";
    state[2][i] = "pivot";
    frames.push(
      snapshot(
        `ハッシュ関数h(x)=(${a}x+${b}) mod ${p}: ${setA.name}の最小値=${minA}, ${setB.name}の最小値=${minB} → ${match ? "一致" : "不一致"}`,
      ),
    );
    state[0][i] = "settled";
    state[1][i] = "settled";
    state[2][i] = "settled";
  });

  const estimate = matches / hashParams.length;
  frames.push(
    snapshot(
      `計算完了。${matches}/${hashParams.length}個のハッシュ関数で一致 → 推定Jaccard係数=${estimate.toFixed(3)}(真の値${trueJaccard.toFixed(3)}との差は、ハッシュ関数を増やすことで縮まる)`,
    ),
  );

  return frames;
}

export const SUFFIX_ARRAY_STRING = "banana$";

/**
 * 接尾辞配列(Suffix Array)のステップ列を生成する。文字列の全ての接尾辞
 * (末尾から始まる部分文字列)を辞書順にソートし、各接尾辞の開始位置だけを記録した配列。
 * これを一度構築しておけば、任意のパターンの検索を二分探索でO(m log n)に高速化でき、
 * 最長共通接頭辞情報と組み合わせれば最長重複部分文字列なども求まる、文字列処理の基盤データ構造。
 * 末尾に他のどの文字よりも小さい番兵記号($)を付けることで、接尾辞同士の比較で
 * 片方がもう片方の接頭辞になる曖昧なケースを避けている。
 */
export function suffixArraySteps(): DPFrame[] {
  const s = SUFFIX_ARRAY_STRING;
  const n = s.length;
  const suffixes = Array.from({ length: n }, (_, i) => ({ index: i, text: s.slice(i) }));
  const sorted = [...suffixes].sort((a, b) => (a.text < b.text ? -1 : a.text > b.text ? 1 : 0));

  const cols = n;
  const table: (number | null)[][] = [new Array(cols).fill(null)];
  const state: DPCellState[][] = [new Array(cols).fill("idle")];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `接尾辞配列の構築を開始。文字列"${s}"の全${n}個の接尾辞: ${suffixes.map((sf) => `${sf.index}:"${sf.text}"`).join(", ")}`,
    ),
  );

  sorted.forEach((sf, rank) => {
    table[0][rank] = sf.index;
    state[0][rank] = "pivot";
    frames.push(snapshot(`辞書順で${rank}番目: 開始位置${sf.index}("${sf.text}")`));
    state[0][rank] = "settled";
  });

  frames.push(
    snapshot(`構築完了。接尾辞配列 = [${sorted.map((sf) => sf.index).join(", ")}](辞書順に並べた接尾辞の開始位置)`),
  );

  return frames;
}

/**
 * シンプレックス法のデモ用LP(Wikipedia等で広く引用される教科書的な例):
 * maximize z = 3x1 + 5x2, s.t. x1<=4, 2x2<=12, 3x1+2x2<=18, x1,x2>=0
 * 既知の最適解: x1=2, x2=6, z=36。
 */
export const SIMPLEX_OBJECTIVE = [3, 5];
export const SIMPLEX_CONSTRAINTS: { coeffs: number[]; rhs: number }[] = [
  { coeffs: [1, 0], rhs: 4 },
  { coeffs: [0, 2], rhs: 12 },
  { coeffs: [3, 2], rhs: 18 },
];

/**
 * シンプレックス法のステップ列を生成する。制約条件にスラック変数を加えて等式に変換した
 * タブロー(表)を使い、(1) 目的関数の行で最も負に大きい係数の列を「入る変数」として選び、
 * (2) その列で正の係数を持つ行のうち、RHS/係数の比が最小の行を「出る変数」として選び、
 * (3) その要素(ピボット)が1になるよう行を正規化し、他の全行からその列の成分を消去する
 * (掃き出し法/ガウスの消去法と同じ操作)、という3ステップを目的関数の行に負の係数が
 * 残らなくなるまで繰り返す。各頂点(実行可能領域の角)を辿りながら目的関数を改善していく様子が、
 * タブローの数値の変化として直接見える。
 */
export function simplexMethodSteps(): DPFrame[] {
  const numVars = SIMPLEX_OBJECTIVE.length;
  const constraints = SIMPLEX_CONSTRAINTS;
  const numSlack = constraints.length;
  const numCols = numVars + numSlack + 1;
  const numRows = numSlack + 1;

  const tableau: number[][] = [];
  constraints.forEach((con, i) => {
    const row = new Array(numCols).fill(0);
    con.coeffs.forEach((v, j) => {
      row[j] = v;
    });
    row[numVars + i] = 1;
    row[numCols - 1] = con.rhs;
    tableau.push(row);
  });
  const objRow = new Array(numCols).fill(0);
  SIMPLEX_OBJECTIVE.forEach((v, j) => {
    objRow[j] = -v;
  });
  tableau.push(objRow);

  const rowLabels = [...constraints.map((_, i) => `s${i + 1}`), "z"];
  const colLabels = [...Array.from({ length: numVars }, (_, i) => `x${i + 1}`), ...Array.from({ length: numSlack }, (_, i) => `s${i + 1}`), "RHS"];

  let highlight: { row: number; col: number } | null = null;
  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: tableau.map((row, r) =>
      row.map((value, c) => ({
        value,
        state: highlight && highlight.row === r && highlight.col === c ? "pivot" : ("idle" as DPCellState),
      })),
    ),
    description,
  });

  frames.push(
    snapshot(
      `シンプレックス法を開始。maximize z=${SIMPLEX_OBJECTIVE.map((c, i) => `${c}x${i + 1}`).join("+")}、制約: ${constraints.map((c) => `${c.coeffs.map((v, i) => `${v}x${i + 1}`).filter((_, i) => c.coeffs[i] !== 0).join("+")}<=${c.rhs}`).join(", ")}`,
    ),
  );

  let iteration = 0;
  for (;;) {
    iteration++;
    const lastRow = tableau[numRows - 1];
    let pivotCol = -1;
    let mostNegative = 0;
    for (let j = 0; j < numCols - 1; j++) {
      if (lastRow[j] < mostNegative) {
        mostNegative = lastRow[j];
        pivotCol = j;
      }
    }
    if (pivotCol === -1) {
      highlight = null;
      break;
    }

    let pivotRow = -1;
    let minRatio = Infinity;
    for (let i = 0; i < numRows - 1; i++) {
      if (tableau[i][pivotCol] > 0) {
        const ratio = tableau[i][numCols - 1] / tableau[i][pivotCol];
        if (ratio < minRatio) {
          minRatio = ratio;
          pivotRow = i;
        }
      }
    }
    highlight = pivotRow === -1 ? null : { row: pivotRow, col: pivotCol };
    if (pivotRow === -1) break;

    frames.push(
      snapshot(
        `[反復${iteration}] 入る変数=${colLabels[pivotCol]}(目的関数の行で最も負な係数${mostNegative}) / 出る変数=${rowLabels[pivotRow]}(比${minRatio.toFixed(2)}が最小)`,
      ),
    );

    const pivotValue = tableau[pivotRow][pivotCol];
    for (let j = 0; j < numCols; j++) {
      tableau[pivotRow][j] /= pivotValue;
    }
    rowLabels[pivotRow] = colLabels[pivotCol];
    for (let i = 0; i < numRows; i++) {
      if (i === pivotRow) continue;
      const factor = tableau[i][pivotCol];
      if (factor === 0) continue;
      for (let j = 0; j < numCols; j++) {
        tableau[i][j] -= factor * tableau[pivotRow][j];
      }
    }

    frames.push(snapshot(`[反復${iteration}] ピボット操作(掃き出し法)完了。タブローを更新`));
  }

  const solution = colLabels
    .slice(0, numVars)
    .map((label) => {
      const rowIdx = rowLabels.indexOf(label);
      return rowIdx !== -1 && rowIdx < numRows - 1 ? tableau[rowIdx][numCols - 1] : 0;
    });
  const z = tableau[numRows - 1][numCols - 1];

  frames.push(
    snapshot(
      `計算完了。目的関数の行に負の係数が残らなくなり最適解に到達: ${solution.map((v, i) => `x${i + 1}=${v.toFixed(2)}`).join(", ")}, z=${z.toFixed(2)}`,
    ),
  );

  return frames;
}

export const WORD_BREAK_STRING = "leetcode";
export const WORD_BREAK_DICTIONARY = ["leet", "code"];

/**
 * 単語分割問題(Word Break)のDPを1行のテーブルとして埋めていくステップ列を生成する。
 * dp[i]=「先頭i文字が辞書の単語だけで分割可能か」。coin-changeと同じ1行DPパターンを流用。
 */
export function wordBreakSteps(): DPFrame[] {
  const s = WORD_BREAK_STRING;
  const dict = new Set(WORD_BREAK_DICTIONARY);
  const n = s.length;
  const dp: (number | null)[] = new Array(n + 1).fill(null);
  dp[0] = 1;
  const state: DPCellState[] = new Array(n + 1).fill("idle");
  state[0] = "settled";

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: [dp.map((value, i) => ({ value, state: state[i] }))],
    description,
  });

  frames.push(
    snapshot(`初期状態: dp[0]=1(空文字列は分割可能)。対象文字列="${s}"、辞書={${WORD_BREAK_DICTIONARY.join(",")}}`),
  );

  for (let i = 1; i <= n; i++) {
    let found = false;
    for (let j = 0; j < i; j++) {
      state[j] = "comparing";
      const word = s.slice(j, i);
      frames.push(snapshot(`dp[${i}]を検討: dp[${j}]=${dp[j] ?? 0}かつ"${word}"が辞書に含まれるか`));
      state[j] = "idle";
      if (dp[j] === 1 && dict.has(word)) {
        found = true;
        break;
      }
    }
    dp[i] = found ? 1 : 0;
    state[i] = "settled";
    frames.push(snapshot(`dp[${i}] = ${dp[i]} を確定(先頭${i}文字="${s.slice(0, i)}"が分割可能か)`));
  }

  frames.push(
    snapshot(`計算完了。"${s}"は辞書の単語だけで分割${dp[n] === 1 ? "可能" : "不可能"}(dp[${n}]=${dp[n]})`),
  );
  return frames;
}

export const UNBOUNDED_KNAPSACK_ITEMS: DPItem[] = [
  { name: "A", weight: 2, value: 3 },
  { name: "B", weight: 3, value: 4 },
  { name: "C", weight: 4, value: 5 },
];
export const UNBOUNDED_KNAPSACK_CAPACITY = 8;

/**
 * 完全ナップサック問題のDPを1行のテーブルとして埋めていくステップ列を生成する。
 * 0-1ナップサック(knapsackSteps)と違い、容量を小さい方から大きい方へ更新することで
 * 同じ品物を何度でも使える性質を表現する。
 */
export function unboundedKnapsackSteps(): DPFrame[] {
  const items = UNBOUNDED_KNAPSACK_ITEMS;
  const capacity = UNBOUNDED_KNAPSACK_CAPACITY;
  const dp: (number | null)[] = new Array(capacity + 1).fill(null);
  dp[0] = 0;
  const state: DPCellState[] = new Array(capacity + 1).fill("idle");
  state[0] = "settled";

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: [dp.map((value, w) => ({ value, state: state[w] }))],
    description,
  });
  frames.push(snapshot("初期状態: dp[0]=0(容量0では価値0)"));

  for (const item of items) {
    frames.push(
      snapshot(`品物${item.name}(重さ${item.weight}/価値${item.value})の検討開始(容量の小さい方から更新=同じ品物を繰り返し使える)`),
    );
    for (let w = item.weight; w <= capacity; w++) {
      state[w] = "comparing";
      const candidate = dp[w - item.weight] !== null ? dp[w - item.weight]! + item.value : null;
      frames.push(
        snapshot(
          `dp[${w}]候補: dp[${w - item.weight}](=${dp[w - item.weight]})+価値${item.value}=${candidate} と現在のdp[${w}](=${dp[w] ?? 0})を比較`,
        ),
      );
      if (candidate !== null && (dp[w] === null || candidate > dp[w]!)) {
        dp[w] = candidate;
      }
      state[w] = "settled";
      frames.push(snapshot(`dp[${w}] = ${dp[w]} を確定`));
    }
  }

  frames.push(snapshot(`計算完了。容量${capacity}での最大価値は${dp[capacity]}(品物を何度でも使ってよい)`));
  return frames;
}

export const PARTITION_PROBLEM_NUMBERS = [1, 5, 11, 5];

/**
 * 集合分割問題のDPテーブルを埋めていくステップ列を生成する。
 * 「合計の半分をちょうど作れる部分集合が存在するか」という部分和問題に帰着させ、
 * subsetSumStepsと全く同じ2次元DPパターンで解く。
 */
export function partitionProblemSteps(): DPFrame[] {
  const nums = PARTITION_PROBLEM_NUMBERS;
  const total = nums.reduce((a, b) => a + b, 0);

  if (total % 2 !== 0) {
    return [
      {
        table: [[{ value: total, state: "idle" }]],
        description: `合計${total}が奇数のため、2つの等しい部分集合には分割不可能`,
      },
    ];
  }

  const target = total / 2;
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

  frames.push(
    snapshot(new Map(), `合計${total}は偶数。目標和${target}(=合計の半分)を作れる部分集合があるか判定(部分和問題への帰着)`),
  );

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
      frames.push(snapshot(highlight, `数値${num}を目標和${s}の達成に使うかどうかを検討`));
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
      `計算完了。{${nums.join(",")}}は${dp[n][target] === 1 ? "合計が等しい2つの部分集合に分割可能" : "分割不可能"}(dp[${n}][${target}]=${dp[n][target]})`,
    ),
  );
  return frames;
}

export const ASSEMBLY_LINE_ENTRY: [number, number] = [2, 4];
export const ASSEMBLY_LINE_EXIT: [number, number] = [3, 2];
export const ASSEMBLY_LINE_STATION_TIMES: [number[], number[]] = [
  [7, 9, 3, 4, 8, 4],
  [8, 5, 6, 4, 5, 7],
];
export const ASSEMBLY_LINE_TRANSFER_TIMES: [number[], number[]] = [
  [2, 3, 1, 3, 4],
  [2, 1, 2, 2, 1],
];

/**
 * 組立ラインスケジューリング問題のDPを2行(ライン1・ライン2)のテーブルとして埋めていくステップ列を生成する。
 * f[line][i] = 「そのラインのi番目のステーションに到達するまでの最短所要時間」。
 * CLRS(Cormen等)の教科書の定番例題と同じ構造の数値を使用。
 */
export function assemblyLineSchedulingSteps(): DPFrame[] {
  const [entry1, entry2] = ASSEMBLY_LINE_ENTRY;
  const [exit1, exit2] = ASSEMBLY_LINE_EXIT;
  const [times1, times2] = ASSEMBLY_LINE_STATION_TIMES;
  const [transfer1, transfer2] = ASSEMBLY_LINE_TRANSFER_TIMES;
  const n = times1.length;

  const f: (number | null)[][] = [new Array(n).fill(null), new Array(n).fill(null)];
  const state: DPCellState[][] = [new Array(n).fill("idle"), new Array(n).fill("idle")];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: f.map((row, line) => row.map((value, i) => ({ value, state: state[line][i] }))),
    description,
  });

  f[0][0] = entry1 + times1[0];
  f[1][0] = entry2 + times2[0];
  state[0][0] = "settled";
  state[1][0] = "settled";
  frames.push(
    snapshot(`初期状態: f[1][1]=進入コスト${entry1}+処理時間${times1[0]}=${f[0][0]}、f[2][1]=進入コスト${entry2}+処理時間${times2[0]}=${f[1][0]}`),
  );

  for (let i = 1; i < n; i++) {
    state[0][i] = "comparing";
    state[1][i - 1] = "comparing";
    const stay1 = f[0][i - 1]! + times1[i];
    const switchFrom2 = f[1][i - 1]! + transfer2[i - 1] + times1[i];
    frames.push(
      snapshot(`f[1][${i + 1}]を検討: ライン1に留まる(${stay1}) vs ライン2から乗り換える(${switchFrom2})`),
    );
    f[0][i] = Math.min(stay1, switchFrom2);
    state[0][i] = "settled";
    state[1][i - 1] = "idle";
    frames.push(snapshot(`f[1][${i + 1}] = ${f[0][i]} を確定`));

    state[1][i] = "comparing";
    state[0][i - 1] = "comparing";
    const stay2 = f[1][i - 1]! + times2[i];
    const switchFrom1 = f[0][i - 1]! + transfer1[i - 1] + times2[i];
    frames.push(
      snapshot(`f[2][${i + 1}]を検討: ライン2に留まる(${stay2}) vs ライン1から乗り換える(${switchFrom1})`),
    );
    f[1][i] = Math.min(stay2, switchFrom1);
    state[1][i] = "settled";
    state[0][i - 1] = "idle";
    frames.push(snapshot(`f[2][${i + 1}] = ${f[1][i]} を確定`));
  }

  const total1 = f[0][n - 1]! + exit1;
  const total2 = f[1][n - 1]! + exit2;
  const best = Math.min(total1, total2);
  frames.push(
    snapshot(`計算完了。出口コストを加えるとライン1経由=${total1}、ライン2経由=${total2}。最小所要時間は${best}`),
  );
  return frames;
}

export type FractionalKnapsackItem = { name: string; weight: number; value: number };
export const FRACTIONAL_KNAPSACK_ITEMS: FractionalKnapsackItem[] = [
  { name: "A", weight: 10, value: 60 },
  { name: "B", weight: 20, value: 100 },
  { name: "C", weight: 30, value: 120 },
];
export const FRACTIONAL_KNAPSACK_CAPACITY = 50;

/**
 * 分数ナップサック問題(貪欲法)のステップ列を生成する。価値密度(価値/重さ)の高い順に
 * ソートし、容量が許す限り詰め、最後の品物だけ端数を詰める。interval-schedulingと
 * 同じ「1回のソート+線形走査」の貪欲法パターン。
 */
export function fractionalKnapsackSteps(): DPFrame[] {
  const sorted = [...FRACTIONAL_KNAPSACK_ITEMS].sort(
    (a, b) => b.value / b.weight - a.value / a.weight,
  );
  const n = sorted.length;
  const table: (number | null)[][] = [
    sorted.map((it) => it.weight),
    sorted.map((it) => Math.round((it.value / it.weight) * 100) / 100),
    sorted.map(() => null),
  ];
  const state: DPCellState[][] = [
    sorted.map(() => "settled"),
    sorted.map(() => "settled"),
    sorted.map(() => "idle"),
  ];

  const frames: DPFrame[] = [];
  const snapshot = (description: string): DPFrame => ({
    table: table.map((row, r) => row.map((value, c) => ({ value, state: state[r][c] }))),
    description,
  });

  frames.push(
    snapshot(
      `価値密度(価値/重さ)の高い順にソート: ${sorted.map((it) => `${it.name}(密度${(it.value / it.weight).toFixed(2)})`).join(", ")}`,
    ),
  );

  let remaining = FRACTIONAL_KNAPSACK_CAPACITY;
  let totalValue = 0;
  for (let c = 0; c < n; c++) {
    state[2][c] = "comparing";
    const item = sorted[c];
    frames.push(snapshot(`品物${item.name}(重さ${item.weight}/価値${item.value})を検討(残り容量${remaining})`));

    if (remaining <= 0) {
      table[2][c] = 0;
      state[2][c] = "idle";
      frames.push(snapshot(`容量が尽きたため品物${item.name}は詰めない`));
      continue;
    }

    if (item.weight <= remaining) {
      table[2][c] = 1;
      state[2][c] = "pivot";
      remaining -= item.weight;
      totalValue += item.value;
      frames.push(snapshot(`品物${item.name}を丸ごと詰める(価値${item.value}を追加、残り容量${remaining})`));
    } else {
      const fraction = remaining / item.weight;
      table[2][c] = Math.round(fraction * 100) / 100;
      state[2][c] = "pivot";
      const partialValue = item.value * fraction;
      totalValue += partialValue;
      remaining = 0;
      frames.push(
        snapshot(`品物${item.name}を${(fraction * 100).toFixed(0)}%だけ詰めて容量を使い切る(価値${partialValue.toFixed(2)}を追加)`),
      );
    }
  }

  frames.push(snapshot(`計算完了。容量${FRACTIONAL_KNAPSACK_CAPACITY}での最大価値は${totalValue.toFixed(2)}`));
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
  "sparse-table": {
    chips: [`配列: [${SPARSE_TABLE_ARRAY.join(", ")}]`, "各セルは区間最小値(RMQ)"],
    cornerLabel: "k \\ 開始位置i",
    rowHeaders: Array.from({ length: SPARSE_TABLE_K }, (_, k) => `k=${k}`),
    colHeaders: Array.from({ length: SPARSE_TABLE_N }, (_, i) => String(i)),
  },
  "matrix-chain-multiplication": {
    chips: [`行列の次元列: ${MATRIX_DIMENSIONS.join(" × ")}`, `行列数: ${MATRIX_DIMENSIONS.length - 1}`],
    cornerLabel: "i \\ j",
    rowHeaders: Array.from({ length: MATRIX_DIMENSIONS.length - 1 }, (_, i) => `A${i + 1}`),
    colHeaders: Array.from({ length: MATRIX_DIMENSIONS.length - 1 }, (_, i) => `A${i + 1}`),
  },
  "egg-drop": {
    chips: [`卵の数: ${EGG_DROP_EGGS}`, `階数: ${EGG_DROP_FLOORS}`],
    cornerLabel: "卵数 \\ 階数",
    rowHeaders: Array.from({ length: EGG_DROP_EGGS }, (_, e) => `${e + 1}個`),
    colHeaders: Array.from({ length: EGG_DROP_FLOORS + 1 }, (_, f) => String(f)),
  },
  "longest-common-substring": {
    chips: [`文字列1: "${LONGEST_COMMON_SUBSTRING_A}"`, `文字列2: "${LONGEST_COMMON_SUBSTRING_B}"`],
    cornerLabel: "∅ \\ ∅",
    rowHeaders: ["∅", ...LONGEST_COMMON_SUBSTRING_A.split("")],
    colHeaders: ["∅", ...LONGEST_COMMON_SUBSTRING_B.split("")],
  },
  "interval-scheduling": {
    chips: [`区間: ${INTERVAL_SCHEDULING_INTERVALS.map((iv) => `${iv.label}(${iv.start}-${iv.end})`).join(", ")}`],
    cornerLabel: "属性 \\ 区間(終了時刻順)",
    rowHeaders: ["開始時刻", "終了時刻", "採用?(1/0)"],
    colHeaders: [...INTERVAL_SCHEDULING_INTERVALS].sort((a, b) => a.end - b.end).map((iv) => iv.label),
  },
  "euclidean-algorithm": {
    chips: [`a=${EUCLIDEAN_A}`, `b=${EUCLIDEAN_B}`],
    cornerLabel: "変数 \\ 反復",
    rowHeaders: ["a", "b"],
    colHeaders: (() => {
      let a = EUCLIDEAN_A;
      let b = EUCLIDEAN_B;
      let count = 1;
      while (b !== 0) {
        const r = a % b;
        a = b;
        b = r;
        count++;
      }
      return Array.from({ length: count }, (_, i) => `第${i}回`);
    })(),
  },
  "extended-euclidean": {
    chips: [`a=${EXTENDED_EUCLIDEAN_A}`, `b=${EXTENDED_EUCLIDEAN_B}`, "ax + by = gcd(a,b) を満たす(x,y)も同時に求める"],
    cornerLabel: "変数 \\ 反復",
    rowHeaders: ["r(余り)", "s", "t"],
    colHeaders: (() => {
      let r0 = EXTENDED_EUCLIDEAN_A;
      let r1 = EXTENDED_EUCLIDEAN_B;
      let count = 2;
      while (r1 !== 0) {
        const q = Math.floor(r0 / r1);
        const r2 = r0 - q * r1;
        r0 = r1;
        r1 = r2;
        count++;
      }
      return Array.from({ length: count }, (_, i) => `第${i}回`);
    })(),
  },
  "modular-exponentiation": {
    chips: [`底=${MOD_EXP_BASE}`, `指数=${MOD_EXP_EXPONENT}`, `法=${MOD_EXP_MODULUS}`],
    cornerLabel: "値 \\ 反復",
    rowHeaders: ["ビット", "底(掛けた値)", "result"],
    colHeaders: (() => {
      let e = MOD_EXP_EXPONENT;
      let count = 0;
      while (e > 0) {
        count++;
        e = e >> 1;
      }
      return Array.from({ length: count }, (_, i) => `反復${i + 1}`);
    })(),
  },
  "russian-peasant-multiplication": {
    chips: [`a=${RUSSIAN_PEASANT_A}`, `b=${RUSSIAN_PEASANT_B}`, `a×b=${RUSSIAN_PEASANT_A * RUSSIAN_PEASANT_B}`],
    cornerLabel: "値 \\ 反復",
    rowHeaders: ["a(半分に)", "b(倍に)", "aは奇数?(1/0)", "累積和"],
    colHeaders: (() => {
      let a = RUSSIAN_PEASANT_A;
      let count = 0;
      while (a > 0) {
        count++;
        a = Math.floor(a / 2);
      }
      return Array.from({ length: count }, (_, i) => `反復${i + 1}`);
    })(),
  },
  "chinese-remainder-theorem": {
    chips: [`法の組: ${CRT_MODULI.join(", ")}`, `余りの組: ${CRT_REMAINDERS.join(", ")}`, `N=${CRT_MODULI.reduce((p, c) => p * c, 1)}`],
    cornerLabel: "値 \\ i番目",
    rowHeaders: ["n_i", "a_i", "N_i=N/n_i", "逆元(N_i⁻¹ mod n_i)", "項(a_i×N_i×逆元 mod N)", "累積和 mod N"],
    colHeaders: CRT_MODULI.map((n, i) => `i=${i + 1}(mod ${n})`),
  },
  "diffie-hellman": {
    chips: [`素数p=${DH_PRIME}`, `原始根g=${DH_GENERATOR}`, "秘密鍵は非公開、公開鍵と共有鍵のみ通信路に流れる"],
    cornerLabel: "当事者 \\ 値",
    rowHeaders: ["Alice", "Bob"],
    colHeaders: ["秘密鍵", "公開鍵(g^秘密 mod p)", "共有鍵"],
  },
  "miller-rabin": {
    chips: [`n=${MILLER_RABIN_N}(=3×11×17、カーマイケル数)`, `証人: ${MILLER_RABIN_WITNESSES.join(", ")}`],
    cornerLabel: "値 \\ 証人",
    rowHeaders: ["証人a", "判定(1=素数の可能性/0=合成数の証拠)"],
    colHeaders: MILLER_RABIN_WITNESSES.map((a) => `a=${a}`),
  },
  "pollards-rho": {
    chips: [`n=${POLLARDS_RHO_N}`, "f(x)=x²+1 mod n"],
    cornerLabel: "値 \\ 反復",
    rowHeaders: ["x(遅い)", "y(速い)", "gcd(|x-y|, n)"],
    colHeaders: (() => {
      let x = 2;
      let y = 2;
      let d = 1;
      let count = 0;
      while (d === 1) {
        x = pollardsRhoF(x, POLLARDS_RHO_N);
        y = pollardsRhoF(pollardsRhoF(y, POLLARDS_RHO_N), POLLARDS_RHO_N);
        d = pollardsRhoGcd(Math.abs(x - y), POLLARDS_RHO_N);
        count++;
      }
      return Array.from({ length: count }, (_, i) => `反復${i + 1}`);
    })(),
  },
  karatsuba: {
    chips: [`x=${KARATSUBA_X}`, `y=${KARATSUBA_Y}`, "4桁×4桁を2桁ずつに分割する1段のみの簡略デモ"],
    cornerLabel: "変数",
    rowHeaders: ["値"],
    colHeaders: ["a", "b", "c", "d", "a×c", "b×d", "(a+b)×(c+d)", "ad+bc", "結果"],
  },
  rsa: {
    chips: [`p=${RSA_P}`, `q=${RSA_Q}`, `e=${RSA_E}`, `平文m=${RSA_MESSAGE}`],
    cornerLabel: "変数",
    rowHeaders: ["値"],
    colHeaders: ["p", "q", "n=pq", "φ(n)", "e", "d", "m", "c=m^e mod n", "復号=c^d mod n"],
  },
  "lucas-lehmer": {
    chips: [`p=${LUCAS_LEHMER_P}`, `M=2^${LUCAS_LEHMER_P}-1=${2 ** LUCAS_LEHMER_P - 1}`],
    cornerLabel: "数列 \\ 反復",
    rowHeaders: ["s"],
    colHeaders: Array.from({ length: LUCAS_LEHMER_P - 1 }, (_, i) => `s_${i}`),
  },
  "baby-step-giant-step": {
    chips: [`p=${BSGS_P}`, `g=${BSGS_G}`, `h=${BSGS_H}`, "g^x ≡ h (mod p) を満たすxを求める"],
    cornerLabel: "値 \\ ステップ番号",
    rowHeaders: ["j(ベビー)", "g^j mod p", "i(ジャイアント)", "y_i mod p"],
    colHeaders: Array.from({ length: Math.ceil(Math.sqrt(BSGS_P - 1)) }, (_, i) => String(i)),
  },
  "lru-cache": {
    chips: [`容量: ${LRU_CAPACITY}`, `操作列: ${LRU_OPERATIONS.map((op) => (op.type === "put" ? `put(${op.key},${op.value})` : `get(${op.key})`)).join(" → ")}`],
    cornerLabel: "キー(MRU→LRU順)",
    rowHeaders: ["キー"],
    colHeaders: Array.from({ length: LRU_CAPACITY }, (_, i) => (i === 0 ? "位置0(MRU)" : i === LRU_CAPACITY - 1 ? `位置${i}(LRU)` : `位置${i}`)),
  },
  "tf-idf": {
    chips: TFIDF_DOCUMENTS.map((d, i) => `文書${i + 1}: "${d.join(" ")}"`),
    cornerLabel: "単語 \\ 文書1..N・IDF・TFIDF1..N",
    rowHeaders: TFIDF_TERMS,
    colHeaders: [
      ...TFIDF_DOCUMENTS.map((_, i) => `TF文書${i + 1}`),
      "IDF",
      ...TFIDF_DOCUMENTS.map((_, i) => `TFIDF文書${i + 1}`),
    ],
  },
  bm25: {
    chips: [`クエリ: "${BM25_QUERY.join(" ")}"`, ...BM25_DOCUMENTS.map((d, i) => `文書${i + 1}: "${d.join(" ")}"`)],
    cornerLabel: "値 \\ 文書",
    rowHeaders: ["文書長", ...BM25_QUERY.map((q) => `"${q}"の寄与`), "BM25スコア合計"],
    colHeaders: BM25_DOCUMENTS.map((_, i) => `文書${i + 1}`),
  },
  rrf: {
    chips: [`k=${RRF_K}`, "2つの検索結果の順位を統合"],
    cornerLabel: "値 \\ 文書",
    rowHeaders: ["キーワード検索順位", "ベクトル検索順位", "RRFスコア"],
    colHeaders: RRF_DOCS,
  },
  perceptron: {
    chips: [`ANDゲート(${PERCEPTRON_DATA.length}サンプル×${PERCEPTRON_EPOCHS}エポック)`, `学習率=${PERCEPTRON_LEARNING_RATE}`],
    cornerLabel: "値 \\ ステップ",
    rowHeaders: ["w1", "w2", "bias", "予測"],
    colHeaders: Array.from({ length: PERCEPTRON_DATA.length * PERCEPTRON_EPOCHS }, (_, i) => {
      const epoch = Math.floor(i / PERCEPTRON_DATA.length) + 1;
      const sampleIdx = i % PERCEPTRON_DATA.length;
      return `E${epoch}-${sampleIdx + 1}`;
    }),
  },
  backpropagation: {
    chips: [`x=${BACKPROP_X}`, `目標y=${BACKPROP_TARGET}`, `学習率=${BACKPROP_LEARNING_RATE}`, "x→隠れ層(sigmoid)→出力の最小ネットワーク"],
    cornerLabel: "値 \\ エポック",
    rowHeaders: ["w1", "b1", "w2", "b2", "y_hat", "損失"],
    colHeaders: Array.from({ length: BACKPROP_EPOCHS }, (_, i) => `E${i + 1}`),
  },
  "naive-bayes": {
    chips: [`訓練データ${NAIVE_BAYES_DATA.length}件`, `クエリ: f1=${NAIVE_BAYES_QUERY.f1}, f2=${NAIVE_BAYES_QUERY.f2}`],
    cornerLabel: "確率 \\ クラス",
    rowHeaders: ["P(class)", "P(f1=query値|class)", "P(f2=query値|class)", "事後確率(比例値)"],
    colHeaders: ["class=0", "class=1"],
  },
  "genetic-algorithm": {
    chips: [`目的関数: f(x)=-(x-${GA_TARGET})²+100`, `初期集団: [${GA_POPULATION_INITIAL.join(", ")}]`],
    cornerLabel: "個体 \\ 世代",
    rowHeaders: GA_POPULATION_INITIAL.map((_, i) => `個体${i + 1}`),
    colHeaders: Array.from({ length: GA_GENERATIONS + 1 }, (_, i) => `世代${i}`),
  },
  "monte-carlo": {
    chips: ["半径1の四分円 / 1辺2の正方形でπを推定"],
    cornerLabel: "値 \\ チェックポイント",
    rowHeaders: ["累計サンプル数", "円周率の推定値"],
    colHeaders: MONTE_CARLO_CHECKPOINTS.map((cp) => `${cp}点`),
  },
  "tsp-bitdp": {
    chips: [`都市数: ${TSP_BITDP_CITIES}`, "訪問済み集合をビットマスクで管理"],
    cornerLabel: "訪問済み集合(mask) \\ 現在地",
    rowHeaders: Array.from({ length: 1 << TSP_BITDP_CITIES }, (_, mask) => mask.toString(2).padStart(TSP_BITDP_CITIES, "0")),
    colHeaders: Array.from({ length: TSP_BITDP_CITIES }, (_, i) => `都市${i}`),
  },
  "minhash-lsh": {
    chips: [`${MINHASH_SET_A.name}={${MINHASH_SET_A.elements.join(",")}}`, `${MINHASH_SET_B.name}={${MINHASH_SET_B.elements.join(",")}}`],
    cornerLabel: "値 \\ ハッシュ関数",
    rowHeaders: [`${MINHASH_SET_A.name}のMinHash`, `${MINHASH_SET_B.name}のMinHash`, "一致(1)/不一致(0)"],
    colHeaders: MINHASH_HASH_PARAMS.map(([a, b]) => `h(${a}x+${b})`),
  },
  "suffix-array": {
    chips: [`文字列: "${SUFFIX_ARRAY_STRING}"`],
    cornerLabel: "開始位置(辞書順)",
    rowHeaders: ["開始位置"],
    colHeaders: Array.from({ length: SUFFIX_ARRAY_STRING.length }, (_, i) => `第${i}位`),
  },
  "simplex-method": {
    chips: [
      `maximize z=${SIMPLEX_OBJECTIVE.map((c, i) => `${c}x${i + 1}`).join("+")}`,
      ...SIMPLEX_CONSTRAINTS.map((c) => `${c.coeffs.map((v, i) => `${v}x${i + 1}`).join("+")}<=${c.rhs}`),
    ],
    cornerLabel: "基底変数 \\ 変数",
    rowHeaders: [...SIMPLEX_CONSTRAINTS.map((_, i) => `s${i + 1}`), "z"],
    colHeaders: [
      ...SIMPLEX_OBJECTIVE.map((_, i) => `x${i + 1}`),
      ...SIMPLEX_CONSTRAINTS.map((_, i) => `s${i + 1}`),
      "RHS",
    ],
  },
  "word-break-problem": {
    chips: [`対象文字列: "${WORD_BREAK_STRING}"`, `辞書: {${WORD_BREAK_DICTIONARY.join(",")}}`],
    cornerLabel: "分割可能?(1/0)",
    rowHeaders: ["dp"],
    colHeaders: Array.from({ length: WORD_BREAK_STRING.length + 1 }, (_, i) => String(i)),
  },
  "unbounded-knapsack": {
    chips: [
      ...UNBOUNDED_KNAPSACK_ITEMS.map((item) => `${item.name}: 重さ${item.weight} / 価値${item.value}`),
      `容量: ${UNBOUNDED_KNAPSACK_CAPACITY}(品物は何度でも使用可)`,
    ],
    cornerLabel: "最大価値 \\ 容量",
    rowHeaders: ["価値"],
    colHeaders: Array.from({ length: UNBOUNDED_KNAPSACK_CAPACITY + 1 }, (_, w) => String(w)),
  },
  "partition-problem": {
    chips: [
      `数値集合: {${PARTITION_PROBLEM_NUMBERS.join(",")}}`,
      `目標和: 合計の半分(1=達成可能/0=不可)`,
    ],
    cornerLabel: "個数 \\ 和",
    rowHeaders: ["∅", ...PARTITION_PROBLEM_NUMBERS.map(String)],
    colHeaders: Array.from(
      { length: PARTITION_PROBLEM_NUMBERS.reduce((a, b) => a + b, 0) / 2 + 1 },
      (_, s) => String(s),
    ),
  },
  "assembly-line-scheduling": {
    chips: [
      `ライン1の処理時間: ${ASSEMBLY_LINE_STATION_TIMES[0].join(", ")}`,
      `ライン2の処理時間: ${ASSEMBLY_LINE_STATION_TIMES[1].join(", ")}`,
      `進入コスト: ${ASSEMBLY_LINE_ENTRY.join(", ")} / 出口コスト: ${ASSEMBLY_LINE_EXIT.join(", ")}`,
    ],
    cornerLabel: "ライン \\ ステーション",
    rowHeaders: ["ライン1", "ライン2"],
    colHeaders: ASSEMBLY_LINE_STATION_TIMES[0].map((_, i) => `S${i + 1}`),
  },
  "fractional-knapsack": {
    chips: [
      ...FRACTIONAL_KNAPSACK_ITEMS.map((it) => `${it.name}: 重さ${it.weight} / 価値${it.value}`),
      `容量: ${FRACTIONAL_KNAPSACK_CAPACITY}(分割して詰めてよい)`,
    ],
    cornerLabel: "属性 \\ 品物(価値密度順)",
    rowHeaders: ["重さ", "価値密度", "詰めた割合(0〜1)"],
    colHeaders: [...FRACTIONAL_KNAPSACK_ITEMS]
      .sort((a, b) => b.value / b.weight - a.value / a.weight)
      .map((it) => it.name),
  },
  "fermat-primality-test": {
    chips: [`判定対象: n=${FERMAT_N}`, `試す底: ${FERMAT_WITNESSES.join(", ")}`],
    cornerLabel: "項目 \\ 底",
    rowHeaders: ["底a", "a^(n-1) mod n"],
    colHeaders: FERMAT_WITNESSES.map((a) => `a=${a}`),
  },
  "pollards-p-minus-1": {
    chips: [`判定対象: n=${POLLARDS_P_MINUS_1_N}`, `境界B=${POLLARDS_P_MINUS_1_BOUND}`],
    cornerLabel: "項目 \\ 反復",
    rowHeaders: ["k", "a", "gcd(a-1,n)"],
    colHeaders: Array.from({ length: POLLARDS_P_MINUS_1_BOUND - 1 }, (_, i) => `k=${i + 2}`),
  },
  "tonelli-shanks": {
    chips: [`n=${TONELLI_SHANKS_N}`, `p=${TONELLI_SHANKS_P}`],
    cornerLabel: "変数 \\ 反復",
    rowHeaders: ["M", "c", "t", "R"],
    colHeaders: Array.from({ length: 6 }, (_, i) => `#${i}`),
  },
  "montgomery-multiplication": {
    chips: [`a=${MONTGOMERY_A}`, `b=${MONTGOMERY_B}`, `n=${MONTGOMERY_N}`],
    cornerLabel: "手順",
    rowHeaders: ["値"],
    colHeaders: ["a'", "b'", "a'b'", "m", "t", "結果'", "結果", "検算"],
  },
  "elgamal-encryption": {
    chips: [`p=${ELGAMAL_P}`, `g=${ELGAMAL_G}`, `秘密鍵x=${ELGAMAL_X}`, `平文m=${ELGAMAL_M}`],
    cornerLabel: "手順",
    rowHeaders: ["値"],
    colHeaders: ["公開鍵y", "c1", "共有s", "c2", "s'^-1", "復号m'", "元のm"],
  },
  "elliptic-curve-cryptography": {
    chips: [
      `曲線: y²=x³+${EC_A}x+${EC_B} (mod ${EC_P})`,
      `基点P=(${EC_BASE_POINT?.x},${EC_BASE_POINT?.y})`,
      `スカラーk=${EC_SCALAR}`,
    ],
    cornerLabel: "項目 \\ ビット",
    rowHeaders: ["ビット", "result", "2倍点"],
    colHeaders: Array.from({ length: EC_SCALAR.toString(2).length }, (_, i) => `bit${i}`),
  },
  "toom-cook-multiplication": {
    chips: [`x=${TOOM_COOK_X}`, `y=${TOOM_COOK_Y}`],
    cornerLabel: "多項式 \\ 評価点",
    rowHeaders: ["P(t)", "Q(t)"],
    colHeaders: ["t=0", "t=1", "t=-1", "t=2", "t=∞"],
  },
  "gaussian-elimination": {
    chips: GAUSSIAN_ELIMINATION_MATRIX.map((row, i) => `${i + 1}行目: [${row.join(", ")}]`),
    cornerLabel: "行 \\ 列",
    rowHeaders: GAUSSIAN_ELIMINATION_MATRIX.map((_, i) => `${i + 1}行目`),
    colHeaders: [...GAUSSIAN_ELIMINATION_MATRIX[0].slice(0, -1).map((_, i) => `x${i + 1}`), "定数項"],
  },
  "lu-decomposition": {
    chips: LU_DECOMPOSITION_MATRIX.map((row, i) => `A${i + 1}行目: [${row.join(", ")}]`),
    cornerLabel: "行 \\ 列(下三角=L, 上三角=U)",
    rowHeaders: LU_DECOMPOSITION_MATRIX.map((_, i) => `${i + 1}行目`),
    colHeaders: LU_DECOMPOSITION_MATRIX[0].map((_, i) => `列${i + 1}`),
  },
  "least-squares": {
    chips: LEAST_SQUARES_POINTS.map((p) => `(${p.x}, ${p.y})`),
    cornerLabel: "手順",
    rowHeaders: ["値"],
    colHeaders: ["Σx", "Σy", "Σxy", "Σx²", "傾きm", "切片b", "残差平方和"],
  },
  "power-iteration": {
    chips: [`A=[[2,1],[1,2]]`, `初期v0=(${POWER_ITERATION_INITIAL.join(",")})`],
    cornerLabel: "項目 \\ 反復",
    rowHeaders: ["v.x", "v.y", "固有値推定"],
    colHeaders: Array.from({ length: POWER_ITERATION_STEPS }, (_, i) => `反復${i + 1}`),
  },
  "discrete-convolution": {
    chips: [`信号=[${CONVOLUTION_SIGNAL.join(", ")}]`, `カーネル=[${CONVOLUTION_KERNEL.join(", ")}]`],
    cornerLabel: "出力インデックス",
    rowHeaders: ["畳み込み結果"],
    colHeaders: Array.from(
      { length: CONVOLUTION_SIGNAL.length + CONVOLUTION_KERNEL.length - 1 },
      (_, i) => `out[${i}]`,
    ),
  },
  "qr-decomposition": {
    chips: [`a1=(${QR_DECOMPOSITION_A1.join(",")})`, `a2=(${QR_DECOMPOSITION_A2.join(",")})`],
    cornerLabel: "成分 \\ 手順",
    rowHeaders: ["x成分", "y成分"],
    colHeaders: ["r11", "q1", "r12", "a2'", "r22", "q2"],
  },
  "multivariate-newton-method": {
    chips: [
      `方程式1: x²+y²-4=0`,
      `方程式2: x-y=0`,
      `初期値: (${MULTIVARIATE_NEWTON_START.join(",")})`,
    ],
    cornerLabel: "変数 \\ 反復",
    rowHeaders: ["x", "y", "f1(x,y)", "f2(x,y)"],
    colHeaders: Array.from({ length: MULTIVARIATE_NEWTON_ITERATIONS + 1 }, (_, i) => (i === 0 ? "初期値" : `反復${i}`)),
  },
  "needleman-wunsch": {
    chips: [
      `配列A: "${NEEDLEMAN_WUNSCH_A}"`,
      `配列B: "${NEEDLEMAN_WUNSCH_B}"`,
      `一致=+${NEEDLEMAN_WUNSCH_MATCH} / 不一致=${NEEDLEMAN_WUNSCH_MISMATCH} / ギャップ=${NEEDLEMAN_WUNSCH_GAP}`,
    ],
    cornerLabel: "A \\ B",
    rowHeaders: ["∅", ...NEEDLEMAN_WUNSCH_A.split("")],
    colHeaders: ["∅", ...NEEDLEMAN_WUNSCH_B.split("")],
  },
  "smith-waterman": {
    chips: [
      `配列A: "${SMITH_WATERMAN_A}"`,
      `配列B: "${SMITH_WATERMAN_B}"`,
      `一致=+${SMITH_WATERMAN_MATCH} / 不一致=${SMITH_WATERMAN_MISMATCH} / ギャップ=${SMITH_WATERMAN_GAP}`,
    ],
    cornerLabel: "A \\ B",
    rowHeaders: ["∅", ...SMITH_WATERMAN_A.split("")],
    colHeaders: ["∅", ...SMITH_WATERMAN_B.split("")],
  },
  "nussinov-algorithm": {
    chips: [`RNA配列: "${NUSSINOV_RNA}"`, "ペア規則: G-C, A-Uのみ"],
    cornerLabel: "i \\ j",
    rowHeaders: NUSSINOV_RNA.split(""),
    colHeaders: NUSSINOV_RNA.split(""),
  },
  "multiple-sequence-alignment": {
    chips: MSA_SEQUENCES.map((s, i) => `配列${i + 1}: "${s}"`),
    cornerLabel: "手順",
    rowHeaders: ["値"],
    colHeaders: ["段階1スコア", "整列結果1", "段階2準備", "段階2スコア", "整列結果2", "完成"],
  },
  "viterbi-algorithm": {
    chips: [`観測列: ${VITERBI_OBSERVATIONS.join(" → ")}`, `隠れ状態: ${VITERBI_STATES.join(", ")}`],
    cornerLabel: "状態 \\ 時刻",
    rowHeaders: VITERBI_STATES,
    colHeaders: VITERBI_OBSERVATIONS,
  },
  "forward-backward-algorithm": {
    chips: [`観測列: ${VITERBI_OBSERVATIONS.join(" → ")}`, `隠れ状態: ${VITERBI_STATES.join(", ")}`],
    cornerLabel: "α/β[状態] \\ 時刻",
    rowHeaders: [...VITERBI_STATES.map((s) => `α[${s}]`), ...VITERBI_STATES.map((s) => `β[${s}]`)],
    colHeaders: VITERBI_OBSERVATIONS,
  },
  "cky-algorithm": {
    chips: [`文: "${CKY_SENTENCE.join(" ")}"`, "文法: S→NP VP, VP→V NP, NP→Det N"],
    cornerLabel: "開始 \\ 終了(単語位置)",
    rowHeaders: CKY_SENTENCE.map((_, i) => `${i}`),
    colHeaders: CKY_SENTENCE.map((_, i) => `${i}`),
  },
  "conditional-random-field": {
    chips: [`単語列: ${CRF_SENTENCE.join(" ")}`, `タグ: ${CRF_TAGS.join(", ")}`],
    cornerLabel: "タグ \\ 時刻",
    rowHeaders: CRF_TAGS,
    colHeaders: CRF_SENTENCE,
  },
  "optimal-binary-search-tree": {
    chips: OBST_KEYS.map((k, i) => `${k}: 頻度${OBST_FREQ[i]}`),
    cornerLabel: "開始 \\ 終了",
    rowHeaders: OBST_KEYS,
    colHeaders: OBST_KEYS,
  },
  "palindrome-partitioning": {
    chips: [`文字列: "${PALINDROME_PARTITIONING_STRING}"`],
    cornerLabel: "開始 \\ 終了",
    rowHeaders: PALINDROME_PARTITIONING_STRING.split(""),
    colHeaders: PALINDROME_PARTITIONING_STRING.split(""),
  },
  "burst-balloons-dp": {
    chips: [`風船: [${BURST_BALLOONS_NUMS.join(", ")}](両端に番兵1を追加)`],
    cornerLabel: "左境界 \\ 右境界",
    rowHeaders: [1, ...BURST_BALLOONS_NUMS, 1].map((v) => String(v)),
    colHeaders: [1, ...BURST_BALLOONS_NUMS, 1].map((v) => String(v)),
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
  "sparse-table": sparseTableSteps,
  "matrix-chain-multiplication": matrixChainSteps,
  "egg-drop": eggDropSteps,
  "longest-common-substring": longestCommonSubstringSteps,
  "interval-scheduling": intervalSchedulingSteps,
  "euclidean-algorithm": euclideanAlgorithmSteps,
  "extended-euclidean": extendedEuclideanSteps,
  "modular-exponentiation": modularExponentiationSteps,
  "russian-peasant-multiplication": russianPeasantMultiplicationSteps,
  "chinese-remainder-theorem": chineseRemainderTheoremSteps,
  "diffie-hellman": diffieHellmanSteps,
  "miller-rabin": millerRabinSteps,
  "pollards-rho": pollardsRhoSteps,
  karatsuba: karatsubaSteps,
  rsa: rsaSteps,
  "lucas-lehmer": lucasLehmerSteps,
  "baby-step-giant-step": babyStepGiantStepSteps,
  "lru-cache": lruCacheSteps,
  "tf-idf": tfidfSteps,
  bm25: bm25Steps,
  rrf: rrfSteps,
  perceptron: perceptronSteps,
  backpropagation: backpropagationSteps,
  "naive-bayes": naiveBayesSteps,
  "genetic-algorithm": geneticAlgorithmSteps,
  "monte-carlo": monteCarloSteps,
  "tsp-bitdp": tspBitDpSteps,
  "minhash-lsh": minhashLshSteps,
  "suffix-array": suffixArraySteps,
  "simplex-method": simplexMethodSteps,
  "word-break-problem": wordBreakSteps,
  "unbounded-knapsack": unboundedKnapsackSteps,
  "partition-problem": partitionProblemSteps,
  "assembly-line-scheduling": assemblyLineSchedulingSteps,
  "fractional-knapsack": fractionalKnapsackSteps,
  "fermat-primality-test": fermatPrimalityTestSteps,
  "pollards-p-minus-1": pollardsPMinus1Steps,
  "tonelli-shanks": tonelliShanksSteps,
  "montgomery-multiplication": montgomeryMultiplicationSteps,
  "elgamal-encryption": elgamalEncryptionSteps,
  "elliptic-curve-cryptography": ellipticCurveCryptographySteps,
  "toom-cook-multiplication": toomCookMultiplicationSteps,
  "gaussian-elimination": gaussianEliminationSteps,
  "lu-decomposition": luDecompositionSteps,
  "least-squares": leastSquaresSteps,
  "power-iteration": powerIterationSteps,
  "discrete-convolution": discreteConvolutionSteps,
  "qr-decomposition": qrDecompositionSteps,
  "multivariate-newton-method": multivariateNewtonMethodSteps,
  "needleman-wunsch": needlemanWunschSteps,
  "smith-waterman": smithWatermanSteps,
  "nussinov-algorithm": nussinovAlgorithmSteps,
  "multiple-sequence-alignment": multipleSequenceAlignmentSteps,
  "viterbi-algorithm": viterbiAlgorithmSteps,
  "forward-backward-algorithm": forwardBackwardAlgorithmSteps,
  "cky-algorithm": ckyAlgorithmSteps,
  "conditional-random-field": conditionalRandomFieldSteps,
  "optimal-binary-search-tree": optimalBinarySearchTreeSteps,
  "palindrome-partitioning": palindromePartitioningSteps,
  "burst-balloons-dp": burstBalloonsDpSteps,
};
