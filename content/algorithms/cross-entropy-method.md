---
name: 交差エントロピー法(Cross-Entropy Method)
category: 最適化・確率的手法
subcategory: 進化的・確率的手法
complexity: O(N・n)(1反復あたり、Nはサンプル数、nは次元数)
summary: サンプリング分布から候補解を生成し、成績上位のエリート集団だけを使って分布のパラメータ(平均・分散)を再推定するという単純な反復だけで、[進化戦略](/algorithms/evolution-strategies)と同様に勾配なしで確率分布を最適解の周りに集束させていく。
---

## 概要

[進化戦略](/algorithms/evolution-strategies)が正規分布のパラメータを世代ごとに更新しながら探索を進めるのに対し、交差エントロピー法(CEM)は、統計学における重要度サンプリングの理論から派生した、よりシンプルで統一的な枠組みを持つ確率的最適化手法である。基本的な考え方は、「探索に使う確率分布を、その分布からサンプリングした点の中で**成績の良かった上位グループ(エリート)** の分布に近づけていく」という反復にある——これは情報理論における2つの確率分布の近さを測る**交差エントロピー(KLダイバージェンスに関連する量)を最小化する**という操作に相当することが示せるため、この名前が付いている。実装のシンプルさから、強化学習の方策探索、組合せ最適化、金融工学のリスク推定など幅広い分野で使われている。

## 仕組み

1. サンプリングに使う確率分布のパラメータ(連続空間の場合、典型的には正規分布の平均`μ`と標準偏差`σ`)を初期化する
2. 現在の分布から`N`個の候補解をサンプリングする
3. 全ての候補解について目的関数を評価する
4. 評価値が上位`ρ`%(典型的には上位10〜20%)の候補を**エリート集団**として選び出す
5. エリート集団**だけ**を使って、次の分布のパラメータを再推定する——正規分布の場合、エリート集団の標本平均を新しい`μ`に、標本標準偏差を新しい`σ`にする、という最尤推定に相当する単純な計算になる
6. 2〜5を、分布の広がり`σ`が十分小さくなる(分布がほぼ1点に収束する)まで、または一定の反復回数繰り返す

## 特性・トレードオフ

- **驚くほどシンプルな更新規則**: [進化戦略](/algorithms/evolution-strategies)が成績に応じた重み付き平均や適応的なステップサイズ調整のような工夫を持つのに対し、CEMの基本形は「エリート集団の標本平均・標本分散を計算するだけ」という統計学の基本操作の繰り返しであり、実装が非常に単純である
- **早すぎる収束(局所最適への収束)のリスク**: エリート集団だけを使う単純な更新は、探索の初期段階でたまたま良かった狭い領域に分布が急速に集中してしまい、真の最適解を見逃す(局所最適に収束する)ことがある。エリートの割合`ρ`やサンプル数`N`の調整、ノイズの追加といった工夫で緩和されることが多い
- **[進化戦略](/algorithms/evolution-strategies)・[遺伝的アルゴリズム](/algorithms/genetic-algorithm)との位置づけ**: これら3つの手法はいずれも「集団(サンプル群)を使った確率的探索」という共通点を持つが、CEMは統計的推定(最尤推定)という明確な理論的基盤を持つ点で際立っている。連続最適化、離散的な組合せ最適化(TSPのような問題にも、経路をエンコードする確率分布を工夫することで適用できる)の両方に適用しやすい汎用性も特徴である
- **使いどころ**: 強化学習における方策パラメータの直接探索(モデル予測制御の行動系列最適化などにも使われる)、まれな事象の確率推定(重要度サンプリングとしての本来の用途、金融リスク管理における極端な損失シナリオの確率推定)、組合せ最適化問題(巡回セールスマン問題、ネットワーク信頼性最適化)、ロボティクスにおける軌道最適化

## 実装例

```python
import random
import statistics

def cross_entropy_method(
    objective_fn: "Callable[[list[float]], float]", dim: int,
    initial_mean: list[float] | None = None, initial_std: float = 1.0,
    n_samples: int = 100, elite_frac: float = 0.2, iterations: int = 50,
) -> list[float]:
    mean = initial_mean or [0.0] * dim
    std = [initial_std] * dim
    n_elite = max(1, int(n_samples * elite_frac))

    for _ in range(iterations):
        samples = [[random.gauss(mean[d], std[d]) for d in range(dim)] for _ in range(n_samples)]
        scored = sorted(samples, key=objective_fn)  # 最小化を仮定
        elites = scored[:n_elite]

        mean = [statistics.mean(e[d] for e in elites) for d in range(dim)]
        std = [statistics.pstdev([e[d] for e in elites]) or 1e-6 for d in range(dim)]

    return mean
```

