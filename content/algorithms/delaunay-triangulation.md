---
name: ドロネー三角形分割
category: 計算幾何
subcategory: 三角形分割・分割図
complexity: O(n log n)
summary: 各三角形の外接円が他の点を含まないように点群を三角形分割する。地形モデリングやメッシュ生成の基礎。
---

## 概要

平面上の点群を、三角形の集合で隙間なく分割する方法は無数にあるが、ドロネー三角形分割は「**できるだけ細長い、つぶれた三角形を避ける**」という基準で、ある種"最も美しい"分割を選び出す。1934年にロシアの数学者ボリス・ドロネーが考案した。3D地形のメッシュ生成やコンピュータグラフィックスをはじめ、点群データを扱う様々な分野の基礎技術になっている。

## 仕組み

ドロネー三角形分割は、**「ドロネー条件」**と呼ばれる性質を全ての三角形が満たすように点群を分割する:

> どの三角形についても、その外接円(3頂点を通る円)の内部に、他のどの点も含まれてはならない

この条件を満たす分割は、「最小角度を最大化する」——つまり、可能な限り正三角形に近い、細長くつぶれていない三角形の集合になることが数学的に保証されている。

**代表的な構築アルゴリズム**:
1. 全ての点を含む十分に大きな仮の三角形から始める
2. 点を1つずつ追加していく。ある点を追加すると、その点を内部に含む既存の三角形の外接円を持つ三角形群が「ドロネー条件」を破るので、それらを削除して再三角形分割する(この局所的な再構築を「フリップ」と呼ぶ)
3. 全ての点を追加し終えたら、仮の三角形の頂点を取り除く

**ボロノイ図との双対性**: ドロネー三角形分割と、後述するボロノイ図は、互いに双対の関係にある(一方の頂点がもう一方の面に対応する)。片方から他方を機械的に導出することもできる。

## 特性・トレードオフ

- **計算量**: O(n log n)(効率的な構築アルゴリズムを使った場合)
- **メッシュの品質**: 細長い「ひしゃげた」三角形は数値シミュレーションの精度を悪化させるため、これを避けるドロネー三角形分割の性質は、有限要素法のようなシミュレーションで扱いやすいメッシュを作る上で極めて重要
- **点の追加・削除への対応**: 点群が動的に変化する場合でも、局所的なフリップ操作で再三角形分割できるため、リアルタイムに更新される点群データにも対応しやすい
- **使いどころ**: 3D地形のメッシュ生成、有限要素法における解析メッシュの構築、コンピュータグラフィックスにおける点群からのサーフェス再構築、GISにおける不規則な地形データ(TIN: Triangulated Irregular Network)の表現

## 実装例

ボウヤー・ワトソン法による構築。全点を包む仮の巨大三角形から始め、点を1つずつ追加してドロネー条件を破る三角形を削除・再構築する。

```python
def orientation(a: tuple[float, float], b: tuple[float, float], c: tuple[float, float]) -> float:
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def circumcircle_contains(a, b, c, p) -> bool:
    # a, b, c は反時計回り (CCW) であることを前提とする
    ax, ay = a[0] - p[0], a[1] - p[1]
    bx, by = b[0] - p[0], b[1] - p[1]
    cx, cy = c[0] - p[0], c[1] - p[1]
    det = (
        (ax**2 + ay**2) * (bx * cy - cx * by)
        - (bx**2 + by**2) * (ax * cy - cx * ay)
        + (cx**2 + cy**2) * (ax * by - bx * ay)
    )
    return det > 1e-9


def bowyer_watson(points: list[tuple[float, float]]) -> list[tuple]:
    minx = min(p[0] for p in points); maxx = max(p[0] for p in points)
    miny = min(p[1] for p in points); maxy = max(p[1] for p in points)
    dx, dy = maxx - minx, maxy - miny
    delta = max(dx, dy, 1) * 10
    p1 = (minx - delta, miny - delta)
    p2 = (minx + 2 * delta + dx, miny - delta)
    p3 = (minx - delta, miny + 2 * delta + dy)
    super_tri = (p1, p2, p3)
    triangles = [super_tri]

    for p in points:
        bad = []
        for tri in triangles:
            a, b, c = tri
            if orientation(a, b, c) < 0:
                a, b, c = c, b, a
            if circumcircle_contains(a, b, c, p):
                bad.append(tri)

        edge_count = {}
        for tri in bad:
            a, b, c = tri
            for e in [(a, b), (b, c), (c, a)]:
                key = frozenset(e)
                edge_count[key] = edge_count.get(key, 0) + 1

        boundary = []
        for tri in bad:
            a, b, c = tri
            for e in [(a, b), (b, c), (c, a)]:
                if edge_count[frozenset(e)] == 1:
                    boundary.append(e)

        for tri in bad:
            triangles.remove(tri)
        for e in boundary:
            triangles.append((e[0], e[1], p))

    return [tri for tri in triangles if not any(v in super_tri for v in tri)]
```

