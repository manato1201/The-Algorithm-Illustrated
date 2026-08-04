---
name: RRT*(最適化版RRT)
category: 制御・ロボティクス
subcategory: 経路計画
complexity: O(n log n)(n回のサンプリング、効率的な近傍探索使用時)
summary: 新しい頂点を追加するたびに周辺の接続を「配線し直す」ことで、サンプル数を増やすにつれて経路が漸近的に最短経路へ収束することを保証する、RRTの最適性を追求した拡張版。
---

## 概要

[RRT](/algorithms/rrt)は経路を高速に発見できるが、見つかる経路の質(最短性)には何の保証もない。2011年にカラマンとフラッツォリが発表したRRT*は、木に新しい頂点を追加する際に、単に最も近い頂点と繋ぐだけでなく、周辺の頂点同士の接続を賢く「配線し直す(リワイヤリング)」ことで、サンプル数を無限に増やしていくと、得られる経路が理論上の最短経路へ確率1で収束する(**漸近的最適性**)という強い性質を追加した拡張版である。RRTの「速く見つける」という長所を保ちながら、経路の質を継続的に改善し続けられるようにした発展形になっている。

## 仕組み

1. [RRT](/algorithms/rrt)と同様に、ランダムサンプリング、最近傍頂点の探索、新しい頂点`x_new`の生成までは同じ手順を踏む
2. **親の選び直し**: `x_new`を木に追加する際、単純に最も近い頂点`x_near`と接続するのではなく、`x_new`の周辺(一定半径内)にある全ての頂点を候補として調べ、その中で「根から`x_new`までのコスト(経路長)が最小になる」頂点を、新しい親として選ぶ——[ダイクストラ法](/algorithms/dijkstra)が「これまでで最短の経路」を維持しながら探索を広げるのと同じ発想が、局所的な範囲で適用されている
3. **周辺の再配線(リワイヤリング)**: `x_new`が木に追加された後、`x_new`の周辺にある既存の頂点それぞれについて、「その頂点にとって、`x_new`を経由する方が今までの親を経由するより経路が短くならないか」を確認する。もし短くなるなら、その頂点の親を`x_new`に付け替える(既存の枝を切って新しい枝を張り直す)
4. このリワイヤリング操作により、木全体が局所的に、常により良い(短い)接続へと継続的に改善され続ける
5. サンプリングを繰り返すたびに1〜4のプロセスが積み重なり、木全体の経路品質が漸近的に最適経路へ近づいていく

## 特性・トレードオフ

- **計算量**: 各サンプリングステップで、リワイヤリングのために周辺頂点を探索する処理が追加されるため、[RRT](/algorithms/rrt)よりも1ステップあたりのコストはやや高いが、効率的な近傍探索構造を使えば全体として`O(n log n)`程度に収まる
- **漸近的最適性という強力な理論的保証**: サンプル数(計算時間)を増やせば増やすほど、得られる経路が理論的な最短経路に確率的に近づいていくことが保証されている——これは[RRT](/algorithms/rrt)にはない、実用上非常に価値のある性質である。ただし「漸近的」であるため、有限の計算時間では最適性の保証はなく、あくまで「改善され続ける」という性質にとどまる
- **速度と品質のトレードオフ**: リワイヤリングのコストの分だけ、同じ計算時間で得られる木の頂点数は[RRT](/algorithms/rrt)より少なくなる。初期の実行可能な経路をとにかく早く得たい場合は素のRRT、時間をかけてでも高品質な経路が欲しい場合はRRT*、という使い分けが実務では行われる
- **使いどころ**: 自動運転車の経路計画(安全かつ効率的な経路が求められる)、産業ロボットの高精度な軌道計画、ドローンの飛行経路最適化。品質の要求が高い経路計画タスクにおける、サンプリングベース手法の標準的な選択肢のひとつ

## 実装例

[RRT](/algorithms/rrt)に「近傍からの親の選び直し」と「再配線」を追加した実装。