```typescript
function gaussianRandom(
  mean: number,
  std: number,
  rand: () => number = Math.random,
): number {
  const u1 = rand(),
    u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

function crossEntropyMethod(
  objectiveFn: (x: number[]) => number,
  dim: number,
  initialMean: number[] | null = null,
  initialStd = 1.0,
  nSamples = 100,
  eliteFrac = 0.2,
  iterations = 50,
): number[] {
  let mean = initialMean ?? new Array(dim).fill(0);
  let std = new Array(dim).fill(initialStd);
  const nElite = Math.max(1, Math.floor(nSamples * eliteFrac));

  for (let iter = 0; iter < iterations; iter++) {
    const samples = Array.from({ length: nSamples }, () =>
      mean.map((m, d) => gaussianRandom(m, std[d])),
    );
    samples.sort((a, b) => objectiveFn(a) - objectiveFn(b));
    const elites = samples.slice(0, nElite);

    mean = mean.map((_, d) => elites.reduce((s, e) => s + e[d], 0) / nElite);
    std = std.map((_, d) => {
      const variance =
        elites.reduce((s, e) => s + (e[d] - mean[d]) ** 2, 0) / nElite;
      return Math.sqrt(variance) || 1e-6;
    });
  }

  return mean;
}
```

```cpp
#include <vector>
#include <random>
#include <algorithm>
#include <functional>
#include <cmath>

std::vector<double> crossEntropyMethod(
    std::function<double(const std::vector<double>&)> objectiveFn, int dim,
    std::vector<double> mean, double initialStd, int nSamples, double eliteFrac, int iterations) {
    std::vector<double> std_(dim, initialStd);
    int nElite = std::max(1, static_cast<int>(nSamples * eliteFrac));
    std::mt19937 rng(std::random_device{}());

    for (int iter = 0; iter < iterations; iter++) {
        std::vector<std::vector<double>> samples(nSamples, std::vector<double>(dim));
        for (int i = 0; i < nSamples; i++) {
            for (int d = 0; d < dim; d++) {
                std::normal_distribution<double> dist(mean[d], std_[d]);
                samples[i][d] = dist(rng);
            }
        }

        std::sort(samples.begin(), samples.end(), [&](auto& a, auto& b) {
            return objectiveFn(a) < objectiveFn(b);
        });

        for (int d = 0; d < dim; d++) {
            double sum = 0.0;
            for (int i = 0; i < nElite; i++) sum += samples[i][d];
            mean[d] = sum / nElite;

            double variance = 0.0;
            for (int i = 0; i < nElite; i++) variance += (samples[i][d] - mean[d]) * (samples[i][d] - mean[d]);
            std_[d] = std::max(std::sqrt(variance / nElite), 1e-6);
        }
    }

    return mean;
}
```

```rust
use rand_distr::{Distribution, Normal};
use rand::Rng;

fn cross_entropy_method(
    objective_fn: impl Fn(&[f64]) -> f64, dim: usize,
    mut mean: Vec<f64>, initial_std: f64, n_samples: usize, elite_frac: f64, iterations: usize,
    rng: &mut impl Rng,
) -> Vec<f64> {
    let mut std_dev = vec![initial_std; dim];
    let n_elite = ((n_samples as f64 * elite_frac) as usize).max(1);

    for _ in 0..iterations {
        let mut samples: Vec<Vec<f64>> = (0..n_samples)
            .map(|_| {
                (0..dim)
                    .map(|d| Normal::new(mean[d], std_dev[d]).unwrap().sample(rng))
                    .collect()
            })
            .collect();

        samples.sort_by(|a, b| objective_fn(a).partial_cmp(&objective_fn(b)).unwrap());
        let elites = &samples[..n_elite];

        for d in 0..dim {
            let m: f64 = elites.iter().map(|e| e[d]).sum::<f64>() / n_elite as f64;
            mean[d] = m;
            let var: f64 = elites.iter().map(|e| (e[d] - m).powi(2)).sum::<f64>() / n_elite as f64;
            std_dev[d] = var.sqrt().max(1e-6);
        }
    }

    mean
}
```

```csharp
static double GaussianRandom(double mean, double std, Random rand)
{
    double u1 = 1.0 - rand.NextDouble(), u2 = rand.NextDouble();
    return mean + std * Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Cos(2.0 * Math.PI * u2);
}

static double[] CrossEntropyMethod(
    Func<double[], double> objectiveFn, int dim, double[] mean, double initialStd,
    int nSamples = 100, double eliteFrac = 0.2, int iterations = 50)
{
    var rand = new Random();
    var std = Enumerable.Repeat(initialStd, dim).ToArray();
    int nElite = Math.Max(1, (int)(nSamples * eliteFrac));

    for (int iter = 0; iter < iterations; iter++)
    {
        var samples = new List<double[]>();
        for (int i = 0; i < nSamples; i++)
        {
            var sample = new double[dim];
            for (int d = 0; d < dim; d++) sample[d] = GaussianRandom(mean[d], std[d], rand);
            samples.Add(sample);
        }

        samples = samples.OrderBy(objectiveFn).ToList();
        var elites = samples.Take(nElite).ToList();

        for (int d = 0; d < dim; d++)
        {
            mean[d] = elites.Average(e => e[d]);
            double variance = elites.Average(e => Math.Pow(e[d] - mean[d], 2));
            std[d] = Math.Max(Math.Sqrt(variance), 1e-6);
        }
    }

    return mean;
}
```
