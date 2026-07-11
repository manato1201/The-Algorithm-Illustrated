import { notFound } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import { ComplexityBadge } from "@/components/hud/ComplexityBadge";
import { SortVisualizer } from "@/components/visualizer/SortVisualizer";
import { PathfindingVisualizer } from "@/components/visualizer/PathfindingVisualizer";
import { sampleAlgorithms } from "@/lib/sample-algorithms";
import { SORT_VISUALIZERS } from "@/lib/sort-visualizers";
import { PATHFINDING_VISUALIZERS } from "@/lib/pathfinding-visualizers";

type AlgorithmDetailPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return sampleAlgorithms.map((algorithm) => ({ id: algorithm.id }));
}

export default async function AlgorithmDetailPage({
  params,
}: AlgorithmDetailPageProps) {
  const { id } = await params;
  const algorithm = sampleAlgorithms.find((item) => item.id === id);

  if (!algorithm) {
    notFound();
  }

  const isSortVisualized = id in SORT_VISUALIZERS;
  const isPathfindingVisualized = id in PATHFINDING_VISUALIZERS;

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
          ) : (
            <div className={styles.placeholder}>
              可視化は準備中です。現在はソート系(バブル/選択/挿入/クイックソート)と経路探索(BFS/DFS)のみ対応しています。
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
          <p className={styles.summary}>{algorithm.summary}</p>
        </section>
      </div>
    </div>
  );
}
