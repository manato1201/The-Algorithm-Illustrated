---
name: 回転キャリパー法
category: 計算幾何
subcategory: 凸包・多角形
complexity: O(n)
summary: 凸多角形の周りを2本の平行線で挟んで回転させ、最大幅や最小包含長方形などを求める。
---

## 概要

凸多角形を、ノギス(キャリパー)のような2本(あるいは複数)の平行線で挟み、その平行線を多角形の周りに沿ってぐるりと回転させていく——この操作から名付けられた計算幾何のテクニック。凸多角形の直径(最も離れた2点間の距離)、最小包含長方形、最大幅など、一見それぞれ別々に解く必要がありそうな複数の問題を、共通のフレームワークで効率よく解ける。1978年にMichael Shamosが考案した。

## 仕組み

前提として、凸包(グラハムスキャンなどで得られる)が既に求まっているとする。

1. 多角形の各辺について、その辺に平行な「支持線(その辺を含み、多角形全体がその片側に収まる直線)」を考える
2. 対辺(反対側)にも同様に平行な支持線を考え、これら2本の平行線がキャリパーの役割を果たす
3. 一方の支持線を、多角形の辺に沿って少しずつ回転させていくと、もう一方の支持線も連動して回転する。これを多角形を1周する角度(180度)分だけ行う
4. 回転の各ステップで、2本の支持線の間の距離(幅)や、支持線が接する頂点間の距離を記録していく。**最大値や最小値を探すことで、直径・最小幅・最小包含長方形などが求まる**

「凸多角形の頂点を、単調に(後戻りせず)1周だけなぞる」という単純な走査だけで、複数の幾何的な量を同時に効率よく計算できるのが、このテクニックの汎用性の高さ。

## 特性・トレードオフ

- **計算量**: 凸包が既に求まっていれば、回転キャリパー自体はO(n)(各支持線の候補が単調に進むため、全体でも頂点数分の走査で済む)。凸包の構築自体にO(n log n)かかる
- **多用途性**: 直径(最も離れた2点)、最小幅、最小包含長方形、2つの凸多角形間の最小距離など、似た構造を持つ複数の計算幾何問題に、同じ「回転させながら走査する」発想を使い回せる
- **凸性が前提**: この手法は凸多角形にのみ適用できる。非凸な図形にはそのまま使えず、事前に凸包を取るなどの前処理が必要
- **使いどころ**: 物体の最小外接矩形の計算(パッキング問題、物流の梱包最適化)、ロボットアームの可動範囲の解析、コンピュータビジョンにおける物体の向き・サイズの推定、地図データにおける建物の輪郭の簡略化など

## 実装例

凸包を求めたうえで、回転キャリパー法により直径(最も離れた2点)を計算する例。

```python
import math

Point = tuple[float, float]


def cross(o: Point, a: Point, b: Point) -> float:
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def dist2(a: Point, b: Point) -> float:
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2


def convex_hull(points: list[Point]) -> list[Point]:
    pts = sorted(set(points))
    if len(pts) <= 2:
        return pts

    def half_hull(seq):
        hull: list[Point] = []
        for p in seq:
            while len(hull) >= 2 and cross(hull[-2], hull[-1], p) <= 0:
                hull.pop()
            hull.append(p)
        return hull

    lower = half_hull(pts)
    upper = half_hull(reversed(pts))
    return lower[:-1] + upper[:-1]


def rotating_calipers_diameter(hull: list[Point]) -> tuple[float, tuple[Point, Point]]:
    n = len(hull)
    if n == 1:
        return 0.0, (hull[0], hull[0])
    if n == 2:
        return math.sqrt(dist2(hull[0], hull[1])), (hull[0], hull[1])

    def area2(a: Point, b: Point, c: Point) -> float:
        return abs(cross(a, b, c))

    k = 1
    while area2(hull[n - 1], hull[0], hull[(k + 1) % n]) > area2(hull[n - 1], hull[0], hull[k]):
        k += 1

    best = 0.0
    best_pair = (hull[0], hull[0])
    j = k
    for i in range(n):  # 支持線を単調に(後戻りせず)1周させる
        while area2(hull[i], hull[(i + 1) % n], hull[(j + 1) % n]) > area2(hull[i], hull[(i + 1) % n], hull[j]):
            j = (j + 1) % n
            d = dist2(hull[i], hull[j])
            if d > best:
                best, best_pair = d, (hull[i], hull[j])
        d = dist2(hull[i], hull[j])
        if d > best:
            best, best_pair = d, (hull[i], hull[j])
    return math.sqrt(best), best_pair
```

