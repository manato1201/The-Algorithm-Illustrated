"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./AlgorithmCatalog.module.css";
import { AlgorithmStackBrowser } from "./AlgorithmStackBrowser";
import { CategoryRail } from "./CategoryRail";
import {
  CategorySheetTrigger,
  CategorySidebar,
  type SidebarGroup,
} from "./CategorySidebar";
import { AsciiMycelium } from "@/components/hud/AsciiMycelium";
import { LivePreview } from "./LivePreview";
import { ComplexityBadge } from "@/components/hud/ComplexityBadge";
import { FavoriteToggleButton } from "@/components/hud/FavoriteToggleButton";
import {
  CATEGORY_GROUPS,
  CATEGORY_ORDER,
  SUBCATEGORIES_BY_CATEGORY,
} from "@/lib/algorithm-categories";
import { matchesSearchQuery } from "@/lib/algorithm-search";
import { useFavorites } from "@/lib/use-favorites";
import { useRecentlyViewed } from "@/lib/recently-viewed";
import { useMediaQuery } from "@/lib/use-media-query";
import type { AlgorithmMeta } from "@/lib/content/algorithms";

type SortOrder = "category" | "name";

const categoryOrder: readonly string[] = CATEGORY_ORDER;

/** トップの入口の段分け(まずはここから / 用途から)。解決済みのメタ情報で受け取る。 */
export type CatalogEntryPoints = {
  start: AlgorithmMeta[];
  useCases: { label: string; items: AlgorithmMeta[] }[];
};

type AlgorithmCatalogProps = {
  algorithms: AlgorithmMeta[];
  featuredId: string;
  entryPoints?: CatalogEntryPoints;
};

/**
 * カタログ画面(docs/design/ui-design.md 3節・4節)。
 * 左のカテゴリ・サイドバー(モバイルは一覧シート)・自由テキスト検索・2 つのトグルを組み合わせた絞り込みの有無で、
 * 「代表アルゴリズム+カテゴリ別一覧」と「絞り込み結果の一覧」を切り替える。
 * 1600件規模を見据え、カテゴリ単体での絞り込みだけでも一覧を発見しやすくすることを狙っている。
 */
