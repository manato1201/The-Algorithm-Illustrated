---
name: 最近点対問題
category: 計算幾何
subcategory: 分割統治・走査
complexity: O(n log n)
summary: 分割統治で候補を絞り込み、素朴なO(n²)の総当りを避けて最も近い2点を求める。
---

## 概要

平面上に散らばったn個の点の中から、最も距離が近い2点の組を見つける問題。素朴には全ペアの距離を計算して比較すればよいがO(n²)かかる。分割統治法を使うと、この問題をO(n log n)まで高速化できる——1975年頃に発展した、分割統治のアルゴリズム設計における教科書的な成功例のひとつ。

## 仕組み

1. 全ての点をx座標でソートし、点群を左半分・右半分に分割する
2. **左半分・右半分それぞれについて、再帰的に最近点対を求める**(それぞれの中での最小距離d_left, d_rightが得られる)
3. `d = min(d_left, d_right)` を、現時点での最良の候補とする
4. しかし、これだけでは**分割線をまたぐペア**(左半分の点と右半分の点の組み合わせ)を見落としている。そこで、分割線から距離d以内にある点だけを取り出し、それらの中から改めて最近点対を探す
5. この「境界付近の帯」の中の点は、**y座標でソートしておけば、各点について確認すべき候補が定数個(高々7点程度)に限られる**ことが幾何学的に証明できる。これにより、この境界チェックがO(n)で済む

「分割して再帰的に解き、境界だけを別途丁寧にチェックする」という構成が、この問題を線形対数時間まで押し下げる鍵になっている。

## 特性・トレードオフ

- **計算量**: O(n log n)。初期のソートに加え、再帰の各段階での境界チェックがO(n)で済むことがマージソートと同様の計算量帰納法(T(n) = 2T(n/2) + O(n))につながる
- **「境界付近だけ定数個」という幾何学的な洞察が核心**: なぜ帯の中の各点について確認すべき候補が定数個に限られるのか、その証明(鳩の巣原理を使った議論)自体が計算幾何の面白い教材になっている
- **多次元への拡張**: この分割統治の考え方は3次元以上の空間における最近点対問題にも拡張できる(次元が上がるごとに定数倍のコストは増える)
- **使いどころ**: 地理情報システムにおける近接施設の発見、衝突判定における最も危険な物体ペアの特定、クラスタリングアルゴリズムの前処理、気象データにおける観測地点間の類似性分析など

## 実装例

```python
import math

def closest_pair_brute_force(points: list[tuple[float, float]]):
    n = len(points)
    best = math.inf
    best_pair = None
    for i in range(n):
        for j in range(i + 1, n):
            d = math.dist(points[i], points[j])
            if d < best:
                best = d
                best_pair = (points[i], points[j])
    return best, best_pair

def closest_pair(points: list[tuple[float, float]]):
    pts_sorted_x = sorted(points)
    return _closest_pair_rec(pts_sorted_x)

def _closest_pair_rec(pts_x: list[tuple[float, float]]):
    n = len(pts_x)
    if n <= 3:
        return closest_pair_brute_force(pts_x)
    mid = n // 2
    mid_x = pts_x[mid][0]
    d_left, pair_left = _closest_pair_rec(pts_x[:mid])
    d_right, pair_right = _closest_pair_rec(pts_x[mid:])
    d, best_pair = (d_left, pair_left) if d_left <= d_right else (d_right, pair_right)

    strip = [p for p in pts_x if abs(p[0] - mid_x) < d]
    strip.sort(key=lambda p: p[1])
    m = len(strip)
    for i in range(m):
        for j in range(i + 1, m):
            if strip[j][1] - strip[i][1] >= d:
                break
            dist = math.dist(strip[i], strip[j])
            if dist < d:
                d = dist
                best_pair = (strip[i], strip[j])
    return d, best_pair
```

