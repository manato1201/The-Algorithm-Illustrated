---
name: ボロノイ図による経路計画
category: 制御・ロボティクス
subcategory: 経路計画
complexity: O(n log n)(ボロノイ図の構築、n=障害物の代表点数)、O(V log V)(構築後のグラフ上での最短路探索)
summary: 障害物の周りの空間を「各障害物から最も遠い場所」を結んだ骨格線(ボロノイ図)に還元し、その骨格線上だけを探索することで、障害物から可能な限り離れた安全な経路を効率的に見つけるロボット経路計画手法。
---

## 概要

[RRT](/algorithms/rrt)や[ポテンシャル法](/algorithms/potential-field-path-planning)は、探索空間全体(またはランダムサンプリング)から経路を探すが、ボロノイ図による経路計画は全く異なる発想を取る——[ボロノイ図(計算幾何学における空間分割図)](/algorithms/delaunay-triangulation)を障害物回避の道具として応用し、「各障害物から最も遠い点の集まり」で構成される骨格線(ボロノイ図の辺)だけを経路の候補とみなす。この骨格線は、定義上どの障害物からもできるだけ離れた場所を通るため、生成される経路は自然と障害物との衝突マージンが大きい安全な経路になる。探索空間全体ではなく1次元の骨格線のグラフだけを扱えばよいため、経路探索自体は非常に効率的に行える。

## 仕組み

1. 環境内の各障害物を、その形状を近似する点(多角形の頂点など)や領域として表現する
2. 全ての障害物の点集合に対して[ボロノイ図](/algorithms/delaunay-triangulation)を計算する——ボロノイ図は、平面を「どの障害物の点に最も近いか」によって領域分割した図であり、その境界線(ボロノイ辺)は定義上、隣接する2つの障害物からちょうど等距離にある点の集まりになる
3. このボロノイ辺の集合を、ロボットが移動できる経路の候補を表す「ボロノイグラフ」とみなす(辺同士が交わる点=ボロノイ頂点をグラフのノード、辺をグラフのエッジとする)
4. ロボットの現在位置と目標位置を、それぞれ最も近いボロノイグラフ上の点に接続する
5. [ダイクストラ法](/algorithms/dijkstra)や[A*探索](/algorithms/a-star)を使い、このボロノイグラフ上で開始点から目標点までの最短経路を探索する——グラフ自体が障害物から最大限離れた骨格線でできているため、見つかった経路は自然と衝突安全性の高い経路になる

## 特性・トレードオフ

- **計算量**: [ボロノイ図](/algorithms/delaunay-triangulation)の構築自体は分割統治法を使えば`O(n log n)`(`n`は障害物の代表点数)、構築後のグラフ上での最短路探索は[ダイクストラ法](/algorithms/dijkstra)で`O(V log V)`程度——探索空間全体ではなく低次元の骨格グラフだけを扱うため、[RRT](/algorithms/rrt)のようなサンプリングベースの手法と比べて経路探索自体は非常に高速
- **障害物からの安全マージンが最大化されるという際立った特徴**: ボロノイ図の性質上、生成される経路は定義上どの障害物からもできるだけ離れた場所を通る——[ポテンシャル法](/algorithms/potential-field-path-planning)が障害物からの反発力を近似的に扱うのに対し、ボロノイ経路は幾何学的に「最も安全な骨格」を厳密に捉えている点で優れる
- **最短経路にはならないというトレードオフ**: 安全マージンを最大化する代わりに、生成される経路は必ずしも最短経路にはならない(障害物のすぐ近くを通れば最短だが安全マージンが犠牲になる)——安全性と最短性の間のトレードオフがあり、用途によっては見つかった経路をさらに後処理で最適化(障害物との最小マージンを保ちつつ短縮する)することもある
- **狭い通路での扱いにくさ**: 障害物同士が密集している狭い通路では、ボロノイグラフの辺が極端に曲がりくねったり、ロボットの実際の大きさに対して通行可能な幅を十分に確保できなかったりすることがある——このような場面では[RRT](/algorithms/rrt)や[ダイナミックウィンドウアプローチ](/algorithms/dynamic-window-approach)のような、より柔軟な探索手法と組み合わせることが実務では多い
- **使いどころ**: 倉庫内搬送ロボットの経路計画(障害物からの安全マージンを重視する用途)、自律走行ロボットの大域的経路計画(骨格グラフによる高速な経路探索)、ゲームAIにおけるナビゲーションメッシュ生成の理論的基盤

