import { notFound } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import { MarkdownBody } from "./MarkdownBody";
import { FavoriteButton } from "./FavoriteButton";
import { ViewTracker } from "./ViewTracker";
import { ComplexityBadge } from "@/components/hud/ComplexityBadge";
import {
  AlgorithmVisualizer,
  hasVisualizer,
} from "@/components/visualizer/AlgorithmVisualizer";
import {
  getAllAlgorithmIds,
  getAlgorithmDetail,
  getRelatedAlgorithms,
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

  const relatedAlgorithms = getRelatedAlgorithms(id);

  return (
    <div className={styles.page}>
      <ViewTracker id={id} />
      <Link href="/" className={styles.backLink}>
        ← カタログに戻る
      </Link>

      <header className={styles.header}>
        <span className={styles.category}>
          {algorithm.category} ・ {algorithm.subcategory}
        </span>
        <h1 className={styles.title}>{algorithm.name}</h1>
        <ComplexityBadge notation={algorithm.complexity} />
        <FavoriteButton id={id} />
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
              このアルゴリズムの可視化はまだ準備中です。
              <br />
              <Link href="/" className={styles.placeholderLink}>
                カタログの「可視化対応のみ」フィルタ
              </Link>
              で対応済みのアルゴリズムを確認できます。
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
          <MarkdownBody
            html={algorithm.bodyHtml}
            className={styles.markdownBody}
          />
        </section>
      </div>

      {relatedAlgorithms.length > 0 ? (
        <section className={styles.related} aria-labelledby="related-heading">
          <h2 id="related-heading" className={styles.sectionLabel}>
            ■ RELATED 関連アルゴリズム({algorithm.subcategory})
          </h2>
          <ul className={styles.relatedList}>
            {relatedAlgorithms.map((related) => (
              <li key={related.id}>
                <Link
                  href={`/algorithms/${related.id}`}
                  className={styles.relatedLink}
                >
                  {related.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