```typescript
type Point = [number, number];

function dist(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function closestPairBruteForce(points: Point[]): [number, [Point, Point] | null] {
  let best = Infinity;
  let bestPair: [Point, Point] | null = null;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = dist(points[i], points[j]);
      if (d < best) {
        best = d;
        bestPair = [points[i], points[j]];
      }
    }
  }
  return [best, bestPair];
}

function closestPair(points: Point[]): [number, [Point, Point] | null] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return closestPairRec(sorted);
}

function closestPairRec(ptsX: Point[]): [number, [Point, Point] | null] {
  const n = ptsX.length;
  if (n <= 3) return closestPairBruteForce(ptsX);
  const mid = Math.floor(n / 2);
  const midX = ptsX[mid][0];
  const [dLeft, pairLeft] = closestPairRec(ptsX.slice(0, mid));
  const [dRight, pairRight] = closestPairRec(ptsX.slice(mid));
  let [d, bestPair] = dLeft <= dRight ? [dLeft, pairLeft] : [dRight, pairRight];

  const strip = ptsX.filter((p) => Math.abs(p[0] - midX) < d);
  strip.sort((a, b) => a[1] - b[1]);
  for (let i = 0; i < strip.length; i++) {
    for (let j = i + 1; j < strip.length; j++) {
      if (strip[j][1] - strip[i][1] >= d) break;
      const dd = dist(strip[i], strip[j]);
      if (dd < d) {
        d = dd;
        bestPair = [strip[i], strip[j]];
      }
    }
  }
  return [d, bestPair];
}
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>
#include <limits>
#include <optional>

using Point = std::pair<double, double>;

double dist(const Point& a, const Point& b) {
    double dx = a.first - b.first, dy = a.second - b.second;
    return std::sqrt(dx * dx + dy * dy);
}

std::pair<double, std::optional<std::pair<Point, Point>>> closestPairBruteForce(const std::vector<Point>& points) {
    double best = std::numeric_limits<double>::infinity();
    std::optional<std::pair<Point, Point>> bestPair;
    for (size_t i = 0; i < points.size(); i++) {
        for (size_t j = i + 1; j < points.size(); j++) {
            double d = dist(points[i], points[j]);
            if (d < best) {
                best = d;
                bestPair = {points[i], points[j]};
            }
        }
    }
    return {best, bestPair};
}

std::pair<double, std::optional<std::pair<Point, Point>>> closestPairRec(std::vector<Point> ptsX) {
    size_t n = ptsX.size();
    if (n <= 3) return closestPairBruteForce(ptsX);
    size_t mid = n / 2;
    double midX = ptsX[mid].first;
    std::vector<Point> left(ptsX.begin(), ptsX.begin() + mid);
    std::vector<Point> right(ptsX.begin() + mid, ptsX.end());
    auto [dLeft, pairLeft] = closestPairRec(left);
    auto [dRight, pairRight] = closestPairRec(right);
    double d;
    std::optional<std::pair<Point, Point>> bestPair;
    if (dLeft <= dRight) { d = dLeft; bestPair = pairLeft; }
    else { d = dRight; bestPair = pairRight; }

    std::vector<Point> strip;
    for (const auto& p : ptsX) {
        if (std::abs(p.first - midX) < d) strip.push_back(p);
    }
    std::sort(strip.begin(), strip.end(), [](const Point& a, const Point& b) {
        return a.second < b.second;
    });
    for (size_t i = 0; i < strip.size(); i++) {
        for (size_t j = i + 1; j < strip.size(); j++) {
            if (strip[j].second - strip[i].second >= d) break;
            double dd = dist(strip[i], strip[j]);
            if (dd < d) {
                d = dd;
                bestPair = {strip[i], strip[j]};
            }
        }
    }
    return {d, bestPair};
}

std::pair<double, std::optional<std::pair<Point, Point>>> closestPair(std::vector<Point> points) {
    std::sort(points.begin(), points.end());
    return closestPairRec(points);
}
```

