import { notFound } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import { ComplexityBadge } from "@/components/hud/ComplexityBadge";
import { AlgorithmVisualizer, hasVisualizer } from "@/components/visualizer/AlgorithmVisualizer";
import {
  getAllAlgorithmIds,
  getAlgorithmDetail,
} from "@/lib/content/algorithms";

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
          {hasVisualizer(id) ? (
            <AlgorithmVisualizer algorithmId={id} />
          ) : (
            <div className={styles.placeholder}>
              可視化は準備中です。現在はソート系17種・探索系(線形/二分/三分/ジャンプ/補間/指数/フィボナッチ探索/カダンのアルゴリズム/エラトステネスの篩/フェニック木/ブルームフィルタ/山登り法/焼きなまし法/タブーサーチ/勾配降下法/k近傍法/マナカーのアルゴリズム)・グリッド経路探索(BFS/DFS/ダイクストラ法/A*探索/IDDFS/ライフゲーム/ラングトンのアリ)・グラフ(ベルマン・フォード法/プリム法/クラスカル法/ボルーフカ法/トポロジカルソート/カーンのアルゴリズム/Union-Find/Tarjanの強連結成分分解/Edmonds-Karp法/Dinic法/Ford-Fulkerson法/ホップクロフト・カープ法/ジョンソンのアルゴリズム/ハフマン符号化/フロイドの循環検出法/セグメント木/スキップリスト/PageRank/HITS/一貫性ハッシュ法/ブリー・アルゴリズム/二相コミット/Raft/Paxos/ベクタークロック/決定木/高速フーリエ変換/分枝限定法)・動的計画法39種(...LRUキャッシュ/TF-IDF/BM25/RRF/パーセプトロン/誤差逆伝播法/ナイーブベイズ/遺伝的アルゴリズム/モンテカルロ法/巡回セールスマン問題(bitDP)/MinHash・LSH/接尾辞配列/シンプレックス法)・木構造(二分探索木/AVL木/Treap/赤黒木/スプレー木/区間木/トライ木/Aho-Corasick法)・文字列パターンマッチング(KMP法/ラビン-カープ法/Z algorithm/ボイヤー・ムーア法/連長圧縮)のみ対応しています。
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
