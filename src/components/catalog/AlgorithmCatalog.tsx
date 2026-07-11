"use client";

import { useMemo, useState } from "react";
import styles from "./AlgorithmCatalog.module.css";
import { ComplexityBadge } from "@/components/hud/ComplexityBadge";
import { CATEGORY_ORDER, type SampleAlgorithm } from "@/lib/sample-algorithms";

type AlgorithmCatalogProps = {
  algorithms: SampleAlgorithm[];
  featuredId: string;
};

/**
 * カタログ画面(docs/design/ui-design.md 3節・4節)。
 * 検索クエリの有無で「代表アルゴリズム+カテゴリ別一覧」と「検索結果の一覧」を切り替える。
 */
export function AlgorithmCatalog({
  algorithms,
  featuredId,
}: AlgorithmCatalogProps) {
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;

  const featured = algorithms.find((a) => a.id === featuredId) ?? algorithms[0];

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    return algorithms.filter((algorithm) =>
      [algorithm.name, algorithm.category, algorithm.summary].some((field) =>
        field.toLowerCase().includes(trimmedQuery),
      ),
    );
  }, [algorithms, trimmedQuery, isSearching]);

  const groupedByCategory = useMemo(() => {
    const rest = algorithms.filter((algorithm) => algorithm.id !== featured.id);
    const groups = new Map<string, SampleAlgorithm[]>();
    for (const algorithm of rest) {
      const list = groups.get(algorithm.category) ?? [];
      list.push(algorithm);
      groups.set(algorithm.category, list);
    }
    return CATEGORY_ORDER.filter((category) => groups.has(category)).map(
      (category) => ({
        category,
        items: groups.get(category)!,
      }),
    );
  }, [algorithms, featured.id]);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>■ CATALOG アルゴリズム図鑑</p>
        <h1 className={styles.heroTitle}>
          アルゴリズムを、
          <br />
          動かして理解する。
        </h1>
        <p className={styles.heroLead}>
          速さを競うランキングではない。なぜ生まれ、どう動き、どこで報われるのか
          ——状態遷移を一歩ずつ巻き戻しながら学ぶための図鑑です。
        </p>
        <p className={styles.countLine}>
          <span className={styles.countNumber}>{algorithms.length}</span>
          <span className={styles.countLabel}>件のアルゴリズムを収録</span>
        </p>
        <form
          className={styles.searchBar}
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <span className={styles.searchLabel}>SEARCH</span>
          <input
            className={styles.searchInput}
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="アルゴリズム名・カテゴリで検索(例: ソート、木、暗号)"
            aria-label="アルゴリズムを検索"
          />
        </form>
      </section>

      {isSearching ? (
        <section className={styles.results} aria-labelledby="results-heading">
          <h2 id="results-heading" className={styles.sectionLabel}>
            ■ RESULTS 「{query}」の検索結果 — {searchResults.length}件
          </h2>
          {searchResults.length === 0 ? (
            <div className={styles.emptyState}>
              該当するアルゴリズムが見つかりませんでした。別のキーワードでお試しください。
            </div>
          ) : (
            <ul className={styles.listItems}>
              {searchResults.map((algorithm) => (
                <AlgorithmRow
                  key={algorithm.id}
                  algorithm={algorithm}
                  showCategory
                />
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          <section
            className={styles.showcase}
            aria-labelledby="featured-heading"
          >
            <h2 id="featured-heading" className={styles.sectionLabel}>
              ■ FEATURED 代表アルゴリズム
            </h2>
            <article className={styles.featuredCard}>
              <div className={styles.featuredMeta}>
                <span className={styles.category}>{featured.category}</span>
                <ComplexityBadge notation={featured.complexity} />
              </div>
              <h3 className={styles.featuredName}>{featured.name}</h3>
              <p className={styles.featuredDesc}>{featured.summary}</p>
            </article>
          </section>

          <section className={styles.list} aria-labelledby="list-heading">
            <h2 id="list-heading" className={styles.sectionLabel}>
              ■ INDEX 一覧
            </h2>
            {groupedByCategory.map(({ category, items }) => (
              <div key={category} className={styles.categoryGroup}>
                <h3 className={styles.categoryHeading}>
                  {category}
                  <span className={styles.categoryCount}>{items.length}</span>
                </h3>
                <ul className={styles.listItems}>
                  {items.map((algorithm) => (
                    <AlgorithmRow key={algorithm.id} algorithm={algorithm} />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function AlgorithmRow({
  algorithm,
  showCategory = false,
}: {
  algorithm: SampleAlgorithm;
  showCategory?: boolean;
}) {
  return (
    <li className={styles.listRow}>
      <div className={styles.listRowHead}>
        <span className={styles.listName}>{algorithm.name}</span>
        {showCategory ? (
          <span className={styles.listCategory}>{algorithm.category}</span>
        ) : null}
        <ComplexityBadge notation={algorithm.complexity} />
      </div>
      <p className={styles.listSummary}>{algorithm.summary}</p>
    </li>
  );
}
