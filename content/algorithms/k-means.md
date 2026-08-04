---
name: k-means法
category: 機械学習
subcategory: 教師なし学習
complexity: O(nkdi)(反復i回)
summary: データ点を最も近い重心のクラスタに割り当て、重心を更新することを繰り返す、最も基本的なクラスタリング手法。
---

## 概要

ラベル(正解)のないデータの集合を、似た者同士のグループ(クラスタ)に自動的に分ける「クラスタリング」の、最も基本的で広く使われる手法。データをk個のグループに分けたいとき、各グループの「重心(平均的な位置)」を仮に置き、データをその重心に応じて振り分ける、という単純な反復操作で、意外なほど実用的なグループ分けが得られる。

## 仕組み

1. クラスタの数kを事前に決め、k個の重心をランダムな位置(あるいはデータ点からランダムに選んだ位置)に初期配置する
2. **割り当てステップ**: 各データ点を、最も近い重心のクラスタに割り当てる
3. **更新ステップ**: 各クラスタについて、そこに属するデータ点の平均位置を計算し、それを新しい重心とする
4. 重心の位置がほとんど変化しなくなるまで、2〜3を繰り返す

「割り当て」と「更新」を交互に行うことで、重心とクラスタの境界が徐々にデータの構造に馴染んでいき、最終的に安定した分割に収束する。

## 特性・トレードオフ

- **計算量**: O(nkdi)(n=データ数、k=クラスタ数、d=次元数、i=反復回数)。データ数に対してほぼ線形で、大規模データにも適用しやすい
- **kを事前に決める必要がある**: クラスタの数kは自分で指定しなければならず、「本当は何個のグループに分かれるべきか」がわからないことが多い実務では、エルボー法などでkの妥当性を検討する必要がある
- **初期値への敏感さ**: 初期の重心の位置によって最終的な結果が変わりうる(局所最適に陥る)ため、初期値を変えて複数回実行し、最も良い結果を採用するのが一般的
- **使いどころ**: 顧客セグメンテーション(似た購買傾向の顧客グループの発見)、画像の色数削減(ピクセルの色をk個の代表色にまとめる)、異常検知の前処理、レコメンデーションシステムにおけるユーザーのグループ化など

## 実装例

言語間で結果を完全に一致させるため、初期重心はランダムではなく固定値で与える。2つの明確に分離したクラスタが、既知の重心(0.5, 0.5)と(10.5, 10.5)に収束することを確認できる。

```python
import math

def dist2(a: tuple[float, ...], b: tuple[float, ...]) -> float:
    return sum((a[i] - b[i]) ** 2 for i in range(len(a)))

def kmeans(
    points: list[tuple[float, float]], initial_centroids: list[tuple[float, float]],
    max_iters: int = 100, tol: float = 1e-9,
) -> tuple[list[list[float]], list[int]]:
    centroids = [list(c) for c in initial_centroids]
    k = len(centroids)
    assignments = [0] * len(points)
    for _ in range(max_iters):
        changed = False
        for i, p in enumerate(points):
            best_j = min(range(k), key=lambda j: dist2(p, centroids[j]))
            if assignments[i] != best_j:
                assignments[i] = best_j
                changed = True
        new_centroids = []
        for j in range(k):
            members = [points[i] for i in range(len(points)) if assignments[i] == j]
            if members:
                dim = len(members[0])
                mean = [sum(m[d] for m in members) / len(members) for d in range(dim)]
            else:
                mean = centroids[j]
            new_centroids.append(mean)
        max_shift = max(math.sqrt(dist2(new_centroids[j], centroids[j])) for j in range(k))
        centroids = new_centroids
        if max_shift < tol and not changed:
            break
    return centroids, assignments
```

```typescript
type Point = number[];

function dist2(a: Point, b: Point): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return s;
}

function kmeans(
  points: Point[],
  initialCentroids: Point[],
  maxIters = 100,
  tol = 1e-9
): { centroids: Point[]; assignments: number[] } {
  let centroids = initialCentroids.map((c) => [...c]);
  const k = centroids.length;
  const assignments = new Array(points.length).fill(0);
  for (let iter = 0; iter < maxIters; iter++) {
    let changed = false;
    for (let i = 0; i < points.length; i++) {
      let bestJ = 0;
      let bestD = Infinity;
      for (let j = 0; j < k; j++) {
        const d = dist2(points[i], centroids[j]);
        if (d < bestD) {
          bestD = d;
          bestJ = j;
        }
      }
      if (assignments[i] !== bestJ) {
        assignments[i] = bestJ;
        changed = true;
      }
    }
    const newCentroids: Point[] = [];
    for (let j = 0; j < k; j++) {
      const members = points.filter((_, i) => assignments[i] === j);
      if (members.length > 0) {
        const dim = members[0].length;
        const mean = new Array(dim).fill(0);
        for (const m of members) for (let d = 0; d < dim; d++) mean[d] += m[d] / members.length;
        newCentroids.push(mean);
      } else {
        newCentroids.push(centroids[j]);
      }
    }
    const maxShift = Math.max(...newCentroids.map((c, j) => Math.sqrt(dist2(c, centroids[j]))));
    centroids = newCentroids;
    if (maxShift < tol && !changed) break;
  }
  return { centroids, assignments };
}
```

