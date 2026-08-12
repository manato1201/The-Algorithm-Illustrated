---
name: パワー図(重み付きボロノイ図)
category: 計算幾何
subcategory: 三角形分割・分割図
complexity: O(n log n)
summary: 通常の[ボロノイ図](/algorithms/voronoi-diagram)が「単純なユークリッド距離」で領域を分けるのに対し、各母点に半径(重み)を持たせ「点から円までの累乗距離」で領域を分けることで、円の大きさの違いを反映した自然な勢力分割を実現する。
---

## 概要

[ボロノイ図](/algorithms/voronoi-diagram)は、各母点からの単純なユークリッド距離に基づいて平面を分割するが、この方法では全ての母点が「同じ重要度・同じ大きさ」であることを暗黙に仮定している。しかし現実の問題では、母点(施設、円、勢力の拠点)によって「影響力の大きさ」が異なることが多い——例えば異なる半径を持つ円の集合があるとき、単純な最近傍(通常のボロノイ図)ではなく、**各円の大きさを考慮した「実質的な近さ」**で領域を分けたい場合がある。パワー図(重み付きボロノイ図、Laguerre-Voronoi図とも呼ばれる)は、各母点`p_i`に重み(典型的には円の半径の2乗)`w_i`を持たせ、通常のユークリッド距離の2乗の代わりに**「パワー距離」**`pow(x, p_i) = |x - p_i|² - w_i`という指標で領域を分割する。

## 仕組み

1. 各母点`p_i`に、重み`w_i`(円の半径`r_i`を使う場合は`w_i = r_i²`)を割り当てる
2. 点`x`から母点`p_i`への**パワー距離**を`pow(x, p_i) = |x - p_i|² - w_i`と定義する。通常のユークリッド距離の2乗から、重みの分だけ差し引いた値になる
3. パワー図の各セル`V_i`を、「他のどの母点よりも`p_i`へのパワー距離が小さい(または等しい)点の集合」として定義する:`V_i = {x : pow(x, p_i) ≤ pow(x, p_j) for all j}`
4. パワー図の構築は、**リフトマップ**という巧妙な手法でドロネー三角形分割の計算に帰着できる——各2次元の母点`(p_i, w_i)`を、3次元空間上の点`(p_i, |p_i|² - w_i)`へ持ち上げ(リフトし)、その3次元点群の**下側凸包**を計算する。この下側凸包を再び2次元平面に投影すると、パワー図の三角形分割(パワー図の双対グラフ)が得られる
5. 通常のボロノイ図の構築が同様のリフトマップ+凸包の手法で[ドロネー三角形分割](/algorithms/delaunay-triangulation)に帰着できることの一般化になっており、`w_i = 0`とすれば通常のボロノイ図に一致する

## 特性・トレードオフ

- **重みの違いを反映した自然な領域分割**: 半径の異なる円の集合(例えば異なる大きさの勢力圏、異なる出力の基地局)に対して、単純な最近傍ではなく「円の大きさを考慮した実質的な近さ」で領域を分けられる。大きな重みを持つ母点は、より広い領域を獲得しやすくなる
- **セルが空になることがある**: 通常のボロノイ図では全ての母点が必ず非空のセルを持つが、パワー図では、ある母点の重みが他の母点に比べて極端に小さい場合、その母点のセルが完全に消滅する(空集合になる)ことがある。これは通常のボロノイ図にはない、パワー図特有の性質である
- **[ドロネー三角形分割](/algorithms/delaunay-triangulation)との双対関係の一般化**: 通常のボロノイ図とドロネー三角形分割が互いに双対であるのと同様、パワー図はその双対として「重み付きドロネー三角形分割(regular triangulation)」を持つ。この一般化された双対関係は、円のパッキング問題やアペルニウスの問題(与えられた円に接する円を求める)といった、円に関する幾何学的問題との深い関連を持つ
- **使いどころ**: 円のパッキング・充填問題の解析、材料科学における結晶粒界のモデリング(異なる大きさの結晶核からの成長領域)、[ボロノイ経路計画](/algorithms/voronoi-path-planning)の重み付き拡張(障害物の大きさを考慮した安全マージン)、計算幾何学における凸包・三角形分割アルゴリズムの統一的な理解

