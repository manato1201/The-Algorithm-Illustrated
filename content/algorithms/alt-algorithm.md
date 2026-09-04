---
name: ALTアルゴリズム(A* with Landmarks and Triangle inequality)
category: 探索
subcategory: グラフ・経路探索
complexity: O(E)(クエリ、実測ではA*より探索ノード数が大幅に少ない)
summary: グラフ上にランドマーク(基準点)をいくつか選び、事前に全頂点との距離を計算しておくことで、三角不等式から強力なヒューリスティックを導き出しA*を高速化する経路探索。
---

## 概要

A*探索の性能は、ヒューリスティック関数がどれだけ「実際の残り距離」に近い正確な見積もりを出せるかに大きく左右される。しかしユークリッド距離のような単純な幾何学的ヒューリスティックは、実際の道路網(一方通行や迂回が多い)では精度が低いことが多い。2005年にAndrew Goldberg と Chris Harrelsonが発表したALTアルゴリズムは、**グラフ上にいくつかの「ランドマーク」頂点を選び、全頂点からランドマークまでの最短距離を事前に計算しておく**ことで、三角不等式を使った非常にタイトな(精度の高い)ヒューリスティックを導き出す。名前のALTは、Aは(A*の)A、Lはランドマーク(Landmark)、Tは三角不等式(Triangle inequality)の頭文字から来ている。

## 仕組み

1. **前処理**: グラフ全体からいくつかのランドマーク頂点L₁, L₂, ..., Lₖを選ぶ(グラフの端に近い、互いに離れた頂点を選ぶと効果が高い)
2. 各ランドマークLᵢについて、**全頂点からLᵢまでの最短距離、およびLᵢから全頂点までの最短距離**をダイクストラ法で1回ずつ計算し、テーブルとして保存しておく(有向グラフの場合、往復両方向が必要)
3. **クエリ時のヒューリスティック計算**: ある頂点vからゴールgまでの残り距離を見積もる際、三角不等式を利用する。d(v, g) ≥ |d(v, Lᵢ) - d(g, Lᵢ)| という関係が任意のランドマークLᵢについて成り立つ(三角形の2辺の差は残りの1辺以上にはならない、という三角不等式の応用)
4. この式を全てのランドマークについて計算し、**最も大きい(=最もタイトな)値をヒューリスティックとして採用する**
5. 得られたヒューリスティックを使い、通常のA*探索を実行する。ヒューリスティックの計算は事前に保存したテーブルの参照だけなのでO(1)(ランドマーク数k倍)で済む

ランドマークまでの正確な距離を「複数の視点」として持っておくことで、単純な直線距離よりもずっと道路網の実際の構造を反映した見積もりが得られる。

## 特性・トレードオフ

- **計算量**: 前処理はランドマーク数k個分のダイクストラ法でO(k・E)。クエリ時のヒューリスティック計算はテーブル参照でO(k)、探索全体としてはA*と同じO(E)のオーダーだが、**ヒューリスティックの精度向上により実際に展開するノード数が大幅に減る**
- **ヒューリスティックの許容性(admissibility)が保証される**: 三角不等式から導かれるこの下界は、実際の最短距離を絶対に超えないことが数学的に保証されており、A*の最短経路保証をそのまま維持できる
- **ランドマークの選び方が性能を左右する**: グラフの周辺部に、互いにできるだけ離れた位置のランドマークを選ぶと、三角不等式のタイトさが向上する。ランダムに選ぶよりも、貪欲法や最遠点探索でランドマークを選定する方が効果的
- **前処理のメモリコスト**: 全頂点×ランドマーク数ぶんの距離テーブルを保持する必要があり、頂点数が非常に大きい場合はメモリ使用量が課題になる。縮約階層法(Contraction Hierarchies)と組み合わせたハイブリッド手法も研究されている
- **使いどころ**: 静的な道路網や交通ネットワークでの高速な経路探索、ヒューリスティックの精度が重要になる長距離ルーティング、A*ベースの既存システムにヒューリスティック品質の改善だけを組み込みたい場合

## 実装例