export function AlgorithmCatalog({
  algorithms,
  featuredId,
  entryPoints,
}: AlgorithmCatalogProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(
    null,
  );
  const [visualizedOnly, setVisualizedOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("category");
  const { favorites, isLoaded: favoritesLoaded, toggleFavorite } = useFavorites();
  const recentIds = useRecentlyViewed();
  const isMobile = useMediaQuery("(max-width: 639px)");
  const [stackMode, setStackMode] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  // ディープリンク(詳細ページのパンくずなどから ?category=... で来た場合)。
  // useSearchParamsは静的描画のSSRを崩す(Suspenseが要る)ので、マウント後に一度だけwindow.locationを読む。
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const category = params.get("category");
      if (category && categoryOrder.includes(category)) {
        setActiveCategory(category);
        setActiveSubcategory(null);
      }
      const q = params.get("q");
      if (q) setQuery(q);
      if (category || q) {
        document.getElementById("catalog-start")?.scrollIntoView({ block: "start" });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const trimmedQuery = query.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;
  const isFiltering =
    isSearching || activeCategory !== null || visualizedOnly || favoritesOnly;

  const visualizedCount = useMemo(
    () => algorithms.reduce((count, a) => count + (a.hasVisualizer ? 1 : 0), 0),
    [algorithms],
  );

  // 空のデータでも崩れないよう、代表アルゴリズムは無いことがある
  const featured: AlgorithmMeta | undefined =
    algorithms.find((a) => a.id === featuredId) ?? algorithms[0];

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const algorithm of algorithms) {
      counts.set(algorithm.category, (counts.get(algorithm.category) ?? 0) + 1);
    }
    return counts;
  }, [algorithms]);

  // カテゴリ以外の絞り込み(検索・可視化対応のみ・お気に入りのみ)を通ったもの。
  // サイドバーの件数はこれを数えるので、検索中でも「押した先に何件あるか」が合う。
  const baseMatches = useMemo(
    () =>
      algorithms.filter((algorithm) => {
        if (visualizedOnly && !algorithm.hasVisualizer) return false;
        if (favoritesOnly && !favorites.has(algorithm.id)) return false;
        if (isSearching && !matchesSearchQuery(algorithm, query)) return false;
        return true;
      }),
    [algorithms, visualizedOnly, favoritesOnly, favorites, query, isSearching],
  );

  const sidebarGroups = useMemo<SidebarGroup[]>(() => {
    const matchedByCategory = new Map<string, number>();
    const matchedBySub = new Map<string, number>();
    for (const algorithm of baseMatches) {
      matchedByCategory.set(
        algorithm.category,
        (matchedByCategory.get(algorithm.category) ?? 0) + 1,
      );
      const key = `${algorithm.category}::${algorithm.subcategory}`;
      matchedBySub.set(key, (matchedBySub.get(key) ?? 0) + 1);
    }
    const presentSubs = new Set(
      algorithms.map((algorithm) => `${algorithm.category}::${algorithm.subcategory}`),
    );
    return CATEGORY_GROUPS.map((group) => ({
      label: group.label,
      categories: group.categories
        .filter((name) => categoryCounts.has(name))
        .sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b))
        .map((name) => ({
          name,
          count: matchedByCategory.get(name) ?? 0,
          subcategories: (SUBCATEGORIES_BY_CATEGORY[name] ?? [])
            .filter((sub) => presentSubs.has(`${name}::${sub}`))
            .map((sub) => ({ name: sub, count: matchedBySub.get(`${name}::${sub}`) ?? 0 })),
        })),
    })).filter((group) => group.categories.length > 0);
  }, [algorithms, baseMatches, categoryCounts]);

  const handleSelect = useCallback(
    (category: string | null, subcategory: string | null) => {
      setActiveCategory(category);
      setActiveSubcategory(subcategory);
      // モバイルでは結果が下にあるので、シートが閉じる選択(サブカテゴリが続かない選択)のあとに一覧の先頭へ移す
      const continuesToSub =
        category !== null &&
        subcategory === null &&
        (SUBCATEGORIES_BY_CATEGORY[category]?.length ?? 0) > 0;
      if (category !== null && !continuesToSub) {
        setTimeout(() => {
          if (window.matchMedia("(max-width: 639px)").matches) {
            document.getElementById("catalog-body")?.scrollIntoView({ block: "start" });
          }
        }, 0);
      }
    },
    [],
  );

  const filteredResults = useMemo(() => {
    if (!isFiltering) return [];
    const results = baseMatches.filter((algorithm) => {
      if (activeCategory && algorithm.category !== activeCategory) return false;
      if (activeSubcategory && algorithm.subcategory !== activeSubcategory)
        return false;
      return true;
    });
    if (sortOrder === "name") {
      return [...results].sort((a, b) => a.name.localeCompare(b.name, "ja"));
    }
    return results;
  }, [baseMatches, activeCategory, activeSubcategory, isFiltering, sortOrder]);

  const filterLabelParts: string[] = [];
  if (activeCategory) {
    filterLabelParts.push(
      activeSubcategory
        ? `${activeCategory} ・ ${activeSubcategory}`
        : activeCategory,
    );
  }
  if (visualizedOnly) filterLabelParts.push("可視化対応のみ");
  if (favoritesOnly) filterLabelParts.push("お気に入りのみ");
  if (isSearching) filterLabelParts.push(`「${query}」`);
  const filterLabel = filterLabelParts.join(" ／ ");

  const recentAlgorithms = useMemo(() => {
    const byId = new Map(algorithms.map((a) => [a.id, a]));
    return recentIds
      .map((id) => byId.get(id))
      .filter((a): a is AlgorithmMeta => a !== undefined);
  }, [algorithms, recentIds]);

  const groupedByCategory = useMemo(() => {
    const rest = algorithms.filter((algorithm) => algorithm.id !== featured?.id);
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
  }, [algorithms, featured?.id]);

  const railItems = useMemo(
    () =>
      groupedByCategory.map(({ category, items }, index) => ({
        label: category,
        targetId: `catalog-cat-${index}`,
        count: items.length,
      })),
    [groupedByCategory],
  );

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
        <p className={styles.eyebrow}>■ CATALOG アルゴリズム図鑑</p>
        <h1 className={styles.heroTitle}>
          アルゴリズムを、
          <br />
          <span className={styles.heroAccent}>動かして</span>理解する。
        </h1>
        <p className={styles.heroLead}>
          速さを競うランキングではない。なぜ生まれ、どう動き、どこで報われるのか
          ——状態遷移を一歩ずつ巻き戻しながら学ぶための図鑑です。
        </p>
        {/* 主要数値は収録データそのものから算出する(手書きの固定値にしない) */}
        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>収録アルゴリズム</dt>
            <dd className={styles.statValue}>{algorithms.length}</dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>カテゴリ</dt>
            <dd className={styles.statValue}>{categoryCounts.size}</dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>可視化対応</dt>
            <dd className={styles.statValue}>{visualizedCount}</dd>
          </div>
        </dl>
        <a href="#catalog-start" className={styles.scrollCue}>
          始める
          <span aria-hidden="true"> ↓</span>
        </a>
        <div className={styles.searchRow} id="catalog-start">
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
            className={styles.toggles}
            role="group"
            aria-label="可視化対応・お気に入りで絞り込む"
          >
            <CategorySheetTrigger
              activeLabel={
                activeCategory
                  ? activeSubcategory
                    ? `${activeCategory}・${activeSubcategory}`
                    : activeCategory
                  : null
              }
              open={sheetOpen}
              onClick={() => setSheetOpen(true)}
            />
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
            <button
              type="button"
              className={`${styles.chip} ${favoritesOnly ? styles.chipActive : ""}`}
              aria-pressed={favoritesOnly}
              disabled={!favoritesLoaded || favorites.size === 0}
              onClick={() => setFavoritesOnly((current) => !current)}
            >
              ★ お気に入りのみ
              <span className={styles.chipCount}>{favorites.size}</span>
            </button>
          </div>
        </div>
        </div>
        {/* ライブステージ: クイックソートが自動でループする小さな舞台(動きを減らす設定では結果を静止表示) */}
        <div className={styles.heroStage}>
          <LivePreview algorithmId="quick-sort" variant="hero" label="QUICK SORT" />
        </div>
      </section>

      <div className={styles.body} id="catalog-body">
        <CategorySidebar
          groups={sidebarGroups}
          activeCategory={activeCategory}
          activeSubcategory={activeSubcategory}
          onSelect={handleSelect}
          totalCount={baseMatches.length}
          sheetOpen={sheetOpen}
          onSheetOpenChange={setSheetOpen}
        />
        <div className={styles.content}>
          {!isFiltering && recentAlgorithms.length > 0 ? (
            <section className={styles.recent} aria-labelledby="recent-heading">
              <h2 id="recent-heading" className={styles.sectionLabel}>
                ■ RECENT 最近見た
              </h2>
              <div className={styles.chipRow}>
                {recentAlgorithms.map((algorithm) => (
                  <Link
                    key={algorithm.id}
                    href={`/algorithms/${algorithm.id}`}
                    className={styles.chip}
                  >
                    {algorithm.name}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {!isFiltering && entryPoints ? (
            <section className={styles.entry} aria-label="入口">
              <div className={styles.entryBlock}>
                <h2 className={styles.sectionLabel}>■ START まずはここから</h2>
                <p className={styles.entryLead}>
                  はじめてなら、まず基本の探索・整列・グラフ探索から。
                  <Link href="/basics" className={styles.entryInlineLink}>
                    アルゴリズムとは?
                  </Link>
                </p>
                <ul className={styles.startGrid}>
                  {entryPoints.start.map((algorithm) => (
                    <li key={algorithm.id}>
                      <Link href={`/algorithms/${algorithm.id}`} className={styles.startCard}>
                        <LivePreview algorithmId={algorithm.id} variant="card" />
                        <span className={styles.startName}>{algorithm.name}</span>
                        <span className={styles.startMeta}>{algorithm.complexity}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.entryBlock}>
                <h2 className={styles.sectionLabel}>■ BY USE 用途から</h2>
                <ul className={styles.useCaseList}>
                  {entryPoints.useCases.map((group) => (
                    <li key={group.label} className={styles.useCase}>
                      <span className={styles.useCaseLabel}>{group.label}</span>
                      <span className={styles.useCaseItems}>
                        {group.items.map((algorithm) => (
                          <Link
                            key={algorithm.id}
                            href={`/algorithms/${algorithm.id}`}
                            className={styles.useCaseLink}
                          >
                            {algorithm.name}
                          </Link>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          {isFiltering ? (
            <section className={styles.results} aria-labelledby="results-heading">
              <div className={styles.resultsHeader}>
                <h2 id="results-heading" className={styles.sectionLabel}>
                  ■ RESULTS {filterLabel}の絞り込み結果 — {filteredResults.length}件
                </h2>
                {isMobile ? (
                  <button
                    type="button"
                    className={styles.stackToggle}
                    aria-pressed={stackMode}
                    onClick={() => setStackMode((current) => !current)}
                  >
                    {stackMode ? "≡ リスト表示" : "▤ スタック表示"}
                  </button>
                ) : null}
                {filteredResults.length > 1 ? (
                  <label className={styles.sortControl}>
                    並び替え
                    <select
                      value={sortOrder}
                      onChange={(event) =>
                        setSortOrder(event.target.value as SortOrder)
                      }
                    >
                      <option value="category">カテゴリ順</option>
                      <option value="name">名前順</option>
                    </select>
                  </label>
                ) : null}
              </div>
              {filteredResults.length === 0 ? (
                <div className={styles.emptyState}>
                  <AsciiMycelium />
                  該当するアルゴリズムが見つかりませんでした。別のキーワードやカテゴリでお試しください。
                </div>
              ) : isMobile && stackMode ? (
                <AlgorithmStackBrowser
                  algorithms={filteredResults}
                  favorites={favorites}
                  favoritesLoaded={favoritesLoaded}
                  onToggleFavorite={toggleFavorite}
                />
              ) : (
                <ul className={styles.listItems}>
                  {filteredResults.map((algorithm) => (
                    <AlgorithmRow
                      key={algorithm.id}
                      algorithm={algorithm}
                      showCategory
                      isFavorite={favorites.has(algorithm.id)}
                      favoritesLoaded={favoritesLoaded}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <>
              {featured ? (
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
                  <div className={styles.featuredLayout}>
                    <div className={styles.featuredText}>
                      <div className={styles.featuredMeta}>
                        <span className={styles.category}>
                          {featured.category} ・ {featured.subcategory}
                        </span>
                        <ComplexityBadge notation={featured.complexity} />
                        {featured.hasVisualizer ? <VisualizedBadge /> : null}
                      </div>
                      <h3 className={styles.featuredName}>{featured.name}</h3>
                      <p className={styles.featuredDesc}>{featured.summary}</p>
                    </div>
                    <div className={styles.featuredPreview}>
                      <LivePreview algorithmId={featured.id} variant="card" />
                    </div>
                  </div>
                </Link>
              </section>
              ) : null}

              <section id="catalog-index" className={styles.list} aria-labelledby="list-heading">
                <h2 id="list-heading" className={styles.sectionLabel}>
                  ■ INDEX 一覧
                </h2>
                <CategoryRail containerId="catalog-index" items={railItems} />
                {groupedByCategory.map(({ category, items }, index) => (
                  <div
                    key={category}
                    id={`catalog-cat-${index}`}
                    className={styles.categoryGroup}
                  >
                    <h3 className={styles.categoryHeading}>
                      {category}
                      <span className={styles.categoryCount}>{items.length}</span>
                    </h3>
                    <ul className={styles.listItems}>
                      {items.map((algorithm) => (
                        <AlgorithmRow
                          key={algorithm.id}
                          algorithm={algorithm}
                          isFavorite={favorites.has(algorithm.id)}
                          favoritesLoaded={favoritesLoaded}
                          onToggleFavorite={toggleFavorite}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AlgorithmRow({
  algorithm,
  showCategory = false,
  isFavorite,
  favoritesLoaded,
  onToggleFavorite,
}: {
  algorithm: AlgorithmMeta;
  showCategory?: boolean;
  isFavorite: boolean;
  favoritesLoaded: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  return (
    <li className={styles.listRow}>
      <div className={styles.listRowTop}>
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
        <FavoriteToggleButton
          active={isFavorite}
          disabled={!favoritesLoaded}
          onToggle={() => onToggleFavorite(algorithm.id)}
        />
      </div>
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
