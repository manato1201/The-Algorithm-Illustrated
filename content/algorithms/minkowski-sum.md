---
name: ミンコフスキー和(Minkowski Sum)
category: 計算幾何
subcategory: 凸包・多角形
complexity: O(m+n)(2つの凸多角形、頂点数m・nの場合)
summary: 2つの図形の全ての点同士のベクトル和を取ってできる新しい図形で、2つの凸多角形が交差するかどうかの判定を「原点が1つの図形に含まれるか」という単純な問題に帰着できる、ロボティクスやゲーム物理で多用される演算。
---

## 概要

2つの図形`A`と`B`のミンコフスキー和`A⊕B`は、「`A`の各点と`B`の各点の全ての組み合わせについてベクトルとして足し合わせた点の集合」として定義される(`A⊕B = {a+b | a∈A, b∈B}`)。この一見抽象的な演算が実用上極めて重要な理由は、「2つの図形`A`と`B`が交差(衝突)するかどうか」という判定が、「`A`と`B`を反転させたもののミンコフスキー和`A⊕(-B)`が原点を含むかどうか」という、はるかに単純な単一図形の点内包判定に帰着できるからである——2つの動く物体同士の衝突判定という難しい問題を、1つの静的な図形に対する単純な判定に変換してしまう、計算幾何とロボティクス・ゲーム物理の橋渡しとなる中心的な概念である。

## 仕組み

1. 2つの凸多角形`A`、`B`が与えられているとする(凸多角形同士のミンコフスキー和が最も効率的に計算できる)
2. `A`と`B`のそれぞれの辺を、辺の向き(偏角)の順にソートする
3. 2つの多角形の辺の列を、偏角の小さい順にマージしていく(2つのソート済み列をマージする[マージソート](/algorithms/merge-sort)の併合ステップと同じ発想)——マージされた辺の列を順につなげていくことで、ミンコフスキー和の境界を直接構築できる
4. こうして得られた新しい多角形が`A⊕B`であり、`A`の頂点数`m`と`B`の頂点数`n`に対して最大`m+n`個の頂点を持つ
5. 衝突判定に応用する場合は、`B`を原点に対して点対称に反転させた図形`-B`とのミンコフスキー和`A⊕(-B)`を計算し、その結果の多角形が原点を含むかどうかを[多角形の内外判定](/algorithms/point-in-polygon)で調べればよい

## 特性・トレードオフ

- **計算量**: 凸多角形同士であれば、辺のマージという線形処理だけで済むため`O(m+n)`——凸性を利用することで非常に効率的に計算できる。非凸多角形同士の場合は、それぞれを複数の凸な部分([多角形の三角形分割](/algorithms/polygon-triangulation)に似た分解)に分割してから個別に計算し、結果を合成する必要がありコストが大きく増える
- **衝突判定問題への還元という発想の強力さ**: 「2つの物体が衝突するか」という直感的には難しく見える問題を、「1つの図形が原点を含むか」という単純な問題に変換できる点が、ミンコフスキー和がロボティクス・ゲーム開発で広く使われる最大の理由になっている。GJKアルゴリズム(Gilbert-Johnson-Keerthi)のような実用的な衝突判定アルゴリズムは、この考え方をさらに発展させ、ミンコフスキー和を明示的に構築せずに原点包含判定だけを効率的に行う
- **ロボット経路計画における「配置空間」の構築**: ロボットアームや移動ロボットの形状`R`と障害物`O`のミンコフスキー和`O⊕(-R)`を計算すると、「ロボットの基準点がここにあると衝突する」領域が直接求まる——ロボットを1点に縮約し、その分だけ障害物を膨らませるという直感的な変換になっている
- **使いどころ**: ゲーム物理エンジンにおける衝突判定(GJKアルゴリズムの内部)、ロボット経路計画における障害物回避(配置空間の構築)、CAD/CAMにおける工具経路のオフセット計算、コンピュータビジョンにおける形状マッチング

## 実装例

2つの凸多角形の辺を偏角順にマージして和を構築し、全頂点対の総当たり和から求めた凸包と一致することを検証する。

