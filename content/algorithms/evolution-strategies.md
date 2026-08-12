---
name: 進化戦略(Evolution Strategies)
category: 最適化・確率的手法
subcategory: 進化的・確率的手法
complexity: O(λ・n)(1世代あたり、λは個体数、nは次元数)
summary: 各世代で正規分布からサンプリングした複数の候補解を評価し、成績上位の候補から次世代の分布の平均・広がりを更新することで、勾配情報なしに連続空間の最適化を進める、[遺伝的アルゴリズム](/algorithms/genetic-algorithm)と並ぶ進化計算の一分野。
---

## 概要

[遺伝的アルゴリズム](/algorithms/genetic-algorithm)が染色体の交叉・突然変異という生物学的なアナロジーで探索を進めるのに対し、進化戦略(ES)は1960年代にドイツで独立に発展した進化計算の一分野で、**連続値のパラメータ空間における数値最適化**により焦点を当てている。基本的な発想は、現在の探索の中心(平均)の周りに正規分布のノイズを加えた複数の候補解を生成し、実際に目的関数を評価して**成績の良かった候補ほど次世代の探索の中心に強く反映させる**というものである。勾配(目的関数の微分)を一切必要としないため、目的関数が微分不可能・ノイズが多い・ブラックボックスである(内部構造が分からない)場合でも適用できる汎用性が特徴で、発展形であるCMA-ES(共分散行列適応進化戦略)は、深層強化学習における方策探索の手法としても再評価されている。

## 仕組み

1. 探索の中心となる平均ベクトル`m`(パラメータの初期推定値)と、探索の広がりを表す標準偏差`σ`(またはより高度な実装では共分散行列)を初期化する
2. 各世代で、`m`を中心とした正規分布から`λ`個の候補解(個体)`x_i = m + σ・z_i`(`z_i`は標準正規分布からのサンプル)を生成する
3. 生成した`λ`個の候補解全てについて、目的関数の値を評価する(この評価は並列に行いやすく、勾配計算を必要としない)
4. 評価値が良かった上位`μ`個(`μ < λ`)の候補を選び、それらの**重み付き平均**を次世代の平均`m`として採用する(成績の良い候補ほど大きな重みを与える設計が一般的)
5. `σ`(探索の広がり)も、過去の成功率や、選ばれた候補の分散の情報を使って適応的に更新する(広がりすぎている場合は縮小し、局所的すぎる場合は拡大する)。CMA-ESでは、この適応をパラメータごとの共分散行列全体にまで拡張し、探索方向自体を問題の形状に合わせて回転・伸縮させる
6. 2〜5を、目的関数の値が収束するまで、または一定世代数に達するまで繰り返す

## 特性・トレードオフ

- **勾配不要のブラックボックス最適化**: 目的関数が微分不可能、ノイズが多い、シミュレーションの出力のように内部構造がブラックボックスである場合でも、関数の評価値さえ得られれば適用できる。この汎用性は、強化学習における方策のパラメータ探索(方策勾配法が使えない、または不安定な場合の代替)としての再評価につながっている
- **[遺伝的アルゴリズム](/algorithms/genetic-algorithm)との違い**: 遺伝的アルゴリズムが離散的な遺伝子表現と交叉操作を中心に据えるのに対し、進化戦略は連続値パラメータの正規分布サンプリングと選択に特化しており、実数値の最適化問題においてより直接的で効率的な探索を行う傾向がある
- **次元数の増加に伴う課題**: 共分散行列適応を伴うCMA-ESは高次元(パラメータ数が数千を超えるような深層学習のネットワーク全体)では、共分散行列の更新コストがパラメータ数の2乗に比例して増大するため、計算コストが課題になる。この点を改善した、対角共分散のみを扱う簡略版や、自然勾配法とのハイブリッドな手法も提案されている
- **使いどころ**: ロボット制御・強化学習における方策パラメータの最適化(OpenAIの研究でCMA-ESが深層強化学習の代替として注目された)、ハイパーパラメータ最適化、工学設計におけるシミュレーションベースの最適化(空力設計など、目的関数の評価にシミュレーションを要し勾配が得にくい場合)、[遺伝的アルゴリズム](/algorithms/genetic-algorithm)が不得手な連続値の精密な最適化

## 実装例

簡略化した(1+λ)進化戦略(1つの親から複数の子を生成し、最良の子を次世代の親にする単純な形)を示す。

