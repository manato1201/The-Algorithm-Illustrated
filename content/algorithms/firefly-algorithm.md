---
name: ホタルアルゴリズム(Firefly Algorithm)
category: シミュレーション・群知能
subcategory: 群知能最適化
complexity: O(g×n²×d)(gは世代数、nはホタルの数、dは次元数)
summary: ホタルが発する光の明るさに引き寄せられて他のホタルへ近づいていくという求愛行動を模倣し、「より明るい(良い解を持つ)ホタルほど、より暗いホタルを引き寄せる」という非対称な引力関係を全個体ペアに適用する群知能最適化アルゴリズム。
---

## 概要

[粒子群最適化](/algorithms/particle-swarm-optimization)は「群れ全体のこれまでの最良解」という単一の目標に全個体が引き寄せられるのに対し、2008年にシン・シェ・ヤン(Yang)が発表したホタルアルゴリズムは、ホタルの発光による求愛行動から着想を得た、より局所的な相互作用に基づく最適化手法である——実際のホタルは、より明るく光る個体ほど魅力的とみなされ、暗い個体がより明るい個体へ引き寄せられる。このアルゴリズムはこの関係を「明るさ=目的関数の良さ」「引力=距離とともに減衰する」という2つの規則として定式化し、全てのホタルのペアについて「より暗い方がより明るい方へ近づく」という更新を繰り返すことで、複数の有望な領域(多峰性関数の複数の山)を同時に探索できる。

## 仕組み

1. `n`匹のホタル(候補解)をランダムに初期化する。各ホタルの「明るさ」は、その位置における目的関数の評価値(最大化問題なら評価値そのもの)として定義する
2. 全てのホタルのペア`(i, j)`について、ホタル`j`の方がホタル`i`より明るい(良い解を持つ)場合、ホタル`i`はホタル`j`の方向へ引き寄せられる
3. 引力の強さは2点間の距離とともに指数関数的に減衰するよう設計する(`β = β₀ × e^(-γr²)`、`r`は2点間の距離、`γ`は光の吸収係数に相当するパラメータ)——これにより近くの明るいホタルには強く引き寄せられ、遠くの明るいホタルにはあまり影響されない、という現実の光の減衰に似た振る舞いになる
4. 各ホタル`i`の新しい位置を、引力による移動量とランダムなゆらぎ(局所探索のための小さなランダム項)を加えて更新する
5. 全ホタルの明るさ(目的関数値)を再評価し、手順2〜4を世代数の上限に達するか収束するまで繰り返す。最も明るいホタルの位置が最良解になる

## 特性・トレードオフ

- **計算量**: 各世代で全ホタルペア`n²`組について引力を計算するため`O(g×n²×d)`——[粒子群最適化](/algorithms/particle-swarm-optimization)や[差分進化](/algorithms/differential-evolution)の`O(g×n×d)`よりペア数の分だけ計算コストが高くなる
- **距離減衰による局所的なクラスタ形成という特徴**: 引力が距離とともに急速に減衰するよう設計されているため、集団が複数の局所的な明るい領域(多峰性関数の複数の山)の周りにそれぞれクラスタを形成しやすい——[粒子群最適化](/algorithms/particle-swarm-optimization)が単一の「群れ全体の最良解」に収束しやすいのと対照的に、複数の良い解を並行して発見しやすい性質を持つとされる
- **吸収係数γのチューニングが結果を左右する**: `γ`が大きいと引力の届く範囲が狭くなり、局所的なクラスタ化が強まる一方で大域的な情報共有が弱まる。`γ`が小さいと[粒子群最適化](/algorithms/particle-swarm-optimization)に近い、より大域的に協調する挙動になる——問題の性質に応じたパラメータ調整が性能を大きく左右する
- **使いどころ**: 多峰性(複数の局所最適を持つ)連続最適化問題、画像処理におけるパラメータ最適化、無線センサーネットワークの配置最適化、[粒子群最適化](/algorithms/particle-swarm-optimization)・[人工蜂コロニーアルゴリズム](/algorithms/artificial-bee-colony)と並ぶ、多様な群知能最適化アルゴリズムの選択肢の一つ

## 実装例

2次元の球面関数(最小値は原点で0)を最小化する例。20匹のホタルで60世代回すと、最小値0近くまで収束する。

