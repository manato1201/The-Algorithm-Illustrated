import { notFound } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import { ComplexityBadge } from "@/components/hud/ComplexityBadge";
import { SortVisualizer } from "@/components/visualizer/SortVisualizer";
import { PathfindingVisualizer } from "@/components/visualizer/PathfindingVisualizer";
import { DPTableVisualizer } from "@/components/visualizer/DPTableVisualizer";
import { GraphVisualizer } from "@/components/visualizer/GraphVisualizer";
import { SearchVisualizer } from "@/components/visualizer/SearchVisualizer";
import {
  getAllAlgorithmIds,
  getAlgorithmDetail,
} from "@/lib/content/algorithms";
import { SORT_VISUALIZERS } from "@/lib/sort-visualizers";
import { PATHFINDING_VISUALIZERS } from "@/lib/pathfinding-visualizers";
import { DP_VISUALIZERS } from "@/lib/dp-visualizers";
import { GRAPH_VISUALIZERS } from "@/lib/graph-visualizers";
import { SEARCH_VISUALIZERS } from "@/lib/search-visualizers";

type AlgorithmDetailPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return getAllAlgorithmIds().map((id) => ({ id }));
}

export default async function AlgorithmDetailPage({
  params,
}: AlgorithmDetailPageProps) {
  const { id } = await params;
  const algorithm = getAlgorithmDetail(id);

  if (!algorithm) {
    notFound();
  }

  const isSortVisualized = id in SORT_VISUALIZERS;
  const isPathfindingVisualized = id in PATHFINDING_VISUALIZERS;
  const isDPVisualized = id in DP_VISUALIZERS;
  const isGraphVisualized = id in GRAPH_VISUALIZERS;
  const isSearchVisualized = id in SEARCH_VISUALIZERS;

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.backLink}>
        ← カタログに戻る
      </Link>

      <header className={styles.header}>
        <span className={styles.category}>{algorithm.category}</span>
        <h1 className={styles.title}>{algorithm.name}</h1>
        <ComplexityBadge notation={algorithm.complexity} />
      </header>

      <div className={styles.layout}>
        <section className={styles.visualPane} aria-labelledby="visual-heading">
          <h2 id="visual-heading" className={styles.sectionLabel}>
            ■ VISUALIZE 実行の可視化
          </h2>
          {isSortVisualized ? (
            <SortVisualizer algorithmId={id} />
          ) : isPathfindingVisualized ? (
            <PathfindingVisualizer algorithmId={id} />
          ) : isDPVisualized ? (
            <DPTableVisualizer algorithmId={id} />
          ) : isGraphVisualized ? (
            <GraphVisualizer algorithmId={id} />
          ) : isSearchVisualized ? (
            <SearchVisualizer algorithmId={id} />
          ) : (
            <div className={styles.placeholder}>
              可視化は準備中です。現在はソート系17種・探索系(線形/二分/三分/ジャンプ/補間/指数/フィボナッチ探索)・グリッド経路探索(BFS/DFS/ダイクストラ法/A*探索)・グラフ(ベルマン・フォード法/プリム法/クラスカル法/ボルーフカ法/トポロジカルソート)・動的計画法9種のみ対応しています。
            </div>
          )}
        </section>

        <section
          className={styles.explainPane}
          aria-labelledby="explain-heading"
        >
          <h2 id="explain-heading" className={styles.sectionLabel}>
            ■ ABOUT 概要
          </h2>
          <div
            className={styles.markdownBody}
            // content/algorithms/*.md はリポジトリで管理する信頼済みコンテンツのみ(外部入力なし)
            dangerouslySetInnerHTML={{ __html: algorithm.bodyHtml }}
          />
        </section>
      </div>
    </div>
  );
}
