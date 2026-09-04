---
name: NSW(Navigable Small World Graph)
category: 情報検索・ランキング
subcategory: 近似検索
complexity: O(log n)(貪欲探索、平均)
summary: データ点をノードとした「スモールワールド」構造のグラフを構築し、貪欲探索で少ないホップ数で最近傍にたどり着く近似最近傍探索手法。
---

## 概要

HNSW(階層型NSW)の前身にあたる、グラフベースの近似最近傍探索アルゴリズム。「世界の誰とでも6ステップ程度でつながる」というスモールワールド現象を模した**単層のグラフ**を構築し、そのグラフ上を貪欲法(グリーディ法)で辿ることで、高速に近似最近傍を発見する。各ノードが近い点への「短距離リンク」と、たまたま遠くの点ともつながる「長距離のショートカット」の両方を持つ構造により、少ないホップ数でグラフのどこからでも目的の近傍に到達できる。この単層構造をさらに多層化(階層ごとに間引いたグラフを重ねる)したものがHNSWであり、NSWはその基礎となる考え方を提供している。

## 仕組み

1. データ点を1つずつ順番にグラフに挿入していく。新しい点を挿入する際は、現在のグラフに対して貪欲探索を行い、**既にグラフに存在する点の中から最も近いM個の点**を見つけ、それらとの間に双方向の辺を張る
2. データ挿入の順序がランダムであるため、グラフ構築の初期段階で追加されたノードは、後から密に追加される領域を飛び越える「長距離リンク」として機能しやすくなり、これがスモールワールド性(少ないホップで全体に到達できる性質)を生む
3. 検索時には、ランダムなノード(またはエントリポイント)から出発し、**現在のノードの隣接点の中で、クエリに最も近いものへ移動する**という貪欲な山登り法を繰り返す
4. どの隣接点も現在のノードより近くない(局所最適)状態になったら探索を停止し、その時点のノードを近似最近傍として返す。局所最適に陥るリスクを減らすため、複数のエントリポイントから並行して探索することも多い
5. HNSWはこの構造を「上位層ほどノード数が少なく長距離移動が速い」多層グラフに拡張し、上層から下層へ絞り込むことで、単層NSWよりもさらに高速かつ高精度な探索を実現する

## 特性・トレードオフ

- **計算量**: グラフ構築はO(n log n)程度、検索は貪欲探索によって平均でO(log n)程度のホップ数で収束することが実験的に知られている(理論保証というよりも経験的な性質)
- **HNSWとの違い**: HNSWはNSWのグラフを階層化することで、探索の初期段階(粗い探索)と終盤(細かい探索)を上位層・下位層に分離し、単層NSWよりも高速かつ高い再現率を実現する。現代の実務ではNSW単体よりもHNSWが使われることがほとんど
- **局所最適への弱さ**: 単層の貪欲探索は、グラフの構造によっては真の最近傍から離れた局所最適に収束してしまうことがある。複数のエントリポイントからの並行探索や、多層化がこの弱点を緩和する
- **使いどころ**: HNSWが登場する以前のベクトル検索エンジンでの近似最近傍探索、グラフベースANN手法の基礎理論としての学習・研究、HNSWのような多層グラフ手法を理解するための土台

## 実装例

```python
import math
import random


def build_nsw(vectors: list[list[float]], m: int = 6) -> dict[int, set[int]]:
    """データ点を1つずつ挿入し、貪欲探索でM個の近傍と接続してグラフを構築する。"""
    graph: dict[int, set[int]] = {}
    order = list(range(len(vectors)))
    random.shuffle(order)

    def dist(a: int, b: int) -> float:
        return math.sqrt(sum((vectors[a][i] - vectors[b][i]) ** 2 for i in range(len(vectors[a]))))

    for point in order:
        if not graph:
            graph[point] = set()
            continue
        entry = next(iter(graph))
        neighbors = greedy_search(graph, vectors, vectors[point], entry, m)
        graph[point] = set()
        for nb, _ in neighbors:
            graph[point].add(nb)
            graph[nb].add(point)

    return graph


def greedy_search(
    graph: dict[int, set[int]],
    vectors: list[list[float]],
    query: list[float],
    entry: int,
    k: int,
) -> list[tuple[int, float]]:
    def dist(p: int) -> float:
        return math.sqrt(sum((vectors[p][i] - query[i]) ** 2 for i in range(len(query))))

    visited = {entry}
    current = entry
    best = [(entry, dist(entry))]

    improved = True
    while improved:
        improved = False
        for nb in graph.get(current, ()):
            if nb in visited:
                continue
            visited.add(nb)
            d = dist(nb)
            best.append((nb, d))
            if d < dist(current):
                current = nb
                improved = True

    best.sort(key=lambda x: x[1])
    return best[:k]
```

```typescript
function dist(vectors: number[][], a: number, b: number): number {
  let sum = 0;
  for (let i = 0; i < vectors[a].length; i++) sum += (vectors[a][i] - vectors[b][i]) ** 2;
  return Math.sqrt(sum);
}

function distToQuery(vectors: number[][], p: number, query: number[]): number {
  let sum = 0;
  for (let i = 0; i < query.length; i++) sum += (vectors[p][i] - query[i]) ** 2;
  return Math.sqrt(sum);
}

function greedySearch(
  graph: Map<number, Set<number>>,
  vectors: number[][],
  query: number[],
  entry: number,
  k: number,
): [number, number][] {
  const visited = new Set<number>([entry]);
  let current = entry;
  const best: [number, number][] = [[entry, distToQuery(vectors, entry, query)]];

  let improved = true;
  while (improved) {
    improved = false;
    for (const nb of graph.get(current) ?? []) {
      if (visited.has(nb)) continue;
      visited.add(nb);
      const d = distToQuery(vectors, nb, query);
      best.push([nb, d]);
      if (d < distToQuery(vectors, current, query)) {
        current = nb;
        improved = true;
      }
    }
  }

  best.sort((a, b) => a[1] - b[1]);
  return best.slice(0, k);
}

function buildNsw(vectors: number[][], m = 6): Map<number, Set<number>> {
  const graph = new Map<number, Set<number>>();
  const order = Array.from({ length: vectors.length }, (_, i) => i).sort(() => Math.random() - 0.5);

  for (const point of order) {
    if (graph.size === 0) {
      graph.set(point, new Set());
      continue;
    }
    const entry = graph.keys().next().value as number;
    const neighbors = greedySearch(graph, vectors, vectors[point], entry, m);
    graph.set(point, new Set());
    for (const [nb] of neighbors) {
      graph.get(point)!.add(nb);
      graph.get(nb)!.add(point);
    }
  }

  return graph;
}
```
