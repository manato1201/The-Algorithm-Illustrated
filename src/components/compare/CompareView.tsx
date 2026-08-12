"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./CompareView.module.css";
import { ComplexityBadge } from "@/components/hud/ComplexityBadge";
import {
  AlgorithmVisualizer,
  hasVisualizer,
} from "@/components/visualizer/AlgorithmVisualizer";
import { CATEGORY_ORDER } from "@/lib/algorithm-categories";
import { matchesSearchQuery } from "@/lib/algorithm-search";
import type { AlgorithmMeta } from "@/lib/content/algorithms";

const MAX_SELECTED = 4;
const CANDIDATE_LIMIT_WITH_QUERY = 8;
const CANDIDATE_LIMIT_BROWSE = 20;

type CompareViewProps = {
  algorithms: AlgorithmMeta[];
};

/**
 * 検索で候補を絞り込みつつ、最大4件まで選択して並べて比較するテーブルを表示する。
 * 選択状態はこの画面内だけのローカルUI状態(URLクエリへの永続化は現状未対応)。
 */
export function CompareView({ algorithms }: CompareViewProps) {
  const [query, setQuery] = useState("");
  const [browseCategory, setBrowseCategory] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const byId = useMemo(
    () => new Map(algorithms.map((a) => [a.id, a])),
    [algorithms],
  );
  const selected = selectedIds
    .map((id) => byId.get(id))
    .filter((a): a is AlgorithmMeta => !!a);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const algorithm of algorithms) {
      counts.set(algorithm.category, (counts.get(algorithm.category) ?? 0) + 1);
    }
    return counts;
  }, [algorithms]);

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;
  const isBrowsing = isSearching || browseCategory !== null;
  const candidates = useMemo(() => {
    if (!isBrowsing) return [];
    return algorithms
      .filter((a) => !selectedIds.includes(a.id))
      .filter((a) => !browseCategory || a.category === browseCategory)
      .filter((a) => !isSearching || matchesSearchQuery(a, trimmedQuery))
      .slice(0, isSearching ? CANDIDATE_LIMIT_WITH_QUERY : CANDIDATE_LIMIT_BROWSE);
  }, [algorithms, trimmedQuery, isSearching, browseCategory, isBrowsing, selectedIds]);

  const addAlgorithm = (id: string) => {
    if (selectedIds.length >= MAX_SELECTED || selectedIds.includes(id)) return;
    setSelectedIds((current) => [...current, id]);
    setQuery("");
  };

  const removeAlgorithm = (id: string) => {
    setSelectedIds((current) => current.filter((x) => x !== id));
  };

  return (
    <div className={styles.view}>
      <div
        className={styles.chipRow}
        role="group"
        aria-label="カテゴリから候補を絞り込む"
      >
        {CATEGORY_ORDER.filter((category) => categoryCounts.has(category)).map(
          (category) => (
            <button
              key={category}
              type="button"
              className={`${styles.chip} ${browseCategory === category ? styles.chipActive : ""}`}
              aria-pressed={browseCategory === category}
              disabled={selectedIds.length >= MAX_SELECTED}
              onClick={() =>
                setBrowseCategory((current) =>
                  current === category ? null : category,
                )
              }
            >
              {category}
              <span className={styles.chipCount}>
                {categoryCounts.get(category)}
              </span>
            </button>
          ),
        )}
      </div>

      <div className={styles.searchArea}>
        <input
          className={styles.searchInput}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            selectedIds.length >= MAX_SELECTED
              ? `最大${MAX_SELECTED}件まで選択済みです`
              : browseCategory
                ? `「${browseCategory}」内をキーワードでさらに絞り込む`
                : "追加するアルゴリズムを検索、またはカテゴリから選択(例: ソート、木)"
          }
          aria-label="比較に追加するアルゴリズムを検索"
          disabled={selectedIds.length >= MAX_SELECTED}
        />
        {isBrowsing && candidates.length === 0 ? (
          <p className={styles.candidateEmpty}>
            該当するアルゴリズムが見つかりませんでした。
          </p>
        ) : null}
        {candidates.length > 0 ? (
          <ul className={styles.candidateList}>
            {candidates.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className={styles.candidateButton}
                  onClick={() => addAlgorithm(a.id)}
                >
                  <span className={styles.candidateName}>{a.name}</span>
                  <span className={styles.candidateCategory}>{a.category}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {selected.length === 0 ? (
        <div className={styles.emptyState}>
          上の検索欄からアルゴリズムを追加すると、ここに比較表が表示されます。
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.rowLabel}></th>
                {selected.map((a) => (
                  <th key={a.id} className={styles.colHeader}>
                    <Link
                      href={`/algorithms/${a.id}`}
                      className={styles.algoLink}
                    >
                      {a.name}
                    </Link>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeAlgorithm(a.id)}
                      aria-label={`${a.name}を比較から外す`}
                    >
                      ✕
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className={styles.rowLabel}>カテゴリ</th>
                {selected.map((a) => (
                  <td key={a.id}>{a.category}</td>
                ))}
              </tr>
              <tr>
                <th className={styles.rowLabel}>計算量/分類</th>
                {selected.map((a) => (
                  <td key={a.id}>
                    <ComplexityBadge notation={a.complexity} />
                  </td>
                ))}
              </tr>
              <tr>
                <th className={styles.rowLabel}>概要</th>
                {selected.map((a) => (
                  <td key={a.id} className={styles.summaryCell}>
                    {a.summary}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {selected.length > 0 ? (
        <div className={styles.visualSection}>
          <h2 className={styles.visualSectionLabel}>■ VISUALIZE 実行の可視化を見比べる</h2>
          {selected.some((a) => hasVisualizer(a.id)) ? (
            <div className={styles.visualGrid}>
              {selected
                .filter((a) => hasVisualizer(a.id))
                .map((a) => (
                  <div key={a.id} className={styles.visualPanel}>
                    <Link href={`/algorithms/${a.id}`} className={styles.visualPanelTitle}>
                      {a.name}
                    </Link>
                    <AlgorithmVisualizer algorithmId={a.id} />
                  </div>
                ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              選択したアルゴリズムはまだ可視化に対応していません。
            </div>
          )}
          {selected.some((a) => !hasVisualizer(a.id)) ? (
            <p className={styles.visualNote}>
              可視化未対応:{" "}
              {selected
                .filter((a) => !hasVisualizer(a.id))
                .map((a) => a.name)
                .join("、")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
