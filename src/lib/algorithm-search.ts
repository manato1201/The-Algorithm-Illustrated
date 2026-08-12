import type { AlgorithmMeta } from "@/lib/content/algorithms";

/**
 * カタログ・比較画面で共有する自由テキスト検索の判定ロジック。
 * 空白区切りの複数語をAND条件で扱う(例: 「グラフ 最短」で両語を含むものだけに絞る)。
 * 499件超の規模で単語検索の精度を上げるための共通化(カタログ・比較で判定基準がずれないようにする)。
 */
export function matchesSearchQuery(
  algorithm: Pick<
    AlgorithmMeta,
    "name" | "category" | "subcategory" | "summary"
  >,
  query: string,
): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = [
    algorithm.name,
    algorithm.category,
    algorithm.subcategory,
    algorithm.summary,
  ]
    .join(" ")
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}
