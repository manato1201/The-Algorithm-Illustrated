"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./AlgorithmCatalog.module.css";
import { ComplexityBadge } from "@/components/hud/ComplexityBadge";
import {
  CATEGORY_ORDER,
  SUBCATEGORIES_BY_CATEGORY,
} from "@/lib/algorithm-categories";
import type { AlgorithmMeta } from "@/lib/content/algorithms";

type AlgorithmCatalogProps = {
  algorithms: AlgorithmMeta[];
  featuredId: string;
};

/**
 * カタログ画面(docs/design/ui-design.md 3節・4節)。
 * カテゴリチップ・サブカテゴリチップ・自由テキスト検索を組み合わせた絞り込みの有無で、
 * 「代表アルゴリズム+カテゴリ別一覧」と「絞り込み結果の一覧」を切り替える。
 * 1600件規模を見据え、カテゴリ単体での絞り込みだけでも一覧を発見しやすくすることを狙っている。
 */
export function AlgorithmCatalog({
  algorithms,
  featuredId,
}: AlgorithmCatalogProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(
    null,
  );
  const [visualizedOnly, setVisualizedOnly] = useState(false);
  const trimmedQuery = query.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;
  const isFiltering = isSearching || activeCategory !== null || visualizedOnly;

  const visualizedCount = useMemo(
    () => algorithms.reduce((count, a) => count + (a.hasVisualizer ? 1 : 0), 0),
    [algorithms],
  );

  const featured = algorithms.find((a) => a.id === featuredId) ?? algorithms[0];

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const algorithm of algorithms) {
      counts.set(algorithm.category, (counts.get(algorithm.category) ?? 0) + 1);
    }
    return counts;
  }, [algorithms]);

  const subcategoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!activeCategory) return counts;
    for (const algorithm of algorithms) {
      if (algorithm.category !== activeCategory) continue;
      counts.set(
        algorithm.subcategory,
        (counts.get(algorithm.subcategory) ?? 0) + 1,
      );
    }
    return counts;
  }, [algorithms, activeCategory]);

  const handleCategoryClick = (category: string) => {
    setActiveCategory((current) => (current === category ? null : category));
    setActiveSubcategory(null);
  };

  const handleSubcategoryClick = (subcategory: string) => {
    setActiveSubcategory((current) =>
      current === subcategory ? null : subcategory,
    );
  };

  const filteredResults = useMemo(() => {
    if (!isFiltering) return [];
    return algorithms.filter((algorithm) => {
      if (activeCategory && algorithm.category !== activeCategory) return false;
      if (activeSubcategory && algorithm.subcategory !== activeSubcategory)
        return false;
      if (visualizedOnly && !algorithm.hasVisualizer) return false;
      if (
        trimmedQuery &&
        ![
          algorithm.name,
          algorithm.category,
          algorithm.subcategory,
          algorithm.summary,
        ].some((field) => field.toLowerCase().includes(trimmedQuery))
      ) {
        return false;
      }
      return true;
    });
  }, [
    algorithms,
    activeCategory,
    activeSubcategory,
    visualizedOnly,
    trimmedQuery,
    isFiltering,
  ]);

  const filterLabelParts: string[] = [];
  if (activeCategory) {
    filterLabelParts.push(
      activeSubcategory
        ? `${activeCategory} ・ ${activeSubcategory}`
        : activeCategory,
    );
  }
  if (visualizedOnly) filterLabelParts.push("可視化対応のみ");
  if (isSearching) filterLabelParts.push(`「${query}」`);
  const filterLabel = filterLabelParts.join(" ／ ");

  const groupedByCategory = useMemo(() => {
    const rest = algorithms.filter((algorithm) => algorithm.id !== featured.id);
    const groups = new Map<string, AlgorithmMeta[]>();
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

        <div
          className={styles.chipRow}
          role="group"
          aria-label="カテゴリで絞り込む"
        >
          <button
            type="button"
            className={`${styles.chip} ${activeCategory === null ? styles.chipActive : ""}`}
            aria-pressed={activeCategory === null}
            onClick={() => {
              setActiveCategory(null);
              setActiveSubcategory(null);
            }}
          >
            すべて
          </button>
          {CATEGORY_ORDER.filter((category) =>
            categoryCounts.has(category),
          ).map((category) => (
            <button
              key={category}
              type="button"
              className={`${styles.chip} ${activeCategory === category ? styles.chipActive : ""}`}
              aria-pressed={activeCategory === category}
              onClick={() => handleCategoryClick(category)}
            >
              {category}
              <span className={styles.chipCount}>
                {categoryCounts.get(category)}
              </span>
            </button>
          ))}
        </div>

        {activeCategory ? (
          <div
            className={styles.chipRow}
            role="group"
            aria-label="サブカテゴリで絞り込む"
          >
            {(SUBCATEGORIES_BY_CATEGORY[activeCategory] ?? [])
              .filter((subcategory) => subcategoryCounts.has(subcategory))
              .map((subcategory) => (
                <button
                  key={subcategory}
                  type="button"
                  className={`${styles.chip} ${styles.chipSub} ${activeSubcategory === subcategory ? styles.chipActive : ""}`}
                  aria-pressed={activeSubcategory === subcategory}
                  onClick={() => handleSubcategoryClick(subcategory)}
                >
                  {subcategory}
                  <span className={styles.chipCount}>
                    {subcategoryCounts.get(subcategory)}
                  </span>
                </button>
              ))}
          </div>
        ) : null}

        <div
          className={styles.chipRow}
          role="group"
          aria-label="可視化対応で絞り込む"
        >
          <button
            type="button"
            className={`${styles.chip} ${styles.chipVisualized} ${visualizedOnly ? styles.chipActive : ""}`}
            aria-pressed={visualizedOnly}
            onClick={() => setVisualizedOnly((current) => !current)}
          >
            <span className={styles.chipVisualizedDot} aria-hidden="true" />
            可視化対応のみ
            <span className={styles.chipCount}>{visualizedCount}</span>
          </button>
        </div>
      </section>

      {isFiltering ? (
        <section className={styles.results} aria-labelledby="results-heading">
          <h2 id="results-heading" className={styles.sectionLabel}>
            ■ RESULTS {filterLabel}の絞り込み結果 — {filteredResults.length}件
          </h2>
          {filteredResults.length === 0 ? (
            <div className={styles.emptyState}>
              該当するアルゴリズムが見つかりませんでした。別のキーワードやカテゴリでお試しください。
            </div>
          ) : (
            <ul className={styles.listItems}>
              {filteredResults.map((algorithm) => (
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
            <Link
              href={`/algorithms/${featured.id}`}
              className={styles.featuredCard}
            >
              <div className={styles.featuredMeta}>
                <span className={styles.category}>
                  {featured.category} ・ {featured.subcategory}
                </span>
                <ComplexityBadge notation={featured.complexity} />
                {featured.hasVisualizer ? <VisualizedBadge /> : null}
              </div>
              <h3 className={styles.featuredName}>{featured.name}</h3>
              <p className={styles.featuredDesc}>{featured.summary}</p>
            </Link>
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
  algorithm: AlgorithmMeta;
  showCategory?: boolean;
}) {
  return (
    <li className={styles.listRow}>
      <Link href={`/algorithms/${algorithm.id}`} className={styles.listRowHead}>
        <span className={styles.listName}>{algorithm.name}</span>
        {showCategory ? (
          <span className={styles.listCategory}>
            {algorithm.category} ・ {algorithm.subcategory}
          </span>
        ) : null}
        <ComplexityBadge notation={algorithm.complexity} />
        {algorithm.hasVisualizer ? <VisualizedBadge /> : null}
      </Link>
      <p className={styles.listSummary}>{algorithm.summary}</p>
    </li>
  );
}

/** 可視化対応済みであることを示す小さなバッジ。ui-design.mdの「green=確定済み」の用途分離ルールに従う。 */
function VisualizedBadge() {
  return (
    <span className={styles.visualizedBadge} title="このアルゴリズムは可視化対応済みです">
      <span className={styles.visualizedDot} aria-hidden="true" />
      可視化対応
    </span>
  );
}
