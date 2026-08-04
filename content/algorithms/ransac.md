---
name: RANSAC(Random Sample Consensus)
category: コンピュータビジョン
subcategory: ロバスト推定
complexity: O(k × (nのサンプルコスト + 全点への当てはめ評価))(kは反復回数)
summary: データにランダムな外れ値が多数混じっていても、少数のサンプルからモデルを繰り返し推定し最も支持者が多い結果を採用することで、頑健にモデルを当てはめる手法。
---

## 概要

[SIFT](/algorithms/sift)などで画像間の対応点を見つけても、その中には誤ったマッチング(外れ値)が一定数必ず混じる。[最小二乗法](/algorithms/least-squares)のような手法は全データ点を平等に扱うため、外れ値が少しでも混じると結果が大きく歪んでしまう。1981年にフィッシュラーとボレスが提案したRANSACは、逆転の発想で「データの一部(できるだけ少数)だけを使ってモデルを仮に作り、残りのデータがそのモデルにどれだけ一致するか(支持するか)を数える」ことを何度も繰り返し、最も多くのデータに支持されたモデルを採用する。外れ値がどれだけ多くても、正しいモデルを支持する点(インライア)の割合さえある程度あれば、驚くほど頑健に正しいモデルを見つけ出せる。

## 仕組み

1. モデルを一意に決めるのに必要な最小限のデータ点をランダムに選ぶ(例えば直線なら2点、ホモグラフィ変換なら4組の対応点)
2. 選んだ点からモデルのパラメータを計算する(仮のモデル)
3. 残り全てのデータ点について、そのモデルにどれだけ一致するか(誤差が閾値以下か)を調べ、一致する点を「インライア」としてカウントする
4. インライアの数が、これまでで最も多い結果を記録しておく
5. 1〜4を指定回数`k`繰り返し、最終的にインライア数が最大だったモデルを採用する。仕上げに、そのモデルが獲得した全インライアを使って[最小二乗法](/algorithms/least-squares)で最終的なモデルを再推定すると、より精度の高い結果が得られる

必要な反復回数`k`は、外れ値の割合と目標とする成功確率から統計的に見積もることができる(外れ値の割合が高いほど、また求める成功確率が高いほど`k`は大きくなる)。

## 特性・トレードオフ

- **計算量**: 1回の反復コストは小さい(最小限のサンプルからのモデル計算+全点との誤差評価)ため、反復回数`k`を掛けても全体として実用的な速度で計算できる。ただし外れ値の割合が非常に高い場合、必要な`k`が指数的に増大することがある
- **外れ値への圧倒的な頑健性**: 外れ値がデータの半分近くを占めていても、正しいモデルを発見できることが多い。これは全データを平等に扱う[最小二乗法](/algorithms/least-squares)にはない大きな強み
- **確率的な手法**: ランダムサンプリングに基づくため、実行するたびに(乱数のシードが異なれば)結果がわずかに変わりうる。また理論上は正しいモデルを見逃す可能性もゼロではないが、反復回数を十分取ることでその確率を実用上無視できるレベルまで下げられる
- **使いどころ**: 画像間のホモグラフィ・基礎行列の推定(パノラマ合成、[SIFT](/algorithms/sift)特徴点マッチング後の誤対応除去)、点群からの直線・平面のフィッティング(3Dスキャンデータ処理)、GPSデータからの頑健な軌跡推定など、「外れ値が混じるのが前提」のあらゆるモデル当てはめ問題

## 実装例

