---
name: 半平面交差(Half-plane Intersection)
category: 計算幾何
subcategory: 分割統治・走査
complexity: O(n log n)(分割統治法)
summary: 複数の半平面(直線で区切られた片側の領域)全ての共通部分を、半分ずつに分けて再帰的に交差させ、隣接する2つの凸多角形をマージする「クリッピング」操作を繰り返すことで効率的に求める。
---

## 概要

「この直線より右側」「あの直線より上側」といった条件(半平面)がいくつも与えられたとき、それら**全ての条件を同時に満たす領域**(半平面の共通部分、必ず凸多角形になる)を求める問題を半平面交差と呼ぶ。線形計画法の実行可能領域の可視化、複数の制約条件を同時に満たす配置可能領域の計算など、幾何学的な制約充足問題の基礎になる。半平面をランダムな順に1つずつ追加していく素朴な逐次交差法はO(n²)かかるが、[最近点対問題](/algorithms/closest-pair-of-points)と同じ**分割統治**の考え方を使うと、半平面を半分ずつのグループに分け、それぞれの共通部分(凸多角形)を再帰的に求めてから、最後に2つの凸多角形同士を交差(クリッピング)させてマージすることで、O(n log n)まで高速化できる。

## 仕組み

1. `n`個の半平面を、単純に前半・後半の2グループに分割する
2. 各グループについて、要素数が1個(またはごく少数)になるまで再帰的に1の分割を繰り返す
3. 再帰の底(半平面が1〜2個程度)では、その少数の半平面の共通部分を直接計算する(1個ならその半平面自身、2個なら2直線の交差領域)
4. 再帰から戻る際、**左半分の結果である凸多角形`P_left`と、右半分の結果である凸多角形`P_right`を交差(マージ)**する。凸多角形同士の交差は、Sutherland-Hodgmanアルゴリズムのようなクリッピング手法で、`P_left`を`P_right`の各辺(半平面とみなせる)で順に切り取っていくことで計算できる。凸多角形同士の交差自体はO(頂点数の和)で計算できる
5. 2〜4を再帰的に繰り返し、最終的に全ての半平面の共通部分を表す1つの凸多角形(または空集合、共通部分がない場合)を得る。分割統治の各階層での作業量の合計がO(n)、階層数がO(log n)であるため、全体でO(n log n)となる

## 特性・トレードオフ

- **凸多角形同士のマージへ問題を帰着させる分割統治の型**: 半平面交差は、点群を「左右に分けて、それぞれの凸包を求めてからマージする」分割統治法による凸包構築と同じ構造を持つ。個々の半平面という単純な要素の交差を直接扱うのではなく、途中結果として得られる「凸多角形同士のマージ」という部分問題に帰着させる点が、この分割統治の型の一般的なパターンである。[凸包の層分解](/algorithms/convex-layers-onion-peeling)も同様に、凸包の計算を繰り返し適用することで点群の階層構造を明らかにする、関連した幾何学的な反復処理の例である
- **共通部分が空になる場合の扱い**: 全ての制約を同時に満たす領域が存在しない(実行不可能)ケースもあり、マージの過程で凸多角形が退化する(頂点がなくなる)ことを正しく検出する必要がある。線形計画問題の実行可能性判定の文脈では、この「空集合の検出」自体が重要な情報になる
- **オンライン版・インクリメンタル版との対比**: 分割統治法は全ての半平面が事前に分かっているオフラインの設定に向くが、半平面が逐次追加されるオンラインの設定では、ランダム化incremental algorithmを使い期待計算量O(n log n)を達成する別のアプローチが使われる(ランダムな順序で1つずつ追加し、既存の多角形をクリッピングし続ける)
- **使いどころ**: 線形計画問題の実行可能領域の可視化・幾何学的解法、複数のセンサー・カメラの視野が重なる共通監視領域の計算、ロボットが複数の制約(壁からの距離、他ロボットとの安全距離)を同時に満たせる配置可能領域の算出、地理情報システムにおける複数条件を満たすエリアの抽出

## 実装例

Sutherland-Hodgmanクリッピングを使い、凸多角形を1つの半平面で切り取る核となる処理を示す(この処理を繰り返し適用することで、複数の半平面との交差、および凸多角形同士のマージが実現できる)。

```python
Point = tuple[float, float]

def is_inside(p: Point, line_a: Point, line_b: Point) -> bool:
    """半平面: (line_a, line_b)を結ぶ直線の左側を「内側」とする。"""
    return (line_b[0] - line_a[0]) * (p[1] - line_a[1]) - (line_b[1] - line_a[1]) * (p[0] - line_a[0]) >= 0

def line_intersection(p1: Point, p2: Point, line_a: Point, line_b: Point) -> Point:
    x1, y1 = p1; x2, y2 = p2; x3, y3 = line_a; x4, y4 = line_b
    denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
    return (x1 + t * (x2 - x1), y1 + t * (y2 - y1))

def clip_polygon_by_halfplane(polygon: list[Point], line_a: Point, line_b: Point) -> list[Point]:
    """凸多角形polygonを、直線(line_a, line_b)の左側の半平面で切り取る。"""
    if not polygon:
        return []
    result = []
    n = len(polygon)
    for i in range(n):
        current, nxt = polygon[i], polygon[(i + 1) % n]
        cur_inside, nxt_inside = is_inside(current, line_a, line_b), is_inside(nxt, line_a, line_b)
        if cur_inside:
            result.append(current)
            if not nxt_inside:
                result.append(line_intersection(current, nxt, line_a, line_b))
        elif nxt_inside:
            result.append(line_intersection(current, nxt, line_a, line_b))
    return result

def intersect_halfplanes(halfplanes: list[tuple[Point, Point]], bounding_box: list[Point]) -> list[Point]:
    """十分大きな初期矩形(bounding_box)を、全ての半平面で順に切り取っていく(素朴な逐次法)。"""
    polygon = bounding_box
    for line_a, line_b in halfplanes:
        polygon = clip_polygon_by_halfplane(polygon, line_a, line_b)
    return polygon
```