```python
import heapq
import math
from typing import Iterable

Node = str


def dijkstra_all(graph: dict[Node, list[tuple[Node, float]]], source: Node) -> dict[Node, float]:
    dist: dict[Node, float] = {source: 0.0}
    pq: list[tuple[float, Node]] = [(0.0, source)]
    visited: set[Node] = set()
    while pq:
        d, u = heapq.heappop(pq)
        if u in visited:
            continue
        visited.add(u)
        for v, w in graph.get(u, []):
            nd = d + w
            if nd < dist.get(v, math.inf):
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return dist


def build_landmark_tables(
    graph: dict[Node, list[tuple[Node, float]]], landmarks: Iterable[Node]
) -> dict[Node, dict[Node, float]]:
    """各ランドマークから全頂点への最短距離テーブルを構築する"""
    return {lm: dijkstra_all(graph, lm) for lm in landmarks}


def alt_heuristic(landmark_tables: dict[Node, dict[Node, float]], v: Node, goal: Node) -> float:
    best = 0.0
    for table in landmark_tables.values():
        dv = table.get(v)
        dg = table.get(goal)
        if dv is not None and dg is not None:
            best = max(best, abs(dv - dg))
    return best


def alt_search(
    graph: dict[Node, list[tuple[Node, float]]],
    start: Node,
    goal: Node,
    landmark_tables: dict[Node, dict[Node, float]],
) -> list[Node] | None:
    g_score: dict[Node, float] = {start: 0.0}
    came_from: dict[Node, Node] = {}
    open_heap: list[tuple[float, Node]] = [(alt_heuristic(landmark_tables, start, goal), start)]
    visited: set[Node] = set()

    while open_heap:
        _, node = heapq.heappop(open_heap)
        if node in visited:
            continue
        if node == goal:
            path = [node]
            while node in came_from:
                node = came_from[node]
                path.append(node)
            return path[::-1]
        visited.add(node)
        for neighbor, weight in graph.get(node, []):
            tentative_g = g_score[node] + weight
            if tentative_g < g_score.get(neighbor, math.inf):
                g_score[neighbor] = tentative_g
                came_from[neighbor] = node
                h = alt_heuristic(landmark_tables, neighbor, goal)
                heapq.heappush(open_heap, (tentative_g + h, neighbor))
    return None
```

```typescript
type Node = string;

function dijkstraAll(graph: Map<Node, [Node, number][]>, source: Node): Map<Node, number> {
  const dist = new Map<Node, number>([[source, 0]]);
  const visited = new Set<Node>();
  const pq: [number, Node][] = [[0, source]];

  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift()!;
    if (visited.has(u)) continue;
    visited.add(u);
    for (const [v, w] of graph.get(u) ?? []) {
      const nd = d + w;
      if (nd < (dist.get(v) ?? Infinity)) {
        dist.set(v, nd);
        pq.push([nd, v]);
      }
    }
  }
  return dist;
}

function buildLandmarkTables(graph: Map<Node, [Node, number][]>, landmarks: Node[]): Map<Node, Map<Node, number>> {
  const tables = new Map<Node, Map<Node, number>>();
  for (const lm of landmarks) tables.set(lm, dijkstraAll(graph, lm));
  return tables;
}

function altHeuristic(landmarkTables: Map<Node, Map<Node, number>>, v: Node, goal: Node): number {
  let best = 0;
  for (const table of landmarkTables.values()) {
    const dv = table.get(v);
    const dg = table.get(goal);
    if (dv !== undefined && dg !== undefined) {
      best = Math.max(best, Math.abs(dv - dg));
    }
  }
  return best;
}

function altSearch(
  graph: Map<Node, [Node, number][]>,
  start: Node,
  goal: Node,
  landmarkTables: Map<Node, Map<Node, number>>
): Node[] | null {
  const gScore = new Map<Node, number>([[start, 0]]);
  const cameFrom = new Map<Node, Node>();
  const visited = new Set<Node>();
  const open: [number, Node][] = [[altHeuristic(landmarkTables, start, goal), start]];

  while (open.length > 0) {
    open.sort((a, b) => a[0] - b[0]);
    const [, node] = open.shift()!;
    if (visited.has(node)) continue;
    if (node === goal) {
      const path = [node];
      let cur = node;
      while (cameFrom.has(cur)) {
        cur = cameFrom.get(cur)!;
        path.push(cur);
      }
      return path.reverse();
    }
    visited.add(node);
    for (const [neighbor, weight] of graph.get(node) ?? []) {
      const tentativeG = gScore.get(node)! + weight;
      if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
        gScore.set(neighbor, tentativeG);
        cameFrom.set(neighbor, node);
        const h = altHeuristic(landmarkTables, neighbor, goal);
        open.push([tentativeG + h, neighbor]);
      }
    }
  }
  return null;
}
```
