---
name: Annoy(Approximate Nearest Neighbors Oh Yeah)
category: 情報検索・ランキング
subcategory: 近似検索
complexity: O(log n)(木1本あたりの検索)
summary: ランダムな超平面で空間を再帰的に分割する木を複数本構築し、メモリマップで高速・省メモリな近似最近傍探索を実現する手法。
---

## 概要

Spotify社のErik Bernhardssonが開発した、音楽の推薦システム向けに設計された近似最近傍探索ライブラリ、およびそのアルゴリズム。**ランダム射影木(Random Projection Tree)の森(フォレスト)**を構築するのが基本アイデアで、木構造をディスク上にメモリマップ可能な形式で保存できるため、巨大なインデックスを複数のプロセスで共有しながら省メモリで扱えるという実務上の利点が特に評価され、多くの推薦システムで採用されてきた。

## 仕組み

1. データ点集合からランダムに2点を選び、その2点を分ける**超平面**(2点の垂直二等分面)を求める
2. その超平面を基準に、全データ点を「片側」と「もう片側」の2つのグループに再帰的に分割していく(kd-treeがある固定軸で分割するのに対し、Annoyはランダムな向きの超平面で分割する)
3. 各グループのサイズが一定の閾値以下になるまで分割を繰り返し、二分木を構築する
4. この木を複数本(独立にランダムな超平面選択で)構築し、**フォレスト**とする
5. 検索時には、クエリ点を各木でルートから辿り、到達した葉ノードの候補点を全ての木から集めて統合し、クエリとの実際の距離を計算して上位k件を返す
6. クエリ点が分割境界のすぐ近くにある場合、正しい葉に辿り着けないことがあるため、優先度付きキューで**近い境界の両側を探索する**(木を複数本使うことで、1本の木で境界を間違えても他の木でカバーされる確率を高める)

## 特性・トレードオフ

- **計算量**: 木の構築はO(n log n)、1本の木での検索はO(log n)。木の本数を増やすほど精度は上がるが、検索時間とメモリ使用量もほぼ線形に増える(精度とコストのトレードオフをユーザーが調整できる)
- **HNSWとの違い**: HNSWはグラフベースの探索で一般に高い再現率と速度を両立するが、メモリ使用量が大きくインデックス構築も重い。Annoyは木構造のシンプルさゆえに構築が高速で、メモリマップによる省メモリ・複数プロセス間共有が容易という運用上の利点がある
- **静的データセットへの適性**: 一度構築した木への要素追加は基本的にサポートされておらず、データが更新されるたびに再構築が必要になる(動的な追加に強いHNSWとの明確な違い)
- **使いどころ**: Spotifyの楽曲推薦システム、埋め込みベクトルの近似最近傍検索が必要で、かつメモリ効率・複数プロセス間でのインデックス共有を重視する推薦システム全般

## 実装例

```python
import random
import math


class AnnoyNode:
    def __init__(self) -> None:
        self.is_leaf = True
        self.points: list[int] = []
        self.normal: list[float] | None = None
        self.midpoint: list[float] | None = None
        self.left: "AnnoyNode | None" = None
        self.right: "AnnoyNode | None" = None


def _split(points: list[int], vectors: list[list[float]], leaf_size: int) -> AnnoyNode:
    node = AnnoyNode()
    if len(points) <= leaf_size:
        node.points = points
        return node

    a, b = random.sample(points, 2)
    dim = len(vectors[a])
    normal = [vectors[a][i] - vectors[b][i] for i in range(dim)]
    midpoint = [(vectors[a][i] + vectors[b][i]) / 2 for i in range(dim)]

    left_points, right_points = [], []
    for p in points:
        dot = sum(normal[i] * (vectors[p][i] - midpoint[i]) for i in range(dim))
        (left_points if dot >= 0 else right_points).append(p)

    node.is_leaf = False
    node.normal, node.midpoint = normal, midpoint
    node.left = _split(left_points or points[: len(points) // 2], vectors, leaf_size)
    node.right = _split(right_points or points[len(points) // 2 :], vectors, leaf_size)
    return node


def build_annoy_forest(
    vectors: list[list[float]], n_trees: int = 10, leaf_size: int = 10
) -> list[AnnoyNode]:
    points = list(range(len(vectors)))
    return [_split(points, vectors, leaf_size) for _ in range(n_trees)]


def _search_tree(node: AnnoyNode, query: list[float]) -> list[int]:
    if node.is_leaf:
        return node.points
    dot = sum(node.normal[i] * (query[i] - node.midpoint[i]) for i in range(len(query)))
    return _search_tree(node.left if dot >= 0 else node.right, query)


def annoy_search(
    forest: list[AnnoyNode], vectors: list[list[float]], query: list[float], k: int
) -> list[int]:
    candidates: set[int] = set()
    for tree in forest:
        candidates.update(_search_tree(tree, query))

    def dist2(p: int) -> float:
        return sum((vectors[p][i] - query[i]) ** 2 for i in range(len(query)))

    return sorted(candidates, key=dist2)[:k]
```

```typescript
interface AnnoyNode {
  isLeaf: boolean;
  points: number[];
  normal?: number[];
  midpoint?: number[];
  left?: AnnoyNode;
  right?: AnnoyNode;
}

function split(
  points: number[],
  vectors: number[][],
  leafSize: number,
): AnnoyNode {
  if (points.length <= leafSize) {
    return { isLeaf: true, points };
  }

  const shuffled = [...points].sort(() => Math.random() - 0.5);
  const [a, b] = shuffled;
  const dim = vectors[a].length;
  const normal = Array.from(
    { length: dim },
    (_, i) => vectors[a][i] - vectors[b][i],
  );
  const midpoint = Array.from(
    { length: dim },
    (_, i) => (vectors[a][i] + vectors[b][i]) / 2,
  );

  const leftPoints: number[] = [];
  const rightPoints: number[] = [];
  for (const p of points) {
    let dot = 0;
    for (let i = 0; i < dim; i++)
      dot += normal[i] * (vectors[p][i] - midpoint[i]);
    (dot >= 0 ? leftPoints : rightPoints).push(p);
  }

  return {
    isLeaf: false,
    points: [],
    normal,
    midpoint,
    left: split(
      leftPoints.length ? leftPoints : points.slice(0, points.length / 2),
      vectors,
      leafSize,
    ),
    right: split(
      rightPoints.length ? rightPoints : points.slice(points.length / 2),
      vectors,
      leafSize,
    ),
  };
}

function buildAnnoyForest(
  vectors: number[][],
  nTrees = 10,
  leafSize = 10,
): AnnoyNode[] {
  const points = Array.from({ length: vectors.length }, (_, i) => i);
  return Array.from({ length: nTrees }, () => split(points, vectors, leafSize));
}

function searchTree(node: AnnoyNode, query: number[]): number[] {
  if (node.isLeaf) return node.points;
  let dot = 0;
  for (let i = 0; i < query.length; i++)
    dot += node.normal![i] * (query[i] - node.midpoint![i]);
  return searchTree(dot >= 0 ? node.left! : node.right!, query);
}

function annoySearch(
  forest: AnnoyNode[],
  vectors: number[][],
  query: number[],
  k: number,
): number[] {
  const candidates = new Set<number>();
  for (const tree of forest) {
    for (const p of searchTree(tree, query)) candidates.add(p);
  }

  const dist2 = (p: number): number =>
    query.reduce((sum, q, i) => sum + (vectors[p][i] - q) ** 2, 0);

  return [...candidates].sort((a, b) => dist2(a) - dist2(b)).slice(0, k);
}
```