```typescript
type Point = [number, number];

function isInside(p: Point, lineA: Point, lineB: Point): boolean {
  return (lineB[0] - lineA[0]) * (p[1] - lineA[1]) - (lineB[1] - lineA[1]) * (p[0] - lineA[0]) >= 0;
}

function lineIntersection(p1: Point, p2: Point, lineA: Point, lineB: Point): Point {
  const [x1, y1] = p1, [x2, y2] = p2, [x3, y3] = lineA, [x4, y4] = lineB;
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
}

function clipPolygonByHalfplane(polygon: Point[], lineA: Point, lineB: Point): Point[] {
  if (polygon.length === 0) return [];
  const result: Point[] = [];
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const current = polygon[i], next = polygon[(i + 1) % n];
    const curInside = isInside(current, lineA, lineB);
    const nextInside = isInside(next, lineA, lineB);
    if (curInside) {
      result.push(current);
      if (!nextInside) result.push(lineIntersection(current, next, lineA, lineB));
    } else if (nextInside) {
      result.push(lineIntersection(current, next, lineA, lineB));
    }
  }
  return result;
}
```

```cpp
#include <vector>
#include <utility>

using Point = std::pair<double, double>;

bool isInside(const Point& p, const Point& lineA, const Point& lineB) {
    return (lineB.first - lineA.first) * (p.second - lineA.second) - (lineB.second - lineA.second) * (p.first - lineA.first) >= 0;
}

Point lineIntersection(const Point& p1, const Point& p2, const Point& lineA, const Point& lineB) {
    double x1 = p1.first, y1 = p1.second, x2 = p2.first, y2 = p2.second;
    double x3 = lineA.first, y3 = lineA.second, x4 = lineB.first, y4 = lineB.second;
    double denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    double t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    return {x1 + t * (x2 - x1), y1 + t * (y2 - y1)};
}

std::vector<Point> clipPolygonByHalfplane(const std::vector<Point>& polygon, const Point& lineA, const Point& lineB) {
    if (polygon.empty()) return {};
    std::vector<Point> result;
    int n = static_cast<int>(polygon.size());
    for (int i = 0; i < n; i++) {
        const Point& current = polygon[i];
        const Point& next = polygon[(i + 1) % n];
        bool curInside = isInside(current, lineA, lineB);
        bool nextInside = isInside(next, lineA, lineB);
        if (curInside) {
            result.push_back(current);
            if (!nextInside) result.push_back(lineIntersection(current, next, lineA, lineB));
        } else if (nextInside) {
            result.push_back(lineIntersection(current, next, lineA, lineB));
        }
    }
    return result;
}
```

```rust
type Point = (f64, f64);

fn is_inside(p: Point, line_a: Point, line_b: Point) -> bool {
    (line_b.0 - line_a.0) * (p.1 - line_a.1) - (line_b.1 - line_a.1) * (p.0 - line_a.0) >= 0.0
}

fn line_intersection(p1: Point, p2: Point, line_a: Point, line_b: Point) -> Point {
    let (x1, y1) = p1;
    let (x2, y2) = p2;
    let (x3, y3) = line_a;
    let (x4, y4) = line_b;
    let denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    let t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    (x1 + t * (x2 - x1), y1 + t * (y2 - y1))
}

fn clip_polygon_by_halfplane(polygon: &[Point], line_a: Point, line_b: Point) -> Vec<Point> {
    if polygon.is_empty() {
        return Vec::new();
    }
    let mut result = Vec::new();
    let n = polygon.len();
    for i in 0..n {
        let current = polygon[i];
        let next = polygon[(i + 1) % n];
        let cur_inside = is_inside(current, line_a, line_b);
        let next_inside = is_inside(next, line_a, line_b);
        if cur_inside {
            result.push(current);
            if !next_inside {
                result.push(line_intersection(current, next, line_a, line_b));
            }
        } else if next_inside {
            result.push(line_intersection(current, next, line_a, line_b));
        }
    }
    result
}
```

```csharp
static bool IsInside((double x, double y) p, (double x, double y) lineA, (double x, double y) lineB)
{
    return (lineB.x - lineA.x) * (p.y - lineA.y) - (lineB.y - lineA.y) * (p.x - lineA.x) >= 0;
}

static (double x, double y) LineIntersection((double x, double y) p1, (double x, double y) p2, (double x, double y) lineA, (double x, double y) lineB)
{
    double x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;
    double x3 = lineA.x, y3 = lineA.y, x4 = lineB.x, y4 = lineB.y;
    double denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    double t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    return (x1 + t * (x2 - x1), y1 + t * (y2 - y1));
}

static List<(double, double)> ClipPolygonByHalfplane(List<(double x, double y)> polygon, (double x, double y) lineA, (double x, double y) lineB)
{
    if (polygon.Count == 0) return new List<(double, double)>();
    var result = new List<(double, double)>();
    int n = polygon.Count;
    for (int i = 0; i < n; i++)
    {
        var current = polygon[i];
        var next = polygon[(i + 1) % n];
        bool curInside = IsInside(current, lineA, lineB);
        bool nextInside = IsInside(next, lineA, lineB);
        if (curInside)
        {
            result.Add(current);
            if (!nextInside) result.Add(LineIntersection(current, next, lineA, lineB));
        }
        else if (nextInside)
        {
            result.Add(LineIntersection(current, next, lineA, lineB));
        }
    }
    return result;
}
```
