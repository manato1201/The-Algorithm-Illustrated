import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";
import { getAllAlgorithmsMeta, getDependencyMap } from "@/lib/content/algorithms";
import { CATEGORY_ORDER } from "@/lib/algorithm-categories";
import { topFoundations } from "@/lib/dependency-map";
import { PROVENANCE_LABELS } from "@/lib/provenance";

export const metadata: Metadata = {
  title: "依存の地図 | The Algorithm Illustrated",
  description: "アルゴリズム同士のつながりを、記事の本文のリンクから読み取って一覧にした地図。多くの記事から参照される「足場」のアルゴリズムも分かる。",
};

const FOUNDATION_LIMIT = 20;

/**
 * 依存の地図(IMPROVEMENT_DESIGN_2026-10 第6弾)。記事本文のリンクから機械的に読み取ったつながりを一覧にする。
 * 「前提」と「比較・関連」の区別は記事に書かれていないので、つながりの向き(どの記事がどの記事を参照しているか)だけを示す。
 */
export default function DependencyMapPage() {
  const metas = getAllAlgorithmsMeta();
  const map = getDependencyMap();
  const nameById = new Map(metas.map((meta) => [meta.id, meta.name]));
  const foundations = topFoundations(map, FOUNDATION_LIMIT);
  const edgeCount = [...map.values()].reduce((sum, entry) => sum + entry.refs.length, 0);

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>■ MAP 依存の地図</p>
      <h1 className={styles.title}>
        どの記事が、どの記事に<span className={styles.accent}>支えられて</span>いるか。
      </h1>
      <p className={styles.lead}>
        {metas.length}件の記事の本文にあるリンクのうち、アルゴリズムどうしをつなぐ{edgeCount}本を読み取りました(
        <span aria-hidden="true">{PROVENANCE_LABELS.read.glyph}</span> {PROVENANCE_LABELS.read.ja})。
        前提・比較・関連の区別は記事に書かれていないので、「この記事がこの記事を参照している」という向きだけを示します。
        多くの記事から参照されるものは、ほかの理解の足場になっています。
      </p>

      <section aria-labelledby="foundation-heading" className={styles.section}>
        <h2 id="foundation-heading" className={styles.sectionLabel}>
          ■ 足場になっているアルゴリズム(参照されている数の上位{FOUNDATION_LIMIT})
        </h2>
        <ol className={styles.foundationList}>
          {foundations.map(({ id, count }) => (
            <li key={id} className={styles.foundationItem}>
              <Link href={`/algorithms/${id}`} className={styles.link}>
                {nameById.get(id) ?? id}
              </Link>
              <span className={styles.count}>{count}件の記事から参照</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="all-heading" className={styles.section}>
        <h2 id="all-heading" className={styles.sectionLabel}>
          ■ カテゴリごとの、参照のつながり
        </h2>
        {CATEGORY_ORDER.map((category) => {
          const inCategory = metas.filter((meta) => meta.category === category);
          const linked = inCategory.filter((meta) => (map.get(meta.id)?.refs.length ?? 0) > 0);
          if (inCategory.length === 0) return null;
          return (
            <details key={category} className={styles.category}>
              <summary className={styles.categorySummary}>
                {category}
                <span className={styles.count}>
                  {inCategory.length}件のうち{linked.length}件が他の記事を参照
                </span>
              </summary>
              <ul className={styles.rows}>
                {linked.map((meta) => (
                  <li key={meta.id} className={styles.row}>
                    <Link href={`/algorithms/${meta.id}`} className={styles.link}>
                      {meta.name}
                    </Link>
                    <span className={styles.arrow} aria-label="が参照している">
                      →
                    </span>
                    <span className={styles.targets}>
                      {map.get(meta.id)!.refs.map((refId, index) => (
                        <span key={refId}>
                          {index > 0 ? "、" : ""}
                          <Link href={`/algorithms/${refId}`} className={styles.linkMuted}>
                            {nameById.get(refId) ?? refId}
                          </Link>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </section>
    </div>
  );
}
