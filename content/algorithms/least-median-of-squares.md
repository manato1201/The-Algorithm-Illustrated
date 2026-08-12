---
name: 最小メディアン二乗法(LMedS)
category: コンピュータビジョン
subcategory: ロバスト推定
complexity: O(候補モデル数 × n log n)(nはデータ点数、中央値計算のソートに依存)
summary: 「残差の二乗和」ではなく「残差の二乗の中央値」を最小化するという評価基準に切り替えるだけで、外れ値がデータの半分未満である限り、外れ値の大きさに関わらず頑健にモデルを推定できる。
---

## 概要

通常の最小二乗法は残差の二乗の**合計(平均)**を最小化するため、たった1つの極端な外れ値でもその二乗が結果を大きく歪めてしまう。[M推定](/algorithms/m-estimator)は損失関数を工夫して外れ値の影響を抑えたが、最小メディアン二乗法(LMedS)はさらに大胆な発想の転換を行う——**残差の二乗の「平均」ではなく「中央値(メディアン)」を最小化する**。中央値は、データの半分未満がどれだけ極端な値を取っても変化しないという統計的な性質(高いブレークダウンポイント)を持つため、この基準でモデルを選ぶと、外れ値がデータ全体の50%未満である限り、外れ値がどれだけ極端であっても正しいモデルへの当てはまりが揺るがない。1984年にピーター・ラウゼーウとロイ・ルロイが提案し、[RANSAC](/algorithms/ransac)と並ぶ、コンピュータビジョンにおける代表的な頑健推定法の一つになっている。

## 仕組み

1. データ点の中からランダムに、モデルを一意に決めるのに必要な最小限の部分集合(例えば直線フィッティングなら2点)を選ぶ
2. 選んだ部分集合からモデル(直線、ホモグラフィ行列など)のパラメータを計算する
3. そのモデルを使って、**全てのデータ点**の残差(モデルとの誤差)を計算し、残差の二乗の**中央値**を求める。これがこの候補モデルの「評価スコア」になる
4. 1〜3を、十分な回数(候補となるモデルの多様性を確保できる回数)繰り返し、多数の候補モデルとそれぞれの中央値スコアを得る
5. **中央値スコアが最小**だった候補モデルを、最終的なロバスト推定の結果として採用する
6. 採用したモデルの残差を使って、正常値(インライア)と外れ値を判別する閾値を統計的に推定し、インライアだけを使って通常の最小二乗法で最終的なパラメータを精密化する、という後処理を行うこともある

## 特性・トレードオフ

- **外れ値の大きさに影響されない頑健性**: 中央値という統計量は、データの半分未満がどれだけ極端であっても変化しないため、LMedSは「外れ値がどれだけひどいか」に依存しない頑健性を持つ。これは[M推定](/algorithms/m-estimator)の損失関数ベースのアプローチが持つ「損失関数の設計次第で頑健性の強さが変わる」という性質とは異なる、統計学的に明確な保証である
- **外れ値の割合が50%を超えると破綻する**: 中央値の頑健性は「データの半分未満が外れ値である」という前提に依存しており、外れ値がデータの半分以上を占めると、正しくないモデルが選ばれてしまう。[RANSAC](/algorithms/ransac)も同様に「インライアの割合」を前提とするが、LMedSはインライア率を事前に知らなくても機能するという利点がある(RANSACは反復回数の設定にインライア率の見積もりが必要)
- **[RANSAC](/algorithms/ransac)との比較**: RANSACは「一定の誤差閾値内に収まる点の数」を評価基準にするのに対し、LMedSは「残差の中央値」を評価基準にする。RANSACは誤差の閾値をユーザーが設定する必要があるが、LMedSはこの閾値設定が不要という利点を持つ一方、中央値の計算(ソート)のコストがRANSACの単純なカウントより若干高くなる
- **使いどころ**: [RANSAC](/algorithms/ransac)と同様のカメラキャリブレーション・[SIFT](/algorithms/sift)特徴点マッチングにおける外れ値除去、誤差閾値を事前に決めにくい状況でのロバストなモデルフィッティング、統計学における頑健回帰分析

## 実装例

直線フィッティング`y = ax + b`を例に、LMedSによるロバスト推定を示す。

```python
import random

def fit_line_from_2_points(p1: tuple[float, float], p2: tuple[float, float]) -> tuple[float, float] | None:
    (x1, y1), (x2, y2) = p1, p2
    if x2 == x1:
        return None
    a = (y2 - y1) / (x2 - x1)
    b = y1 - a * x1
    return a, b

def median(values: list[float]) -> float:
    sorted_v = sorted(values)
    n = len(sorted_v)
    mid = n // 2
    return sorted_v[mid] if n % 2 == 1 else (sorted_v[mid - 1] + sorted_v[mid]) / 2

def lmeds_line_fit(points: list[tuple[float, float]], n_trials: int = 500) -> tuple[float, float]:
    best_model, best_score = None, float("inf")

    for _ in range(n_trials):
        p1, p2 = random.sample(points, 2)
        model = fit_line_from_2_points(p1, p2)
        if model is None:
            continue
        a, b = model
        squared_residuals = [(y - (a * x + b)) ** 2 for x, y in points]
        score = median(squared_residuals)
        if score < best_score:
            best_score, best_model = score, model

    return best_model
```