```cpp
#include <vector>
#include <cmath>
#include <limits>
#include <algorithm>

using Point = std::vector<double>;

double dist2(const Point& a, const Point& b) {
    double s = 0;
    for (size_t i = 0; i < a.size(); i++) s += (a[i] - b[i]) * (a[i] - b[i]);
    return s;
}

std::pair<std::vector<Point>, std::vector<int>> kmeans(
    const std::vector<Point>& points, const std::vector<Point>& initialCentroids,
    int maxIters = 100, double tol = 1e-9) {
    std::vector<Point> centroids = initialCentroids;
    int k = static_cast<int>(centroids.size());
    std::vector<int> assignments(points.size(), 0);
    for (int iter = 0; iter < maxIters; iter++) {
        bool changed = false;
        for (size_t i = 0; i < points.size(); i++) {
            int bestJ = 0;
            double bestD = std::numeric_limits<double>::infinity();
            for (int j = 0; j < k; j++) {
                double d = dist2(points[i], centroids[j]);
                if (d < bestD) { bestD = d; bestJ = j; }
            }
            if (assignments[i] != bestJ) { assignments[i] = bestJ; changed = true; }
        }
        std::vector<Point> newCentroids(k);
        for (int j = 0; j < k; j++) {
            std::vector<Point> members;
            for (size_t i = 0; i < points.size(); i++)
                if (assignments[i] == j) members.push_back(points[i]);
            if (!members.empty()) {
                size_t dim = members[0].size();
                Point mean(dim, 0.0);
                for (const auto& m : members)
                    for (size_t d = 0; d < dim; d++) mean[d] += m[d] / members.size();
                newCentroids[j] = mean;
            } else {
                newCentroids[j] = centroids[j];
            }
        }
        double maxShift = 0;
        for (int j = 0; j < k; j++) maxShift = std::max(maxShift, std::sqrt(dist2(newCentroids[j], centroids[j])));
        centroids = newCentroids;
        if (maxShift < tol && !changed) break;
    }
    return {centroids, assignments};
}
```

```rust
fn dist2(a: &[f64], b: &[f64]) -> f64 {
    a.iter().zip(b.iter()).map(|(x, y)| (x - y).powi(2)).sum()
}

fn kmeans(
    points: &[Vec<f64>], initial_centroids: &[Vec<f64>], max_iters: usize, tol: f64,
) -> (Vec<Vec<f64>>, Vec<usize>) {
    let mut centroids: Vec<Vec<f64>> = initial_centroids.to_vec();
    let k = centroids.len();
    let mut assignments = vec![0usize; points.len()];
    for _ in 0..max_iters {
        let mut changed = false;
        for (i, p) in points.iter().enumerate() {
            let mut best_j = 0;
            let mut best_d = f64::INFINITY;
            for j in 0..k {
                let d = dist2(p, &centroids[j]);
                if d < best_d {
                    best_d = d;
                    best_j = j;
                }
            }
            if assignments[i] != best_j {
                assignments[i] = best_j;
                changed = true;
            }
        }
        let mut new_centroids = Vec::with_capacity(k);
        for j in 0..k {
            let members: Vec<&Vec<f64>> = points.iter().enumerate()
                .filter(|(i, _)| assignments[*i] == j)
                .map(|(_, p)| p)
                .collect();
            if !members.is_empty() {
                let dim = members[0].len();
                let mut mean = vec![0.0; dim];
                for m in &members {
                    for d in 0..dim {
                        mean[d] += m[d] / members.len() as f64;
                    }
                }
                new_centroids.push(mean);
            } else {
                new_centroids.push(centroids[j].clone());
            }
        }
        let max_shift = (0..k)
            .map(|j| dist2(&new_centroids[j], &centroids[j]).sqrt())
            .fold(0.0, f64::max);
        centroids = new_centroids;
        if max_shift < tol && !changed {
            break;
        }
    }
    (centroids, assignments)
}
```

```csharp
static double Dist2(double[] a, double[] b)
{
    double s = 0;
    for (int i = 0; i < a.Length; i++) s += Math.Pow(a[i] - b[i], 2);
    return s;
}

static (List<double[]> centroids, List<int> assignments) KMeans(
    List<double[]> points, List<double[]> initialCentroids, int maxIters = 100, double tol = 1e-9)
{
    var centroids = initialCentroids.Select(c => (double[])c.Clone()).ToList();
    int k = centroids.Count;
    var assignments = new int[points.Count];
    for (int iter = 0; iter < maxIters; iter++)
    {
        bool changed = false;
        for (int i = 0; i < points.Count; i++)
        {
            int bestJ = 0;
            double bestD = double.PositiveInfinity;
            for (int j = 0; j < k; j++)
            {
                double d = Dist2(points[i], centroids[j]);
                if (d < bestD) { bestD = d; bestJ = j; }
            }
            if (assignments[i] != bestJ) { assignments[i] = bestJ; changed = true; }
        }
        var newCentroids = new List<double[]>();
        for (int j = 0; j < k; j++)
        {
            var members = points.Where((p, i) => assignments[i] == j).ToList();
            if (members.Count > 0)
            {
                int dim = members[0].Length;
                var mean = new double[dim];
                foreach (var m in members) for (int d = 0; d < dim; d++) mean[d] += m[d] / members.Count;
                newCentroids.Add(mean);
            }
            else newCentroids.Add(centroids[j]);
        }
        double maxShift = 0;
        for (int j = 0; j < k; j++) maxShift = Math.Max(maxShift, Math.Sqrt(Dist2(newCentroids[j], centroids[j])));
        centroids = newCentroids;
        if (maxShift < tol && !changed) break;
    }
    return (centroids, assignments.ToList());
}
```
