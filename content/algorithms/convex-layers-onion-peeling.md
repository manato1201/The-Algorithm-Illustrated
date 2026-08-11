---
name: 凸包の層分解(Onion Peeling)
category: 計算幾何
subcategory: 分割統治・走査
complexity: O(n²)(単純な繰り返し版)、O(n log n)(高度な実装)
summary: 点群から凸包を求めては取り除く、という操作を残った点がなくなるまで繰り返すことで、玉ねぎの皮のように点群を「外側の層」から順に何層もの凸多角形へ分解する。
---

## 概要

[グラハムスキャン](/algorithms/graham-scan)や[ジャービス行進法](/algorithms/jarvis-march)は点群の**最も外側の**凸包(全ての点を囲む最小の凸多角形)だけを求めるが、点群の内部構造をより詳しく捉えたい場合、外側の凸包を取り除いた後に**残った点群でもう一度凸包を求める**という操作を繰り返すことができる。この「凸包を求めては取り除く」を、点が1つも残らなくなるまで続けると、点群全体が玉ねぎの皮のように何層もの入れ子になった凸多角形(凸層、Convex Layers)へと分解される。最も外側の層(第1層)が通常の凸包に相当し、内側の層に進むほど点群の「中心部」の形状を反映する。統計学における多変量データの外れ値検出(データの「深さ」の指標の一つ)や、点群の構造分析に応用される。

## 仕組み

1. 与えられた点群全体に対して、[グラハムスキャン](/algorithms/graham-scan)や[クイックハル](/algorithms/quickhull)のようなアルゴリズムで凸包を計算する
2. 計算した凸包を構成する頂点(点群の最も外側にある点たち)を、元の点群から取り除く
3. 残った点群に対して、再び1〜2の手順(凸包の計算と除去)を行う
4. 点が1つも残らなくなる(または点の数が2以下になり凸多角形が構成できなくなる)まで、1〜3を繰り返す
5. 各繰り返しで得られた凸包の列が、外側から内側への「凸層」を構成する。第1層(最外殻)、第2層、…と番号を振ることで、各点がどの深さの層に属するかという情報が得られる

## 特性・トレードオフ

- **単純な繰り返しではO(n²)、専用アルゴリズムではO(n log n)**: 「凸包を求めて除去」を素朴に繰り返すと、各層の凸包計算にO(k log k)(kはその時点の残り点数)かかり、層の数が多い(点が均等に分布している)場合には全体でO(n²)になりうる。より高度な実装(Chazelleのアルゴリズムなど)を使うと、全ての層をまとめてO(n log n)で計算できることが知られている
- **「データの深さ」の指標としての応用**: ある点が何層目に属するか(第1層に近いほど点群の外縁、層番号が大きいほど点群の中心に近い)は、統計学における「凸包深さ(Convex Hull Depth / Peeling Depth)」という頑健な多変量データの中心性・外れ値検出の指標として使われる。外れ値は浅い層(第1層に近い)に位置しやすく、データの中心的な傾向を持つ点は深い層に位置しやすい
- **[分割統治法による凸包構築](/algorithms/graham-scan)との関係**: 凸層分解自体は「凸包を求めては除去する」という反復的な操作で、個々のステップは通常の凸包アルゴリズムに帰着するが、全体としてはこの反復構造そのものが分割統治的な性質(点群を『外側』と『残り』に分けて処理していく)を持つ
- **使いどころ**: 統計的な多変量データの外れ値検出・頑健な中心性の推定、点群データの階層的な構造分析、地理情報システムにおける空間分布の「密度の層」の可視化、コンピュータビジョンにおける物体形状の輪郭の階層的な特徴抽出

## 実装例

```python
Point = tuple[float, float]

def cross(o: Point, a: Point, b: Point) -> float:
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

def convex_hull(points: list[Point]) -> list[Point]:
    """グラハムスキャン風のモノトーンチェーン法による凸包計算。"""
    pts = sorted(set(points))
    if len(pts) <= 2:
        return pts

    lower: list[Point] = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)

    upper: list[Point] = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)

    return lower[:-1] + upper[:-1]

def convex_layers(points: list[Point]) -> list[list[Point]]:
    remaining = list(points)
    layers = []
    while len(remaining) >= 3:
        hull = convex_hull(remaining)
        layers.append(hull)
        hull_set = set(hull)
        remaining = [p for p in remaining if p not in hull_set]
    if remaining:
        layers.append(remaining)
    return layers
```

```typescript
type Point = [number, number];

function cross(o: Point, a: Point, b: Point): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function convexHull(points: Point[]): Point[] {
  const pts = [...new Set(points.map((p) => JSON.stringify(p)))].map((s) => JSON.parse(s) as Point);
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length <= 2) return pts;

  const lower: Point[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }

  const upper: Point[] = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }

  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function convexLayers(points: Point[]): Point[][] {
  let remaining = [...points];
  const layers: Point[][] = [];
  while (remaining.length >= 3) {
    const hull = convexHull(remaining);
    layers.push(hull);
    const hullSet = new Set(hull.map((p) => JSON.stringify(p)));
    remaining = remaining.filter((p) => !hullSet.has(JSON.stringify(p)));
  }
  if (remaining.length > 0) layers.push(remaining);
  return layers;
}
```

