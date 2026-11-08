import type { VisualKind } from "./visual-kind.ts";

/**
 * 全体図(IMPROVEMENT_DESIGN_2026-10 第6弾): 「入力 → 工程 → 出力」を操作の横に出しっぱなしにする。
 * 工程は再生中の状態種別(比較・入れ替え・基準・確定)から決まり、今の工程が光る。
 * ここでは入力と出力の文言を持つ。種類ごとの共通の説明を基本とし、代表的なアルゴリズムだけは個別に書く
 * (個別の入出力を全件には書いていない。書いていないものは種類の説明になる)。
 */
export type FlowIO = { input: string; output: string };

export const FLOW_BY_KIND: Record<VisualKind, FlowIO> = {
  sort: { input: "整列前の配列", output: "昇順に整列した配列" },
  search: { input: "対象の配列(固定の入力)", output: "見つかった位置・最終状態の配列" },
  pathfinding: { input: "格子・始点・終点・壁", output: "始点から終点への経路" },
  graph: { input: "ノードと辺のグラフ", output: "確定した辺・ノード(経路・木・流れなど、問題ごとの結果)" },
  dp: { input: "問題の入力(文字列・品物など)", output: "表が埋まった結果と、最後に求まる答え" },
  tree: { input: "挿入・削除などの操作の列", output: "操作後の木" },
  string: { input: "文章とパターン", output: "一致した位置" },
  trie: { input: "登録する語と検索する語", output: "見つかった語" },
  geometry: { input: "点・線分の集合", output: "凸包・交点など、問題ごとの図形" },
  lanes: { input: "同じ行列 A と B", output: "3方式の結果(どれも同じ A×B)と、かかったステップ数" },
  signal: { input: "入力の波形(固定の信号)", output: "処理後の波形・係数・スペクトル" },
};

/** 代表的なアルゴリズムの個別の入出力。 */
export const FLOW_OVERRIDES: Record<string, FlowIO> = {
  "binary-search": { input: "整列済みの配列と、探す値", output: "値の位置(見つからなければ「なし」)" },
  dijkstra: { input: "重み付きの格子と、始点・終点", output: "始点から終点までの最短経路" },
  "a-star": { input: "格子・始点・終点と、ゴールまでの見積もり", output: "始点から終点までの最短経路" },
  bfs: { input: "格子・始点・終点", output: "辺の数が最少の経路" },
  kruskal: { input: "重み付きの無向グラフ", output: "全ノードをつなぐ最小の木(最小全域木)" },
  "knapsack-dp": { input: "品物(重さ・価値)と容量", output: "容量内で価値が最大になる合計" },
  "edit-distance": { input: "2つの文字列", output: "一方を他方に変える最小の編集回数" },
  kmp: { input: "文章と、探すパターン", output: "パターンが現れる開始位置(すべて)" },
};

export function flowOverviewFor(algorithmId: string, kind: VisualKind): FlowIO {
  return FLOW_OVERRIDES[algorithmId] ?? FLOW_BY_KIND[kind];
}