```python
import math
import random

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


def rrt_star(start: Point, goal: Point, obstacles, bounds, step_size=1.0, goal_radius=1.0,
             rewire_radius=3.0, max_iter=2000, rng: random.Random | None = None):
    rng = rng or random.Random()
    nodes = [start]
    parent: dict[int, int | None] = {0: None}
    cost = {0: 0.0}
    best_goal_idx: int | None = None

    def path_to(idx: int) -> list[Point]:
        path = [nodes[idx]]
        while parent[idx] is not None:
            idx = parent[idx]
            path.append(nodes[idx])
        path.reverse()
        return path

    for _ in range(max_iter):
        sample = goal if rng.random() < 0.05 else (
            rng.uniform(bounds[0], bounds[2]), rng.uniform(bounds[1], bounds[3]))

        nearest_idx = min(range(len(nodes)), key=lambda i: dist(nodes[i], sample))
        nearest = nodes[nearest_idx]
        d = dist(nearest, sample)
        if d < 1e-9:
            continue
        ratio = min(step_size, d) / d
        new_point = (nearest[0] + (sample[0] - nearest[0]) * ratio,
                     nearest[1] + (sample[1] - nearest[1]) * ratio)
        if not collision_free(nearest, new_point, obstacles):
            continue

        # 近傍の中から根からのコストが最小になる親を選び直す
        near_indices = [i for i, n in enumerate(nodes) if dist(n, new_point) <= rewire_radius]
        best_parent = nearest_idx
        best_cost = cost[nearest_idx] + dist(nearest, new_point)
        for i in near_indices:
            c = cost[i] + dist(nodes[i], new_point)
            if c < best_cost and collision_free(nodes[i], new_point, obstacles):
                best_cost, best_parent = c, i

        nodes.append(new_point)
        new_idx = len(nodes) - 1
        parent[new_idx] = best_parent
        cost[new_idx] = best_cost

        # 新しい頂点を経由した方が短くなる近傍を再配線する
        for i in near_indices:
            new_cost = cost[new_idx] + dist(new_point, nodes[i])
            if new_cost < cost[i] and collision_free(new_point, nodes[i], obstacles):
                parent[i] = new_idx
                cost[i] = new_cost

        if dist(new_point, goal) <= goal_radius:
            if best_goal_idx is None or cost[new_idx] < cost[best_goal_idx]:
                best_goal_idx = new_idx

    if best_goal_idx is None:
        return None, None
    return path_to(best_goal_idx), cost[best_goal_idx]
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

function rrtStar(
  start: Point, goal: Point, obstacles: Obstacle[], bounds: [number, number, number, number],
  stepSize: number, goalRadius: number, rewireRadius: number, maxIter: number, rng: () => number
): { path: Point[] | null; cost: number | null } {
  const nodes: Point[] = [start];
  const parent = new Map<number, number | null>([[0, null]]);
  const cost = new Map<number, number>([[0, 0]]);
  let bestGoalIdx: number | null = null;

  const pathTo = (idx: number): Point[] => {
    const path: Point[] = [nodes[idx]];
    let cur: number | null = idx;
    while (parent.get(cur!) !== null) {
      cur = parent.get(cur!)!;
      path.push(nodes[cur]);
    }
    path.reverse();
    return path;
  };

  for (let iter = 0; iter < maxIter; iter++) {
    const sample: Point = rng() < 0.05 ? goal : [
      bounds[0] + rng() * (bounds[2] - bounds[0]),
      bounds[1] + rng() * (bounds[3] - bounds[1]),
    ];
    let nearestIdx = 0, nearestDist = Infinity;
    nodes.forEach((n, i) => { const d = dist(n, sample); if (d < nearestDist) { nearestDist = d; nearestIdx = i; } });
    const nearest = nodes[nearestIdx];
    const d = dist(nearest, sample);
    if (d < 1e-9) continue;
    const ratio = Math.min(stepSize, d) / d;
    const newPoint: Point = [nearest[0] + (sample[0] - nearest[0]) * ratio, nearest[1] + (sample[1] - nearest[1]) * ratio];
    if (!collisionFree(nearest, newPoint, obstacles)) continue;

    const nearIndices = nodes.map((n, i) => (dist(n, newPoint) <= rewireRadius ? i : -1)).filter((i) => i >= 0);
    let bestParent = nearestIdx;
    let bestCost = cost.get(nearestIdx)! + dist(nearest, newPoint);
    for (const i of nearIndices) {
      const c = cost.get(i)! + dist(nodes[i], newPoint);
      if (c < bestCost && collisionFree(nodes[i], newPoint, obstacles)) { bestCost = c; bestParent = i; }
    }

    nodes.push(newPoint);
    const newIdx = nodes.length - 1;
    parent.set(newIdx, bestParent);
    cost.set(newIdx, bestCost);

    for (const i of nearIndices) {
      const newCost = cost.get(newIdx)! + dist(newPoint, nodes[i]);
      if (newCost < cost.get(i)! && collisionFree(newPoint, nodes[i], obstacles)) {
        parent.set(i, newIdx);
        cost.set(i, newCost);
      }
    }

    if (dist(newPoint, goal) <= goalRadius) {
      if (bestGoalIdx === null || cost.get(newIdx)! < cost.get(bestGoalIdx)!) bestGoalIdx = newIdx;
    }
  }

  if (bestGoalIdx === null) return { path: null, cost: null };
  return { path: pathTo(bestGoalIdx), cost: cost.get(bestGoalIdx)! };
}
```

