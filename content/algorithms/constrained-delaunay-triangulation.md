---
name: 制約付きドロネー三角形分割
category: 計算幾何
subcategory: 三角形分割・分割図
complexity: O(n log n)(nは点数、辺の制約数に応じて追加処理が発生)
summary: 通常の[ドロネー三角形分割](/algorithms/delaunay-triangulation)が持つ「なるべく細長い三角形を作らない」という性質を保ちながら、指定した辺(壁・境界線)を必ず三角形の辺として含めることを強制し、建物の壁や地図の境界線を跨がない三角形分割を実現する。
---

## 概要

[ドロネー三角形分割](/algorithms/delaunay-triangulation)は、各三角形の外接円が他の点を含まないという性質により、細長い(数値的に不安定な)三角形をなるべく避けた、質の良い三角形分割を自動的に生成する。しかし、建物の間取り図やGISの地図データのように、**「この2点を結ぶ辺(壁、道路の境界線など)は必ず三角形分割の一部として保持したい」**という制約がある場合、通常のドロネー三角形分割はこの制約を無視して、指定した辺を横切るような三角形を作ってしまうことがある。制約付きドロネー三角形分割(CDT)は、**指定された制約辺の集合を必ず三角形の辺として含めながら、それ以外の部分ではできる限りドロネー三角形分割に近い(質の良い)分割を保つ**という、2つの要求を両立させる手法である。

## 仕組み

1. まず、制約辺を無視して、通常の[ドロネー三角形分割](/algorithms/delaunay-triangulation)を全ての点集合に対して構築する
2. 各制約辺について、それが既にドロネー三角形分割の辺として存在しているかを確認する。存在していれば、その制約辺はそのまま使える
3. 制約辺が存在していない(つまり、制約辺を横切る形で他の三角形の辺が通っている)場合、**辺の交換(エッジフリップ)** を繰り返して、その制約辺を三角形分割に組み込む。具体的には、制約辺と交差している既存の辺を、周囲の四角形の対角線を入れ替えるように交換していく操作を、制約辺が完全に組み込まれるまで繰り返す
4. 制約辺が全て組み込まれたら、**制約辺以外の部分**について、ローカルなドロネー条件(各辺の両側の三角形の外接円が、もう片方の頂点を含まないこと)を満たすように、可能な限りエッジフリップで最適化する(制約辺自体はこの最適化の対象から除外し、常に保持され続ける)
5. 結果として、制約辺は全て保持されつつ、それ以外の部分では通常のドロネー三角形分割に近い、質の良い三角形分割が得られる

## 特性・トレードオフ

- **境界・壁を跨がない三角形分割**: 建物の間取り、地形の輪郭線、道路網のような「越えてはいけない境界」を持つデータに対して、通常のドロネー三角形分割をそのまま適用すると、壁を貫通するような不自然な三角形ができてしまうことがあるが、CDTはこれを構造的に防ぐ
- **完全なドロネー性は制約辺周辺で失われる**: 制約辺を保持するために挿入した辺は、必ずしも真のドロネー条件(外接円に他の点を含まない)を満たすとは限らない。CDTは「制約辺の保持」を最優先し、その周辺だけドロネー性をわずかに犠牲にするという妥協を伴う
- **有限要素法・ナビゲーションメッシュへの応用**: 構造解析の有限要素法(FEM)でメッシュを生成する際、材料の境界や既知の亀裂線を辺として保持したい場合にCDTが使われる。同様に、ゲームの[ナビゲーションメッシュ生成](/algorithms/navmesh-generation)でも、壁や障害物の輪郭を辺として保持しながら歩行可能領域を三角形分割するのにCDTの考え方が使える
- **使いどころ**: GIS(地理情報システム)における地形・境界線を考慮した三角形分割、建築間取り図の解析、有限要素法メッシュ生成における既知の境界の保持、ゲームの[ナビゲーションメッシュ生成](/algorithms/navmesh-generation)や[ボロノイ経路計画](/algorithms/voronoi-path-planning)のための壁を考慮した空間分割

## 実装例

エッジフリップによる制約辺の組み込み処理の核心部分を、簡略化した形で示す(完全なCDT実装は交差判定や複雑なデータ構造を要するため、ここでは中心となる判定・フリップ操作のロジックを示す)。

```python
Point = tuple[float, float]

def segments_intersect(p1: Point, p2: Point, p3: Point, p4: Point) -> bool:
    def cross(o: Point, a: Point, b: Point) -> float:
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    d1 = cross(p3, p4, p1)
    d2 = cross(p3, p4, p2)
    d3 = cross(p1, p2, p3)
    d4 = cross(p1, p2, p4)
    return ((d1 > 0) != (d2 > 0)) and ((d3 > 0) != (d4 > 0))

def in_circumcircle(a: Point, b: Point, c: Point, d: Point) -> bool:
    """点dが三角形abcの外接円の内部にあるかを判定する(ドロネー条件の違反チェック)。"""
    ax, ay = a[0] - d[0], a[1] - d[1]
    bx, by = b[0] - d[0], b[1] - d[1]
    cx, cy = c[0] - d[0], c[1] - d[1]
    det = (
        (ax * ax + ay * ay) * (bx * cy - cx * by)
        - (bx * bx + by * by) * (ax * cy - cx * ay)
        + (cx * cx + cy * cy) * (ax * by - bx * ay)
    )
    return det > 0

def find_edges_crossing_constraint(
    edges: list[tuple[Point, Point]], constraint: tuple[Point, Point]
) -> list[tuple[Point, Point]]:
    p1, p2 = constraint
    return [(a, b) for a, b in edges if segments_intersect(a, b, p1, p2)]
```