## 実装例

障害物点集合を2つの「壁」として配置し(下側の壁と上側の壁の間に隙間がある)、その隙間を通る開始点・目標点を設定する。骨格(2つの障害物からほぼ等距離にある格子点)だけを辿るグラフ上でダイクストラ法を実行すると、直線経路よりも障害物からの最小クリアランス(安全マージン)が大きい経路が得られることを検証する。

```python
import math
import heapq


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def clearance(p, obstacles):
    return min(dist(p, o) for o in obstacles)


def build_skeleton(obstacles, width, height, step=0.5, eps=0.35):
    """最も近い2つの障害物への距離がほぼ等しい格子点を、ボロノイ骨格とみなす"""
    skeleton = []
    y = 0.0
    while y <= height:
        x = 0.0
        while x <= width:
            p = (x, y)
            dists = sorted(dist(p, o) for o in obstacles)
            if len(dists) >= 2 and (dists[1] - dists[0]) < eps and dists[0] > 0.3:
                skeleton.append(p)
            x += step
        y += step
    return skeleton


def build_graph(nodes, connect_radius):
    graph = {i: [] for i in range(len(nodes))}
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            d = dist(nodes[i], nodes[j])
            if d <= connect_radius:
                graph[i].append((j, d))
                graph[j].append((i, d))
    return graph


def dijkstra(graph, nodes, src, dst):
    pq = [(0.0, src)]
    dist_map = {src: 0.0}
    prev = {}
    visited = set()
    while pq:
        d, u = heapq.heappop(pq)
        if u in visited:
            continue
        visited.add(u)
        if u == dst:
            break
        for v, w in graph[u]:
            nd = d + w
            if nd < dist_map.get(v, math.inf):
                dist_map[v] = nd
                prev[v] = u
                heapq.heappush(pq, (nd, v))
    if dst not in dist_map:
        return None
    path = [dst]
    while path[-1] != src:
        path.append(prev[path[-1]])
    path.reverse()
    return [nodes[i] for i in path]


def plan_path(start, goal, obstacles, width, height, step=0.5, connect_radius=0.75):
    skeleton = build_skeleton(obstacles, width, height, step)
    nodes = skeleton + [start, goal]
    start_idx, goal_idx = len(nodes) - 2, len(nodes) - 1
    graph = build_graph(nodes, connect_radius)
    # start/goalは最も近い5つの骨格ノードへ接続する
    for idx in (start_idx, goal_idx):
        p = nodes[idx]
        candidates = sorted(range(len(skeleton)), key=lambda i: dist(p, skeleton[i]))[:5]
        for c in candidates:
            d = dist(p, skeleton[c])
            graph[idx].append((c, d))
            graph[c].append((idx, d))
    return dijkstra(graph, nodes, start_idx, goal_idx)
```