```python
import math
import random

Point = tuple[float, float]


def fit_line(p1: Point, p2: Point) -> tuple[float, float] | None:
    (x1, y1), (x2, y2) = p1, p2
    if x2 == x1:
        return None
    m = (y2 - y1) / (x2 - x1)
    b = y1 - m * x1
    return m, b


def point_line_distance(m: float, b: float, p: Point) -> float:
    x, y = p
    return abs(m * x - y + b) / math.sqrt(m * m + 1)


def least_squares_fit(points: list[Point]) -> tuple[float, float]:
    n = len(points)
    sx = sum(p[0] for p in points)
    sy = sum(p[1] for p in points)
    sxx = sum(p[0] * p[0] for p in points)
    sxy = sum(p[0] * p[1] for p in points)
    denom = n * sxx - sx * sx
    m = (n * sxy - sx * sy) / denom
    b = (sy - m * sx) / n
    return m, b


def ransac_line(points: list[Point], n_iterations: int, threshold: float, rng: random.Random):
    best_inliers: list[Point] = []
    for _ in range(n_iterations):
        p1, p2 = rng.sample(points, 2)  # 最小限のサンプルからモデルを仮に作る
        model = fit_line(p1, p2)
        if model is None:
            continue
        m, b = model
        inliers = [p for p in points if point_line_distance(m, b, p) <= threshold]
        if len(inliers) > len(best_inliers):
            best_inliers = inliers  # 最も支持者が多いモデルを記録
    m, b = least_squares_fit(best_inliers)  # 仕上げに全インライアで再推定
    return m, b, best_inliers
```

```typescript
type Point = [number, number];

function fitLine(p1: Point, p2: Point): [number, number] | null {
  const [x1, y1] = p1, [x2, y2] = p2;
  if (x2 === x1) return null;
  const m = (y2 - y1) / (x2 - x1);
  const b = y1 - m * x1;
  return [m, b];
}
function pointLineDistance(m: number, b: number, p: Point): number {
  const [x, y] = p;
  return Math.abs(m * x - y + b) / Math.sqrt(m * m + 1);
}
function leastSquaresFit(points: Point[]): [number, number] {
  const n = points.length;
  const sx = points.reduce((s, p) => s + p[0], 0);
  const sy = points.reduce((s, p) => s + p[1], 0);
  const sxx = points.reduce((s, p) => s + p[0] * p[0], 0);
  const sxy = points.reduce((s, p) => s + p[0] * p[1], 0);
  const denom = n * sxx - sx * sx;
  const m = (n * sxy - sx * sy) / denom;
  const b = (sy - m * sx) / n;
  return [m, b];
}

function ransacLine(points: Point[], iterations: number, threshold: number, rng: () => number) {
  let bestInliers: Point[] = [];
  for (let i = 0; i < iterations; i++) {
    const i1 = Math.floor(rng() * points.length);
    let i2 = Math.floor(rng() * points.length);
    while (i2 === i1) i2 = Math.floor(rng() * points.length);
    const model = fitLine(points[i1], points[i2]);
    if (!model) continue;
    const [m, b] = model;
    const inliers = points.filter((p) => pointLineDistance(m, b, p) <= threshold);
    if (inliers.length > bestInliers.length) bestInliers = inliers;
  }
  const [m, b] = leastSquaresFit(bestInliers);
  return { m, b, inliers: bestInliers };
}
```

```cpp
#include <vector>
#include <cmath>
#include <random>
#include <optional>

struct Point { double x, y; };
struct Line { double m, b; };

std::optional<Line> fitLine(const Point& p1, const Point& p2) {
    if (p2.x == p1.x) return std::nullopt;
    double m = (p2.y - p1.y) / (p2.x - p1.x);
    double b = p1.y - m * p1.x;
    return Line{ m, b };
}
double pointLineDistance(const Line& line, const Point& p) {
    return std::abs(line.m * p.x - p.y + line.b) / std::sqrt(line.m * line.m + 1);
}
Line leastSquaresFit(const std::vector<Point>& points) {
    double n = static_cast<double>(points.size());
    double sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (auto& p : points) { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; }
    double denom = n * sxx - sx * sx;
    double m = (n * sxy - sx * sy) / denom;
    double b = (sy - m * sx) / n;
    return { m, b };
}

struct RansacResult { Line line; std::vector<Point> inliers; };

RansacResult ransacLine(const std::vector<Point>& points, int iterations, double threshold, std::mt19937& rng) {
    std::uniform_int_distribution<size_t> dist(0, points.size() - 1);
    std::vector<Point> bestInliers;
    for (int i = 0; i < iterations; i++) {
        size_t i1 = dist(rng), i2 = dist(rng);
        if (i1 == i2) continue;
        auto model = fitLine(points[i1], points[i2]);
        if (!model) continue;
        std::vector<Point> inliers;
        for (auto& p : points) if (pointLineDistance(*model, p) <= threshold) inliers.push_back(p);
        if (inliers.size() > bestInliers.size()) bestInliers = inliers;
    }
    return { leastSquaresFit(bestInliers), bestInliers };
}
```