```typescript
type Point = [number, number];

function cross(o: Point, a: Point, b: Point): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}
function dist2(a: Point, b: Point): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

function convexHull(points: Point[]): Point[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length <= 2) return pts;
  const half = (seq: Point[]): Point[] => {
    const hull: Point[] = [];
    for (const p of seq) {
      while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) hull.pop();
      hull.push(p);
    }
    return hull;
  };
  const lower = half(pts);
  const upper = half([...pts].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function rotatingCalipersDiameter(hull: Point[]): { diameter: number; pair: [Point, Point] } {
  const n = hull.length;
  if (n === 1) return { diameter: 0, pair: [hull[0], hull[0]] };
  if (n === 2) return { diameter: Math.sqrt(dist2(hull[0], hull[1])), pair: [hull[0], hull[1]] };
  const area2 = (a: Point, b: Point, c: Point) => Math.abs(cross(a, b, c));

  let k = 1;
  while (area2(hull[n - 1], hull[0], hull[(k + 1) % n]) > area2(hull[n - 1], hull[0], hull[k])) k++;

  let best = 0;
  let bestPair: [Point, Point] = [hull[0], hull[0]];
  let j = k;
  for (let i = 0; i < n; i++) {
    while (area2(hull[i], hull[(i + 1) % n], hull[(j + 1) % n]) > area2(hull[i], hull[(i + 1) % n], hull[j])) {
      j = (j + 1) % n;
      const d = dist2(hull[i], hull[j]);
      if (d > best) { best = d; bestPair = [hull[i], hull[j]]; }
    }
    const d = dist2(hull[i], hull[j]);
    if (d > best) { best = d; bestPair = [hull[i], hull[j]]; }
  }
  return { diameter: Math.sqrt(best), pair: bestPair };
}
```

```cpp
#include <vector>
#include <algorithm>
#include <cmath>

struct Point { double x, y; };

double cross(const Point& o, const Point& a, const Point& b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}
double dist2(const Point& a, const Point& b) {
    return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}

std::vector<Point> convexHull(std::vector<Point> points) {
    std::sort(points.begin(), points.end(), [](const Point& a, const Point& b) {
        return a.x != b.x ? a.x < b.x : a.y < b.y;
    });
    if (points.size() <= 2) return points;

    auto half = [](const std::vector<Point>& seq) {
        std::vector<Point> hull;
        for (auto& p : seq) {
            while (hull.size() >= 2 && cross(hull[hull.size() - 2], hull[hull.size() - 1], p) <= 0) hull.pop_back();
            hull.push_back(p);
        }
        return hull;
    };
    auto lower = half(points);
    std::vector<Point> reversed(points.rbegin(), points.rend());
    auto upper = half(reversed);

    std::vector<Point> result(lower.begin(), lower.end() - 1);
    result.insert(result.end(), upper.begin(), upper.end() - 1);
    return result;
}

std::pair<double, std::pair<Point, Point>> rotatingCalipersDiameter(const std::vector<Point>& hull) {
    int n = static_cast<int>(hull.size());
    if (n == 1) return { 0.0, { hull[0], hull[0] } };
    if (n == 2) return { std::sqrt(dist2(hull[0], hull[1])), { hull[0], hull[1] } };

    auto area2 = [](const Point& a, const Point& b, const Point& c) { return std::abs(cross(a, b, c)); };

    int k = 1;
    while (area2(hull[n - 1], hull[0], hull[(k + 1) % n]) > area2(hull[n - 1], hull[0], hull[k])) k++;

    double best = 0;
    std::pair<Point, Point> bestPair = { hull[0], hull[0] };
    int j = k;
    for (int i = 0; i < n; i++) {
        while (area2(hull[i], hull[(i + 1) % n], hull[(j + 1) % n]) > area2(hull[i], hull[(i + 1) % n], hull[j])) {
            j = (j + 1) % n;
            double d = dist2(hull[i], hull[j]);
            if (d > best) { best = d; bestPair = { hull[i], hull[j] }; }
        }
        double d = dist2(hull[i], hull[j]);
        if (d > best) { best = d; bestPair = { hull[i], hull[j] }; }
    }
    return { std::sqrt(best), bestPair };
}
```

