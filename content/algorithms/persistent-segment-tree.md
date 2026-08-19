---
name: 永続セグメント木(Persistent Segment Tree)
category: ゲーム/競技プログラミング
subcategory: 競技プログラミング典型
complexity: O(log n)(1回の更新・クエリあたり)、O(log n)の追加メモリ/更新
summary: 更新のたびに変更されたパスだけ新しいノードを作ることで、過去の全バージョンを参照可能な形で残しながらO(log n)の更新・クエリを維持するセグメント木の拡張。
---

## 概要

[セグメント木](/algorithms/segment-tree)は区間クエリと更新をO(log n)で処理できる強力な構造だが、通常の実装では「更新」は既存のノードを上書きしてしまうため、過去のある時点での状態を後から参照することはできない。永続セグメント木(Persistent Segment Tree、"Functional Segment Tree"とも呼ばれる)は、更新のたびに**ルートから葉までの経路上のノードだけを新しく作り、それ以外のノードは古いバージョンとそのまま共有する**ことで、過去の全てのバージョンを同時に、しかも追加コストO(log n)のメモリだけで保持できるようにする拡張である。木構造全体を毎回コピーすればO(n)のメモリと時間がかかってしまうが、「変更されるのは根から対象の葉までのO(log n)個のノードだけで、残りの子孫はまるごと共有できる」という観察により、更新のたびに必要なのはO(log n)個の新規ノードのみで済む。競技プログラミングでは「区間`[l, r]`内でk番目に小さい値を求める」といった、通常の[セグメント木](/algorithms/segment-tree)や[Fenwick木](/algorithms/fenwick-tree)だけでは扱いにくいクエリを、累積構築されたバージョン群の差分を使って解く典型テクニックとして頻出する。

## 仕組み

永続セグメント木は、配列ベースで木を表現する通常の[セグメント木](/algorithms/segment-tree)とは異なり、**各ノードが左右の子への参照(ポインタ)を持つ動的な二分木**として実装する。

1. **初期バージョンの構築**: 全要素が0(または初期値)のセグメント木を、通常の再帰的な構築でO(n)個のノードを使って作る。これがバージョン0のルートになる
2. **更新(新バージョンの作成)**: バージョン`v`に対して位置`i`の値を変更した新バージョン`v+1`を作りたいとき、ルートから葉`i`までの経路をたどりながら**新しいノードを都度複製**していく。具体的には、あるノードの子のうち更新対象を含む側だけ再帰的に新しいノードを作り、更新対象を含まない側は**古いバージョンの子ノードをそのまま参照として使い回す**。これにより新しく作られるノードは根から葉までのO(log n)個だけで済み、木の大部分(更新に関係しない部分木)は前のバージョンと物理的に共有される
3. **各バージョンのルートを配列などに記録**しておく。バージョン`v`のルートから通常の[セグメント木](/algorithms/segment-tree)と同じ手順で区間クエリをたどれば、そのバージョン時点での状態に対するクエリにO(log n)で答えられる
4. **区間k番目クエリへの応用**: 値の出現有無を数えるセグメント木(各位置は値の頻度)を、配列の先頭から1要素ずつ追加しながら永続化して構築すると、バージョン`i`は「先頭`i`要素の値の頻度分布」を表す。区間`[l, r]`のk番目に小さい値を知りたければ、バージョン`r`とバージョン`l-1`の対応するノードの値の**差**(頻度の差)を見ながら、値の小さい側から二分探索的に木をたどることで、区間内の値の分布を実際に配列化せずにO(log n)で求められる

## 特性・トレードオフ

- **計算量とメモリ**: 更新・クエリともにO(log n)を維持しつつ、m回の更新に対して総メモリはO(n + m log n)。バージョンごとに木を丸ごとコピーするO(n・m)と比べて大幅に効率的
- **不変性(immutability)ゆえの安全性**: 一度作られたバージョンのノードは二度と書き換えられないため、複数のバージョンを同時に、しかも並行して安全に参照できる。関数型プログラミングにおける永続データ構造(persistent data structure)の考え方をそのまま体現している
- **区間k番目クエリの定番解法**: 「区間`[l, r]`内でk番目に小さい値を求めよ」という問題は、[Wavelet木](/algorithms/wavelet-tree)や平方分割でも解けるが、永続セグメント木は座標圧縮と組み合わせることで実装量を抑えつつO((n+q) log n)で解ける典型手法として広く使われる
- **[セグメント木](/algorithms/segment-tree)との違い**: 通常のセグメント木が「今の状態」だけを保持するのに対し、永続セグメント木は「全ての過去の状態」を同時に保持する。木上のパスに対する累積クエリ(木を根からの深さ順に永続化して構築し、任意の頂点から根までの区間k番目を求めるなど)にも応用が広がる
- **使いどころ**: 区間内k番目クエリ、バージョン管理が必要なデータ構造(エディタのUndo/Redo、Gitのようなスナップショット管理の縮小版)、[小から大へのマージ](/algorithms/small-to-large-merging)や[重心分解](/algorithms/centroid-decomposition)と組み合わせた木上のクエリ処理

## 実装例

配列の座標圧縮された値の頻度を永続化して保持し、区間`[l, r]`内でk番目に小さい値を求める例。

