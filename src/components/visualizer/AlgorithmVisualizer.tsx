import { SortVisualizer } from "./SortVisualizer";
import { PathfindingVisualizer } from "./PathfindingVisualizer";
import { DPTableVisualizer } from "./DPTableVisualizer";
import { GraphVisualizer } from "./GraphVisualizer";
import { SearchVisualizer } from "./SearchVisualizer";
import { TreeVisualizer } from "./TreeVisualizer";
import { StringMatchVisualizer } from "./StringMatchVisualizer";
import { TrieVisualizer } from "./TrieVisualizer";
import { GeometryVisualizer } from "./GeometryVisualizer";
import { LaneVisualizer } from "./LaneVisualizer";
import { SignalVisualizer } from "./SignalVisualizer";
import { AlgorithmMetaProvider } from "./AlgorithmMeta";
import { visualKindOf, type VisualKind } from "@/lib/visual-kind";
import { flowOverviewFor } from "@/lib/flow-overview";
import { visualizationProvenance } from "@/lib/provenance";

/**
 * このidに対応する可視化コンポーネントが存在するかどうか。詳細ページ・比較画面の両方から使う。
 * 実体は src/lib/has-visualizer.ts に一本化されている(React componentへの依存を持たないため、
 * カタログ一覧のビルド時メタデータ計算(getAllAlgorithmsMeta)からも安全にimportできる)。
 * ここでは既存の呼び出し元(詳細ページ・比較画面)のimportパスを変えずに済むようre-exportする。
 */
export { hasVisualizer } from "@/lib/has-visualizer";

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
  const kind = visualKindOf(algorithmId);
  if (kind === null) return null;
  return (
    <AlgorithmMetaProvider
      value={{
        flow: flowOverviewFor(algorithmId, kind),
        provenance: visualizationProvenance(algorithmId, kind),
      }}
    >
      {renderVisualizer(kind, algorithmId)}
    </AlgorithmMetaProvider>
  );
}

function renderVisualizer(kind: VisualKind, algorithmId: string) {
  switch (kind) {
    case "sort":
      return <SortVisualizer algorithmId={algorithmId} />;
    case "pathfinding":
      return <PathfindingVisualizer algorithmId={algorithmId} />;
    case "dp":
      return <DPTableVisualizer algorithmId={algorithmId} />;
    case "graph":
      return <GraphVisualizer algorithmId={algorithmId} />;
    case "search":
      return <SearchVisualizer algorithmId={algorithmId} />;
    case "tree":
      return <TreeVisualizer algorithmId={algorithmId} />;
    case "string":
      return <StringMatchVisualizer algorithmId={algorithmId} />;
    case "trie":
      return <TrieVisualizer algorithmId={algorithmId} />;
    case "geometry":
      return <GeometryVisualizer algorithmId={algorithmId} />;
    case "lanes":
      return <LaneVisualizer algorithmId={algorithmId} />;
    case "signal":
      return <SignalVisualizer algorithmId={algorithmId} />;
  }
}
