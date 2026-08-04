---
name: ボロノイ図
category: 計算幾何
subcategory: 三角形分割・分割図
complexity: O(n log n)
summary: 各点に最も近い領域で平面を分割する。ドロネー三角形分割と双対の関係にある。
---

## 概要

複数の「拠点」(コンビニの店舗、消防署、細胞の核など)が平面上に散らばっているとき、「どの地点が、どの拠点に最も近いか」で平面全体を塗り分けた図。1908年にロシアの数学者ゲオルギー・ボロノイが定式化した(自然界では、キリンの模様やトンボの羽の構造にも似たパターンが見られることで知られる)。空間の"勢力圏"を可視化する、計算幾何の基本的かつ視覚的にわかりやすい構造。

## 仕組み

各拠点(母点)について、「その母点に最も近い領域」を求めると、それらの領域(ボロノイ領域、またはボロノイセルと呼ぶ)の境界線が、平面全体を隙間なく分割する。

1. 2つの母点の間の境界線は、必ず**その2点を結ぶ線分の垂直二等分線の一部**になる(垂直二等分線上の点は、どちらの母点からも等距離であるため)
2. 各母点のボロノイ領域は、その母点と他の全ての母点との垂直二等分線によって囲まれる、凸多角形(あるいは無限に広がる領域)になる
3. 全ての母点についてこれを求めると、平面全体が母点の数だけの領域に分割される

**構築の実務的な方法**: 直接構築するアルゴリズム(フォーチュンのアルゴリズムなど)もあるが、**ドロネー三角形分割を先に求めてから、その双対を取る**ことでボロノイ図を導出する方法もよく使われる(ドロネー三角形の外接円の中心を結ぶと、ボロノイ図の境界線が得られる)。

## 特性・トレードオフ

- **計算量**: O(n log n)。ドロネー三角形分割と同じオーダーで構築できる
- **ドロネー三角形分割との双対性**: 2つの構造は表裏一体の関係にあり、片方を求めれば、もう片方は機械的に(あるいは概念的に)導出できる。用途に応じてどちらを直接構築するか選ばれる
- **k近傍探索への応用**: あるクエリ点がどのボロノイ領域に含まれるかを調べれば、それがどの母点に最も近いか(最近傍探索)を即座に判定できる。事前に構築しておけば、個々のクエリはO(log n)で処理できる
- **使いどころ**: 店舗・施設の商圏分析、携帯電話の基地局のカバレッジ設計、細胞組織の成長パターンのモデリング、ロボットの経路計画(障害物から最も離れた安全な経路の探索)、気象観測地点のデータ補間(ティーセン多角形法)など

## 実装例

Fortuneのアルゴリズムのような掃引線法は実装が複雑なため、ここでは各格子点について総当たりで最も近い母点を求める「ラスタライズ版」で実装する。境界のグリッド点では、2つの最近傍母点への距離がほぼ等しくなる(=垂直二等分線の性質)ことを検証する。

```python
import math


def dist2(a, b):
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2


def nearest_site(point, sites):
    best_i, best_d = 0, dist2(point, sites[0])
    for i in range(1, len(sites)):
        d = dist2(point, sites[i])
        if d < best_d:
            best_d, best_i = d, i
    return best_i, best_d


def voronoi_raster(sites, width, height, step=1.0):
    grid = []
    y = 0.0
    while y < height:
        row = []
        x = 0.0
        while x < width:
            idx, _ = nearest_site((x, y), sites)
            row.append(idx)
            x += step
        grid.append(row)
        y += step
    return grid


# 検証: 境界のグリッド点は、隣接する2つの母点への距離がほぼ等しい(垂直二等分線の性質)
sites = [(2.0, 2.0), (8.0, 2.0), (5.0, 8.0)]
grid = voronoi_raster(sites, 10.0, 10.0, step=0.25)
for r in range(len(grid)):
    for c in range(len(grid[0]) - 1):
        a, b = grid[r][c], grid[r][c + 1]
        if a != b:
            p = ((c + 0.5) * 0.25, r * 0.25)
            da = math.sqrt(dist2(p, sites[a]))
            db = math.sqrt(dist2(p, sites[b]))
            assert abs(da - db) < 0.5  # グリッド解像度の誤差内で等距離
```

