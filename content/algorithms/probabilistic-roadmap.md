---
name: PRM(確率的ロードマップ法, Probabilistic Roadmap)
category: 制御・ロボティクス
subcategory: 経路計画
complexity: O(n² )(n個のサンプル点間の近傍衝突判定を含むロードマップ構築、クエリ自体はO(n log n)程度)
summary: configuration space上にランダムな点をサンプリングし、障害物を避けられる近傍点同士を結んで経路探索用のグラフ(ロードマップ)を事前に構築しておき、探索クエリのたびにそのグラフ上でグラフ探索するサンプリングベースの経路計画手法。
---

## 概要

[RRT](/algorithms/rrt)は探索木をその場でスタート地点から少しずつ伸ばしていく「クエリ駆動」の経路計画法であり、スタートとゴールが与えられるたびに一から木を構築し直す。1996年にLydia Kavrakiらが発表したPRM(確率的ロードマップ法)は、これとは異なる二段階のアプローチを取る——まず環境全体の**configuration space**(ロボットの取りうる姿勢・関節角の空間)にランダムな点を大量にサンプリングし、障害物を避けて直線的に(あるいは単純な補間で)接続できる近傍の点同士を辺で結んだ「ロードマップ」と呼ばれるグラフを、スタートやゴールに依存しない形で**事前に**構築しておく。実際に経路を求めたいとき(クエリのとき)は、スタート地点とゴール地点をロードマップに接続し、あとは通常のグラフ探索アルゴリズム([A*探索](/algorithms/a-star)など)でロードマップ上の最短経路を探すだけでよい——一度作ったロードマップは、同じ環境であればスタート・ゴールを変えて何度でも使い回せる点が最大の特徴である。

## 仕組み

1. **ロードマップ構築フェーズ**: configuration space上にランダムな点(configuration)を大量にサンプリングする。各サンプル点について、障害物と衝突していないかを確認し、衝突していれば破棄する(衝突していない点だけがロードマップの頂点候補になる)
2. 各サンプル点について、近傍の(距離が近い、あるいはk個の最近傍の)他のサンプル点との間に、障害物を避けて接続できるか(2点を結ぶ経路上のどの点も衝突しないか)を確認する
3. 衝突なく接続できる点同士を辺で結び、頂点の集合と辺の集合からなる無向グラフ(ロードマップ)を構築する——これで環境全体を覆う経路探索用のグラフが1つ完成する
4. **クエリフェーズ**: 実際に経路を求めたいスタート地点とゴール地点を、それぞれロードマップ上の近傍の頂点に(衝突なく接続できることを確認した上で)追加接続する
5. スタートからゴールまでの経路を、[A*探索](/algorithms/a-star)や[ダイクストラ法](/algorithms/dijkstra)のような通常のグラフ探索アルゴリズムでロードマップ上から見つける——ロードマップ自体は変わらないため、スタート・ゴールが変わるたびに手順4〜5だけを繰り返せばよい

## 特性・トレードオフ

- **計算量**: ロードマップ構築フェーズは、`n`個のサンプル点それぞれについて近傍点との衝突判定を行うため、素朴な実装では`O(n²)`(空間分割構造を使えばもっと効率化できる)。この構築コストは事前に1回だけ支払えばよく、構築後の各クエリはグラフ探索のコストである`O(n log n)`程度(効率的な優先度付きキューを使う場合)で済む
- **[RRT](/algorithms/rrt)との使い分け**: RRTはスタートからその場で木を伸ばす「シングルクエリ」向けの手法であり、1回の経路計画には効率的だが、スタートやゴールが変わるたびに一から木を再構築する必要がある。PRMは逆に、ロードマップの構築に相応のコストがかかる代わりに、**一度構築すれば同じ環境で何度も異なるスタート・ゴールのクエリに再利用できる**——工場内の同じ作業空間で毎回異なる位置間の経路を求めるロボットアームや、同じマップ上で多数の巡回ルートを計算したい搬送ロボットのように、同一環境に対して繰り返し経路計画クエリが発生する場面ではPRMが有利になる
- **狭い通路の弱点**: ランダムサンプリングに基づくため、幅の狭い通路(サンプル点がその通路内に偶然落ちる確率が低い領域)がロードマップに反映されにくいという弱点がある——この弱点を緩和するため、障害物の境界付近を重点的にサンプリングするなどの改良版(Gaussian PRM、Bridge Test PRMなど)が提案されている
- **確率的完全性**: [RRT](/algorithms/rrt)と同様、サンプル数を増やせば増やすほど、もし経路が存在するならほぼ確実にPRMのロードマップ上にもその経路が反映されることが理論的に保証されている(確率的完全性)。ただし最短性は保証されない——ロードマップ上のグラフ探索で得られる経路は、あくまで「サンプリングされた点を経由する経路の中での」最短経路である
- **使いどころ**: 同じ作業空間で繰り返し経路計画を行う産業用ロボットアーム(多自由度の関節空間での経路計画)、倉庫や工場フロアのように環境がほぼ固定された中で多数の搬送タスクを処理するAGV/AMRの経路計画、ゲームのNPCのナビゲーションメッシュ的な事前計算経路網、[RRT](/algorithms/rrt)や[RRT*](/algorithms/rrt-star)と並ぶサンプリングベース経路計画の代表的な比較対象