```typescript
type Point = [number, number];

function dist(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function clearance(p: Point, obstacles: Point[]): number {
  return Math.min(...obstacles.map((o) => dist(p, o)));
}

function buildSkeleton(obstacles: Point[], width: number, height: number, step = 0.5, eps = 0.35): Point[] {
  const skeleton: Point[] = [];
  for (let y = 0; y <= height; y += step) {
    for (let x = 0; x <= width; x += step) {
      const p: Point = [x, y];
      const dists = obstacles.map((o) => dist(p, o)).sort((a, b) => a - b);
      if (dists.length >= 2 && dists[1] - dists[0] < eps && dists[0] > 0.3) {
        skeleton.push(p);
      }
    }
  }
  return skeleton;
}

function buildGraph(nodes: Point[], connectRadius: number): Map<number, Array<[number, number]>> {
  const graph = new Map<number, Array<[number, number]>>();
  for (let i = 0; i < nodes.length; i++) graph.set(i, []);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = dist(nodes[i], nodes[j]);
      if (d <= connectRadius) {
        graph.get(i)!.push([j, d]);
        graph.get(j)!.push([i, d]);
      }
    }
  }
  return graph;
}

function dijkstra(
  graph: Map<number, Array<[number, number]>>,
  nodes: Point[],
  src: number,
  dst: number
): Point[] | null {
  const distMap = new Map<number, number>([[src, 0]]);
  const prev = new Map<number, number>();
  const visited = new Set<number>();
  const pq: Array<[number, number]> = [[0, src]];
  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift()!;
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === dst) break;
    for (const [v, w] of graph.get(u) ?? []) {
      const nd = d + w;
      if (nd < (distMap.get(v) ?? Infinity)) {
        distMap.set(v, nd);
        prev.set(v, u);
        pq.push([nd, v]);
      }
    }
  }
  if (!distMap.has(dst)) return null;
  const path = [dst];
  while (path[path.length - 1] !== src) path.push(prev.get(path[path.length - 1])!);
  path.reverse();
  return path.map((i) => nodes[i]);
}

function planPath(
  start: Point,
  goal: Point,
  obstacles: Point[],
  width: number,
  height: number,
  step = 0.5,
  connectRadius = 0.75
): Point[] | null {
  const skeleton = buildSkeleton(obstacles, width, height, step);
  const nodes = [...skeleton, start, goal];
  const startIdx = nodes.length - 2;
  const goalIdx = nodes.length - 1;
  const graph = buildGraph(nodes, connectRadius);
  for (const idx of [startIdx, goalIdx]) {
    const p = nodes[idx];
    const candidates = skeleton
      .map((s, i): [number, number] => [i, dist(p, s)])
      .sort((a, b) => a[1] - b[1])
      .slice(0, 5);
    for (const [c, d] of candidates) {
      graph.get(idx)!.push([c, d]);
      graph.get(c)!.push([idx, d]);
    }
  }
  return dijkstra(graph, nodes, startIdx, goalIdx);
}
```

```cpp
#include <vector>
#include <queue>
#include <cmath>
#include <algorithm>
#include <limits>
#include <optional>

using Point = std::pair<double, double>;

double dist(const Point& a, const Point& b) {
    return std::hypot(a.first - b.first, a.second - b.second);
}

std::vector<Point> buildSkeleton(const std::vector<Point>& obstacles, double width, double height,
                                  double step = 0.5, double eps = 0.35) {
    std::vector<Point> skeleton;
    for (double y = 0; y <= height; y += step) {
        for (double x = 0; x <= width; x += step) {
            Point p{x, y};
            std::vector<double> dists;
            for (const auto& o : obstacles) dists.push_back(dist(p, o));
            std::sort(dists.begin(), dists.end());
            if (dists.size() >= 2 && (dists[1] - dists[0]) < eps && dists[0] > 0.3) {
                skeleton.push_back(p);
            }
        }
    }
    return skeleton;
}

std::vector<std::vector<std::pair<int, double>>> buildGraph(const std::vector<Point>& nodes, double connectRadius) {
    std::vector<std::vector<std::pair<int, double>>> graph(nodes.size());
    for (size_t i = 0; i < nodes.size(); i++) {
        for (size_t j = i + 1; j < nodes.size(); j++) {
            double d = dist(nodes[i], nodes[j]);
            if (d <= connectRadius) {
                graph[i].push_back({static_cast<int>(j), d});
                graph[j].push_back({static_cast<int>(i), d});
            }
        }
    }
    return graph;
}

std::optional<std::vector<Point>> dijkstra(const std::vector<std::vector<std::pair<int, double>>>& graph,
                                            const std::vector<Point>& nodes, int src, int dst) {
    std::vector<double> distMap(nodes.size(), std::numeric_limits<double>::infinity());
    std::vector<int> prev(nodes.size(), -1);
    std::vector<bool> visited(nodes.size(), false);
    distMap[src] = 0.0;
    using QueueEntry = std::pair<double, int>;
    std::priority_queue<QueueEntry, std::vector<QueueEntry>, std::greater<>> pq;
    pq.push({0.0, src});
    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (visited[u]) continue;
        visited[u] = true;
        if (u == dst) break;
        for (const auto& [v, w] : graph[u]) {
            double nd = d + w;
            if (nd < distMap[v]) {
                distMap[v] = nd;
                prev[v] = u;
                pq.push({nd, v});
            }
        }
    }
    if (distMap[dst] == std::numeric_limits<double>::infinity()) return std::nullopt;
    std::vector<int> path{dst};
    while (path.back() != src) path.push_back(prev[path.back()]);
    std::reverse(path.begin(), path.end());
    std::vector<Point> result;
    for (int i : path) result.push_back(nodes[i]);
    return result;
}

std::optional<std::vector<Point>> planPath(const Point& start, const Point& goal, const std::vector<Point>& obstacles,
                                            double width, double height, double step = 0.5,
                                            double connectRadius = 0.75) {
    auto skeleton = buildSkeleton(obstacles, width, height, step);
    std::vector<Point> nodes = skeleton;
    nodes.push_back(start);
    nodes.push_back(goal);
    int startIdx = static_cast<int>(nodes.size()) - 2;
    int goalIdx = static_cast<int>(nodes.size()) - 1;
    auto graph = buildGraph(nodes, connectRadius);
    for (int idx : {startIdx, goalIdx}) {
        const Point& p = nodes[idx];
        std::vector<std::pair<int, double>> candidates;
        for (size_t i = 0; i < skeleton.size(); i++) candidates.push_back({static_cast<int>(i), dist(p, skeleton[i])});
        std::sort(candidates.begin(), candidates.end(), [](auto& a, auto& b) { return a.second < b.second; });
        for (size_t k = 0; k < std::min<size_t>(5, candidates.size()); k++) {
            auto [c, d] = candidates[k];
            graph[idx].push_back({c, d});
            graph[c].push_back({idx, d});
        }
    }
    return dijkstra(graph, nodes, startIdx, goalIdx);
}
```

