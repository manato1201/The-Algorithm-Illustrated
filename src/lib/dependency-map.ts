/**
 * 依存の地図(IMPROVEMENT_DESIGN_2026-10 第6弾・Z59 の「理解の足場」から見せ方だけ取り入れる)。
 * 記事の本文にある `[名前](/algorithms/<id>)` のリンクを機械的に読み取り、アルゴリズム同士のつながりの一覧にする。
 * 「前提・比較・関連」の区別は記事に書かれていないので、つながりの向き(どの記事がどの記事を参照しているか)だけを示す。
 * 参照される数が多い記事は、他の記事の「足場」になっている。
 */

export type DependencyEntry = {
  /** この記事が本文で参照しているアルゴリズム(重複なし・自分自身と存在しないidは除く)。 */
  refs: string[];
  /** この記事を本文で参照しているアルゴリズム(重複なし)。 */
  refBy: string[];
};

const LINK_PATTERN = /\]\(\/algorithms\/([A-Za-z0-9-]+)\)/g;

/** 本文から、参照しているアルゴリズムのid(出現順・重複なし)を取り出す。 */
export function extractAlgorithmLinks(body: string): string[] {
  const found: string[] = [];
  for (const match of body.matchAll(LINK_PATTERN)) {
    if (!found.includes(match[1])) found.push(match[1]);
  }
  return found;
}

/** 全記事の本文から、参照のつながりを作る。存在しないid・自分自身への参照は含めない。 */
export function buildDependencyMap(
  entries: readonly { id: string; body: string }[],
): Map<string, DependencyEntry> {
  const ids = new Set(entries.map((entry) => entry.id));
  const map = new Map<string, DependencyEntry>(
    entries.map((entry) => [entry.id, { refs: [], refBy: [] }]),
  );
  for (const { id, body } of entries) {
    for (const target of extractAlgorithmLinks(body)) {
      if (target === id || !ids.has(target)) continue;
      map.get(id)!.refs.push(target);
      map.get(target)!.refBy.push(id);
    }
  }
  return map;
}

/** 参照されている数の多い順に並べた上位(他の記事の足場になっているアルゴリズム)。同数はid順。 */
export function topFoundations(
  map: ReadonlyMap<string, DependencyEntry>,
  limit: number,
): { id: string; count: number }[] {
  return [...map.entries()]
    .map(([id, entry]) => ({ id, count: entry.refBy.length }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .slice(0, limit);
}
