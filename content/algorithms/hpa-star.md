---
name: 階層的経路探索A*(HPA*, Hierarchical Pathfinding A*)
category: 探索
subcategory: グラフ・経路探索
complexity: O(√n)(実用上、クラスタサイズに応じた高速な近似最短路)
summary: 巨大なマップをクラスタに分割して抽象グラフを事前に構築し、大まかな経路をクラスタ単位で高速に決めてから局所的にA*で詳細化する、大規模マップ向けの2段階経路探索。
---

## 概要

数千×数千マスに及ぶ大規模なゲームマップでA*をそのまま実行すると、探索するノード数が膨大になり実時間での応答が難しくなる。2004年にAdi BotеаらがRTS(リアルタイムストラテジー)ゲームでの経路探索を念頭に発表したHPA*(Hierarchical Pathfinding A*)は、**マップを固定サイズのクラスタに分割し、クラスタ同士の出入り口(エントランス)だけを頂点とした「抽象グラフ」を事前に構築**することで、まずクラスタ単位の粗い経路を高速に求め、必要な部分だけを詳細なグリッド上のA*で埋めるという2段階アプローチを取る。地図全体を毎回舐めるように探索する必要がなくなる点が最大の利点である。

## 仕組み

1. マップ全体を固定サイズ(例えば10×10マス)の正方形クラスタに分割する
2. 隣接するクラスタ同士が接する境界線上で、通行可能な連続区間を「エントランス」として検出し、各エントランスに代表点(通常は中央のマス)を1つ置く
3. 同じクラスタ内にある代表点同士について、クラスタ内だけの局所的なA*探索を事前に行い、その移動コストを「クラスタ内辺」として抽象グラフに登録する(この前処理はマップが変わらない限り1回だけ行えばよい)
4. 隣接クラスタのエントランス同士は「クラスタ間辺」として直接つなぐ
5. 経路探索時は、まずスタート地点とゴール地点をそれぞれ含むクラスタに一時的にエントランスとして挿入し、**抽象グラフ上でA*を実行して、通過すべきクラスタとエントランスの列(大まかな経路)を高速に求める**
6. 得られた大まかな経路の各区間(クラスタ内の移動)について、必要になった時点で初めて詳細なグリッド上のA*を実行し、実際の1マス単位の経路に肉付けする(遅延詳細化)

「事前計算した抽象グラフ上での粗い探索」と「実際に使う区間だけの詳細探索」を分離することで、探索空間全体のサイズに依存しない高速な経路発見を実現している。

## 特性・トレードオフ

- **計算量**: 抽象グラフの頂点数(エントランス数)はマップ全体のマス数よりずっと少なく、クラスタサイズをkとすると抽象グラフでの探索コストはおおよそO(√n)程度に収まる(実際の定数はクラスタサイズやエントランス密度に依存)。前処理(クラスタ内辺の計算)はO(n)程度だが、マップが変わらない限り1回で済む
- **経路の最適性はやや犠牲になる**: クラスタ境界の代表点を経由する構造上、理論上の完全な最短経路より若干長くなることがある。多くの実装ではこの誤差は数%程度に抑えられ、実用上は問題にならない
- **動的な障害物への対応**: マップの一部が変化した場合、影響を受けたクラスタだけを局所的に再計算すればよく、抽象グラフ全体を作り直す必要がない
- **A*・ダイクストラの直接適用との違い**: 単純なA*は毎回マップ全体の探索空間を対象にするのに対し、HPA*は「粗い探索」と「詳細な探索」を分けることで、特に長距離の経路探索において探索ノード数を大幅に削減できる
- **使いどころ**: 大規模なRTS/シミュレーションゲームでの大量ユニットの経路探索、オープンワールドゲームのマップ全体を対象にしたナビゲーション、都市規模の道路網での高速な経路検索

## 実装例

