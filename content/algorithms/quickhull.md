---
name: クイックハル(QuickHull)
category: 計算幾何
subcategory: 凸包・多角形
complexity: O(n log n)(平均)、O(n²)(最悪)
summary: クイックソートと同じ分割統治の発想を凸包構築に応用し、最も外側の点を軸に点集合を再帰的に分割していく凸包アルゴリズム。平均的な入力では非常に高速に動作する。
---

## 概要

[クイックソート](/algorithms/quick-sort)がピボットを軸に配列を分割していくのと同じ発想を、2次元の点集合の凸包構築に応用したのがクイックハルである。まず最も左と最も右の点を結ぶ直線で点集合を2つの半分に分け、それぞれの半分の中で「直線から最も遠い点」を新たな凸包の頂点として見つけ、その点によってさらに部分問題を分割する——この「最も外側の点を軸に再帰的に絞り込む」という発想が[クイックソート](/algorithms/quick-sort)のピボット選択と本質的に同じ構造を持つことから、この名前が付けられている。

## 仕組み

1. 全点の中からx座標が最小の点`A`と最大の点`B`を見つけ、直線`AB`を引く。この直線は点集合を「直線の上側」と「下側」の2つのグループに分ける(直線上の点は凸包に寄与しない)
2. 各グループについて再帰的に以下を行う: グループが空ならそのまま終了。空でなければ、直線から最も遠い点`C`を見つける——`C`は必ず凸包の頂点になることが幾何学的に保証されている
3. 三角形`ABC`の外側にある点だけを2つの新しいグループ(直線`AC`の外側、直線`BC`の外側)に振り分け、それぞれについて手順2を再帰的に繰り返す(三角形の内側にある点は凸包に寄与しないため、この時点で完全に除外できる)
4. 再帰が全て終了した時点で、見つかった頂点を結ぶと凸包が完成する

## 特性・トレードオフ

- **計算量**: [クイックソート](/algorithms/quick-sort)と同様、平均的な入力(点がランダムに分布している場合)では`O(n log n)`だが、最悪ケース(点が特定の病的な配置になっている場合)では`O(n²)`まで悪化する——ピボット選択に依存する[クイックソート](/algorithms/quick-sort)の性質がそのまま引き継がれている
- **各再帰段階での大幅な枝刈り**: 三角形`ABC`の内側にある点を完全に除外できる点が、[ジャービスの行進法](/algorithms/jarvis-march)の`O(nh)`と比べて優れている理由——特に点が凸包の内側に密集している実データでは、早い段階で多くの点が計算対象から除外され実用上高速に動作する
- **[グラハムスキャン](/algorithms/graham-scan)との比較**: [グラハムスキャン](/algorithms/graham-scan)は事前ソート`O(n log n)`が確定的なコストになるのに対し、クイックハルは平均`O(n log n)`だが最悪`O(n²)`のリスクを持つ、という[クイックソート](/algorithms/quick-sort)と[マージソート](/algorithms/merge-sort)の関係に似たトレードオフがある
- **使いどころ**: 大規模な2次元・3次元点群データの凸包計算(3次元への拡張も比較的自然に行える)、コンピュータグラフィックスにおける衝突判定用のバウンディングボリューム計算、統計学における外れ値検出(凸包の外側は極端な値を持つ点の候補になる)

## 実装例

```python
Point = tuple[float, float]


def cross(o: Point, a: Point, b: Point) -> float:
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def quickhull(points: list[Point]) -> list[Point]:
    pts = sorted(set(points))
    if len(pts) < 3:
        return pts

    def find_hull(subset: list[Point], a: Point, b: Point) -> list[Point]:
        if not subset:
            return []
        farthest = max(subset, key=lambda p: abs(cross(a, b, p)))
        left_a = [p for p in subset if cross(a, farthest, p) > 0]
        left_b = [p for p in subset if cross(farthest, b, p) > 0]
        return find_hull(left_a, a, farthest) + [farthest] + find_hull(left_b, farthest, b)

    leftmost, rightmost = pts[0], pts[-1]
    upper = [p for p in pts if cross(leftmost, rightmost, p) > 0]
    lower = [p for p in pts if cross(leftmost, rightmost, p) < 0]
    return [leftmost] + find_hull(upper, leftmost, rightmost) + [rightmost] + find_hull(lower, rightmost, leftmost)
```