## 実装例

```python
Point = tuple[float, float]

def power_distance(x: Point, site: Point, weight: float) -> float:
    dx, dy = x[0] - site[0], x[1] - site[1]
    return dx * dx + dy * dy - weight

def nearest_power_site(x: Point, sites: list[Point], weights: list[float]) -> int:
    distances = [power_distance(x, site, w) for site, w in zip(sites, weights)]
    return min(range(len(sites)), key=lambda i: distances[i])

def lift_to_paraboloid(site: Point, weight: float) -> tuple[float, float, float]:
    """パワー図構築の核心となるリフトマップ: (x,y,w) -> (x,y, x²+y²-w)。"""
    x, y = site
    return (x, y, x * x + y * y - weight)

def build_lifted_points(sites: list[Point], weights: list[float]) -> list[tuple[float, float, float]]:
    """この点群の下側凸包を計算すると、パワー図の三角形分割(双対)が得られる。"""
    return [lift_to_paraboloid(site, w) for site, w in zip(sites, weights)]
```

```typescript
type Point = [number, number];

function powerDistance(x: Point, site: Point, weight: number): number {
  const dx = x[0] - site[0];
  const dy = x[1] - site[1];
  return dx * dx + dy * dy - weight;
}

function nearestPowerSite(x: Point, sites: Point[], weights: number[]): number {
  const distances = sites.map((site, i) => powerDistance(x, site, weights[i]));
  return distances.indexOf(Math.min(...distances));
}

function liftToParaboloid(site: Point, weight: number): [number, number, number] {
  const [x, y] = site;
  return [x, y, x * x + y * y - weight];
}

function buildLiftedPoints(sites: Point[], weights: number[]): [number, number, number][] {
  return sites.map((site, i) => liftToParaboloid(site, weights[i]));
}
```

```cpp
#include <vector>
#include <utility>
#include <algorithm>

using Point = std::pair<double, double>;

double powerDistance(const Point& x, const Point& site, double weight) {
    double dx = x.first - site.first, dy = x.second - site.second;
    return dx * dx + dy * dy - weight;
}

int nearestPowerSite(const Point& x, const std::vector<Point>& sites, const std::vector<double>& weights) {
    int best = 0;
    double bestDist = powerDistance(x, sites[0], weights[0]);
    for (size_t i = 1; i < sites.size(); i++) {
        double d = powerDistance(x, sites[i], weights[i]);
        if (d < bestDist) { bestDist = d; best = static_cast<int>(i); }
    }
    return best;
}

std::array<double, 3> liftToParaboloid(const Point& site, double weight) {
    double x = site.first, y = site.second;
    return {x, y, x * x + y * y - weight};
}
```

```rust
type Point = (f64, f64);

fn power_distance(x: Point, site: Point, weight: f64) -> f64 {
    let dx = x.0 - site.0;
    let dy = x.1 - site.1;
    dx * dx + dy * dy - weight
}

fn nearest_power_site(x: Point, sites: &[Point], weights: &[f64]) -> usize {
    sites
        .iter()
        .zip(weights.iter())
        .enumerate()
        .min_by(|(_, (s1, w1)), (_, (s2, w2))| {
            power_distance(x, **s1, **w1).partial_cmp(&power_distance(x, **s2, **w2)).unwrap()
        })
        .map(|(i, _)| i)
        .unwrap()
}

fn lift_to_paraboloid(site: Point, weight: f64) -> (f64, f64, f64) {
    let (x, y) = site;
    (x, y, x * x + y * y - weight)
}
```

```csharp
static double PowerDistance((double x, double y) x, (double x, double y) site, double weight)
{
    double dx = x.x - site.x, dy = x.y - site.y;
    return dx * dx + dy * dy - weight;
}

static int NearestPowerSite((double x, double y) x, List<(double x, double y)> sites, List<double> weights)
{
    int best = 0;
    double bestDist = PowerDistance(x, sites[0], weights[0]);
    for (int i = 1; i < sites.Count; i++)
    {
        double d = PowerDistance(x, sites[i], weights[i]);
        if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
}

static (double, double, double) LiftToParaboloid((double x, double y) site, double weight)
{
    double x = site.x, y = site.y;
    return (x, y, x * x + y * y - weight);
}
```
