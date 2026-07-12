import { SortVisualizer } from "./SortVisualizer";
import { PathfindingVisualizer } from "./PathfindingVisualizer";
import { DPTableVisualizer } from "./DPTableVisualizer";
import { GraphVisualizer } from "./GraphVisualizer";
import { SearchVisualizer } from "./SearchVisualizer";
import { TreeVisualizer } from "./TreeVisualizer";
import { StringMatchVisualizer } from "./StringMatchVisualizer";
import { SORT_VISUALIZERS } from "@/lib/sort-visualizers";
import { PATHFINDING_VISUALIZERS } from "@/lib/pathfinding-visualizers";
import { DP_VISUALIZERS } from "@/lib/dp-visualizers";
import { GRAPH_VISUALIZERS } from "@/lib/graph-visualizers";
import { SEARCH_VISUALIZERS } from "@/lib/search-visualizers";
import { TREE_VISUALIZERS } from "@/lib/tree-visualizers";
import { STRING_VISUALIZERS } from "@/lib/string-visualizers";

/** このidに対応する可視化コンポーネントが存在するかどうか。詳細ページ・比較画面の両方から使う。 */
export function hasVisualizer(algorithmId: string): boolean {
  return (
    algorithmId in SORT_VISUALIZERS ||
    algorithmId in PATHFINDING_VISUALIZERS ||
    algorithmId in DP_VISUALIZERS ||
    algorithmId in GRAPH_VISUALIZERS ||
    algorithmId in SEARCH_VISUALIZERS ||
    algorithmId in TREE_VISUALIZERS ||
    algorithmId in STRING_VISUALIZERS
  );
}

type AlgorithmVisualizerProps = {
  algorithmId: string;
};

/**
 * どの可視化コンポーネントを使うかをidから振り分ける共通ディスパッチャ。
 * アルゴリズム詳細ページ(src/app/algorithms/[id]/page.tsx)と比較画面(CompareView.tsx)の
 * 両方から使われる。可視化の種類が増えるたびにこの1箇所だけ直せばよいようにするためのもの。
 * どの可視化にも該当しない場合はnullを返す(呼び出し側でhasVisualizer()と組み合わせて
 * プレースホルダ表示を出し分ける)。
 */
export function AlgorithmVisualizer({ algorithmId }: AlgorithmVisualizerProps) {
  if (algorithmId in SORT_VISUALIZERS)
    return <SortVisualizer algorithmId={algorithmId} />;
  if (algorithmId in PATHFINDING_VISUALIZERS)
    return <PathfindingVisualizer algorithmId={algorithmId} />;
  if (algorithmId in DP_VISUALIZERS)
    return <DPTableVisualizer algorithmId={algorithmId} />;
  if (algorithmId in GRAPH_VISUALIZERS)
    return <GraphVisualizer algorithmId={algorithmId} />;
  if (algorithmId in SEARCH_VISUALIZERS)
    return <SearchVisualizer algorithmId={algorithmId} />;
  if (algorithmId in TREE_VISUALIZERS)
    return <TreeVisualizer algorithmId={algorithmId} />;
  if (algorithmId in STRING_VISUALIZERS)
    return <StringMatchVisualizer algorithmId={algorithmId} />;
  return null;
}