```typescript
type Point = [number, number];

function cross(o: Point, a: Point, b: Point): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  return d1 > 0 !== d2 > 0 && d3 > 0 !== d4 > 0;
}

function inCircumcircle(a: Point, b: Point, c: Point, d: Point): boolean {
  const ax = a[0] - d[0], ay = a[1] - d[1];
  const bx = b[0] - d[0], by = b[1] - d[1];
  const cx = c[0] - d[0], cy = c[1] - d[1];
  const det =
    (ax * ax + ay * ay) * (bx * cy - cx * by) -
    (bx * bx + by * by) * (ax * cy - cx * ay) +
    (cx * cx + cy * cy) * (ax * by - bx * ay);
  return det > 0;
}

function findEdgesCrossingConstraint(edges: [Point, Point][], constraint: [Point, Point]): [Point, Point][] {
  const [p1, p2] = constraint;
  return edges.filter(([a, b]) => segmentsIntersect(a, b, p1, p2));
}
```

```cpp
#include <vector>
#include <utility>

using Point = std::pair<double, double>;

double cross(const Point& o, const Point& a, const Point& b) {
    return (a.first - o.first) * (b.second - o.second) - (a.second - o.second) * (b.first - o.first);
}

bool segmentsIntersect(const Point& p1, const Point& p2, const Point& p3, const Point& p4) {
    double d1 = cross(p3, p4, p1), d2 = cross(p3, p4, p2);
    double d3 = cross(p1, p2, p3), d4 = cross(p1, p2, p4);
    return ((d1 > 0) != (d2 > 0)) && ((d3 > 0) != (d4 > 0));
}

bool inCircumcircle(const Point& a, const Point& b, const Point& c, const Point& d) {
    double ax = a.first - d.first, ay = a.second - d.second;
    double bx = b.first - d.first, by = b.second - d.second;
    double cx = c.first - d.first, cy = c.second - d.second;
    double det = (ax * ax + ay * ay) * (bx * cy - cx * by)
               - (bx * bx + by * by) * (ax * cy - cx * ay)
               + (cx * cx + cy * cy) * (ax * by - bx * ay);
    return det > 0;
}
```

```rust
type Point = (f64, f64);

fn cross(o: Point, a: Point, b: Point) -> f64 {
    (a.0 - o.0) * (b.1 - o.1) - (a.1 - o.1) * (b.0 - o.0)
}

fn segments_intersect(p1: Point, p2: Point, p3: Point, p4: Point) -> bool {
    let d1 = cross(p3, p4, p1);
    let d2 = cross(p3, p4, p2);
    let d3 = cross(p1, p2, p3);
    let d4 = cross(p1, p2, p4);
    (d1 > 0.0) != (d2 > 0.0) && (d3 > 0.0) != (d4 > 0.0)
}

fn in_circumcircle(a: Point, b: Point, c: Point, d: Point) -> bool {
    let (ax, ay) = (a.0 - d.0, a.1 - d.1);
    let (bx, by) = (b.0 - d.0, b.1 - d.1);
    let (cx, cy) = (c.0 - d.0, c.1 - d.1);
    let det = (ax * ax + ay * ay) * (bx * cy - cx * by)
        - (bx * bx + by * by) * (ax * cy - cx * ay)
        + (cx * cx + cy * cy) * (ax * by - bx * ay);
    det > 0.0
}
```

```csharp
static double Cross((double x, double y) o, (double x, double y) a, (double x, double y) b)
    => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

static bool SegmentsIntersect((double, double) p1, (double, double) p2, (double, double) p3, (double, double) p4)
{
    double d1 = Cross(p3, p4, p1), d2 = Cross(p3, p4, p2);
    double d3 = Cross(p1, p2, p3), d4 = Cross(p1, p2, p4);
    return (d1 > 0) != (d2 > 0) && (d3 > 0) != (d4 > 0);
}

static bool InCircumcircle((double x, double y) a, (double x, double y) b, (double x, double y) c, (double x, double y) d)
{
    double ax = a.x - d.x, ay = a.y - d.y;
    double bx = b.x - d.x, by = b.y - d.y;
    double cx = c.x - d.x, cy = c.y - d.y;
    double det = (ax * ax + ay * ay) * (bx * cy - cx * by)
               - (bx * bx + by * by) * (ax * cy - cx * ay)
               + (cx * cx + cy * cy) * (ax * by - bx * ay);
    return det > 0;
}
```