```python
import math
import random


def sphere(pos: list[float]) -> float:
    return sum(p * p for p in pos)


def firefly_algorithm(
    objective, dim: int, n_fireflies: int, generations: int,
    bounds: tuple[float, float], beta0: float = 1.0, gamma: float = 1.0, alpha: float = 0.2,
    rng: random.Random = random,
) -> tuple[list[float], float]:
    lo, hi = bounds
    fireflies = [[rng.uniform(lo, hi) for _ in range(dim)] for _ in range(n_fireflies)]
    brightness = [-objective(f) for f in fireflies]  # 明るさ = 目的関数の良さ(最小化なので符号反転)

    for _ in range(generations):
        for i in range(n_fireflies):
            for j in range(n_fireflies):
                if brightness[j] <= brightness[i]:
                    continue
                r2 = sum((fireflies[i][d] - fireflies[j][d]) ** 2 for d in range(dim))
                beta = beta0 * math.exp(-gamma * r2)  # 距離とともに減衰する引力
                for d in range(dim):
                    rand_term = alpha * (rng.random() - 0.5)
                    fireflies[i][d] += beta * (fireflies[j][d] - fireflies[i][d]) + rand_term
                    fireflies[i][d] = max(lo, min(hi, fireflies[i][d]))
                brightness[i] = -objective(fireflies[i])
        alpha *= 0.97  # ランダム項を世代とともに縮小

    best_idx = max(range(n_fireflies), key=lambda i: brightness[i])
    return fireflies[best_idx], objective(fireflies[best_idx])
```

```typescript
function sphere(pos: number[]): number {
  return pos.reduce((s, p) => s + p * p, 0);
}

function fireflyAlgorithm(
  objective: (pos: number[]) => number,
  dim: number,
  nFireflies: number,
  generations: number,
  bounds: [number, number],
  rng: () => number,
  beta0 = 1.0,
  gamma = 1.0,
  alpha0 = 0.2
): [number[], number] {
  const [lo, hi] = bounds;
  let alpha = alpha0;
  const fireflies: number[][] = Array.from({ length: nFireflies }, () =>
    Array.from({ length: dim }, () => lo + rng() * (hi - lo))
  );
  const brightness = fireflies.map((f) => -objective(f));

  for (let g = 0; g < generations; g++) {
    for (let i = 0; i < nFireflies; i++) {
      for (let j = 0; j < nFireflies; j++) {
        if (brightness[j] <= brightness[i]) continue;
        let r2 = 0;
        for (let d = 0; d < dim; d++) r2 += (fireflies[i][d] - fireflies[j][d]) ** 2;
        const beta = beta0 * Math.exp(-gamma * r2);
        for (let d = 0; d < dim; d++) {
          const randTerm = alpha * (rng() - 0.5);
          fireflies[i][d] += beta * (fireflies[j][d] - fireflies[i][d]) + randTerm;
          fireflies[i][d] = Math.max(lo, Math.min(hi, fireflies[i][d]));
        }
        brightness[i] = -objective(fireflies[i]);
      }
    }
    alpha *= 0.97;
  }

  let bestIdx = 0;
  for (let i = 1; i < nFireflies; i++) if (brightness[i] > brightness[bestIdx]) bestIdx = i;
  return [fireflies[bestIdx], objective(fireflies[bestIdx])];
}
```

```cpp
#include <vector>
#include <cmath>
#include <random>
#include <functional>
#include <algorithm>

std::pair<std::vector<double>, double> fireflyAlgorithm(
    const std::function<double(const std::vector<double>&)>& objective,
    int dim, int nFireflies, int generations,
    double lo, double hi, std::mt19937& rng,
    double beta0 = 1.0, double gamma = 1.0, double alpha0 = 0.2) {

    std::uniform_real_distribution<double> posDist(lo, hi);
    std::uniform_real_distribution<double> randDist(0.0, 1.0);
    double alpha = alpha0;

    std::vector<std::vector<double>> fireflies(nFireflies, std::vector<double>(dim));
    for (auto& f : fireflies)
        for (auto& v : f) v = posDist(rng);

    std::vector<double> brightness(nFireflies);
    for (int i = 0; i < nFireflies; i++) brightness[i] = -objective(fireflies[i]);

    for (int g = 0; g < generations; g++) {
        for (int i = 0; i < nFireflies; i++) {
            for (int j = 0; j < nFireflies; j++) {
                if (brightness[j] <= brightness[i]) continue;
                double r2 = 0;
                for (int d = 0; d < dim; d++) {
                    double diff = fireflies[i][d] - fireflies[j][d];
                    r2 += diff * diff;
                }
                double beta = beta0 * std::exp(-gamma * r2);
                for (int d = 0; d < dim; d++) {
                    double randTerm = alpha * (randDist(rng) - 0.5);
                    fireflies[i][d] += beta * (fireflies[j][d] - fireflies[i][d]) + randTerm;
                    fireflies[i][d] = std::max(lo, std::min(hi, fireflies[i][d]));
                }
                brightness[i] = -objective(fireflies[i]);
            }
        }
        alpha *= 0.97;
    }

    int bestIdx = 0;
    for (int i = 1; i < nFireflies; i++)
        if (brightness[i] > brightness[bestIdx]) bestIdx = i;
    return {fireflies[bestIdx], objective(fireflies[bestIdx])};
}
```

