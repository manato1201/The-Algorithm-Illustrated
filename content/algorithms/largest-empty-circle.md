---
name: 最大空円問題(Largest Empty Circle)
category: 計算幾何
subcategory: 三角形分割・分割図
complexity: O(n log n)
summary: 与えられた点群のどれも内部に含まない最大の円を、ボロノイ図の頂点上に解の中心が必ず存在するという性質を使ってO(n log n)で求める問題。
---

## 概要

工場や倉庫の立地計画で「既存の施設(点群)からできるだけ離れた場所に新しい施設を建てたい」、あるいは軍事・防災の文脈で「監視網の死角(既存のセンサーから最も遠い地点)を見つけたい」というとき、答えは「与えられた点群のどれ一つとして内部に含まない、最大の円」を求める問題として定式化できる。これが最大空円問題(Largest Empty Circle)であり、素朴に考えると円の中心の候補は平面上の無限に多い場所にありうるが、実は**候補となる中心は有限個の点(点群の[ボロノイ図](/algorithms/voronoi-diagram)の頂点、および境界上の特定の点)に絞り込める**という美しい性質により、O(n log n)で解ける。

## 仕組み

**鍵となる性質**: ある点`c`を中心とする円が、点群のどの点も内部に含まずに拡大できる限界まで大きくなったとき、その円の境界には**最低でも2つの最寄り点(点群の点)が同時に接している**はずである(そうでなければ、円をどちらかに少しずらすことでさらに拡大できてしまう)。「ある点`c`から、点群の中で最も近い2点が等距離にある」という条件は、まさに**[ボロノイ図](/algorithms/voronoi-diagram)の辺(2つの母点への垂直二等分線)の上にある**ことを意味する。さらに、点群の内部にできる最大の空円は、ボロノイ図の**頂点**(3つ以上のボロノイ領域が接する点で、3つ以上の母点から等距離になる点)のいずれかを中心に持つことが証明できる。

1. 点群全体の[ボロノイ図](/algorithms/voronoi-diagram)を構築する(O(n log n))
2. ボロノイ図の各頂点`v`について、`v`から最も近い母点までの距離`r(v)`を計算する(ボロノイ頂点は定義上、複数の母点から等距離にあるため、そのうちどれか1つとの距離を測ればよい)
3. 点群の凸包の内部に限定する場合は、ボロノイ図の頂点に加えて、**無限に伸びるボロノイ辺と凸包の境界との交点**も候補に含める(点群の外側まで円を広げてよいなら、境界での打ち切りは不要で無限に大きな円が得られてしまうため、通常は「点群の凸包内で」という制約を付けて考える)
4. 全ての候補点の中で`r(v)`が最大のものを選び、それが最大空円の中心と半径になる

計算量はボロノイ図の構築が支配的でO(n log n)、頂点数はO(n)個なのでそれぞれの半径計算はO(n)で済み、全体としてO(n log n)を達成する。

## 特性・トレードオフ

- **[ボロノイ図](/algorithms/voronoi-diagram)の頂点上に解が存在するという性質の威力**: 円の中心の候補が平面上の無限の可能性から、ボロノイ図の頂点というO(n)個の有限な候補に絞り込めることが、この問題を効率的に解ける根本的な理由になっている。「連続な最適化問題を、幾何学的な構造(ボロノイ図)を使って離散的な候補の探索に帰着させる」という計算幾何によく見られる考え方の good example
- **制約の有無で問題の性質が変わる**: 「点群の凸包内に限定して最大空円を探す」場合と、「平面全体で無制限に探す」場合とでは、後者は常に無限大の円が存在してしまうため意味をなさない。実務上は矩形領域や凸包などの境界条件を明示することが必須になる
- **応用上の類似問題**: 障害物(点群)を避けながら最も安全な(最も障害物から離れた)経路を通りたいロボットの経路計画では、ボロノイ図の辺上を移動する経路が「常に最寄りの障害物から最大限離れた経路」になるという性質があり、最大空円問題と同じボロノイ図の構造を利用する
- **使いどころ**: 新規施設の立地選定(既存拠点から最も離れた場所を探す)、通信基地局やセンサー網の死角(カバレッジの穴)の特定、ロボットの安全な経路計画(障害物から最大限離れた通路の探索)、防災計画における避難拠点の配置検討

## 実装例

ボロノイ図の頂点座標が既知(またはドロネー三角形分割の外接円中心として計算済み)である前提で、各頂点について最寄り母点までの距離を測り最大のものを選ぶ、核心の選定処理を示す。

```python
import math

Point = tuple[float, float]


def dist(a: Point, b: Point) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def nearest_site_distance(v: Point, sites: list[Point]) -> float:
    return min(dist(v, s) for s in sites)


def largest_empty_circle(sites: list[Point], voronoi_vertices: list[Point]) -> tuple[Point, float]:
    """voronoi_verticesは点群sitesのボロノイ図の頂点座標のリスト
    (ドロネー三角形分割の各三角形の外接円中心として得られる)。
    各頂点について最寄り母点までの距離を測り、最大のものを最大空円として返す。"""
    best_center = voronoi_vertices[0]
    best_radius = nearest_site_distance(best_center, sites)
    for v in voronoi_vertices[1:]:
        r = nearest_site_distance(v, sites)
        if r > best_radius:
            best_radius = r
            best_center = v
    return best_center, best_radius


def circumcenter(a: Point, b: Point, c: Point) -> Point | None:
    """ドロネー三角形分割の三角形a, b, cから外接円の中心(=ボロノイ頂点)を求める。"""
    ax, ay = a
    bx, by = b
    cx, cy = c
    d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    if abs(d) < 1e-12:
        return None
    ux = ((ax**2 + ay**2) * (by - cy) + (bx**2 + by**2) * (cy - ay) + (cx**2 + cy**2) * (ay - by)) / d
    uy = ((ax**2 + ay**2) * (cx - bx) + (bx**2 + by**2) * (ax - cx) + (cx**2 + cy**2) * (bx - ax)) / d
    return (ux, uy)
```

```typescript
type Point = [number, number];

function dist(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function nearestSiteDistance(v: Point, sites: Point[]): number {
  return Math.min(...sites.map((s) => dist(v, s)));
}

// voronoiVerticesは点群sitesのボロノイ図の頂点座標のリスト
// (ドロネー三角形分割の各三角形の外接円中心として得られる)。
// 各頂点について最寄り母点までの距離を測り、最大のものを最大空円として返す
function largestEmptyCircle(sites: Point[], voronoiVertices: Point[]): [Point, number] {
  let bestCenter = voronoiVertices[0];
  let bestRadius = nearestSiteDistance(bestCenter, sites);
  for (const v of voronoiVertices.slice(1)) {
    const r = nearestSiteDistance(v, sites);
    if (r > bestRadius) {
      bestRadius = r;
      bestCenter = v;
    }
  }
  return [bestCenter, bestRadius];
}

// ドロネー三角形分割の三角形a, b, cから外接円の中心(=ボロノイ頂点)を求める
function circumcenter(a: Point, b: Point, c: Point): Point | null {
  const [ax, ay] = a;
  const [bx, by] = b;
  const [cx, cy] = c;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-12) return null;
  const ux =
    ((ax ** 2 + ay ** 2) * (by - cy) + (bx ** 2 + by ** 2) * (cy - ay) + (cx ** 2 + cy ** 2) * (ay - by)) / d;
  const uy =
    ((ax ** 2 + ay ** 2) * (cx - bx) + (bx ** 2 + by ** 2) * (ax - cx) + (cx ** 2 + cy ** 2) * (bx - ax)) / d;
  return [ux, uy];
}
```
