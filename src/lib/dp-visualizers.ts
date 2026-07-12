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
};
