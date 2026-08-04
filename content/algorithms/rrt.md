---
name: RRT(Rapidly-exploring Random Tree)
category: 制御・ロボティクス
subcategory: 経路計画
complexity: O(n log n)(n回のサンプリング、効率的な近傍探索使用時)
summary: 空間中にランダムな点を打ち続け、既存の探索木から一番近い点に向かって少しずつ枝を伸ばしていくことで、複雑な障害物や高次元の関節空間でも高速に経路を発見するサンプリングベースの経路計画法。
---

## 概要

[A*探索](/algorithms/a-star)のようなグリッドベースの経路探索は、2次元の平面地図では強力だが、ロボットアームの関節角度のような高次元の空間(自由度が多いほど次元が増える)では、グリッド全体を細かく区切ること自体が組み合わせ爆発を起こし現実的でなくなる。1998年にスティーブン・ラヴァールが発表したRRTは、空間全体を細かく離散化する代わりに、ランダムにサンプリングした点へ向かって探索木を少しずつ伸ばしていくことで、高次元空間や複雑な形状の障害物がある環境でも、比較的少ない計算で「実行可能な」(必ずしも最短ではない)経路を高速に発見する、サンプリングベースの経路計画法の代表格である。

## 仕組み

1. スタート地点を根とする木を初期化する
2. 空間中にランダムな点`x_rand`を1つサンプリングする
3. 現在の木の中で`x_rand`に最も近い頂点`x_near`を見つける([kd-tree](/algorithms/kd-tree)のような空間分割構造を使うと、この近傍探索を効率化できる)
4. `x_near`から`x_rand`の方向へ、あらかじめ決めた固定のステップ幅だけ進んだ点`x_new`を計算する(`x_rand`まで一気に到達するのではなく、少しずつ進むのが「木を成長させる」というこの手法の核心)
5. `x_near`から`x_new`までの経路が障害物と衝突していないことを確認できたら、`x_new`を新しい頂点として木に追加し、`x_near`と`x_new`を辺で結ぶ
6. 2〜5を、木のどこかの頂点がゴール地点に十分近づくまで(あるいは指定回数繰り返すまで)続ける。ゴールに到達したら、木の根からゴールまでの経路を辿ることで、実行可能な経路が得られる

ランダムにサンプリングした点へ向かって木を伸ばす性質上、まだ探索されていない広い領域(木の頂点が少ない領域)へ木が優先的に伸びやすい傾向があり、これが「急速に空間を探索する(Rapidly-exploring)」という名前の由来になっている。

## 特性・トレードオフ

- **計算量**: サンプリング回数`n`に対して、効率的な近傍探索構造([kd-tree](/algorithms/kd-tree)等)を使えば`O(n log n)`程度。グリッドベースの手法が次元数に対して指数的に悪化するのに対し、RRTのサンプリングベースのアプローチは高次元空間でも比較的スケーラブルに動作する
- **最適性の保証がない**: 素のRRTが見つける経路は「実行可能」であることは保証されるが、最短経路や最適な経路である保証はない——ランダムな探索の結果、しばしば不必要に迂回した経路になる。この弱点を改善し、サンプル数を増やすにつれて漸近的に最適解へ収束することを保証する拡張版が[RRT*](/algorithms/rrt-star)である
- **確率的完全性**: 十分な時間(サンプリング回数)をかければ、もし経路が存在するならほぼ確実にRRTはその経路を発見できることが理論的に保証されている(確率的完全性)——厳密な最適性は保証しないが、「解が存在すれば見つかる」という現実的に重要な性質を持つ
- **使いどころ**: ロボットアームの関節空間での動作計画(高次元空間の経路計画)、自動運転車の経路計画、ゲームのNPCの経路探索(複雑な3D環境での移動計画)、狭い通路や複雑な障害物配置がある環境での経路発見

## 実装例

円形障害物のある2次元平面で、スタートからゴールまでの経路を探索する例。

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


def rrt(start: Point, goal: Point, obstacles, bounds, step_size=1.0, goal_radius=1.0,
        max_iter=2000, rng: random.Random | None = None):
    rng = rng or random.Random()
    nodes = [start]
    parent: dict[int, int | None] = {0: None}

    for _ in range(max_iter):
        # 5%の確率でゴールへ直接サンプリングし、収束を後押しする
        sample = goal if rng.random() < 0.05 else (
            rng.uniform(bounds[0], bounds[2]), rng.uniform(bounds[1], bounds[3]))

        nearest_idx = min(range(len(nodes)), key=lambda i: dist(nodes[i], sample))
        nearest = nodes[nearest_idx]
        d = dist(nearest, sample)
        if d < 1e-9:
            continue
        ratio = min(step_size, d) / d
        new_point = (nearest[0] + (sample[0] - nearest[0]) * ratio,
                     nearest[1] + (sample[1] - nearest[1]) * ratio)  # 木を少しずつ伸ばす

        if not collision_free(nearest, new_point, obstacles):
            continue

        nodes.append(new_point)
        new_idx = len(nodes) - 1
        parent[new_idx] = nearest_idx

        if dist(new_point, goal) <= goal_radius:
            path = [new_point]
            idx = new_idx
            while parent[idx] is not None:
                idx = parent[idx]
                path.append(nodes[idx])
            path.reverse()
            return path

    return None
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

