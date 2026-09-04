---
name: Ball Tree(球木)
category: 情報検索・ランキング
subcategory: 近似検索
complexity: O(log n)(平均、高次元では劣化)
summary: データ点を包む超球を再帰的に分割して木構造を構築し、三角不等式による枝刈りで最近傍探索を高速化する空間分割手法。
---

## 概要

高次元のデータ点集合を効率的に検索するための空間分割木構造の一つ。kd-treeが座標軸に沿った矩形(ハイパー直方体)で空間を分割するのに対し、Ball Treeは**データ点を包み込む超球(ボール)**で空間を再帰的に分割する。球という形状は座標軸の向きに依存しないため、kd-treeが苦手とする高次元データや、疎ではなく密に分布したデータに対しても比較的頑健に機能する。scikit-learnのNearestNeighborsやBallTreeクラスに実装されており、正確な(近似ではない)最近傍探索を高速化する目的でよく使われる。

## 仕組み

1. データ点集合全体を包み込む最小の超球(中心点と半径)を求める
2. その集合を2つのサブグループに分割する。典型的には、最も離れた2点を選び、各データ点をどちらの点に近いかで振り分ける
3. 各サブグループについて、それを包む超球を再帰的に求め、木のノードとして保持する。これをサブグループのサイズが閾値以下になるまで繰り返す
4. 検索時には、ルートから木を降りていくが、**「クエリ点から、ある球の中心までの距離 - その球の半径」が現在の最良候補との距離より大きければ、その球の中の点は絶対に最良候補になり得ない**という三角不等式に基づく枝刈りを行い、探索しなくてよい部分木を早期に除外する
5. この枝刈りにより、全データ点との総当たり比較を避けながら、正確な最近傍(または上位k件)を効率的に発見できる

## 特性・トレードオフ

- **計算量**: 木の構築はO(n log n)、検索は低〜中次元ではO(log n)程度だが、**次元の呪い**により次元数が増えるほど枝刈りが効きにくくなり、最悪ケースでは総当たり探索のO(n)に近づく
- **kd-treeとの違い**: kd-treeは座標軸に沿った分割のため軸に依存した偏りのあるデータに弱いが、Ball Treeは球による分割のため任意の分布形状によりよく適応する。一方、Ball Treeは球の中心・半径の計算コストがkd-treeの軸選択より若干高い
- **近似最近傍(ANN)手法との違い**: HNSWやLSHのような近似手法と異なり、Ball Treeは正確な最近傍を返すことを目指す(枝刈りは結果の正確性を損なわない)。そのため超高次元・超大規模データでは近似手法に速度で劣ることが多い
- **使いどころ**: 中程度の次元数(数十〜数百次元程度)のデータに対する正確なk近傍探索、scikit-learnなどの機械学習ライブラリにおけるKNN分類・回帰の内部実装、地理空間データの最近傍検索

## 実装例

```python
import math


class BallTreeNode:
    def __init__(self, points: list[int], vectors: list[list[float]]) -> None:
        self.points = points
        self.center = [
            sum(vectors[p][i] for p in points) / len(points) for i in range(len(vectors[0]))
        ]
        self.radius = max(_dist(self.center, vectors[p]) for p in points)
        self.left: "BallTreeNode | None" = None
        self.right: "BallTreeNode | None" = None


def _dist(a: list[float], b: list[float]) -> float:
    return math.sqrt(sum((a[i] - b[i]) ** 2 for i in range(len(a))))


def build_ball_tree(points: list[int], vectors: list[list[float]], leaf_size: int = 10) -> BallTreeNode:
    node = BallTreeNode(points, vectors)
    if len(points) <= leaf_size:
        return node

    # 中心から最も遠い点を軸とし、それに近いかどうかで2分する
    pivot = max(points, key=lambda p: _dist(node.center, vectors[p]))
    other = max(points, key=lambda p: _dist(vectors[pivot], vectors[p]))

    left_pts = [p for p in points if _dist(vectors[p], vectors[pivot]) <= _dist(vectors[p], vectors[other])]
    right_pts = [p for p in points if p not in left_pts]
    if not left_pts or not right_pts:
        return node

    node.left = build_ball_tree(left_pts, vectors, leaf_size)
    node.right = build_ball_tree(right_pts, vectors, leaf_size)
    return node


def ball_tree_knn(
    node: BallTreeNode, vectors: list[list[float]], query: list[float], k: int
) -> list[tuple[int, float]]:
    best: list[tuple[int, float]] = []

    def search(n: BallTreeNode) -> None:
        d_to_ball = _dist(query, n.center) - n.radius
        if len(best) >= k and d_to_ball > best[-1][1]:
            return  # 三角不等式による枝刈り: この球の中に、より良い候補は存在しない
        if n.left is None:
            for p in n.points:
                d = _dist(query, vectors[p])
                best.append((p, d))
            best.sort(key=lambda x: x[1])
            del best[k:]
        else:
            search(n.left)
            search(n.right)

    search(node)
    return best
```

```typescript
interface BallTreeNode {
  points: number[];
  center: number[];
  radius: number;
  left?: BallTreeNode;
  right?: BallTreeNode;
}

function dist(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

function buildBallTree(
  points: number[],
  vectors: number[][],
  leafSize = 10,
): BallTreeNode {
  const dim = vectors[0].length;
  const center = Array.from(
    { length: dim },
    (_, i) => points.reduce((sum, p) => sum + vectors[p][i], 0) / points.length,
  );
  const radius = Math.max(...points.map((p) => dist(center, vectors[p])));
  const node: BallTreeNode = { points, center, radius };

  if (points.length <= leafSize) return node;

  const pivot = points.reduce((best, p) =>
    dist(center, vectors[p]) > dist(center, vectors[best]) ? p : best,
  );
  const other = points.reduce((best, p) =>
    dist(vectors[pivot], vectors[p]) > dist(vectors[pivot], vectors[best])
      ? p
      : best,
  );

  const leftPts = points.filter(
    (p) => dist(vectors[p], vectors[pivot]) <= dist(vectors[p], vectors[other]),
  );
  const rightPts = points.filter((p) => !leftPts.includes(p));
  if (leftPts.length === 0 || rightPts.length === 0) return node;

  node.left = buildBallTree(leftPts, vectors, leafSize);
  node.right = buildBallTree(rightPts, vectors, leafSize);
  return node;
}

function ballTreeKnn(
  node: BallTreeNode,
  vectors: number[][],
  query: number[],
  k: number,
): [number, number][] {
  const best: [number, number][] = [];

  function search(n: BallTreeNode): void {
    const dToBall = dist(query, n.center) - n.radius;
    if (best.length >= k && dToBall > best[best.length - 1][1]) return; // 三角不等式による枝刈り

    if (!n.left) {
      for (const p of n.points) best.push([p, dist(query, vectors[p])]);
      best.sort((a, b) => a[1] - b[1]);
      best.length = Math.min(best.length, k);
    } else {
      search(n.left);
      search(n.right!);
    }
  }

  search(node);
  return best;
}
```