```typescript
type Point = [number, number];
type Triangle = [Point, Point, Point];

function orientation(a: Point, b: Point, c: Point): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function circumcircleContains(a: Point, b: Point, c: Point, p: Point): boolean {
  const ax = a[0] - p[0], ay = a[1] - p[1];
  const bx = b[0] - p[0], by = b[1] - p[1];
  const cx = c[0] - p[0], cy = c[1] - p[1];
  const det =
    (ax * ax + ay * ay) * (bx * cy - cx * by)
    - (bx * bx + by * by) * (ax * cy - cx * ay)
    + (cx * cx + cy * cy) * (ax * by - bx * ay);
  return det > 1e-9;
}

function edgeKey(e: [Point, Point]): string {
  const [a, b] = e;
  const pa = `${a[0]},${a[1]}`;
  const pb = `${b[0]},${b[1]}`;
  return pa < pb ? `${pa}|${pb}` : `${pb}|${pa}`;
}

function bowyerWatson(points: Point[]): Triangle[] {
  const minx = Math.min(...points.map((p) => p[0]));
  const maxx = Math.max(...points.map((p) => p[0]));
  const miny = Math.min(...points.map((p) => p[1]));
  const maxy = Math.max(...points.map((p) => p[1]));
  const dx = maxx - minx, dy = maxy - miny;
  const delta = Math.max(dx, dy, 1) * 10;
  const p1: Point = [minx - delta, miny - delta];
  const p2: Point = [minx + 2 * delta + dx, miny - delta];
  const p3: Point = [minx - delta, miny + 2 * delta + dy];
  const superTri: Triangle = [p1, p2, p3];
  let triangles: Triangle[] = [superTri];

  for (const p of points) {
    const bad: Triangle[] = [];
    for (const tri of triangles) {
      let [a, b, c] = tri;
      if (orientation(a, b, c) < 0) [a, b, c] = [c, b, a];
      if (circumcircleContains(a, b, c, p)) bad.push(tri);
    }

    const edgeCount = new Map<string, number>();
    for (const tri of bad) {
      const [a, b, c] = tri;
      for (const e of [[a, b], [b, c], [c, a]] as [Point, Point][]) {
        const k = edgeKey(e);
        edgeCount.set(k, (edgeCount.get(k) || 0) + 1);
      }
    }

    const boundary: [Point, Point][] = [];
    for (const tri of bad) {
      const [a, b, c] = tri;
      for (const e of [[a, b], [b, c], [c, a]] as [Point, Point][]) {
        if (edgeCount.get(edgeKey(e)) === 1) boundary.push(e);
      }
    }

    triangles = triangles.filter((tri) => !bad.includes(tri));
    for (const e of boundary) {
      triangles.push([e[0], e[1], p]);
    }
  }

  return triangles.filter(
    (tri) => !tri.some((v) => superTri.some((sv) => v[0] === sv[0] && v[1] === sv[1]))
  );
}
```