```rust
use std::collections::BinaryHeap;
use std::cmp::Ordering;

type Point = (f64, f64);

fn dist(a: Point, b: Point) -> f64 {
    ((a.0 - b.0).powi(2) + (a.1 - b.1).powi(2)).sqrt()
}

fn build_skeleton(obstacles: &[Point], width: f64, height: f64, step: f64, eps: f64) -> Vec<Point> {
    let mut skeleton = Vec::new();
    let mut y = 0.0;
    while y <= height {
        let mut x = 0.0;
        while x <= width {
            let p = (x, y);
            let mut dists: Vec<f64> = obstacles.iter().map(|&o| dist(p, o)).collect();
            dists.sort_by(|a, b| a.partial_cmp(b).unwrap());
            if dists.len() >= 2 && (dists[1] - dists[0]) < eps && dists[0] > 0.3 {
                skeleton.push(p);
            }
            x += step;
        }
        y += step;
    }
    skeleton
}

fn build_graph(nodes: &[Point], connect_radius: f64) -> Vec<Vec<(usize, f64)>> {
    let mut graph = vec![Vec::new(); nodes.len()];
    for i in 0..nodes.len() {
        for j in (i + 1)..nodes.len() {
            let d = dist(nodes[i], nodes[j]);
            if d <= connect_radius {
                graph[i].push((j, d));
                graph[j].push((i, d));
            }
        }
    }
    graph
}

#[derive(PartialEq)]
struct HeapEntry(f64, usize);

impl Eq for HeapEntry {}
impl Ord for HeapEntry {
    fn cmp(&self, other: &Self) -> Ordering {
        other.0.partial_cmp(&self.0).unwrap() // 最小ヒープにするため反転
    }
}
impl PartialOrd for HeapEntry {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

fn dijkstra(graph: &[Vec<(usize, f64)>], nodes: &[Point], src: usize, dst: usize) -> Option<Vec<Point>> {
    let mut dist_map = vec![f64::INFINITY; nodes.len()];
    let mut prev = vec![usize::MAX; nodes.len()];
    let mut visited = vec![false; nodes.len()];
    dist_map[src] = 0.0;
    let mut pq = BinaryHeap::new();
    pq.push(HeapEntry(0.0, src));
    while let Some(HeapEntry(d, u)) = pq.pop() {
        if visited[u] {
            continue;
        }
        visited[u] = true;
        if u == dst {
            break;
        }
        for &(v, w) in &graph[u] {
            let nd = d + w;
            if nd < dist_map[v] {
                dist_map[v] = nd;
                prev[v] = u;
                pq.push(HeapEntry(nd, v));
            }
        }
    }
    if dist_map[dst].is_infinite() {
        return None;
    }
    let mut path = vec![dst];
    while *path.last().unwrap() != src {
        path.push(prev[*path.last().unwrap()]);
    }
    path.reverse();
    Some(path.into_iter().map(|i| nodes[i]).collect())
}

fn plan_path(
    start: Point,
    goal: Point,
    obstacles: &[Point],
    width: f64,
    height: f64,
    step: f64,
    connect_radius: f64,
) -> Option<Vec<Point>> {
    let skeleton = build_skeleton(obstacles, width, height, step, 0.35);
    let mut nodes = skeleton.clone();
    nodes.push(start);
    nodes.push(goal);
    let start_idx = nodes.len() - 2;
    let goal_idx = nodes.len() - 1;
    let mut graph = build_graph(&nodes, connect_radius);
    for &idx in &[start_idx, goal_idx] {
        let p = nodes[idx];
        let mut candidates: Vec<(usize, f64)> = skeleton.iter().enumerate().map(|(i, &s)| (i, dist(p, s))).collect();
        candidates.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());
        for &(c, d) in candidates.iter().take(5) {
            graph[idx].push((c, d));
            graph[c].push((idx, d));
        }
    }
    dijkstra(&graph, &nodes, start_idx, goal_idx)
}
```