## 実装例

円形障害物のある2次元平面でロードマップを構築し、幅優先探索でスタートからゴールまでの経路を求める例。ロードマップは一度構築すれば、異なるスタート・ゴールのクエリに再利用できる。

```python
import math
import random
from collections import deque

Point = tuple[float, float]


def dist(a: Point, b: Point) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def segment_hits_circle(p1: Point, p2: Point, center: Point, radius: float) -> bool:
    x1, y1 = p1
    x2, y2 = p2
    cx, cy = center
    dx, dy = x2 - x1, y2 - y1
    length2 = dx * dx + dy * dy
    if length2 == 0:
        return dist(p1, center) <= radius
    t = max(0.0, min(1.0, ((cx - x1) * dx + (cy - y1) * dy) / length2))
    closest = (x1 + t * dx, y1 + t * dy)
    return dist(closest, center) <= radius


def collision_free(p1: Point, p2: Point, obstacles) -> bool:
    return not any(segment_hits_circle(p1, p2, c, r) for c, r in obstacles)


class Roadmap:
    """一度構築すれば、複数のスタート・ゴールのクエリに使い回せるロードマップ。"""

    def __init__(self, obstacles, bounds, n_samples=300, k_neighbors=8, rng: random.Random | None = None):
        rng = rng or random.Random()
        self.obstacles = obstacles
        self.nodes: list[Point] = []
        self.edges: dict[int, list[int]] = {}

        while len(self.nodes) < n_samples:
            p = (rng.uniform(bounds[0], bounds[2]), rng.uniform(bounds[1], bounds[3]))
            if all(dist(p, c) > r for c, r in obstacles):  # 障害物内でない点だけ採用
                self.nodes.append(p)
                self.edges[len(self.nodes) - 1] = []

        for i, pi in enumerate(self.nodes):
            neighbors = sorted(range(len(self.nodes)), key=lambda j: dist(pi, self.nodes[j]))[1:k_neighbors + 1]
            for j in neighbors:
                if j not in self.edges[i] and collision_free(pi, self.nodes[j], obstacles):
                    self.edges[i].append(j)
                    self.edges[j].append(i)

    def _connect_temp_node(self, point: Point, k: int = 5) -> int:
        idx = len(self.nodes)
        self.nodes.append(point)
        self.edges[idx] = []
        neighbors = sorted(range(idx), key=lambda j: dist(point, self.nodes[j]))[:k]
        for j in neighbors:
            if collision_free(point, self.nodes[j], self.obstacles):
                self.edges[idx].append(j)
                self.edges[j].append(idx)
        return idx

    def query(self, start: Point, goal: Point) -> list[Point] | None:
        """スタート・ゴールをロードマップに接続し、幅優先探索で経路を求める。"""
        saved_nodes, saved_edges = len(self.nodes), {k: v[:] for k, v in self.edges.items()}
        start_idx = self._connect_temp_node(start)
        goal_idx = self._connect_temp_node(goal)

        parent = {start_idx: None}
        queue = deque([start_idx])
        found = False
        while queue:
            cur = queue.popleft()
            if cur == goal_idx:
                found = True
                break
            for nxt in self.edges[cur]:
                if nxt not in parent:
                    parent[nxt] = cur
                    queue.append(nxt)

        path = None
        if found:
            path = []
            idx = goal_idx
            while idx is not None:
                path.append(self.nodes[idx])
                idx = parent[idx]
            path.reverse()

        # 一時的に追加したスタート・ゴールのノードをロードマップから取り除く(再利用のため)
        self.nodes = self.nodes[:saved_nodes]
        self.edges = saved_edges
        return path
```