```cpp
#include <vector>
#include <array>
#include <utility>
#include <cmath>
#include <algorithm>
#include <unordered_map>
#include <string>

using Point = std::pair<double, double>;
using Triangle = std::array<Point, 3>;

double orientation(const Point& a, const Point& b, const Point& c) {
    return (b.first - a.first) * (c.second - a.second) - (b.second - a.second) * (c.first - a.first);
}

bool circumcircleContains(const Point& a, const Point& b, const Point& c, const Point& p) {
    double ax = a.first - p.first, ay = a.second - p.second;
    double bx = b.first - p.first, by = b.second - p.second;
    double cx = c.first - p.first, cy = c.second - p.second;
    double det =
        (ax * ax + ay * ay) * (bx * cy - cx * by)
        - (bx * bx + by * by) * (ax * cy - cx * ay)
        + (cx * cx + cy * cy) * (ax * by - bx * ay);
    return det > 1e-9;
}

std::string edgeKey(const Point& a, const Point& b) {
    std::string pa = std::to_string(a.first) + "," + std::to_string(a.second);
    std::string pb = std::to_string(b.first) + "," + std::to_string(b.second);
    return pa < pb ? pa + "|" + pb : pb + "|" + pa;
}

std::vector<Triangle> bowyerWatson(const std::vector<Point>& points) {
    double minx = points[0].first, maxx = points[0].first;
    double miny = points[0].second, maxy = points[0].second;
    for (const auto& p : points) {
        minx = std::min(minx, p.first); maxx = std::max(maxx, p.first);
        miny = std::min(miny, p.second); maxy = std::max(maxy, p.second);
    }
    double dx = maxx - minx, dy = maxy - miny;
    double delta = std::max({dx, dy, 1.0}) * 10;
    Point p1 = { minx - delta, miny - delta };
    Point p2 = { minx + 2 * delta + dx, miny - delta };
    Point p3 = { minx - delta, miny + 2 * delta + dy };
    Triangle superTri = { p1, p2, p3 };
    std::vector<Triangle> triangles = { superTri };

    auto edgesOf = [](const Triangle& t) {
        return std::array<std::pair<Point, Point>, 3>{
            std::make_pair(t[0], t[1]), std::make_pair(t[1], t[2]), std::make_pair(t[2], t[0])
        };
    };

    for (const auto& p : points) {
        std::vector<Triangle> bad;
        for (const auto& tri : triangles) {
            Point a = tri[0], b = tri[1], c = tri[2];
            if (orientation(a, b, c) < 0) std::swap(a, c);
            if (circumcircleContains(a, b, c, p)) bad.push_back(tri);
        }

        std::unordered_map<std::string, int> edgeCount;
        for (const auto& tri : bad) {
            for (const auto& e : edgesOf(tri)) edgeCount[edgeKey(e.first, e.second)]++;
        }

        std::vector<std::pair<Point, Point>> boundary;
        for (const auto& tri : bad) {
            for (const auto& e : edgesOf(tri)) {
                if (edgeCount[edgeKey(e.first, e.second)] == 1) boundary.push_back(e);
            }
        }

        std::vector<Triangle> next;
        for (const auto& tri : triangles) {
            bool isBad = std::any_of(bad.begin(), bad.end(), [&](const Triangle& b) { return b == tri; });
            if (!isBad) next.push_back(tri);
        }
        for (const auto& e : boundary) next.push_back({ e.first, e.second, p });
        triangles = std::move(next);
    }

    std::vector<Triangle> result;
    for (const auto& tri : triangles) {
        bool touchesSuper = false;
        for (const auto& v : tri) {
            for (const auto& sv : superTri) {
                if (v == sv) { touchesSuper = true; break; }
            }
            if (touchesSuper) break;
        }
        if (!touchesSuper) result.push_back(tri);
    }
    return result;
}
```

```rust
use std::collections::HashMap;

type Point = (f64, f64);
type Triangle = (Point, Point, Point);

fn orientation(a: Point, b: Point, c: Point) -> f64 {
    (b.0 - a.0) * (c.1 - a.1) - (b.1 - a.1) * (c.0 - a.0)
}

fn circumcircle_contains(a: Point, b: Point, c: Point, p: Point) -> bool {
    let (ax, ay) = (a.0 - p.0, a.1 - p.1);
    let (bx, by) = (b.0 - p.0, b.1 - p.1);
    let (cx, cy) = (c.0 - p.0, c.1 - p.1);
    let det = (ax * ax + ay * ay) * (bx * cy - cx * by)
        - (bx * bx + by * by) * (ax * cy - cx * ay)
        + (cx * cx + cy * cy) * (ax * by - bx * ay);
    det > 1e-9
}

fn point_key(p: Point) -> String {
    format!("{:.9},{:.9}", p.0, p.1)
}

fn edge_key(a: Point, b: Point) -> String {
    let (pa, pb) = (point_key(a), point_key(b));
    if pa < pb { format!("{pa}|{pb}") } else { format!("{pb}|{pa}") }
}

fn bowyer_watson(points: &[Point]) -> Vec<Triangle> {
    let minx = points.iter().map(|p| p.0).fold(f64::INFINITY, f64::min);
    let maxx = points.iter().map(|p| p.0).fold(f64::NEG_INFINITY, f64::max);
    let miny = points.iter().map(|p| p.1).fold(f64::INFINITY, f64::min);
    let maxy = points.iter().map(|p| p.1).fold(f64::NEG_INFINITY, f64::max);
    let (dx, dy) = (maxx - minx, maxy - miny);
    let delta = dx.max(dy).max(1.0) * 10.0;
    let p1 = (minx - delta, miny - delta);
    let p2 = (minx + 2.0 * delta + dx, miny - delta);
    let p3 = (minx - delta, miny + 2.0 * delta + dy);
    let super_tri: Triangle = (p1, p2, p3);
    let mut triangles: Vec<Triangle> = vec![super_tri];

    let edges_of = |t: &Triangle| [(t.0, t.1), (t.1, t.2), (t.2, t.0)];

    for &p in points {
        let mut bad: Vec<Triangle> = Vec::new();
        for &tri in &triangles {
            let (mut a, b, mut c) = tri;
            if orientation(a, b, c) < 0.0 {
                std::mem::swap(&mut a, &mut c);
            }
            if circumcircle_contains(a, b, c, p) {
                bad.push(tri);
            }
        }

        let mut edge_count: HashMap<String, i32> = HashMap::new();
        for tri in &bad {
            for (e1, e2) in edges_of(tri) {
                *edge_count.entry(edge_key(e1, e2)).or_insert(0) += 1;
            }
        }

        let mut boundary: Vec<(Point, Point)> = Vec::new();
        for tri in &bad {
            for (e1, e2) in edges_of(tri) {
                if edge_count[&edge_key(e1, e2)] == 1 {
                    boundary.push((e1, e2));
                }
            }
        }

        triangles.retain(|t| !bad.contains(t));
        for (e1, e2) in boundary {
            triangles.push((e1, e2, p));
        }
    }

    triangles
        .into_iter()
        .filter(|&(a, b, c)| {
            let touches = |v: Point| v == super_tri.0 || v == super_tri.1 || v == super_tri.2;
            !(touches(a) || touches(b) || touches(c))
        })
        .collect()
}
```