```cpp
#include <vector>
#include <map>
#include <cmath>
#include <random>
#include <optional>
#include <algorithm>

struct Point { double x, y; };
using Obstacle = std::pair<Point, double>;

double dist(const Point& a, const Point& b) { return std::hypot(a.x - b.x, a.y - b.y); }
bool segmentHitsCircle(const Point& p1, const Point& p2, const Point& center, double radius) {
    double dx = p2.x - p1.x, dy = p2.y - p1.y;
    double length2 = dx * dx + dy * dy;
    if (length2 == 0) return dist(p1, center) <= radius;
    double t = std::max(0.0, std::min(1.0, ((center.x - p1.x) * dx + (center.y - p1.y) * dy) / length2));
    Point closest{ p1.x + t * dx, p1.y + t * dy };
    return dist(closest, center) <= radius;
}
bool collisionFree(const Point& p1, const Point& p2, const std::vector<Obstacle>& obstacles) {
    for (auto& [center, radius] : obstacles) if (segmentHitsCircle(p1, p2, center, radius)) return false;
    return true;
}

struct RrtStarResult { std::optional<std::vector<Point>> path; double cost; };

RrtStarResult rrtStar(
    Point start, Point goal, const std::vector<Obstacle>& obstacles,
    double xmin, double ymin, double xmax, double ymax,
    double stepSize, double goalRadius, double rewireRadius, int maxIter, std::mt19937& rng) {

    std::uniform_real_distribution<double> unitDist(0.0, 1.0);
    std::vector<Point> nodes{ start };
    std::map<int, int> parent{ { 0, -1 } };
    std::map<int, double> cost{ { 0, 0.0 } };
    int bestGoalIdx = -1;

    auto pathTo = [&](int idx) {
        std::vector<Point> path{ nodes[idx] };
        while (parent[idx] != -1) {
            idx = parent[idx];
            path.push_back(nodes[idx]);
        }
        std::reverse(path.begin(), path.end());
        return path;
    };

    for (int iter = 0; iter < maxIter; iter++) {
        Point sample = unitDist(rng) < 0.05 ? goal : Point{
            xmin + unitDist(rng) * (xmax - xmin), ymin + unitDist(rng) * (ymax - ymin)
        };

        int nearestIdx = 0;
        double nearestDist = 1e300;
        for (size_t i = 0; i < nodes.size(); i++) {
            double d = dist(nodes[i], sample);
            if (d < nearestDist) { nearestDist = d; nearestIdx = static_cast<int>(i); }
        }
        Point nearest = nodes[nearestIdx];
        double d = dist(nearest, sample);
        if (d < 1e-9) continue;
        double ratio = std::min(stepSize, d) / d;
        Point newPoint{ nearest.x + (sample.x - nearest.x) * ratio, nearest.y + (sample.y - nearest.y) * ratio };
        if (!collisionFree(nearest, newPoint, obstacles)) continue;

        std::vector<int> nearIndices;
        for (size_t i = 0; i < nodes.size(); i++)
            if (dist(nodes[i], newPoint) <= rewireRadius) nearIndices.push_back(static_cast<int>(i));

        int bestParent = nearestIdx;
        double bestCost = cost[nearestIdx] + dist(nearest, newPoint);
        for (int i : nearIndices) {
            double c = cost[i] + dist(nodes[i], newPoint);
            if (c < bestCost && collisionFree(nodes[i], newPoint, obstacles)) { bestCost = c; bestParent = i; }
        }

        nodes.push_back(newPoint);
        int newIdx = static_cast<int>(nodes.size()) - 1;
        parent[newIdx] = bestParent;
        cost[newIdx] = bestCost;

        for (int i : nearIndices) {
            double newCost = cost[newIdx] + dist(newPoint, nodes[i]);
            if (newCost < cost[i] && collisionFree(newPoint, nodes[i], obstacles)) {
                parent[i] = newIdx;
                cost[i] = newCost;
            }
        }

        if (dist(newPoint, goal) <= goalRadius) {
            if (bestGoalIdx == -1 || cost[newIdx] < cost[bestGoalIdx]) bestGoalIdx = newIdx;
        }
    }

    if (bestGoalIdx == -1) return { std::nullopt, 0.0 };
    return { pathTo(bestGoalIdx), cost[bestGoalIdx] };
}
```