```rust
type Point = (f64, f64);

fn dist(a: Point, b: Point) -> f64 {
    let dx = a.0 - b.0;
    let dy = a.1 - b.1;
    (dx * dx + dy * dy).sqrt()
}

fn closest_pair_brute_force(points: &[Point]) -> (f64, Option<(Point, Point)>) {
    let mut best = f64::INFINITY;
    let mut best_pair = None;
    for i in 0..points.len() {
        for j in (i + 1)..points.len() {
            let d = dist(points[i], points[j]);
            if d < best {
                best = d;
                best_pair = Some((points[i], points[j]));
            }
        }
    }
    (best, best_pair)
}

fn closest_pair_rec(pts_x: &[Point]) -> (f64, Option<(Point, Point)>) {
    let n = pts_x.len();
    if n <= 3 {
        return closest_pair_brute_force(pts_x);
    }
    let mid = n / 2;
    let mid_x = pts_x[mid].0;
    let (left, right) = pts_x.split_at(mid);
    let (d_left, pair_left) = closest_pair_rec(left);
    let (d_right, pair_right) = closest_pair_rec(right);
    let (mut d, mut best_pair) = if d_left <= d_right { (d_left, pair_left) } else { (d_right, pair_right) };

    let mut strip: Vec<Point> = pts_x.iter().copied().filter(|p| (p.0 - mid_x).abs() < d).collect();
    strip.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());
    for i in 0..strip.len() {
        for j in (i + 1)..strip.len() {
            if strip[j].1 - strip[i].1 >= d {
                break;
            }
            let dd = dist(strip[i], strip[j]);
            if dd < d {
                d = dd;
                best_pair = Some((strip[i], strip[j]));
            }
        }
    }
    (d, best_pair)
}

fn closest_pair(points: &[Point]) -> (f64, Option<(Point, Point)>) {
    let mut sorted = points.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
    closest_pair_rec(&sorted)
}
```

```csharp
static double Dist((double x, double y) a, (double x, double y) b)
    => Math.Sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));

static (double dist, ((double, double), (double, double))? pair) ClosestPairBruteForce(List<(double x, double y)> points)
{
    double best = double.PositiveInfinity;
    ((double, double), (double, double))? bestPair = null;
    for (int i = 0; i < points.Count; i++)
    {
        for (int j = i + 1; j < points.Count; j++)
        {
            double d = Dist(points[i], points[j]);
            if (d < best) { best = d; bestPair = (points[i], points[j]); }
        }
    }
    return (best, bestPair);
}

static (double dist, ((double, double), (double, double))? pair) ClosestPairRec(List<(double x, double y)> ptsX)
{
    int n = ptsX.Count;
    if (n <= 3) return ClosestPairBruteForce(ptsX);
    int mid = n / 2;
    double midX = ptsX[mid].x;
    var (dLeft, pairLeft) = ClosestPairRec(ptsX.Take(mid).ToList());
    var (dRight, pairRight) = ClosestPairRec(ptsX.Skip(mid).ToList());
    double d;
    ((double, double), (double, double))? bestPair;
    if (dLeft <= dRight) { d = dLeft; bestPair = pairLeft; }
    else { d = dRight; bestPair = pairRight; }

    var strip = ptsX.Where(p => Math.Abs(p.x - midX) < d).OrderBy(p => p.y).ToList();
    for (int i = 0; i < strip.Count; i++)
    {
        for (int j = i + 1; j < strip.Count; j++)
        {
            if (strip[j].y - strip[i].y >= d) break;
            double dd = Dist(strip[i], strip[j]);
            if (dd < d) { d = dd; bestPair = (strip[i], strip[j]); }
        }
    }
    return (d, bestPair);
}

static (double dist, ((double, double), (double, double))? pair) ClosestPair(List<(double x, double y)> points)
{
    var sorted = points.OrderBy(p => p.x).ThenBy(p => p.y).ToList();
    return ClosestPairRec(sorted);
}
```