```typescript
type Point = [number, number];
type Obstacle = [Point, number];

function dist(a: Point, b: Point): number { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

function segmentHitsCircle(p1: Point, p2: Point, center: Point, radius: number): boolean {
  const [x1, y1] = p1, [x2, y2] = p2, [cx, cy] = center;
  const dx = x2 - x1, dy = y2 - y1;
  const length2 = dx * dx + dy * dy;
  if (length2 === 0) return dist(p1, center) <= radius;
  const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / length2));
  const closest: Point = [x1 + t * dx, y1 + t * dy];
  return dist(closest, center) <= radius;
}
function collisionFree(p1: Point, p2: Point, obstacles: Obstacle[]): boolean {
  return !obstacles.some(([c, r]) => segmentHitsCircle(p1, p2, c, r));
}

class Roadmap {
  nodes: Point[] = [];
  edges: Map<number, number[]> = new Map();

  constructor(
    private obstacles: Obstacle[],
    bounds: [number, number, number, number],
    nSamples = 300,
    kNeighbors = 8,
    rng: () => number = Math.random,
  ) {
    while (this.nodes.length < nSamples) {
      const p: Point = [bounds[0] + rng() * (bounds[2] - bounds[0]), bounds[1] + rng() * (bounds[3] - bounds[1])];
      if (obstacles.every(([c, r]) => dist(p, c) > r)) {
        this.nodes.push(p);
        this.edges.set(this.nodes.length - 1, []);
      }
    }
    for (let i = 0; i < this.nodes.length; i++) {
      const pi = this.nodes[i];
      const neighbors = [...this.nodes.keys()]
        .filter((j) => j !== i)
        .sort((a, b) => dist(pi, this.nodes[a]) - dist(pi, this.nodes[b]))
        .slice(0, kNeighbors);
      for (const j of neighbors) {
        const edgesI = this.edges.get(i)!;
        if (!edgesI.includes(j) && collisionFree(pi, this.nodes[j], obstacles)) {
          edgesI.push(j);
          this.edges.get(j)!.push(i);
        }
      }
    }
  }

  private connectTempNode(point: Point, k = 5): number {
    const idx = this.nodes.length;
    this.nodes.push(point);
    this.edges.set(idx, []);
    const neighbors = [...Array(idx).keys()]
      .sort((a, b) => dist(point, this.nodes[a]) - dist(point, this.nodes[b]))
      .slice(0, k);
    for (const j of neighbors) {
      if (collisionFree(point, this.nodes[j], this.obstacles)) {
        this.edges.get(idx)!.push(j);
        this.edges.get(j)!.push(idx);
      }
    }
    return idx;
  }

  query(start: Point, goal: Point): Point[] | null {
    const savedNodesLen = this.nodes.length;
    const savedEdges = new Map([...this.edges].map(([k, v]) => [k, [...v]]));
    const startIdx = this.connectTempNode(start);
    const goalIdx = this.connectTempNode(goal);

    const parent = new Map<number, number | null>([[startIdx, null]]);
    const queue: number[] = [startIdx];
    let found = false;
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur === goalIdx) { found = true; break; }
      for (const nxt of this.edges.get(cur)!) {
        if (!parent.has(nxt)) {
          parent.set(nxt, cur);
          queue.push(nxt);
        }
      }
    }

    let path: Point[] | null = null;
    if (found) {
      path = [];
      let idx: number | null = goalIdx;
      while (idx !== null) {
        path.push(this.nodes[idx]);
        idx = parent.get(idx)!;
      }
      path.reverse();
    }

    this.nodes = this.nodes.slice(0, savedNodesLen);
    this.edges = savedEdges;
    return path;
  }
}
```
