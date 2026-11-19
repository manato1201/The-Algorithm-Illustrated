/**
 * 詳細ページの「前へ / 次へ」の順序(連続で見るため)。
 * 並びは、カタログの一覧と同じ「カテゴリ順(CATEGORY_ORDER)→ 同じカテゴリの中は渡された順(id 順)」。
 * カテゴリの境界では次のカテゴリの先頭へ続き、全体の最初の prev と最後の next は null。
 *
 * 純粋な関数にしてある(一覧を引数で受け取る)。`node --experimental-strip-types` の検査(npm run verify)から
 * Next の `@/` エイリアスや fs を通さずに呼べるようにするため。ページ側は getAllAlgorithmsMeta() を渡す。
 */
import { CATEGORY_ORDER } from "./algorithm-categories.ts";

export type PagingSource = { id: string; category: string };

const CATEGORY_RANK = new Map<string, number>(
  (CATEGORY_ORDER as readonly string[]).map((category, index) => [category, index]),
);

// 詳細ページは 700 件超を静的生成する。同じ配列に対する並べ替えは 1 回だけにする。
const sortedCache = new WeakMap<readonly PagingSource[], PagingSource[]>();

function sortForPaging<T extends PagingSource>(all: readonly T[]): T[] {
  const cached = sortedCache.get(all);
  if (cached) return cached as T[];
  // Array.prototype.sort は安定ソート。表に無いカテゴリは最後にまとめる
  const sorted = [...all].sort(
    (a, b) =>
      (CATEGORY_RANK.get(a.category) ?? Number.MAX_SAFE_INTEGER) -
      (CATEGORY_RANK.get(b.category) ?? Number.MAX_SAFE_INTEGER),
  );
  sortedCache.set(all, sorted);
  return sorted;
}

/** `id` の前と次のアルゴリズム。存在しない id は両方 null。 */
export function getAdjacentAlgorithms<T extends PagingSource>(
  id: string,
  all: readonly T[],
): { prev: T | null; next: T | null } {
  const sorted = sortForPaging(all);
  const index = sorted.findIndex((item) => item.id === id);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? sorted[index - 1] : null,
    next: index < sorted.length - 1 ? sorted[index + 1] : null,
  };
}