```csharp
static class DelaunayTriangulation
{
    public static double Orientation((double, double) a, (double, double) b, (double, double) c)
    {
        return (b.Item1 - a.Item1) * (c.Item2 - a.Item2) - (b.Item2 - a.Item2) * (c.Item1 - a.Item1);
    }

    public static bool CircumcircleContains((double, double) a, (double, double) b, (double, double) c, (double, double) p)
    {
        double ax = a.Item1 - p.Item1, ay = a.Item2 - p.Item2;
        double bx = b.Item1 - p.Item1, by = b.Item2 - p.Item2;
        double cx = c.Item1 - p.Item1, cy = c.Item2 - p.Item2;
        double det =
            (ax * ax + ay * ay) * (bx * cy - cx * by)
            - (bx * bx + by * by) * (ax * cy - cx * ay)
            + (cx * cx + cy * cy) * (ax * by - bx * ay);
        return det > 1e-9;
    }

    public static List<((double, double), (double, double), (double, double))> BowyerWatson(List<(double, double)> points)
    {
        double minx = points.Min(p => p.Item1), maxx = points.Max(p => p.Item1);
        double miny = points.Min(p => p.Item2), maxy = points.Max(p => p.Item2);
        double dx = maxx - minx, dy = maxy - miny;
        double delta = Math.Max(Math.Max(dx, dy), 1) * 10;
        var p1 = (minx - delta, miny - delta);
        var p2 = (minx + 2 * delta + dx, miny - delta);
        var p3 = (minx - delta, miny + 2 * delta + dy);
        var superTri = (p1, p2, p3);
        var triangles = new List<((double, double), (double, double), (double, double))> { superTri };

        foreach (var p in points)
        {
            var bad = new List<((double, double), (double, double), (double, double))>();
            foreach (var tri in triangles)
            {
                var (a, b, c) = tri;
                if (Orientation(a, b, c) < 0) (a, b, c) = (c, b, a);
                if (CircumcircleContains(a, b, c, p)) bad.Add(tri);
            }

            var edgeCount = new Dictionary<string, int>();
            string EdgeKey((double, double) e1, (double, double) e2)
            {
                string pa = $"{e1.Item1},{e1.Item2}";
                string pb = $"{e2.Item1},{e2.Item2}";
                return string.CompareOrdinal(pa, pb) < 0 ? $"{pa}|{pb}" : $"{pb}|{pa}";
            }

            foreach (var tri in bad)
            {
                var (a, b, c) = tri;
                foreach (var (e1, e2) in new[] { (a, b), (b, c), (c, a) })
                {
                    var k = EdgeKey(e1, e2);
                    edgeCount[k] = edgeCount.GetValueOrDefault(k, 0) + 1;
                }
            }

            var boundary = new List<((double, double), (double, double))>();
            foreach (var tri in bad)
            {
                var (a, b, c) = tri;
                foreach (var (e1, e2) in new[] { (a, b), (b, c), (c, a) })
                {
                    if (edgeCount[EdgeKey(e1, e2)] == 1) boundary.Add((e1, e2));
                }
            }

            triangles.RemoveAll(t => bad.Contains(t));
            foreach (var (e1, e2) in boundary) triangles.Add((e1, e2, p));
        }

        return triangles.Where(t =>
        {
            var (a, b, c) = t;
            return a != superTri.Item1 && a != superTri.Item2 && a != superTri.Item3
                && b != superTri.Item1 && b != superTri.Item2 && b != superTri.Item3
                && c != superTri.Item1 && c != superTri.Item2 && c != superTri.Item3;
        }).ToList();
    }
}
```
