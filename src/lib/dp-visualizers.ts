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
};
