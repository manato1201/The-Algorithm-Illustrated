import { notFound } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import { MarkdownBody } from "./MarkdownBody";
import { FavoriteButton } from "./FavoriteButton";
import { ViewTracker } from "./ViewTracker";
import { ReadingProgress } from "./ReadingProgress";
import { ScrollScrubToggle } from "./ScrollScrubToggle";
import { ScrubBridgeProvider } from "@/components/visualizer/ScrubBridge";
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
      <ReadingProgress />
      <nav className={styles.breadcrumb} aria-label="パンくず">
        <ol className={styles.breadcrumbList}>
          <li>
            <Link href="/" className={styles.breadcrumbLink}>
              カタログ
            </Link>
          </li>
          <li aria-hidden="true" className={styles.breadcrumbSeparator}>
            /
          </li>
          <li>
            <Link
              href={`/?category=${encodeURIComponent(algorithm.category)}`}
              className={styles.breadcrumbLink}
            >
              {algorithm.category}
            </Link>
          </li>
          <li aria-hidden="true" className={styles.breadcrumbSeparator}>
            /
          </li>
          <li aria-current="page" className={styles.breadcrumbCurrent}>
            {algorithm.name}
          </li>
        </ol>
      </nav>

      <header className={styles.header}>
        <span className={styles.category}>
          {algorithm.category} ・ {algorithm.subcategory}
        </span>
        <h1 className={styles.title}>{algorithm.name}</h1>
        <ComplexityBadge notation={algorithm.complexity} />
        <FavoriteButton id={id} />
      </header>

      <ScrubBridgeProvider>
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
          {hasVisualizer(id) ? <ScrollScrubToggle /> : null}
          <MarkdownBody
            html={algorithm.bodyHtml}
            className={styles.markdownBody}
          />
          {/* 記事の定型項目(設計書 T2): 全記事に共通して当てはまる事実だけを置く */}
          <aside className={styles.standardNotes} aria-label="見るポイントと、動きを減らす場合">
            {hasVisualizer(id) ? (
              <section>
                <h3 className={styles.standardNotesTitle}>見るポイント</h3>
                <p>
                  可視化の下のタイムラインの色と目盛りの高さで、そのステップで何が起きたか(入れ替え・比較中・基準・確定)が読み取れます。累計の数は、巻き戻すと同じ時点の値に戻ります。
                </p>
              </section>
            ) : null}
            <section>
              <h3 className={styles.standardNotesTitle}>動きを減らす場合</h3>
              <p>
                OSの「視差効果を減らす」設定では、数字のめくれ・ボタンの波紋・完了の掃引・残像は出ません。再生は押したときだけ進み、←→ または , . で1ステップずつ確認できます。
              </p>
            </section>
          </aside>
        </section>
      </div>
      </ScrubBridgeProvider>

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