```rust
fn firefly_algorithm(
    objective: impl Fn(&[f64]) -> f64,
    dim: usize,
    n_fireflies: usize,
    generations: usize,
    lo: f64,
    hi: f64,
    rng: &mut impl FnMut() -> f64, // [0, 1) の一様乱数を返すクロージャ
    beta0: f64,
    gamma: f64,
    alpha0: f64,
) -> (Vec<f64>, f64) {
    let mut alpha = alpha0;
    let mut fireflies: Vec<Vec<f64>> = (0..n_fireflies)
        .map(|_| (0..dim).map(|_| lo + rng() * (hi - lo)).collect())
        .collect();
    let mut brightness: Vec<f64> = fireflies.iter().map(|f| -objective(f)).collect();

    for _ in 0..generations {
        for i in 0..n_fireflies {
            for j in 0..n_fireflies {
                if brightness[j] <= brightness[i] {
                    continue;
                }
                let r2: f64 = (0..dim).map(|d| (fireflies[i][d] - fireflies[j][d]).powi(2)).sum();
                let beta = beta0 * (-gamma * r2).exp();
                for d in 0..dim {
                    let rand_term = alpha * (rng() - 0.5);
                    fireflies[i][d] += beta * (fireflies[j][d] - fireflies[i][d]) + rand_term;
                    fireflies[i][d] = fireflies[i][d].max(lo).min(hi);
                }
                brightness[i] = -objective(&fireflies[i]);
            }
        }
        alpha *= 0.97;
    }

    let best_idx = (0..n_fireflies).max_by(|&a, &b| brightness[a].partial_cmp(&brightness[b]).unwrap()).unwrap();
    (fireflies[best_idx].clone(), objective(&fireflies[best_idx]))
}
```

```csharp
static (double[] pos, double val) FireflyAlgorithm(
    Func<double[], double> objective, int dim, int nFireflies, int generations,
    (double lo, double hi) bounds, Random rng, double beta0 = 1.0, double gamma = 1.0, double alpha0 = 0.2)
{
    double alpha = alpha0;
    var fireflies = Enumerable.Range(0, nFireflies)
        .Select(_ => Enumerable.Range(0, dim).Select(_ => bounds.lo + rng.NextDouble() * (bounds.hi - bounds.lo)).ToArray())
        .ToArray();
    var brightness = fireflies.Select(f => -objective(f)).ToArray();

    for (int g = 0; g < generations; g++)
    {
        for (int i = 0; i < nFireflies; i++)
        {
            for (int j = 0; j < nFireflies; j++)
            {
                if (brightness[j] <= brightness[i]) continue;
                double r2 = 0;
                for (int d = 0; d < dim; d++) r2 += Math.Pow(fireflies[i][d] - fireflies[j][d], 2);
                double beta = beta0 * Math.Exp(-gamma * r2);
                for (int d = 0; d < dim; d++)
                {
                    double randTerm = alpha * (rng.NextDouble() - 0.5);
                    fireflies[i][d] += beta * (fireflies[j][d] - fireflies[i][d]) + randTerm;
                    fireflies[i][d] = Math.Max(bounds.lo, Math.Min(bounds.hi, fireflies[i][d]));
                }
                brightness[i] = -objective(fireflies[i]);
            }
        }
        alpha *= 0.97;
    }

    int bestIdx = 0;
    for (int i = 1; i < nFireflies; i++) if (brightness[i] > brightness[bestIdx]) bestIdx = i;
    return (fireflies[bestIdx], objective(fireflies[bestIdx]));
}
```