```typescript
type Point = [number, number];

function fitLineFrom2Points(p1: Point, p2: Point): [number, number] | null {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  if (x2 === x1) return null;
  const a = (y2 - y1) / (x2 - x1);
  const b = y1 - a * x1;
  return [a, b];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function lmedsLineFit(
  points: Point[],
  nTrials = 500,
  rand: () => number = Math.random,
): [number, number] {
  let bestModel: [number, number] | null = null;
  let bestScore = Infinity;

  for (let t = 0; t < nTrials; t++) {
    const i = Math.floor(rand() * points.length);
    let j = Math.floor(rand() * points.length);
    while (j === i) j = Math.floor(rand() * points.length);
    const model = fitLineFrom2Points(points[i], points[j]);
    if (model === null) continue;
    const [a, b] = model;
    const squaredResiduals = points.map(([x, y]) => (y - (a * x + b)) ** 2);
    const score = median(squaredResiduals);
    if (score < bestScore) {
      bestScore = score;
      bestModel = model;
    }
  }

  return bestModel!;
}
```

```cpp
#include <vector>
#include <utility>
#include <algorithm>
#include <random>
#include <limits>
#include <optional>

using Point = std::pair<double, double>;

std::optional<std::pair<double, double>> fitLineFrom2Points(Point p1, Point p2) {
    if (p2.first == p1.first) return std::nullopt;
    double a = (p2.second - p1.second) / (p2.first - p1.first);
    double b = p1.second - a * p1.first;
    return std::make_pair(a, b);
}

double median(std::vector<double> values) {
    std::sort(values.begin(), values.end());
    size_t n = values.size();
    size_t mid = n / 2;
    return (n % 2 == 1) ? values[mid] : (values[mid - 1] + values[mid]) / 2.0;
}

std::pair<double, double> lmedsLineFit(const std::vector<Point>& points, int nTrials = 500) {
    std::mt19937 rng(std::random_device{}());
    std::uniform_int_distribution<size_t> dist(0, points.size() - 1);

    std::pair<double, double> bestModel;
    double bestScore = std::numeric_limits<double>::infinity();

    for (int t = 0; t < nTrials; t++) {
        size_t i = dist(rng), j = dist(rng);
        if (i == j) continue;
        auto model = fitLineFrom2Points(points[i], points[j]);
        if (!model) continue;
        auto [a, b] = *model;
        std::vector<double> squaredResiduals;
        for (auto& [x, y] : points) squaredResiduals.push_back((y - (a * x + b)) * (y - (a * x + b)));
        double score = median(squaredResiduals);
        if (score < bestScore) { bestScore = score; bestModel = *model; }
    }

    return bestModel;
}
```

```rust
fn fit_line_from_2_points(p1: (f64, f64), p2: (f64, f64)) -> Option<(f64, f64)> {
    if p2.0 == p1.0 {
        return None;
    }
    let a = (p2.1 - p1.1) / (p2.0 - p1.0);
    let b = p1.1 - a * p1.0;
    Some((a, b))
}

fn median(mut values: Vec<f64>) -> f64 {
    values.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let n = values.len();
    let mid = n / 2;
    if n % 2 == 1 { values[mid] } else { (values[mid - 1] + values[mid]) / 2.0 }
}

fn lmeds_line_fit(points: &[(f64, f64)], n_trials: usize, rand_idx: impl Fn() -> usize) -> (f64, f64) {
    let mut best_model = (0.0, 0.0);
    let mut best_score = f64::INFINITY;

    for _ in 0..n_trials {
        let i = rand_idx() % points.len();
        let mut j = rand_idx() % points.len();
        while j == i {
            j = rand_idx() % points.len();
        }
        if let Some((a, b)) = fit_line_from_2_points(points[i], points[j]) {
            let squared_residuals: Vec<f64> = points.iter().map(|&(x, y)| (y - (a * x + b)).powi(2)).collect();
            let score = median(squared_residuals);
            if score < best_score {
                best_score = score;
                best_model = (a, b);
            }
        }
    }

    best_model
}
```

```csharp
static (double a, double b)? FitLineFrom2Points((double x, double y) p1, (double x, double y) p2)
{
    if (p2.x == p1.x) return null;
    double a = (p2.y - p1.y) / (p2.x - p1.x);
    double b = p1.y - a * p1.x;
    return (a, b);
}

static double Median(List<double> values)
{
    var sorted = values.OrderBy(v => v).ToList();
    int n = sorted.Count;
    int mid = n / 2;
    return n % 2 == 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2.0;
}

static (double a, double b) LmedsLineFit(List<(double x, double y)> points, int nTrials = 500)
{
    var rand = new Random();
    (double, double) bestModel = (0, 0);
    double bestScore = double.PositiveInfinity;

    for (int t = 0; t < nTrials; t++)
    {
        int i = rand.Next(points.Count), j = rand.Next(points.Count);
        if (i == j) continue;
        var model = FitLineFrom2Points(points[i], points[j]);
        if (model == null) continue;
        var (a, b) = model.Value;
        var squaredResiduals = points.Select(p => Math.Pow(p.y - (a * p.x + b), 2)).ToList();
        double score = Median(squaredResiduals);
        if (score < bestScore) { bestScore = score; bestModel = model.Value; }
    }

    return bestModel;
}
```