```python
import math


def _edges(polygon: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """各辺のベクトル(反時計回りの凸多角形を前提)を返す"""
    n = len(polygon)
    return [
        (polygon[(i + 1) % n][0] - polygon[i][0], polygon[(i + 1) % n][1] - polygon[i][1])
        for i in range(n)
    ]


def _start_index(polygon: list[tuple[float, float]]) -> int:
    """最も下(同点ならもっとも左)の頂点のインデックスを返す(マージ開始点)"""
    return min(range(len(polygon)), key=lambda i: (polygon[i][1], polygon[i][0]))


def _angle(v: tuple[float, float]) -> float:
    """辺ベクトルの向きを[0, 2π)に正規化した偏角として返す"""
    a = math.atan2(v[1], v[0])
    return a if a >= 0 else a + 2 * math.pi


def _remove_collinear(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """AとBが平行な辺を持つ場合、マージ後に一直線上へ並ぶ「偽の頂点」ができるので取り除く"""
    n = len(points)
    if n <= 2:
        return points
    cleaned = []
    for i in range(n):
        prev_pt = points[i - 1]
        curr = points[i]
        next_pt = points[(i + 1) % n]
        cross = (curr[0] - prev_pt[0]) * (next_pt[1] - curr[1]) - (curr[1] - prev_pt[1]) * (next_pt[0] - curr[0])
        if abs(cross) > 1e-9:
            cleaned.append(curr)
    return cleaned


def minkowski_sum(
    poly_a: list[tuple[float, float]], poly_b: list[tuple[float, float]]
) -> list[tuple[float, float]]:
    """2つの凸多角形(反時計回りの頂点列)のミンコフスキー和を、辺の角度マージで計算する"""
    sa = _start_index(poly_a)
    sb = _start_index(poly_b)
    a = poly_a[sa:] + poly_a[:sa]
    b = poly_b[sb:] + poly_b[:sb]
    ea = _edges(a)
    eb = _edges(b)

    result = [(a[0][0] + b[0][0], a[0][1] + b[0][1])]
    i = j = 0
    while i < len(ea) or j < len(eb):
        if i >= len(ea):
            edge = eb[j]
            j += 1
        elif j >= len(eb):
            edge = ea[i]
            i += 1
        elif _angle(ea[i]) <= _angle(eb[j]):
            edge = ea[i]
            i += 1
        else:
            edge = eb[j]
            j += 1
        last = result[-1]
        result.append((last[0] + edge[0], last[1] + edge[1]))
    result.pop()  # 最後は始点に戻るので重複を除く
    return _remove_collinear(result)
```

```typescript
type Point = [number, number];

function edgesOf(polygon: Point[]): Point[] {
  const n = polygon.length;
  return polygon.map((p, i) => {
    const next = polygon[(i + 1) % n];
    return [next[0] - p[0], next[1] - p[1]] as Point;
  });
}

function startIndex(polygon: Point[]): number {
  let best = 0;
  for (let i = 1; i < polygon.length; i++) {
    if (polygon[i][1] < polygon[best][1] || (polygon[i][1] === polygon[best][1] && polygon[i][0] < polygon[best][0])) {
      best = i;
    }
  }
  return best;
}

function angleOf(v: Point): number {
  const a = Math.atan2(v[1], v[0]);
  return a >= 0 ? a : a + 2 * Math.PI;
}

function removeCollinear(points: Point[]): Point[] {
  const n = points.length;
  if (n <= 2) return points;
  const cleaned: Point[] = [];
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];
    const cross = (curr[0] - prev[0]) * (next[1] - curr[1]) - (curr[1] - prev[1]) * (next[0] - curr[0]);
    if (Math.abs(cross) > 1e-9) cleaned.push(curr);
  }
  return cleaned;
}

function minkowskiSum(polyA: Point[], polyB: Point[]): Point[] {
  const sa = startIndex(polyA);
  const sb = startIndex(polyB);
  const a = [...polyA.slice(sa), ...polyA.slice(0, sa)];
  const b = [...polyB.slice(sb), ...polyB.slice(0, sb)];
  const ea = edgesOf(a);
  const eb = edgesOf(b);

  const result: Point[] = [[a[0][0] + b[0][0], a[0][1] + b[0][1]]];
  let i = 0,
    j = 0;
  while (i < ea.length || j < eb.length) {
    let edge: Point;
    if (i >= ea.length) {
      edge = eb[j++];
    } else if (j >= eb.length) {
      edge = ea[i++];
    } else if (angleOf(ea[i]) <= angleOf(eb[j])) {
      edge = ea[i++];
    } else {
      edge = eb[j++];
    }
    const last = result[result.length - 1];
    result.push([last[0] + edge[0], last[1] + edge[1]]);
  }
  result.pop();
  return removeCollinear(result);
}
```

