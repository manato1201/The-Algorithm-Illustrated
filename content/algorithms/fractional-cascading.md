---
name: フラクショナルカスケーディング(Fractional Cascading)
category: 探索
subcategory: 配列探索
complexity: O(log n + k)(k個のリストへのクエリ、前処理O(n))
summary: 複数のソート済みリストに同じ値を横断的に二分探索する際、各リストで探索をやり直す無駄を「橋渡し」構造で消し、初回だけO(log n)、以降O(1)で辿れるようにする手法。
---

## 概要

「同じキーで、複数のソート済みリストそれぞれに対して二分探索したい」という場面は計算幾何やデータベースのクエリ処理で頻繁に現れる。愚直にやればk個のリストそれぞれにO(log n)の二分探索をかけてO(k log n)かかる。1986年にBernard Chazelle と Leonidas Guibasが発表したフラクショナルカスケーディングは、隣接するリスト同士を「橋渡し」する補助データを事前に埋め込んでおくことで、**最初のリストだけO(log n)で探索し、残りのリストはO(1)でほぼ直接ジャンプできる**ようにする。結果として全体の探索がO(log n + k)まで縮む。

## 仕組み

1. d個のソート済みリスト L₁, L₂, ..., L_d が与えられる(典型的にはグラフの隣接リストや幾何構造のスライスなど)
2. リストを後ろから前へ処理し、各リストに「次のリストの要素を間引いて挿入した」拡張版リスト L'ᵢ を構築する(例えば L'_{i+1} の要素を2個に1個の割合でL'ᵢに混ぜ込む)
3. 各要素に「自分がどのリストの何番目の要素に対応するか」というポインタ(ブリッジ)を張っておく
4. クエリ時は、まず最初の拡張リスト L'₁ に対してのみ通常の二分探索(O(log n))を行い、目的の値の直近の位置を見つける
5. 以降は、見つかった位置からブリッジポインタを辿るだけで次のリストの対応位置がO(1)で分かる(間引かれた要素が「道しるべ」として機能するため、局所的な線形走査で済む)
6. 全リストを辿り終えるまで4〜5を繰り返し、各リストでの該当位置(または最も近い位置)をまとめて返す

## 特性・トレードオフ

- **計算量**: k個のリスト全体へのクエリがO(log n + k)。愚直な「リストごとに二分探索」のO(k log n)と比べ、kが大きいほど効果が顕著になる。前処理(拡張リストとブリッジの構築)はO(n)(全リストの要素数の合計)
- **空間コストは定数倍**: 各リストに次のリストから間引いた要素を混ぜ込むため、全体のサイズは元のΣ|Lᵢ|の高々2倍程度に収まる
- **静的構造が前提**: 古典的なフラクショナルカスケーディングは構築後の更新(挿入・削除)を苦手とする。動的版の研究もあるが更新コストが増える
- **計算幾何での主要な用途**: 平面走査(スイープライン)アルゴリズムで「複数のスラブ(帯)それぞれに対して同じx座標の走査線と交差する図形を探す」ようなクエリを高速化する際の定番テクニック
- **使いどころ**: 計算幾何の多層探索構造(layered range tree)、グラフの隣接リスト群に対する反復的な二分探索、データベースの複数インデックスを跨いだ範囲クエリの最適化

## 実装例

```python
from bisect import bisect_left, insort

def build_cascaded(lists: list[list[int]]) -> list[list[tuple[int, int]]]:
    """各リストを (値, 次リストでの対応インデックス) のペア列に拡張する"""
    d = len(lists)
    augmented: list[list[tuple[int, int]]] = [[] for _ in range(d)]
    # 末尾のリストはそのまま(次のリストが無いので対応インデックスは -1)
    augmented[d - 1] = [(v, -1) for v in lists[d - 1]]

    for i in range(d - 2, -1, -1):
        merged = [(v, i + 1, -1) for v in lists[i]]
        # 1つ飛ばしで次のリストの要素を間引いて混入する
        for idx, (v, _) in enumerate(augmented[i + 1]):
            if idx % 2 == 0:
                merged.append((v, i + 1, idx))
        merged.sort(key=lambda t: t[0])
        augmented[i] = [(v, nxt) for v, _, nxt in merged]

    return augmented


def cascading_search(augmented: list[list[tuple[int, int]]], target: int) -> list[int]:
    """各リストにおける target 以上で最小の値のインデックスを返す"""
    result: list[int] = []
    values0 = [v for v, _ in augmented[0]]
    pos = bisect_left(values0, target)
    result.append(pos if pos < len(values0) else -1)

    cur_idx = pos
    for level in range(len(augmented) - 1):
        if cur_idx >= len(augmented[level]):
            result.append(-1)
            cur_idx = len(augmented[level + 1])
            continue
        _, bridge = augmented[level][cur_idx]
        # ブリッジ位置から局所的に前後を探索(O(1)に近い定数回の比較)
        nxt_values = [v for v, _ in augmented[level + 1]]
        start = max(0, bridge if bridge >= 0 else len(nxt_values))
        j = bisect_left(nxt_values, target, max(0, start - 2))
        result.append(j if j < len(nxt_values) else -1)
        cur_idx = j
    return result
```

```typescript
type CascadedEntry = [value: number, bridge: number];

function buildCascaded(lists: number[][]): CascadedEntry[][] {
  const d = lists.length;
  const augmented: CascadedEntry[][] = new Array(d);
  augmented[d - 1] = lists[d - 1].map((v): CascadedEntry => [v, -1]);

  for (let i = d - 2; i >= 0; i--) {
    const merged: [number, number, number][] = lists[i].map((v) => [
      v,
      i + 1,
      -1,
    ]);
    augmented[i + 1].forEach(([v], idx) => {
      if (idx % 2 === 0) merged.push([v, i + 1, idx]);
    });
    merged.sort((a, b) => a[0] - b[0]);
    augmented[i] = merged.map(([v, , nxt]): CascadedEntry => [v, nxt]);
  }

  return augmented;
}

function lowerBound(values: number[], target: number, from = 0): number {
  let lo = from;
  let hi = values.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (values[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function cascadingSearch(
  augmented: CascadedEntry[][],
  target: number,
): number[] {
  const result: number[] = [];
  const values0 = augmented[0].map(([v]) => v);
  let curIdx = lowerBound(values0, target);
  result.push(curIdx < values0.length ? curIdx : -1);

  for (let level = 0; level < augmented.length - 1; level++) {
    if (curIdx >= augmented[level].length) {
      result.push(-1);
      curIdx = augmented[level + 1].length;
      continue;
    }
    const [, bridge] = augmented[level][curIdx];
    const nextValues = augmented[level + 1].map(([v]) => v);
    const start = Math.max(0, bridge >= 0 ? bridge : nextValues.length);
    const j = lowerBound(nextValues, target, Math.max(0, start - 2));
    result.push(j < nextValues.length ? j : -1);
    curIdx = j;
  }
  return result;
}
```