```python
from bisect import bisect_left
from typing import List, Optional


class PersistentSegmentTree:
    def __init__(self, size: int) -> None:
        self.size = size
        # 各ノード: (left_child_index, right_child_index, count)
        self.left: List[int] = [0]
        self.right: List[int] = [0]
        self.count: List[int] = [0]
        self.roots: List[int] = [self._build(0, size - 1)]

    def _new_node(self, left: int, right: int, count: int) -> int:
        self.left.append(left)
        self.right.append(right)
        self.count.append(count)
        return len(self.count) - 1

    def _build(self, lo: int, hi: int) -> int:
        if lo == hi:
            return self._new_node(0, 0, 0)
        mid = (lo + hi) // 2
        l = self._build(lo, mid)
        r = self._build(mid + 1, hi)
        return self._new_node(l, r, 0)

    def _update(self, prev: int, lo: int, hi: int, pos: int) -> int:
        if lo == hi:
            return self._new_node(0, 0, self.count[prev] + 1)
        mid = (lo + hi) // 2
        if pos <= mid:
            new_left = self._update(self.left[prev], lo, mid, pos)
            new_right = self.right[prev]
        else:
            new_left = self.left[prev]
            new_right = self._update(self.right[prev], mid + 1, hi, pos)
        return self._new_node(new_left, new_right, self.count[new_left] + self.count[new_right])

    def add_version(self, pos: int) -> None:
        """直前のバージョンに要素posを1個追加した新バージョンを作る"""
        new_root = self._update(self.roots[-1], 0, self.size - 1, pos)
        self.roots.append(new_root)

    def kth_smallest(self, ver_l: int, ver_r: int, lo: int, hi: int, k: int) -> int:
        """バージョンver_lとver_r-1の差分(区間[l, r)相当)でk番目(0-indexed)に小さい圧縮値を返す"""
        node_l, node_r = self.roots[ver_l], self.roots[ver_r]
        while lo < hi:
            mid = (lo + hi) // 2
            left_count = self.count[self.left[node_r]] - self.count[self.left[node_l]]
            if k < left_count:
                node_l, node_r = self.left[node_l], self.left[node_r]
                hi = mid
            else:
                k -= left_count
                node_l, node_r = self.right[node_l], self.right[node_r]
                lo = mid + 1
        return lo


def range_kth_smallest(a: List[int], queries: List[tuple]) -> List[int]:
    """queries: (l, r, k) 0-indexed半開区間[l, r)でk番目(0-indexed)に小さい値"""
    sorted_vals = sorted(set(a))
    compress = {v: i for i, v in enumerate(sorted_vals)}

    pst = PersistentSegmentTree(len(sorted_vals))
    for v in a:
        pst.add_version(compress[v])

    answers = []
    for l, r, k in queries:
        idx = pst.kth_smallest(l, r, 0, len(sorted_vals) - 1, k)
        answers.append(sorted_vals[idx])
    return answers
```

```typescript
class PersistentSegmentTree {
  private left: number[] = [0];
  private right: number[] = [0];
  private count: number[] = [0];
  roots: number[] = [];

  constructor(private size: number) {
    this.roots.push(this.build(0, size - 1));
  }

  private newNode(left: number, right: number, count: number): number {
    this.left.push(left);
    this.right.push(right);
    this.count.push(count);
    return this.count.length - 1;
  }

  private build(lo: number, hi: number): number {
    if (lo === hi) return this.newNode(0, 0, 0);
    const mid = Math.floor((lo + hi) / 2);
    const l = this.build(lo, mid);
    const r = this.build(mid + 1, hi);
    return this.newNode(l, r, 0);
  }

  private update(prev: number, lo: number, hi: number, pos: number): number {
    if (lo === hi) return this.newNode(0, 0, this.count[prev] + 1);
    const mid = Math.floor((lo + hi) / 2);
    let newLeft: number, newRight: number;
    if (pos <= mid) {
      newLeft = this.update(this.left[prev], lo, mid, pos);
      newRight = this.right[prev];
    } else {
      newLeft = this.left[prev];
      newRight = this.update(this.right[prev], mid + 1, hi, pos);
    }
    return this.newNode(newLeft, newRight, this.count[newLeft] + this.count[newRight]);
  }

  addVersion(pos: number): void {
    const newRoot = this.update(this.roots[this.roots.length - 1], 0, this.size - 1, pos);
    this.roots.push(newRoot);
  }

  kthSmallest(verL: number, verR: number, k: number): number {
    let nodeL = this.roots[verL];
    let nodeR = this.roots[verR];
    let lo = 0;
    let hi = this.size - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const leftCount = this.count[this.left[nodeR]] - this.count[this.left[nodeL]];
      if (k < leftCount) {
        nodeL = this.left[nodeL];
        nodeR = this.left[nodeR];
        hi = mid;
      } else {
        k -= leftCount;
        nodeL = this.right[nodeL];
        nodeR = this.right[nodeR];
        lo = mid + 1;
      }
    }
    return lo;
  }
}

function rangeKthSmallest(
  a: number[],
  queries: [number, number, number][],
): number[] {
  const sortedVals = Array.from(new Set(a)).sort((x, y) => x - y);
  const compress = new Map(sortedVals.map((v, i) => [v, i]));

  const pst = new PersistentSegmentTree(sortedVals.length);
  for (const v of a) {
    pst.addVersion(compress.get(v)!);
  }

  return queries.map(([l, r, k]) => {
    const idx = pst.kthSmallest(l, r, k);
    return sortedVals[idx];
  });
}
```