```typescript
type Point = [number, number];

function cross(o: Point, a: Point, b: Point): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function findHull(subset: Point[], a: Point, b: Point): Point[] {
  if (subset.length === 0) return [];
  let farthest = subset[0];
  let farthestDist = Math.abs(cross(a, b, farthest));
  for (const p of subset) {
    const d = Math.abs(cross(a, b, p));
    if (d > farthestDist) {
      farthest = p;
      farthestDist = d;
    }
  }
  const leftA = subset.filter((p) => cross(a, farthest, p) > 0);
  const leftB = subset.filter((p) => cross(farthest, b, p) > 0);
  return [...findHull(leftA, a, farthest), farthest, ...findHull(leftB, farthest, b)];
}

function quickhull(points: Point[]): Point[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;

  const leftmost = pts[0];
  const rightmost = pts[pts.length - 1];
  const upper = pts.filter((p) => cross(leftmost, rightmost, p) > 0);
  const lower = pts.filter((p) => cross(leftmost, rightmost, p) < 0);
  return [leftmost, ...findHull(upper, leftmost, rightmost), rightmost, ...findHull(lower, rightmost, leftmost)];
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

void findHull(const std::vector<Point>& subset, const Point& a, const Point& b, std::vector<Point>& hull) {
    if (subset.empty()) return;
    Point farthest = subset[0];
    double farthestDist = std::abs(cross(a, b, farthest));
    for (const auto& p : subset) {
        double d = std::abs(cross(a, b, p));
        if (d > farthestDist) { farthest = p; farthestDist = d; }
    }
    std::vector<Point> leftA, leftB;
    for (const auto& p : subset) {
        if (cross(a, farthest, p) > 0) leftA.push_back(p);
        if (cross(farthest, b, p) > 0) leftB.push_back(p);
    }
    findHull(leftA, a, farthest, hull);
    hull.push_back(farthest);
    findHull(leftB, farthest, b, hull);
}

std::vector<Point> quickHull(std::vector<Point> points) {
    std::sort(points.begin(), points.end(), [](const Point& a, const Point& b) {
        return a.x != b.x ? a.x < b.x : a.y < b.y;
    });
    if (points.size() < 3) return points;

    Point leftmost = points.front();
    Point rightmost = points.back();
    std::vector<Point> upper, lower;
    for (const auto& p : points) {
        double c = cross(leftmost, rightmost, p);
        if (c > 0) upper.push_back(p);
        else if (c < 0) lower.push_back(p);
    }

    std::vector<Point> hull;
    hull.push_back(leftmost);
    findHull(upper, leftmost, rightmost, hull);
    hull.push_back(rightmost);
    findHull(lower, rightmost, leftmost, hull);
    return hull;
}
```

```rust
#[derive(Clone, Copy, PartialEq)]
struct Point { x: f64, y: f64 }

fn cross(o: Point, a: Point, b: Point) -> f64 {
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

fn find_hull(subset: &[Point], a: Point, b: Point, hull: &mut Vec<Point>) {
    if subset.is_empty() {
        return;
    }
    let mut farthest = subset[0];
    let mut farthest_dist = cross(a, b, farthest).abs();
    for &p in subset {
        let d = cross(a, b, p).abs();
        if d > farthest_dist {
            farthest = p;
            farthest_dist = d;
        }
    }
    let left_a: Vec<Point> = subset.iter().copied().filter(|&p| cross(a, farthest, p) > 0.0).collect();
    let left_b: Vec<Point> = subset.iter().copied().filter(|&p| cross(farthest, b, p) > 0.0).collect();
    find_hull(&left_a, a, farthest, hull);
    hull.push(farthest);
    find_hull(&left_b, farthest, b, hull);
}

fn quickhull(points: &[Point]) -> Vec<Point> {
    let mut pts = points.to_vec();
    pts.sort_by(|a, b| a.x.partial_cmp(&b.x).unwrap().then(a.y.partial_cmp(&b.y).unwrap()));
    if pts.len() < 3 {
        return pts;
    }

    let leftmost = pts[0];
    let rightmost = *pts.last().unwrap();
    let upper: Vec<Point> = pts.iter().copied().filter(|&p| cross(leftmost, rightmost, p) > 0.0).collect();
    let lower: Vec<Point> = pts.iter().copied().filter(|&p| cross(leftmost, rightmost, p) < 0.0).collect();

    let mut hull = vec![leftmost];
    find_hull(&upper, leftmost, rightmost, &mut hull);
    hull.push(rightmost);
    find_hull(&lower, rightmost, leftmost, &mut hull);
    hull
}
```

```csharp
static List<(double X, double Y)> QuickHull(List<(double X, double Y)> points)
{
    double Cross((double X, double Y) o, (double X, double Y) a, (double X, double Y) b) =>
        (a.X - o.X) * (b.Y - o.Y) - (a.Y - o.Y) * (b.X - o.X);

    List<(double, double)> FindHull(List<(double, double)> subset, (double, double) a, (double, double) b)
    {
        if (subset.Count == 0) return new List<(double, double)>();
        var farthest = subset[0];
        double farthestDist = Math.Abs(Cross(a, b, farthest));
        foreach (var p in subset)
        {
            double d = Math.Abs(Cross(a, b, p));
            if (d > farthestDist) { farthest = p; farthestDist = d; }
        }
        var leftA = subset.Where(p => Cross(a, farthest, p) > 0).ToList();
        var leftB = subset.Where(p => Cross(farthest, b, p) > 0).ToList();
        var result = FindHull(leftA, a, farthest);
        result.Add(farthest);
        result.AddRange(FindHull(leftB, farthest, b));
        return result;
    }

    var pts = points.OrderBy(p => p.X).ThenBy(p => p.Y).ToList();
    if (pts.Count < 3) return pts;

    var leftmost = pts[0];
    var rightmost = pts[^1];
    var upper = pts.Where(p => Cross(leftmost, rightmost, p) > 0).ToList();
    var lower = pts.Where(p => Cross(leftmost, rightmost, p) < 0).ToList();

    var hull = new List<(double, double)> { leftmost };
    hull.AddRange(FindHull(upper, leftmost, rightmost));
    hull.Add(rightmost);
    hull.AddRange(FindHull(lower, rightmost, leftmost));
    return hull;
}
```