```typescript
type Point = [number, number];

function dist2(a: Point, b: Point): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

function nearestSite(point: Point, sites: Point[]): [number, number] {
  let bestI = 0;
  let bestD = dist2(point, sites[0]);
  for (let i = 1; i < sites.length; i++) {
    const d = dist2(point, sites[i]);
    if (d < bestD) {
      bestD = d;
      bestI = i;
    }
  }
  return [bestI, bestD];
}

function voronoiRaster(sites: Point[], width: number, height: number, step: number): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < height; y += step) {
    const row: number[] = [];
    for (let x = 0; x < width; x += step) {
      const [idx] = nearestSite([x, y], sites);
      row.push(idx);
    }
    grid.push(row);
  }
  return grid;
}
```

```cpp
#include <vector>
#include <cmath>

using Point = std::pair<double, double>;

double dist2(const Point& a, const Point& b) {
    double dx = a.first - b.first;
    double dy = a.second - b.second;
    return dx * dx + dy * dy;
}

std::pair<int, double> nearestSite(const Point& point, const std::vector<Point>& sites) {
    int bestI = 0;
    double bestD = dist2(point, sites[0]);
    for (size_t i = 1; i < sites.size(); i++) {
        double d = dist2(point, sites[i]);
        if (d < bestD) {
            bestD = d;
            bestI = static_cast<int>(i);
        }
    }
    return {bestI, bestD};
}

std::vector<std::vector<int>> voronoiRaster(const std::vector<Point>& sites, double width, double height, double step) {
    std::vector<std::vector<int>> grid;
    for (double y = 0; y < height; y += step) {
        std::vector<int> row;
        for (double x = 0; x < width; x += step) {
            row.push_back(nearestSite({x, y}, sites).first);
        }
        grid.push_back(row);
    }
    return grid;
}
```

```rust
type Point = (f64, f64);

fn dist2(a: Point, b: Point) -> f64 {
    (a.0 - b.0).powi(2) + (a.1 - b.1).powi(2)
}

fn nearest_site(point: Point, sites: &[Point]) -> (usize, f64) {
    let mut best_i = 0;
    let mut best_d = dist2(point, sites[0]);
    for (i, &s) in sites.iter().enumerate().skip(1) {
        let d = dist2(point, s);
        if d < best_d {
            best_d = d;
            best_i = i;
        }
    }
    (best_i, best_d)
}

fn voronoi_raster(sites: &[Point], width: f64, height: f64, step: f64) -> Vec<Vec<usize>> {
    let mut grid = Vec::new();
    let mut y = 0.0;
    while y < height {
        let mut row = Vec::new();
        let mut x = 0.0;
        while x < width {
            let (idx, _) = nearest_site((x, y), sites);
            row.push(idx);
            x += step;
        }
        grid.push(row);
        y += step;
    }
    grid
}
```

```csharp
static double Dist2((double x, double y) a, (double x, double y) b)
{
    double dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy;
}

static (int idx, double d) NearestSite((double x, double y) point, (double x, double y)[] sites)
{
    int bestI = 0;
    double bestD = Dist2(point, sites[0]);
    for (int i = 1; i < sites.Length; i++)
    {
        double d = Dist2(point, sites[i]);
        if (d < bestD) { bestD = d; bestI = i; }
    }
    return (bestI, bestD);
}

static int[][] VoronoiRaster((double x, double y)[] sites, double width, double height, double step)
{
    var grid = new List<int[]>();
    for (double y = 0; y < height; y += step)
    {
        var row = new List<int>();
        for (double x = 0; x < width; x += step)
        {
            var (idx, _) = NearestSite((x, y), sites);
            row.Add(idx);
        }
        grid.Add(row.ToArray());
    }
    return grid.ToArray();
}
```