```csharp
static double Dist((double x, double y) a, (double x, double y) b) =>
    Math.Sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));

static List<(double, double)> BuildSkeleton(List<(double, double)> obstacles, double width, double height,
    double step = 0.5, double eps = 0.35)
{
    var skeleton = new List<(double, double)>();
    for (double y = 0; y <= height; y += step)
    {
        for (double x = 0; x <= width; x += step)
        {
            var p = (x, y);
            var dists = obstacles.Select(o => Dist(p, o)).OrderBy(d => d).ToList();
            if (dists.Count >= 2 && dists[1] - dists[0] < eps && dists[0] > 0.3)
            {
                skeleton.Add(p);
            }
        }
    }
    return skeleton;
}

static Dictionary<int, List<(int, double)>> BuildGraph(List<(double, double)> nodes, double connectRadius)
{
    var graph = new Dictionary<int, List<(int, double)>>();
    for (int i = 0; i < nodes.Count; i++) graph[i] = new List<(int, double)>();
    for (int i = 0; i < nodes.Count; i++)
    {
        for (int j = i + 1; j < nodes.Count; j++)
        {
            double d = Dist(nodes[i], nodes[j]);
            if (d <= connectRadius)
            {
                graph[i].Add((j, d));
                graph[j].Add((i, d));
            }
        }
    }
    return graph;
}

static List<(double, double)>? Dijkstra(Dictionary<int, List<(int, double)>> graph, List<(double, double)> nodes, int src, int dst)
{
    var distMap = new Dictionary<int, double> { [src] = 0 };
    var prev = new Dictionary<int, int>();
    var visited = new HashSet<int>();
    var pq = new List<(double, int)> { (0, src) };
    while (pq.Count > 0)
    {
        pq.Sort((a, b) => a.Item1.CompareTo(b.Item1));
        var (d, u) = pq[0];
        pq.RemoveAt(0);
        if (visited.Contains(u)) continue;
        visited.Add(u);
        if (u == dst) break;
        foreach (var (v, w) in graph[u])
        {
            double nd = d + w;
            if (nd < distMap.GetValueOrDefault(v, double.PositiveInfinity))
            {
                distMap[v] = nd;
                prev[v] = u;
                pq.Add((nd, v));
            }
        }
    }
    if (!distMap.ContainsKey(dst)) return null;
    var path = new List<int> { dst };
    while (path[^1] != src) path.Add(prev[path[^1]]);
    path.Reverse();
    return path.Select(i => nodes[i]).ToList();
}

static List<(double, double)>? PlanPath((double, double) start, (double, double) goal, List<(double, double)> obstacles,
    double width, double height, double step = 0.5, double connectRadius = 0.75)
{
    var skeleton = BuildSkeleton(obstacles, width, height, step);
    var nodes = new List<(double, double)>(skeleton) { start, goal };
    int startIdx = nodes.Count - 2, goalIdx = nodes.Count - 1;
    var graph = BuildGraph(nodes, connectRadius);
    foreach (var idx in new[] { startIdx, goalIdx })
    {
        var p = nodes[idx];
        var candidates = Enumerable.Range(0, skeleton.Count)
            .Select(i => (i, d: Dist(p, skeleton[i])))
            .OrderBy(x => x.d).Take(5);
        foreach (var (c, d) in candidates)
        {
            graph[idx].Add((c, d));
            graph[c].Add((idx, d));
        }
    }
    return Dijkstra(graph, nodes, startIdx, goalIdx);
}
```