```rust
use rand::Rng;

#[derive(Clone, Copy)]
struct Point { x: f64, y: f64 }
struct Obstacle { center: Point, radius: f64 }

fn dist(a: Point, b: Point) -> f64 {
    ((a.x - b.x).powi(2) + (a.y - b.y).powi(2)).sqrt()
}
fn segment_hits_circle(p1: Point, p2: Point, center: Point, radius: f64) -> bool {
    let (dx, dy) = (p2.x - p1.x, p2.y - p1.y);
    let length2 = dx * dx + dy * dy;
    if length2 == 0.0 {
        return dist(p1, center) <= radius;
    }
    let t = (((center.x - p1.x) * dx + (center.y - p1.y) * dy) / length2).clamp(0.0, 1.0);
    let closest = Point { x: p1.x + t * dx, y: p1.y + t * dy };
    dist(closest, center) <= radius
}
fn collision_free(p1: Point, p2: Point, obstacles: &[Obstacle]) -> bool {
    !obstacles.iter().any(|o| segment_hits_circle(p1, p2, o.center, o.radius))
}

fn rrt_star(
    start: Point, goal: Point, obstacles: &[Obstacle], bounds: (f64, f64, f64, f64),
    step_size: f64, goal_radius: f64, rewire_radius: f64, max_iter: usize, rng: &mut impl Rng,
) -> (Option<Vec<Point>>, Option<f64>) {
    let mut nodes: Vec<Point> = vec![start];
    let mut parent: Vec<Option<usize>> = vec![None];
    let mut cost: Vec<f64> = vec![0.0];
    let mut best_goal_idx: Option<usize> = None;

    for _ in 0..max_iter {
        let sample = if rng.gen::<f64>() < 0.05 {
            goal
        } else {
            Point {
                x: bounds.0 + rng.gen::<f64>() * (bounds.2 - bounds.0),
                y: bounds.1 + rng.gen::<f64>() * (bounds.3 - bounds.1),
            }
        };

        let mut nearest_idx = 0;
        let mut nearest_dist = f64::MAX;
        for (i, &n) in nodes.iter().enumerate() {
            let d = dist(n, sample);
            if d < nearest_dist { nearest_dist = d; nearest_idx = i; }
        }
        let nearest = nodes[nearest_idx];
        let d = dist(nearest, sample);
        if d < 1e-9 {
            continue;
        }
        let ratio = step_size.min(d) / d;
        let new_point = Point { x: nearest.x + (sample.x - nearest.x) * ratio, y: nearest.y + (sample.y - nearest.y) * ratio };
        if !collision_free(nearest, new_point, obstacles) {
            continue;
        }

        let near_indices: Vec<usize> = (0..nodes.len()).filter(|&i| dist(nodes[i], new_point) <= rewire_radius).collect();
        let mut best_parent = nearest_idx;
        let mut best_cost = cost[nearest_idx] + dist(nearest, new_point);
        for &i in &near_indices {
            let c = cost[i] + dist(nodes[i], new_point);
            if c < best_cost && collision_free(nodes[i], new_point, obstacles) {
                best_cost = c;
                best_parent = i;
            }
        }

        nodes.push(new_point);
        let new_idx = nodes.len() - 1;
        parent.push(Some(best_parent));
        cost.push(best_cost);

        for &i in &near_indices {
            let new_cost = cost[new_idx] + dist(new_point, nodes[i]);
            if new_cost < cost[i] && collision_free(new_point, nodes[i], obstacles) {
                parent[i] = Some(new_idx);
                cost[i] = new_cost;
            }
        }

        if dist(new_point, goal) <= goal_radius {
            if best_goal_idx.is_none() || cost[new_idx] < cost[best_goal_idx.unwrap()] {
                best_goal_idx = Some(new_idx);
            }
        }
    }

    match best_goal_idx {
        None => (None, None),
        Some(goal_idx) => {
            let mut path = vec![nodes[goal_idx]];
            let mut idx = goal_idx;
            while let Some(p) = parent[idx] {
                idx = p;
                path.push(nodes[idx]);
            }
            path.reverse();
            (Some(path), Some(cost[goal_idx]))
        }
    }
}
```