```rust
use rand::Rng;

#[derive(Clone, Copy)]
struct Point { x: f64, y: f64 }
struct Line { m: f64, b: f64 }

fn fit_line(p1: Point, p2: Point) -> Option<Line> {
    if p2.x == p1.x {
        return None;
    }
    let m = (p2.y - p1.y) / (p2.x - p1.x);
    let b = p1.y - m * p1.x;
    Some(Line { m, b })
}
fn point_line_distance(line: &Line, p: Point) -> f64 {
    (line.m * p.x - p.y + line.b).abs() / (line.m * line.m + 1.0).sqrt()
}
fn least_squares_fit(points: &[Point]) -> Line {
    let n = points.len() as f64;
    let (mut sx, mut sy, mut sxx, mut sxy) = (0.0, 0.0, 0.0, 0.0);
    for p in points {
        sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y;
    }
    let denom = n * sxx - sx * sx;
    let m = (n * sxy - sx * sy) / denom;
    let b = (sy - m * sx) / n;
    Line { m, b }
}

fn ransac_line(points: &[Point], iterations: usize, threshold: f64, rng: &mut impl Rng) -> (Line, Vec<Point>) {
    let mut best_inliers: Vec<Point> = Vec::new();
    for _ in 0..iterations {
        let i1 = rng.gen_range(0..points.len());
        let mut i2 = rng.gen_range(0..points.len());
        while i2 == i1 {
            i2 = rng.gen_range(0..points.len());
        }
        let model = match fit_line(points[i1], points[i2]) {
            Some(l) => l,
            None => continue,
        };
        let inliers: Vec<Point> = points.iter().copied().filter(|&p| point_line_distance(&model, p) <= threshold).collect();
        if inliers.len() > best_inliers.len() {
            best_inliers = inliers;
        }
    }
    let line = least_squares_fit(&best_inliers);
    (line, best_inliers)
}
```

```csharp
static (double M, double B, List<(double X, double Y)> Inliers) RansacLine(
    List<(double X, double Y)> points, int iterations, double threshold, Random rng)
{
    (double M, double B)? FitLine((double X, double Y) p1, (double X, double Y) p2)
    {
        if (p2.X == p1.X) return null;
        double m = (p2.Y - p1.Y) / (p2.X - p1.X);
        double b = p1.Y - m * p1.X;
        return (m, b);
    }
    double PointLineDistance(double m, double b, (double X, double Y) p) =>
        Math.Abs(m * p.X - p.Y + b) / Math.Sqrt(m * m + 1);
    (double M, double B) LeastSquaresFit(List<(double X, double Y)> pts)
    {
        int n = pts.Count;
        double sx = pts.Sum(p => p.X), sy = pts.Sum(p => p.Y);
        double sxx = pts.Sum(p => p.X * p.X), sxy = pts.Sum(p => p.X * p.Y);
        double denom = n * sxx - sx * sx;
        double m = (n * sxy - sx * sy) / denom;
        double b = (sy - m * sx) / n;
        return (m, b);
    }

    var bestInliers = new List<(double, double)>();
    for (int i = 0; i < iterations; i++)
    {
        int i1 = rng.Next(points.Count);
        int i2 = rng.Next(points.Count);
        while (i2 == i1) i2 = rng.Next(points.Count);
        var model = FitLine(points[i1], points[i2]);
        if (model == null) continue;
        var (m, b) = model.Value;
        var inliers = points.Where(p => PointLineDistance(m, b, p) <= threshold).ToList();
        if (inliers.Count > bestInliers.Count) bestInliers = inliers;
    }
    var (fm, fb) = LeastSquaresFit(bestInliers);
    return (fm, fb, bestInliers);
}
```