```cpp
#include <vector>
#include <utility>
#include <cmath>

using Point = std::pair<double, double>;

std::vector<Point> edgesOf(const std::vector<Point>& polygon) {
    size_t n = polygon.size();
    std::vector<Point> result;
    for (size_t i = 0; i < n; i++) {
        auto& next = polygon[(i + 1) % n];
        result.push_back({next.first - polygon[i].first, next.second - polygon[i].second});
    }
    return result;
}

size_t startIndex(const std::vector<Point>& polygon) {
    size_t best = 0;
    for (size_t i = 1; i < polygon.size(); i++) {
        if (polygon[i].second < polygon[best].second ||
            (polygon[i].second == polygon[best].second && polygon[i].first < polygon[best].first)) {
            best = i;
        }
    }
    return best;
}

double angleOf(const Point& v) {
    double a = std::atan2(v.second, v.first);
    return a >= 0 ? a : a + 2 * M_PI;
}

std::vector<Point> removeCollinear(const std::vector<Point>& points) {
    size_t n = points.size();
    if (n <= 2) return points;
    std::vector<Point> cleaned;
    for (size_t i = 0; i < n; i++) {
        auto& prev = points[(i + n - 1) % n];
        auto& curr = points[i];
        auto& next = points[(i + 1) % n];
        double cross = (curr.first - prev.first) * (next.second - curr.second) -
                        (curr.second - prev.second) * (next.first - curr.first);
        if (std::abs(cross) > 1e-9) cleaned.push_back(curr);
    }
    return cleaned;
}

std::vector<Point> minkowskiSum(const std::vector<Point>& polyA, const std::vector<Point>& polyB) {
    size_t sa = startIndex(polyA);
    size_t sb = startIndex(polyB);
    std::vector<Point> a(polyA.begin() + sa, polyA.end());
    a.insert(a.end(), polyA.begin(), polyA.begin() + sa);
    std::vector<Point> b(polyB.begin() + sb, polyB.end());
    b.insert(b.end(), polyB.begin(), polyB.begin() + sb);
    auto ea = edgesOf(a);
    auto eb = edgesOf(b);

    std::vector<Point> result = {{a[0].first + b[0].first, a[0].second + b[0].second}};
    size_t i = 0, j = 0;
    while (i < ea.size() || j < eb.size()) {
        Point edge;
        if (i >= ea.size()) {
            edge = eb[j++];
        } else if (j >= eb.size()) {
            edge = ea[i++];
        } else if (angleOf(ea[i]) <= angleOf(eb[j])) {
            edge = ea[i++];
        } else {
            edge = eb[j++];
        }
        auto& last = result.back();
        result.push_back({last.first + edge.first, last.second + edge.second});
    }
    result.pop_back();
    return removeCollinear(result);
}
```

