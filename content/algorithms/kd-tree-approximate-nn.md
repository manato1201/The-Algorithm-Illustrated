---
name: KD-Tree近似最近傍探索(Approximate Nearest Neighbor with KD-Tree)
category: 情報検索・ランキング
subcategory: 近似検索
complexity: O(log n)(近似探索、探索打ち切りあり)
summary: 座標軸に沿って空間を再帰的に分割するkd-treeを、探索するノード数に上限を設けて打ち切ることで高速な近似最近傍探索に転用する手法。
---

## 概要

kd-tree(k-dimensional tree)は1975年にJon Bentleyが考案した古典的な空間分割データ構造で、本来は正確な最近傍探索のために設計された。しかし高次元データでは**次元の呪い**により、正確な探索がほぼ総当たりに近い計算量まで劣化してしまう。そこで実務では、探索を打ち切る**バックトラック回数の上限(または優先度探索の予算)**を設けることで、多少の精度を犠牲にする代わりに大幅な高速化を実現する「近似最近傍探索」としてkd-treeを使う手法が広く採用されている。FLANNライブラリのkd-treeベースの近似探索や、OpenCVの特徴点マッチングなどで実用化されている。

## 仕組み

1. データ点集合を、分散が最大の座標軸を基準に中央値で2分割し、これを再帰的に繰り返して二分木を構築する(各ノードは分割軸と分割値を持つ)
2. 検索時には、クエリ点に対してルートから木を降り、クエリ点がどちら側にあるかに従って葉ノードまで到達する(この葉に含まれる点が第一候補)
3. 葉に到達したら、優先度付きキューに「まだ探索していない兄弟部分木」を、クエリ点から分割境界までの距離が近い順に積んでおく
4. **正確な最近傍探索**では、キューにある全ての有望な部分木を探索し尽くすまで続けるが、**近似探索**では、探索したノード数(またはバックトラック回数)があらかじめ決めた上限に達した時点で打ち切り、その時点での最良候補を近似解として返す
5. 複数のkd-treeをランダムな軸選択で構築し(ランダム化kd-forest)、それらを並行して探索することで、1本の木の探索精度の限界を補い、近似精度を高める手法もよく併用される

## 特性・トレードオフ

- **計算量**: 木の構築はO(n log n)。探索は打ち切り上限を固定すればO(上限)、つまり事実上O(log n)〜定数時間に近い挙動になるが、精度とのトレードオフになる
- **正確な最近傍探索との違い**: 打ち切りなしの正確な探索は低次元では高速だが、高次元(数十次元以上)では総当たりに近い計算量まで劣化する。近似探索は打ち切りによってこの劣化を回避する代わりに、正解を見逃すリスクを許容する
- **HNSWとの違い**: HNSWは多層グラフで探索するのに対し、kd-treeは軸に沿った空間分割木である。一般に高次元・大規模データではHNSWの方が再現率と速度のバランスに優れるが、kd-treeは実装がシンプルで低〜中次元データでは依然として実用的
- **使いどころ**: 画像特徴点(SIFT/ORBなど)のマッチング、低〜中次元(数十次元程度)の埋め込みベクトル検索、FLANNライブラリを用いたコンピュータビジョン応用

## 実装例

```python
import math
from dataclasses import dataclass


@dataclass
class KdNode:
    point: int
    axis: int
    left: "KdNode | None" = None
    right: "KdNode | None" = None


def build_kd_tree(points: list[int], vectors: list[list[float]], depth: int = 0) -> KdNode | None:
    if not points:
        return None
    dim = len(vectors[0])
    axis = depth % dim
    points_sorted = sorted(points, key=lambda p: vectors[p][axis])
    mid = len(points_sorted) // 2

    node = KdNode(point=points_sorted[mid], axis=axis)
    node.left = build_kd_tree(points_sorted[:mid], vectors, depth + 1)
    node.right = build_kd_tree(points_sorted[mid + 1 :], vectors, depth + 1)
    return node


def approximate_nn_search(
    root: KdNode, vectors: list[list[float]], query: list[float], max_visits: int = 50
) -> tuple[int, float] | None:
    """探索ノード数に上限を設け、打ち切ることで近似最近傍を高速に求める。"""
    best: tuple[int, float] | None = None
    visits = 0

    def dist(p: int) -> float:
        return math.sqrt(sum((vectors[p][i] - query[i]) ** 2 for i in range(len(query))))

    def search(node: KdNode | None) -> None:
        nonlocal best, visits
        if node is None or visits >= max_visits:
            return
        visits += 1

        d = dist(node.point)
        if best is None or d < best[1]:
            best = (node.point, d)

        diff = query[node.axis] - vectors[node.point][node.axis]
        near, far = (node.left, node.right) if diff < 0 else (node.right, node.left)
        search(near)
        # 分割境界までの距離が現在の最良より近い場合のみ、反対側も探索する
        if best is None or abs(diff) < best[1]:
            search(far)

    search(root)
    return best
```

```typescript
interface KdNode {
  point: number;
  axis: number;
  left?: KdNode;
  right?: KdNode;
}

function buildKdTree(points: number[], vectors: number[][], depth = 0): KdNode | undefined {
  if (points.length === 0) return undefined;
  const dim = vectors[0].length;
  const axis = depth % dim;
  const sorted = [...points].sort((a, b) => vectors[a][axis] - vectors[b][axis]);
  const mid = Math.floor(sorted.length / 2);

  return {
    point: sorted[mid],
    axis,
    left: buildKdTree(sorted.slice(0, mid), vectors, depth + 1),
    right: buildKdTree(sorted.slice(mid + 1), vectors, depth + 1),
  };
}

function approximateNnSearch(
  root: KdNode,
  vectors: number[][],
  query: number[],
  maxVisits = 50,
): [number, number] | null {
  let best: [number, number] | null = null;
  let visits = 0;

  const dist = (p: number): number => {
    let sum = 0;
    for (let i = 0; i < query.length; i++) sum += (vectors[p][i] - query[i]) ** 2;
    return Math.sqrt(sum);
  };

  function search(node: KdNode | undefined): void {
    if (!node || visits >= maxVisits) return;
    visits++;

    const d = dist(node.point);
    if (!best || d < best[1]) best = [node.point, d];

    const diff = query[node.axis] - vectors[node.point][node.axis];
    const [near, far] = diff < 0 ? [node.left, node.right] : [node.right, node.left];
    search(near);
    // 分割境界までの距離が現在の最良より近い場合のみ、反対側も探索する
    if (!best || Math.abs(diff) < best[1]) search(far);
  }

  search(root);
  return best;
}
```
