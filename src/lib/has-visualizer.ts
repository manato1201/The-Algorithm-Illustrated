import { SORT_VISUALIZERS } from "./sort-visualizers";
import { PATHFINDING_VISUALIZERS } from "./pathfinding-visualizers";
import { DP_VISUALIZERS } from "./dp-visualizers";
import { GRAPH_VISUALIZERS } from "./graph-visualizers";
import { SEARCH_VISUALIZERS } from "./search-visualizers";
import { TREE_VISUALIZERS } from "./tree-visualizers";
import { STRING_VISUALIZERS } from "./string-visualizers";
import { TRIE_VISUALIZERS } from "./trie-visualizer";

/**
 * このidに対応する可視化があるかどうか。React componentへの依存を一切持たないため、
 * ビルド時(getAllAlgorithmsMeta)・詳細ページ・比較画面のいずれからでも安全にimportできる。
 * AlgorithmVisualizer.tsxはこの関数を re-export するだけにし、実体はここに一本化する。
 */
export function hasVisualizer(algorithmId: string): boolean {
  return (
    algorithmId in SORT_VISUALIZERS ||
    algorithmId in PATHFINDING_VISUALIZERS ||
    algorithmId in DP_VISUALIZERS ||
    algorithmId in GRAPH_VISUALIZERS ||
    algorithmId in SEARCH_VISUALIZERS ||
    algorithmId in TREE_VISUALIZERS ||
    algorithmId in STRING_VISUALIZERS ||
    algorithmId in TRIE_VISUALIZERS
  );
}
