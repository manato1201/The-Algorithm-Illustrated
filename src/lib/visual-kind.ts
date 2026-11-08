import { SORT_VISUALIZERS } from "./sort-visualizers.ts";
import { PATHFINDING_VISUALIZERS } from "./pathfinding-visualizers.ts";
import { DP_VISUALIZERS } from "./dp-visualizers.ts";
import { GRAPH_VISUALIZERS } from "./graph-visualizers.ts";
import { SEARCH_VISUALIZERS } from "./search-visualizers.ts";
import { BAR_VISUALIZERS } from "./bar-visualizers.ts";
import { TREE_VISUALIZERS } from "./tree-visualizers.ts";
import { STRING_VISUALIZERS } from "./string-visualizers.ts";
import { TRIE_VISUALIZERS } from "./trie-visualizer.ts";
import { GEOMETRY_VISUALIZERS } from "./geometry-visualizers.ts";
import { LANE_VISUALIZERS } from "./lane-visualizers.ts";
import { SIGNAL_VISUALIZERS } from "./signal-visualizers.ts";
import { SCENE3D_VISUALIZERS } from "./scene3d-visualizers.ts";

/**
 * このidを、どの種類の可視化(描画コンポーネント)が受け持つか。
 * 詳細ページ・比較画面の振り分け(AlgorithmVisualizer)と、全体図・値の出どころの札が同じ判定を使うための一本化。
 * 同じidが複数のレジストリにあるときは、ここに並べた順で先に見つかった種類が受け持つ(従来の振り分けと同じ順)。
 * ※ 相対importに拡張子(.ts)を付けているのは、Node の型除去実行(scripts/*.mjs)からも直接読めるようにするため。
 */
export type VisualKind =
  | "sort"
  | "pathfinding"
  | "dp"
  | "graph"
  | "search"
  | "tree"
  | "string"
  | "trie"
  | "geometry"
  | "lanes"
  | "signal"
  | "scene3d";

const ORDER: [VisualKind, Record<string, unknown>][] = [
  ["sort", SORT_VISUALIZERS],
  ["pathfinding", PATHFINDING_VISUALIZERS],
  ["dp", DP_VISUALIZERS],
  ["graph", GRAPH_VISUALIZERS],
  ["search", SEARCH_VISUALIZERS],
  ["search", BAR_VISUALIZERS], // 配列の棒グラフ可視化は SearchVisualizer が描く
  ["tree", TREE_VISUALIZERS],
  ["string", STRING_VISUALIZERS],
  ["trie", TRIE_VISUALIZERS],
  ["geometry", GEOMETRY_VISUALIZERS],
  ["lanes", LANE_VISUALIZERS],
  ["signal", SIGNAL_VISUALIZERS],
  ["scene3d", SCENE3D_VISUALIZERS],
];

/** 対応する可視化が無ければ null。 */
export function visualKindOf(algorithmId: string): VisualKind | null {
  for (const [kind, registry] of ORDER) {
    if (algorithmId in registry) return kind;
  }
  return null;
}

/** 閲覧者が入力(配列の並び・要素数・行列サイズ)を変えて、その場で計算し直せる種類。 */
export function isInputAdjustable(kind: VisualKind): boolean {
  return kind === "sort" || kind === "lanes";
}