```python
import random

def evolution_strategy(
    objective_fn: "Callable[[list[float]], float]", dim: int,
    initial_mean: list[float] | None = None, sigma: float = 1.0,
    lam: int = 10, generations: int = 100,
) -> list[float]:
    mean = initial_mean or [0.0] * dim

    for _ in range(generations):
        candidates = []
        for _ in range(lam):
            candidate = [mean[i] + sigma * random.gauss(0, 1) for i in range(dim)]
            candidates.append(candidate)

        scored = sorted(candidates, key=objective_fn)  # 最小化を仮定
        best = scored[0]

        if objective_fn(best) < objective_fn(mean):
            mean = best
        else:
            sigma *= 0.95  # 改善しなければ探索範囲を縮小する

    return mean
```

```typescript
function gaussianRandom(rand: () => number = Math.random): number {
  const u1 = rand(),
    u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function evolutionStrategy(
  objectiveFn: (x: number[]) => number,
  dim: number,
  initialMean: number[] | null = null,
  sigma = 1.0,
  lam = 10,
  generations = 100,
): number[] {
  let mean = initialMean ?? new Array(dim).fill(0);
  let currentSigma = sigma;

  for (let gen = 0; gen < generations; gen++) {
    const candidates: number[][] = [];
    for (let i = 0; i < lam; i++) {
      candidates.push(mean.map((m) => m + currentSigma * gaussianRandom()));
    }

    candidates.sort((a, b) => objectiveFn(a) - objectiveFn(b));
    const best = candidates[0];

    if (objectiveFn(best) < objectiveFn(mean)) {
      mean = best;
    } else {
      currentSigma *= 0.95;
    }
  }

  return mean;
}
```

```cpp
#include <vector>
#include <random>
#include <functional>
#include <algorithm>

std::vector<double> evolutionStrategy(
    std::function<double(const std::vector<double>&)> objectiveFn, int dim,
    std::vector<double> mean, double sigma = 1.0, int lam = 10, int generations = 100) {
    std::mt19937 rng(std::random_device{}());
    std::normal_distribution<double> gauss(0.0, 1.0);

    for (int gen = 0; gen < generations; gen++) {
        std::vector<std::vector<double>> candidates;
        for (int i = 0; i < lam; i++) {
            std::vector<double> candidate(dim);
            for (int d = 0; d < dim; d++) candidate[d] = mean[d] + sigma * gauss(rng);
            candidates.push_back(candidate);
        }

        std::sort(candidates.begin(), candidates.end(), [&](auto& a, auto& b) {
            return objectiveFn(a) < objectiveFn(b);
        });
        auto& best = candidates[0];

        if (objectiveFn(best) < objectiveFn(mean)) {
            mean = best;
        } else {
            sigma *= 0.95;
        }
    }

    return mean;
}
```

```rust
use rand_distr::{Distribution, Normal};
use rand::Rng;

fn evolution_strategy(
    objective_fn: impl Fn(&[f64]) -> f64, dim: usize,
    mut mean: Vec<f64>, mut sigma: f64, lam: usize, generations: usize, rng: &mut impl Rng,
) -> Vec<f64> {
    let normal = Normal::new(0.0, 1.0).unwrap();

    for _ in 0..generations {
        let mut candidates: Vec<Vec<f64>> = (0..lam)
            .map(|_| mean.iter().map(|&m| m + sigma * normal.sample(rng)).collect())
            .collect();

        candidates.sort_by(|a, b| objective_fn(a).partial_cmp(&objective_fn(b)).unwrap());
        let best = candidates[0].clone();

        if objective_fn(&best) < objective_fn(&mean) {
            mean = best;
        } else {
            sigma *= 0.95;
        }
    }

    mean
}
```

```csharp
static double GaussianRandom(Random rand)
{
    double u1 = 1.0 - rand.NextDouble(), u2 = rand.NextDouble();
    return Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Cos(2.0 * Math.PI * u2);
}

static double[] EvolutionStrategy(
    Func<double[], double> objectiveFn, int dim, double[] mean, double sigma = 1.0, int lam = 10, int generations = 100)
{
    var rand = new Random();

    for (int gen = 0; gen < generations; gen++)
    {
        var candidates = new List<double[]>();
        for (int i = 0; i < lam; i++)
        {
            var candidate = mean.Select(m => m + sigma * GaussianRandom(rand)).ToArray();
            candidates.Add(candidate);
        }

        candidates = candidates.OrderBy(objectiveFn).ToList();
        var best = candidates[0];

        if (objectiveFn(best) < objectiveFn(mean))
        {
            mean = best;
        }
        else
        {
            sigma *= 0.95;
        }
    }

    return mean;
}
```