```python
import heapq
import math
from typing import Callable

Point = tuple[int, int]


def cluster_of(p: Point, cluster_size: int) -> tuple[int, int]:
    return (p[0] // cluster_size, p[1] // cluster_size)


def build_abstract_graph(
    entrances: list[Point],
    cluster_size: int,
    local_astar: Callable[[Point, Point], float | None],
) -> dict[Point, list[tuple[Point, float]]]:
    """同一クラスタ内のエントランス同士をローカルA*でつなぎ、抽象グラフを構築する"""
    graph: dict[Point, list[tuple[Point, float]]] = {e: [] for e in entrances}
    for i, a in enumerate(entrances):
        for b in entrances[i + 1 :]:
            if cluster_of(a, cluster_size) == cluster_of(b, cluster_size):
                cost = local_astar(a, b)
                if cost is not None:
                    graph[a].append((b, cost))
                    graph[b].append((a, cost))
    return graph


def abstract_astar(
    graph: dict[Point, list[tuple[Point, float]]], start: Point, goal: Point, heuristic: Callable[[Point, Point], float]
) -> list[Point] | None:
    """抽象グラフ上での粗い経路探索(クラスタ・エントランス単位)"""
    g_score: dict[Point, float] = {start: 0.0}
    came_from: dict[Point, Point] = {}
    open_heap: list[tuple[float, Point]] = [(heuristic(start, goal), start)]
    visited: set[Point] = set()

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
                heapq.heappush(open_heap, (tentative_g + heuristic(neighbor, goal), neighbor))
    return None
```

```typescript
type Point = [number, number];

function clusterOf(p: Point, clusterSize: number): string {
  return `${Math.floor(p[0] / clusterSize)},${Math.floor(p[1] / clusterSize)}`;
}

function key(p: Point): string {
  return `${p[0]},${p[1]}`;
}

function buildAbstractGraph(
  entrances: Point[],
  clusterSize: number,
  localAStar: (a: Point, b: Point) => number | null
): Map<string, [Point, number][]> {
  const graph = new Map<string, [Point, number][]>();
  for (const e of entrances) graph.set(key(e), []);

  for (let i = 0; i < entrances.length; i++) {
    for (let j = i + 1; j < entrances.length; j++) {
      const a = entrances[i];
      const b = entrances[j];
      if (clusterOf(a, clusterSize) === clusterOf(b, clusterSize)) {
        const cost = localAStar(a, b);
        if (cost !== null) {
          graph.get(key(a))!.push([b, cost]);
          graph.get(key(b))!.push([a, cost]);
        }
      }
    }
  }
  return graph;
}

function abstractAStar(
  graph: Map<string, [Point, number][]>,
  start: Point,
  goal: Point,
  heuristic: (a: Point, b: Point) => number
): Point[] | null {
  const gScore = new Map<string, number>([[key(start), 0]]);
  const cameFrom = new Map<string, Point>();
  const visited = new Set<string>();
  const open: [number, Point][] = [[heuristic(start, goal), start]];

  while (open.length > 0) {
    open.sort((a, b) => a[0] - b[0]);
    const [, node] = open.shift()!;
    const nodeKey = key(node);
    if (visited.has(nodeKey)) continue;
    if (node[0] === goal[0] && node[1] === goal[1]) {
      const path: Point[] = [node];
      let cur = nodeKey;
      while (cameFrom.has(cur)) {
        const prev = cameFrom.get(cur)!;
        path.push(prev);
        cur = key(prev);
      }
      return path.reverse();
    }
    visited.add(nodeKey);
    for (const [neighbor, weight] of graph.get(nodeKey) ?? []) {
      const nk = key(neighbor);
      const tentativeG = gScore.get(nodeKey)! + weight;
      if (tentativeG < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, tentativeG);
        cameFrom.set(nk, node);
        open.push([tentativeG + heuristic(neighbor, goal), neighbor]);
      }
    }
  }
  return null;
}
```