```cpp
#include <vector>
#include <algorithm>
#include <set>

using Point = std::pair<double, double>;

double cross(const Point& o, const Point& a, const Point& b) {
    return (a.first - o.first) * (b.second - o.second) - (a.second - o.second) * (b.first - o.first);
}

std::vector<Point> convexHull(std::vector<Point> points) {
    std::sort(points.begin(), points.end());
    points.erase(std::unique(points.begin(), points.end()), points.end());
    if (points.size() <= 2) return points;

    std::vector<Point> lower;
    for (auto& p : points) {
        while (lower.size() >= 2 && cross(lower[lower.size() - 2], lower.back(), p) <= 0) lower.pop_back();
        lower.push_back(p);
    }

    std::vector<Point> upper;
    for (auto it = points.rbegin(); it != points.rend(); ++it) {
        while (upper.size() >= 2 && cross(upper[upper.size() - 2], upper.back(), *it) <= 0) upper.pop_back();
        upper.push_back(*it);
    }

    lower.pop_back();
    upper.pop_back();
    lower.insert(lower.end(), upper.begin(), upper.end());
    return lower;
}

std::vector<std::vector<Point>> convexLayers(std::vector<Point> points) {
    std::vector<std::vector<Point>> layers;
    while (points.size() >= 3) {
        auto hull = convexHull(points);
        layers.push_back(hull);
        std::set<Point> hullSet(hull.begin(), hull.end());
        std::vector<Point> remaining;
        for (auto& p : points) if (!hullSet.count(p)) remaining.push_back(p);
        points = remaining;
    }
    if (!points.empty()) layers.push_back(points);
    return layers;
}
```

```rust
type Point = (f64, f64);

fn cross(o: Point, a: Point, b: Point) -> f64 {
    (a.0 - o.0) * (b.1 - o.1) - (a.1 - o.1) * (b.0 - o.0)
}

fn convex_hull(mut points: Vec<Point>) -> Vec<Point> {
    points.sort_by(|a, b| a.partial_cmp(b).unwrap());
    points.dedup();
    if points.len() <= 2 {
        return points;
    }

    let mut lower: Vec<Point> = Vec::new();
    for &p in &points {
        while lower.len() >= 2 && cross(lower[lower.len() - 2], lower[lower.len() - 1], p) <= 0.0 {
            lower.pop();
        }
        lower.push(p);
    }

    let mut upper: Vec<Point> = Vec::new();
    for &p in points.iter().rev() {
        while upper.len() >= 2 && cross(upper[upper.len() - 2], upper[upper.len() - 1], p) <= 0.0 {
            upper.pop();
        }
        upper.push(p);
    }

    lower.pop();
    upper.pop();
    lower.extend(upper);
    lower
}

fn convex_layers(mut points: Vec<Point>) -> Vec<Vec<Point>> {
    let mut layers = Vec::new();
    while points.len() >= 3 {
        let hull = convex_hull(points.clone());
        let hull_set: std::collections::HashSet<_> = hull.iter().map(|p| (p.0.to_bits(), p.1.to_bits())).collect();
        points.retain(|p| !hull_set.contains(&(p.0.to_bits(), p.1.to_bits())));
        layers.push(hull);
    }
    if !points.is_empty() {
        layers.push(points);
    }
    layers
}
```

```csharp
static double Cross((double x, double y) o, (double x, double y) a, (double x, double y) b)
{
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

static List<(double, double)> ConvexHull(List<(double x, double y)> points)
{
    var pts = points.Distinct().OrderBy(p => p.x).ThenBy(p => p.y).ToList();
    if (pts.Count <= 2) return pts;

    var lower = new List<(double, double)>();
    foreach (var p in pts)
    {
        while (lower.Count >= 2 && Cross(lower[^2], lower[^1], p) <= 0) lower.RemoveAt(lower.Count - 1);
        lower.Add(p);
    }

    var upper = new List<(double, double)>();
    for (int i = pts.Count - 1; i >= 0; i--)
    {
        while (upper.Count >= 2 && Cross(upper[^2], upper[^1], pts[i]) <= 0) upper.RemoveAt(upper.Count - 1);
        upper.Add(pts[i]);
    }

    lower.RemoveAt(lower.Count - 1);
    upper.RemoveAt(upper.Count - 1);
    lower.AddRange(upper);
    return lower;
}

static List<List<(double, double)>> ConvexLayers(List<(double x, double y)> points)
{
    var remaining = new List<(double, double)>(points);
    var layers = new List<List<(double, double)>>();
    while (remaining.Count >= 3)
    {
        var hull = ConvexHull(remaining);
        layers.Add(hull);
        var hullSet = new HashSet<(double, double)>(hull);
        remaining = remaining.Where(p => !hullSet.Contains(p)).ToList();
    }
    if (remaining.Count > 0) layers.Add(remaining);
    return layers;
}
```