```csharp
using System;
using System.Collections.Generic;

static class RrtStar
{
    static double Dist((double x, double y) a, (double x, double y) b) =>
        Math.Sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));

    static bool SegmentHitsCircle((double x, double y) p1, (double x, double y) p2, (double x, double y) center, double radius)
    {
        double dx = p2.x - p1.x, dy = p2.y - p1.y;
        double length2 = dx * dx + dy * dy;
        if (length2 == 0) return Dist(p1, center) <= radius;
        double t = Math.Max(0, Math.Min(1, ((center.x - p1.x) * dx + (center.y - p1.y) * dy) / length2));
        var closest = (p1.x + t * dx, p1.y + t * dy);
        return Dist(closest, center) <= radius;
    }
    static bool CollisionFree((double x, double y) p1, (double x, double y) p2, List<((double, double) center, double radius)> obstacles)
    {
        foreach (var (center, radius) in obstacles) if (SegmentHitsCircle(p1, p2, center, radius)) return false;
        return true;
    }

    public static (List<(double, double)>? path, double? cost) Run(
        (double, double) start, (double, double) goal,
        List<((double, double) center, double radius)> obstacles,
        (double xmin, double ymin, double xmax, double ymax) bounds,
        double stepSize, double goalRadius, double rewireRadius, int maxIter, Random rng)
    {
        var nodes = new List<(double, double)> { start };
        var parent = new Dictionary<int, int?> { [0] = null };
        var cost = new Dictionary<int, double> { [0] = 0 };
        int? bestGoalIdx = null;

        List<(double, double)> PathTo(int idx)
        {
            var path = new List<(double, double)> { nodes[idx] };
            int? cur = idx;
            while (parent[cur!.Value] != null)
            {
                cur = parent[cur.Value];
                path.Add(nodes[cur!.Value]);
            }
            path.Reverse();
            return path;
        }

        for (int iter = 0; iter < maxIter; iter++)
        {
            (double, double) sample = rng.NextDouble() < 0.05 ? goal :
                (bounds.xmin + rng.NextDouble() * (bounds.xmax - bounds.xmin),
                 bounds.ymin + rng.NextDouble() * (bounds.ymax - bounds.ymin));

            int nearestIdx = 0;
            double nearestDist = double.MaxValue;
            for (int i = 0; i < nodes.Count; i++)
            {
                double d = Dist(nodes[i], sample);
                if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
            }
            var nearest = nodes[nearestIdx];
            double dist = Dist(nearest, sample);
            if (dist < 1e-9) continue;
            double ratio = Math.Min(stepSize, dist) / dist;
            var newPoint = (nearest.Item1 + (sample.Item1 - nearest.Item1) * ratio, nearest.Item2 + (sample.Item2 - nearest.Item2) * ratio);
            if (!CollisionFree(nearest, newPoint, obstacles)) continue;

            var nearIndices = new List<int>();
            for (int i = 0; i < nodes.Count; i++) if (Dist(nodes[i], newPoint) <= rewireRadius) nearIndices.Add(i);

            int bestParent = nearestIdx;
            double bestCost = cost[nearestIdx] + Dist(nearest, newPoint);
            foreach (var i in nearIndices)
            {
                double c = cost[i] + Dist(nodes[i], newPoint);
                if (c < bestCost && CollisionFree(nodes[i], newPoint, obstacles)) { bestCost = c; bestParent = i; }
            }

            nodes.Add(newPoint);
            int newIdx = nodes.Count - 1;
            parent[newIdx] = bestParent;
            cost[newIdx] = bestCost;

            foreach (var i in nearIndices)
            {
                double newCost = cost[newIdx] + Dist(newPoint, nodes[i]);
                if (newCost < cost[i] && CollisionFree(newPoint, nodes[i], obstacles))
                {
                    parent[i] = newIdx;
                    cost[i] = newCost;
                }
            }

            if (Dist(newPoint, goal) <= goalRadius)
            {
                if (bestGoalIdx == null || cost[newIdx] < cost[bestGoalIdx.Value]) bestGoalIdx = newIdx;
            }
        }

        if (bestGoalIdx == null) return (null, null);
        return (PathTo(bestGoalIdx.Value), cost[bestGoalIdx.Value]);
    }
}
```