function rrt(
  start: Point, goal: Point, obstacles: Obstacle[], bounds: [number, number, number, number],
  stepSize: number, goalRadius: number, maxIter: number, rng: () => number
): Point[] | null {
  const nodes: Point[] = [start];
  const parent = new Map<number, number | null>([[0, null]]);

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

    nodes.push(newPoint);
    const newIdx = nodes.length - 1;
    parent.set(newIdx, nearestIdx);

    if (dist(newPoint, goal) <= goalRadius) {
      const path: Point[] = [newPoint];
      let idx: number | null = newIdx;
      while (parent.get(idx!) !== null) {
        idx = parent.get(idx!)!;
        path.push(nodes[idx]);
      }
      path.reverse();
      return path;
    }
  }
  return null;
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

std::optional<std::vector<Point>> rrt(
    Point start, Point goal, const std::vector<Obstacle>& obstacles,
    double xmin, double ymin, double xmax, double ymax,
    double stepSize, double goalRadius, int maxIter, std::mt19937& rng) {

    std::uniform_real_distribution<double> unitDist(0.0, 1.0);
    std::vector<Point> nodes{ start };
    std::map<int, int> parent{ { 0, -1 } };

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

        nodes.push_back(newPoint);
        int newIdx = static_cast<int>(nodes.size()) - 1;
        parent[newIdx] = nearestIdx;

        if (dist(newPoint, goal) <= goalRadius) {
            std::vector<Point> path{ newPoint };
            int idx = newIdx;
            while (parent[idx] != -1) {
                idx = parent[idx];
                path.push_back(nodes[idx]);
            }
            std::reverse(path.begin(), path.end());
            return path;
        }
    }
    return std::nullopt;
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

fn rrt(
    start: Point, goal: Point, obstacles: &[Obstacle],
    bounds: (f64, f64, f64, f64), step_size: f64, goal_radius: f64, max_iter: usize,
    rng: &mut impl Rng,
) -> Option<Vec<Point>> {
    let mut nodes: Vec<Point> = vec![start];
    let mut parent: Vec<Option<usize>> = vec![None];

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
        let new_point = Point {
            x: nearest.x + (sample.x - nearest.x) * ratio,
            y: nearest.y + (sample.y - nearest.y) * ratio,
        };
        if !collision_free(nearest, new_point, obstacles) {
            continue;
        }

        nodes.push(new_point);
        let new_idx = nodes.len() - 1;
        parent.push(Some(nearest_idx));

        if dist(new_point, goal) <= goal_radius {
            let mut path = vec![new_point];
            let mut idx = new_idx;
            while let Some(p) = parent[idx] {
                idx = p;
                path.push(nodes[idx]);
            }
            path.reverse();
            return Some(path);
        }
    }
    None
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

static class RrtGeo
{
    public static double Dist((double x, double y) a, (double x, double y) b) =>
        Math.Sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));

    public static bool SegmentHitsCircle((double x, double y) p1, (double x, double y) p2, (double x, double y) center, double radius)
    {
        double dx = p2.x - p1.x, dy = p2.y - p1.y;
        double length2 = dx * dx + dy * dy;
        if (length2 == 0) return Dist(p1, center) <= radius;
        double t = Math.Max(0, Math.Min(1, ((center.x - p1.x) * dx + (center.y - p1.y) * dy) / length2));
        var closest = (p1.x + t * dx, p1.y + t * dy);
        return Dist(closest, center) <= radius;
    }
    public static bool CollisionFree((double x, double y) p1, (double x, double y) p2, List<((double, double) center, double radius)> obstacles) =>
        !obstacles.Any(o => SegmentHitsCircle(p1, p2, o.center, o.radius));
}

static class Rrt
{
    public static List<(double, double)>? Run(
        (double, double) start, (double, double) goal,
        List<((double, double) center, double radius)> obstacles,
        (double xmin, double ymin, double xmax, double ymax) bounds,
        double stepSize, double goalRadius, int maxIter, Random rng)
    {
        var nodes = new List<(double, double)> { start };
        var parent = new Dictionary<int, int?> { [0] = null };

        for (int iter = 0; iter < maxIter; iter++)
        {
            (double, double) sample = rng.NextDouble() < 0.05 ? goal :
                (bounds.xmin + rng.NextDouble() * (bounds.xmax - bounds.xmin),
                 bounds.ymin + rng.NextDouble() * (bounds.ymax - bounds.ymin));

            int nearestIdx = 0;
            double nearestDist = double.MaxValue;
            for (int i = 0; i < nodes.Count; i++)
            {
                double d = RrtGeo.Dist(nodes[i], sample);
                if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
            }
            var nearest = nodes[nearestIdx];
            double dist = RrtGeo.Dist(nearest, sample);
            if (dist < 1e-9) continue;
            double ratio = Math.Min(stepSize, dist) / dist;
            var newPoint = (nearest.Item1 + (sample.Item1 - nearest.Item1) * ratio, nearest.Item2 + (sample.Item2 - nearest.Item2) * ratio);
            if (!RrtGeo.CollisionFree(nearest, newPoint, obstacles)) continue;

            nodes.Add(newPoint);
            int newIdx = nodes.Count - 1;
            parent[newIdx] = nearestIdx;

            if (RrtGeo.Dist(newPoint, goal) <= goalRadius)
            {
                var path = new List<(double, double)> { newPoint };
                int? idx = newIdx;
                while (parent[idx!.Value] != null)
                {
                    idx = parent[idx.Value];
                    path.Add(nodes[idx!.Value]);
                }
                path.Reverse();
                return path;
            }
        }
        return null;
    }
}
```