```rust
#[derive(Clone, Copy, PartialEq)]
struct Point { x: f64, y: f64 }

fn cross(o: Point, a: Point, b: Point) -> f64 {
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}
fn dist2(a: Point, b: Point) -> f64 {
    (a.x - b.x).powi(2) + (a.y - b.y).powi(2)
}

fn half_hull(seq: &[Point]) -> Vec<Point> {
    let mut hull: Vec<Point> = Vec::new();
    for &p in seq {
        while hull.len() >= 2 && cross(hull[hull.len() - 2], hull[hull.len() - 1], p) <= 0.0 {
            hull.pop();
        }
        hull.push(p);
    }
    hull
}

fn convex_hull(points: &[Point]) -> Vec<Point> {
    let mut pts = points.to_vec();
    pts.sort_by(|a, b| a.x.partial_cmp(&b.x).unwrap().then(a.y.partial_cmp(&b.y).unwrap()));
    if pts.len() <= 2 {
        return pts;
    }
    let lower = half_hull(&pts);
    let reversed: Vec<Point> = pts.iter().rev().copied().collect();
    let upper = half_hull(&reversed);

    let mut result = lower[..lower.len() - 1].to_vec();
    result.extend_from_slice(&upper[..upper.len() - 1]);
    result
}

fn rotating_calipers_diameter(hull: &[Point]) -> (f64, (Point, Point)) {
    let n = hull.len();
    if n == 1 {
        return (0.0, (hull[0], hull[0]));
    }
    if n == 2 {
        return (dist2(hull[0], hull[1]).sqrt(), (hull[0], hull[1]));
    }
    let area2 = |a: Point, b: Point, c: Point| cross(a, b, c).abs();

    let mut k = 1;
    while area2(hull[n - 1], hull[0], hull[(k + 1) % n]) > area2(hull[n - 1], hull[0], hull[k]) {
        k += 1;
    }

    let mut best = 0.0;
    let mut best_pair = (hull[0], hull[0]);
    let mut j = k;
    for i in 0..n {
        while area2(hull[i], hull[(i + 1) % n], hull[(j + 1) % n]) > area2(hull[i], hull[(i + 1) % n], hull[j]) {
            j = (j + 1) % n;
            let d = dist2(hull[i], hull[j]);
            if d > best {
                best = d;
                best_pair = (hull[i], hull[j]);
            }
        }
        let d = dist2(hull[i], hull[j]);
        if d > best {
            best = d;
            best_pair = (hull[i], hull[j]);
        }
    }
    (best.sqrt(), best_pair)
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

static class RotatingCalipers
{
    static double Cross((double x, double y) o, (double x, double y) a, (double x, double y) b) =>
        (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    static double Dist2((double x, double y) a, (double x, double y) b) =>
        (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);

    public static List<(double, double)> ConvexHull(List<(double, double)> points)
    {
        var pts = points.OrderBy(p => p.Item1).ThenBy(p => p.Item2).ToList();
        if (pts.Count <= 2) return pts;

        List<(double, double)> Half(IEnumerable<(double, double)> seq)
        {
            var hull = new List<(double, double)>();
            foreach (var p in seq)
            {
                while (hull.Count >= 2 && Cross(hull[^2], hull[^1], p) <= 0) hull.RemoveAt(hull.Count - 1);
                hull.Add(p);
            }
            return hull;
        }
        var lower = Half(pts);
        var upper = Half(Enumerable.Reverse(pts));
        var result = lower.Take(lower.Count - 1).ToList();
        result.AddRange(upper.Take(upper.Count - 1));
        return result;
    }

    public static (double Diameter, ((double, double), (double, double)) Pair) Diameter(List<(double, double)> hull)
    {
        int n = hull.Count;
        if (n == 1) return (0, (hull[0], hull[0]));
        if (n == 2) return (Math.Sqrt(Dist2(hull[0], hull[1])), (hull[0], hull[1]));
        double Area2((double, double) a, (double, double) b, (double, double) c) => Math.Abs(Cross(a, b, c));

        int k = 1;
        while (Area2(hull[n - 1], hull[0], hull[(k + 1) % n]) > Area2(hull[n - 1], hull[0], hull[k])) k++;

        double best = 0;
        var bestPair = (hull[0], hull[0]);
        int j = k;
        for (int i = 0; i < n; i++)
        {
            while (Area2(hull[i], hull[(i + 1) % n], hull[(j + 1) % n]) > Area2(hull[i], hull[(i + 1) % n], hull[j]))
            {
                j = (j + 1) % n;
                double d = Dist2(hull[i], hull[j]);
                if (d > best) { best = d; bestPair = (hull[i], hull[j]); }
            }
            double d2 = Dist2(hull[i], hull[j]);
            if (d2 > best) { best = d2; bestPair = (hull[i], hull[j]); }
        }
        return (Math.Sqrt(best), bestPair);
    }
}
```