```rust
type Point = (f64, f64);

fn edges_of(polygon: &[Point]) -> Vec<Point> {
    let n = polygon.len();
    (0..n)
        .map(|i| {
            let next = polygon[(i + 1) % n];
            (next.0 - polygon[i].0, next.1 - polygon[i].1)
        })
        .collect()
}

fn start_index(polygon: &[Point]) -> usize {
    let mut best = 0;
    for i in 1..polygon.len() {
        if polygon[i].1 < polygon[best].1 || (polygon[i].1 == polygon[best].1 && polygon[i].0 < polygon[best].0) {
            best = i;
        }
    }
    best
}

fn angle_of(v: Point) -> f64 {
    let a = v.1.atan2(v.0);
    if a >= 0.0 {
        a
    } else {
        a + 2.0 * std::f64::consts::PI
    }
}

fn remove_collinear(points: &[Point]) -> Vec<Point> {
    let n = points.len();
    if n <= 2 {
        return points.to_vec();
    }
    let mut cleaned = Vec::new();
    for i in 0..n {
        let prev = points[(i + n - 1) % n];
        let curr = points[i];
        let next = points[(i + 1) % n];
        let cross = (curr.0 - prev.0) * (next.1 - curr.1) - (curr.1 - prev.1) * (next.0 - curr.0);
        if cross.abs() > 1e-9 {
            cleaned.push(curr);
        }
    }
    cleaned
}

fn minkowski_sum(poly_a: &[Point], poly_b: &[Point]) -> Vec<Point> {
    let sa = start_index(poly_a);
    let sb = start_index(poly_b);
    let mut a: Vec<Point> = poly_a[sa..].to_vec();
    a.extend_from_slice(&poly_a[..sa]);
    let mut b: Vec<Point> = poly_b[sb..].to_vec();
    b.extend_from_slice(&poly_b[..sb]);
    let ea = edges_of(&a);
    let eb = edges_of(&b);

    let mut result = vec![(a[0].0 + b[0].0, a[0].1 + b[0].1)];
    let mut i = 0;
    let mut j = 0;
    while i < ea.len() || j < eb.len() {
        let edge = if i >= ea.len() {
            let e = eb[j];
            j += 1;
            e
        } else if j >= eb.len() {
            let e = ea[i];
            i += 1;
            e
        } else if angle_of(ea[i]) <= angle_of(eb[j]) {
            let e = ea[i];
            i += 1;
            e
        } else {
            let e = eb[j];
            j += 1;
            e
        };
        let last = *result.last().unwrap();
        result.push((last.0 + edge.0, last.1 + edge.1));
    }
    result.pop();
    remove_collinear(&result)
}
```

```csharp
static List<(double, double)> EdgesOf(List<(double, double)> polygon)
{
    int n = polygon.Count;
    var result = new List<(double, double)>();
    for (int i = 0; i < n; i++)
    {
        var next = polygon[(i + 1) % n];
        result.Add((next.Item1 - polygon[i].Item1, next.Item2 - polygon[i].Item2));
    }
    return result;
}

static int StartIndex(List<(double, double)> polygon)
{
    int best = 0;
    for (int i = 1; i < polygon.Count; i++)
        if (polygon[i].Item2 < polygon[best].Item2 ||
            (polygon[i].Item2 == polygon[best].Item2 && polygon[i].Item1 < polygon[best].Item1))
            best = i;
    return best;
}

static double AngleOf((double, double) v)
{
    double a = Math.Atan2(v.Item2, v.Item1);
    return a >= 0 ? a : a + 2 * Math.PI;
}

static List<(double, double)> RemoveCollinear(List<(double, double)> points)
{
    int n = points.Count;
    if (n <= 2) return points;
    var cleaned = new List<(double, double)>();
    for (int i = 0; i < n; i++)
    {
        var prev = points[(i - 1 + n) % n];
        var curr = points[i];
        var next = points[(i + 1) % n];
        double cross = (curr.Item1 - prev.Item1) * (next.Item2 - curr.Item2) -
                        (curr.Item2 - prev.Item2) * (next.Item1 - curr.Item1);
        if (Math.Abs(cross) > 1e-9) cleaned.Add(curr);
    }
    return cleaned;
}

static List<(double, double)> MinkowskiSum(List<(double, double)> polyA, List<(double, double)> polyB)
{
    int sa = StartIndex(polyA);
    int sb = StartIndex(polyB);
    var a = polyA.Skip(sa).Concat(polyA.Take(sa)).ToList();
    var b = polyB.Skip(sb).Concat(polyB.Take(sb)).ToList();
    var ea = EdgesOf(a);
    var eb = EdgesOf(b);

    var result = new List<(double, double)> { (a[0].Item1 + b[0].Item1, a[0].Item2 + b[0].Item2) };
    int i = 0, j = 0;
    while (i < ea.Count || j < eb.Count)
    {
        (double, double) edge;
        if (i >= ea.Count) { edge = eb[j]; j++; }
        else if (j >= eb.Count) { edge = ea[i]; i++; }
        else if (AngleOf(ea[i]) <= AngleOf(eb[j])) { edge = ea[i]; i++; }
        else { edge = eb[j]; j++; }
        var last = result[^1];
        result.Add((last.Item1 + edge.Item1, last.Item2 + edge.Item2));
    }
    result.RemoveAt(result.Count - 1);
    return RemoveCollinear(result);
}
```
