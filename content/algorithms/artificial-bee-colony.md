---
name: 人工蜂コロニーアルゴリズム(ABC)
category: シミュレーション・群知能
subcategory: 群知能最適化
complexity: O(g×n×d)(gは世代数、nは蜂の数、dは次元数)
summary: ミツバチの採餌行動(働き蜂・偵察蜂・見物蜂という3つの役割分担による探索と情報共有)を模倣した群知能最適化アルゴリズムで、[粒子群最適化](/algorithms/particle-swarm-optimization)や[蟻コロニー最適化](/algorithms/ant-colony-optimization)と並ぶ、生物の集団行動から着想を得た最適化手法の一つ。
---

## 概要

[蟻コロニー最適化](/algorithms/ant-colony-optimization)がフェロモンを介したアリの間接的な情報共有を模倣するのに対し、2005年にデルヴィシュ・カラボガ(Karaboga)が発表した人工蜂コロニーアルゴリズム(Artificial Bee Colony, ABC)は、ミツバチの巣における採餌行動を模倣する——働き蜂が特定の花畑(候補解)を探索して蜜の量(目的関数の評価値)を評価し、巣に戻ってダンス(情報)によってその場所の良さを他の蜂に伝え、見物蜂がその情報をもとに有望な場所へ集中し、一方で一定期間改善が見られない場所は偵察蜂によって見捨てられ新しいランダムな場所が探索される。この「活用(良い解の周辺を集中的に探る)」と「探索(新しい領域をランダムに調べる)」のバランスを、3つの異なる役割の蜂に分担させることで自然に実現している点が、ABCの設計上の巧妙さである。

## 仕組み

1. `n`個の候補解(花の蜜源の位置)をランダムに初期化し、それぞれに1匹の働き蜂を割り当てる
2. **働き蜂フェーズ**: 各働き蜂は、自分が担当する蜜源の近傍(現在の解に、別のランダムな解との差分の一部を加えた新しい候補)を1つ生成し、目的関数で評価する。新しい候補の方が良ければその蜜源を更新し、そうでなければ元のまま「改善なし」のカウントを1増やす
3. **見物蜂フェーズ**: 巣に戻った働き蜂の情報(蜜源の評価値)をもとに、見物蜂は評価値が高い(良い)蜜源ほど高い確率で選び、その蜜源についても働き蜂フェーズと同じ近傍探索を行う——ルーレット選択によって、有望な領域に探索資源が自然に集中する
4. **偵察蜂フェーズ**: ある蜜源が一定回数(閾値)以上「改善なし」のままだった場合、その蜜源は見捨てられたとみなし、その働き蜂は偵察蜂に転じて全く新しいランダムな蜜源を探索し直す——局所最適への停滞を防ぐ役割を果たす
5. 手順2〜4を世代数の上限に達するか収束するまで繰り返し、最良の蜜源(最適解)を出力する

## 特性・トレードオフ

- **計算量**: 各世代で`n`匹の働き蜂と見物蜂がそれぞれ`O(d)`の近傍探索を行うため、全体で`O(g×n×d)`——[粒子群最適化](/algorithms/particle-swarm-optimization)や[遺伝的アルゴリズム](/algorithms/genetic-algorithm)と同程度の計算コスト
- **3つの役割分担による探索・活用バランス**: 働き蜂・見物蜂による「良い解の周辺を集中的に探る(活用)」と、偵察蜂による「行き詰まった探索を打ち切り新規領域を試す(探索)」という2つの相反する要求を、異なる役割の個体に分担させることで両立させている——単一の個体が両方を担う[粒子群最適化](/algorithms/particle-swarm-optimization)とは異なる設計思想
- **パラメータの少なさ**: 主要パラメータが「蜂の数」「改善なしの閾値(偵察蜂への転向条件)」程度と少なく、[差分進化](/algorithms/differential-evolution)と同様に比較的チューニングしやすいアルゴリズムとされる
- **使いどころ**: 連続最適化問題全般(勾配情報が使えないブラックボックス最適化)、ニューラルネットワークのハイパーパラメータ探索、エンジニアリング設計における多峰性(複数の局所最適を持つ)関数の最適化、[粒子群最適化](/algorithms/particle-swarm-optimization)・[蟻コロニー最適化](/algorithms/ant-colony-optimization)と並ぶ群知能アルゴリズムの選択肢の一つとして比較検討される

## 実装例

```python
import random
from typing import Callable


def _fitness(value: float) -> float:
    return 1.0 / (1.0 + value) if value >= 0 else 1.0 + abs(value)


def artificial_bee_colony(
    objective: Callable[[list[float]], float],
    dim: int,
    lower: float,
    upper: float,
    colony_size: int = 20,
    limit: int = 15,
    max_iter: int = 200,
    seed: int = 0,
):
    rng = random.Random(seed)
    n = colony_size
    sources = [[rng.uniform(lower, upper) for _ in range(dim)] for _ in range(n)]
    values = [objective(s) for s in sources]
    trials = [0] * n

    best_source = sources[0][:]
    best_value = values[0]

    def clamp(v: float) -> float:
        return min(max(v, lower), upper)

    def neighbor(i: int) -> list[float]:
        k = rng.randrange(dim)
        j = rng.randrange(n - 1)
        if j >= i:
            j += 1
        phi = rng.uniform(-1, 1)
        candidate = sources[i][:]
        candidate[k] = clamp(candidate[k] + phi * (candidate[k] - sources[j][k]))
        return candidate

    for _ in range(max_iter):
        # 働き蜂フェーズ
        for i in range(n):
            candidate = neighbor(i)
            cval = objective(candidate)
            if cval < values[i]:
                sources[i] = candidate
                values[i] = cval
                trials[i] = 0
            else:
                trials[i] += 1

        # 見物蜂フェーズ(ルーレット選択)
        fits = [_fitness(v) for v in values]
        total_fit = sum(fits)
        for _ in range(n):
            r = rng.uniform(0, total_fit)
            cum = 0.0
            i = n - 1
            for idx, f in enumerate(fits):
                cum += f
                if cum >= r:
                    i = idx
                    break
            candidate = neighbor(i)
            cval = objective(candidate)
            if cval < values[i]:
                sources[i] = candidate
                values[i] = cval
                trials[i] = 0
            else:
                trials[i] += 1

        # 偵察蜂フェーズ
        for i in range(n):
            if trials[i] > limit:
                sources[i] = [rng.uniform(lower, upper) for _ in range(dim)]
                values[i] = objective(sources[i])
                trials[i] = 0

        for i in range(n):
            if values[i] < best_value:
                best_value = values[i]
                best_source = sources[i][:]

    return best_source, best_value
```

```typescript
function fitness(v: number): number {
  return v >= 0 ? 1.0 / (1.0 + v) : 1.0 + Math.abs(v);
}

function artificialBeeColony(
  objective: (x: number[]) => number,
  dim: number,
  lower: number,
  upper: number,
  colonySize: number,
  limit: number,
  maxIter: number,
  seed: number
): { bestSource: number[]; bestValue: number } {
  let state = seed;
  const rng = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const randInt = (max: number) => Math.floor(rng() * max);
  const uniform = (lo: number, hi: number) => lo + rng() * (hi - lo);

  const n = colonySize;
  const sources: number[][] = Array.from({ length: n }, () => Array.from({ length: dim }, () => uniform(lower, upper)));
  const values = sources.map(objective);
  const trials = new Array(n).fill(0);
  let bestSource = sources[0].slice();
  let bestValue = values[0];

  const clamp = (v: number) => Math.min(Math.max(v, lower), upper);
  const neighbor = (i: number): number[] => {
    const k = randInt(dim);
    let j = randInt(n - 1);
    if (j >= i) j++;
    const phi = uniform(-1, 1);
    const cand = sources[i].slice();
    cand[k] = clamp(cand[k] + phi * (cand[k] - sources[j][k]));
    return cand;
  };

  for (let iter = 0; iter < maxIter; iter++) {
    for (let i = 0; i < n; i++) {
      const cand = neighbor(i);
      const cval = objective(cand);
      if (cval < values[i]) {
        sources[i] = cand;
        values[i] = cval;
        trials[i] = 0;
      } else {
        trials[i]++;
      }
    }

    const fits = values.map(fitness);
    const totalFit = fits.reduce((a, b) => a + b, 0);
    for (let s = 0; s < n; s++) {
      const r = uniform(0, totalFit);
      let cum = 0;
      let i = n - 1;
      for (let idx = 0; idx < fits.length; idx++) {
        cum += fits[idx];
        if (cum >= r) {
          i = idx;
          break;
        }
      }
      const cand = neighbor(i);
      const cval = objective(cand);
      if (cval < values[i]) {
        sources[i] = cand;
        values[i] = cval;
        trials[i] = 0;
      } else {
        trials[i]++;
      }
    }

    for (let i = 0; i < n; i++) {
      if (trials[i] > limit) {
        sources[i] = Array.from({ length: dim }, () => uniform(lower, upper));
        values[i] = objective(sources[i]);
        trials[i] = 0;
      }
    }

    for (let i = 0; i < n; i++) {
      if (values[i] < bestValue) {
        bestValue = values[i];
        bestSource = sources[i].slice();
      }
    }
  }
  return { bestSource, bestValue };
}
```

```cpp
#include <algorithm>
#include <functional>
#include <random>
#include <vector>

double fitness(double v) { return v >= 0 ? 1.0 / (1.0 + v) : 1.0 + std::abs(v); }

struct AbcResult {
    std::vector<double> bestSource;
    double bestValue;
};

AbcResult artificialBeeColony(const std::function<double(const std::vector<double>&)>& objective, int dim,
                               double lower, double upper, int colonySize, int limit, int maxIter, unsigned seed) {
    std::mt19937 rng(seed);
    std::uniform_real_distribution<double> unif(0.0, 1.0);
    int n = colonySize;

    std::vector<std::vector<double>> sources(n, std::vector<double>(dim));
    for (auto& s : sources)
        for (double& v : s) v = lower + unif(rng) * (upper - lower);
    std::vector<double> values(n);
    for (int i = 0; i < n; i++) values[i] = objective(sources[i]);
    std::vector<int> trials(n, 0);

    std::vector<double> bestSource = sources[0];
    double bestValue = values[0];

    auto clamp = [&](double v) { return std::min(std::max(v, lower), upper); };
    auto neighbor = [&](int i) {
        int k = static_cast<int>(unif(rng) * dim);
        int j = static_cast<int>(unif(rng) * (n - 1));
        if (j >= i) j++;
        double phi = -1.0 + unif(rng) * 2.0;
        std::vector<double> cand = sources[i];
        cand[k] = clamp(cand[k] + phi * (cand[k] - sources[j][k]));
        return cand;
    };

    for (int iter = 0; iter < maxIter; iter++) {
        for (int i = 0; i < n; i++) {
            auto cand = neighbor(i);
            double cval = objective(cand);
            if (cval < values[i]) {
                sources[i] = cand;
                values[i] = cval;
                trials[i] = 0;
            } else {
                trials[i]++;
            }
        }

        std::vector<double> fits(n);
        for (int i = 0; i < n; i++) fits[i] = fitness(values[i]);
        double totalFit = 0.0;
        for (double f : fits) totalFit += f;

        for (int s = 0; s < n; s++) {
            double r = unif(rng) * totalFit;
            double cum = 0.0;
            int i = n - 1;
            for (int idx = 0; idx < n; idx++) {
                cum += fits[idx];
                if (cum >= r) {
                    i = idx;
                    break;
                }
            }
            auto cand = neighbor(i);
            double cval = objective(cand);
            if (cval < values[i]) {
                sources[i] = cand;
                values[i] = cval;
                trials[i] = 0;
            } else {
                trials[i]++;
            }
        }

        for (int i = 0; i < n; i++) {
            if (trials[i] > limit) {
                for (double& v : sources[i]) v = lower + unif(rng) * (upper - lower);
                values[i] = objective(sources[i]);
                trials[i] = 0;
            }
        }

        for (int i = 0; i < n; i++) {
            if (values[i] < bestValue) {
                bestValue = values[i];
                bestSource = sources[i];
            }
        }
    }
    return AbcResult{bestSource, bestValue};
}
```

```rust
struct Rng(u64);
impl Rng {
    fn next_f64(&mut self) -> f64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        (self.0 >> 11) as f64 / (1u64 << 53) as f64
    }
    fn uniform(&mut self, lo: f64, hi: f64) -> f64 {
        lo + self.next_f64() * (hi - lo)
    }
    fn next_usize(&mut self, max: usize) -> usize {
        (self.next_f64() * max as f64) as usize
    }
}

fn fitness(v: f64) -> f64 {
    if v >= 0.0 {
        1.0 / (1.0 + v)
    } else {
        1.0 + v.abs()
    }
}

fn artificial_bee_colony(
    objective: impl Fn(&[f64]) -> f64,
    dim: usize,
    lower: f64,
    upper: f64,
    colony_size: usize,
    limit: u32,
    max_iter: usize,
    seed: u64,
) -> (Vec<f64>, f64) {
    let mut rng = Rng(seed.max(1));
    let n = colony_size;
    let mut sources: Vec<Vec<f64>> = (0..n).map(|_| (0..dim).map(|_| rng.uniform(lower, upper)).collect()).collect();
    let mut values: Vec<f64> = sources.iter().map(|s| objective(s)).collect();
    let mut trials = vec![0u32; n];

    let mut best_source = sources[0].clone();
    let mut best_value = values[0];

    for _ in 0..max_iter {
        for i in 0..n {
            let k = rng.next_usize(dim);
            let mut j = rng.next_usize(n.saturating_sub(1).max(1));
            if j >= i {
                j += 1;
            }
            j = j.min(n - 1);
            let phi = rng.uniform(-1.0, 1.0);
            let mut cand = sources[i].clone();
            cand[k] = (cand[k] + phi * (cand[k] - sources[j][k])).clamp(lower, upper);
            let cval = objective(&cand);
            if cval < values[i] {
                sources[i] = cand;
                values[i] = cval;
                trials[i] = 0;
            } else {
                trials[i] += 1;
            }
        }

        let fits: Vec<f64> = values.iter().map(|&v| fitness(v)).collect();
        let total_fit: f64 = fits.iter().sum();
        for _ in 0..n {
            let r = rng.uniform(0.0, total_fit);
            let mut cum = 0.0;
            let mut i = n - 1;
            for (idx, &f) in fits.iter().enumerate() {
                cum += f;
                if cum >= r {
                    i = idx;
                    break;
                }
            }
            let k = rng.next_usize(dim);
            let mut j = rng.next_usize(n.saturating_sub(1).max(1));
            if j >= i {
                j += 1;
            }
            j = j.min(n - 1);
            let phi = rng.uniform(-1.0, 1.0);
            let mut cand = sources[i].clone();
            cand[k] = (cand[k] + phi * (cand[k] - sources[j][k])).clamp(lower, upper);
            let cval = objective(&cand);
            if cval < values[i] {
                sources[i] = cand;
                values[i] = cval;
                trials[i] = 0;
            } else {
                trials[i] += 1;
            }
        }

        for i in 0..n {
            if trials[i] > limit {
                sources[i] = (0..dim).map(|_| rng.uniform(lower, upper)).collect();
                values[i] = objective(&sources[i]);
                trials[i] = 0;
            }
        }

        for i in 0..n {
            if values[i] < best_value {
                best_value = values[i];
                best_source = sources[i].clone();
            }
        }
    }
    (best_source, best_value)
}
```

```csharp
static class ArtificialBeeColony
{
    static double Fitness(double v) => v >= 0 ? 1.0 / (1.0 + v) : 1.0 + Math.Abs(v);

    public static (double[] bestSource, double bestValue) Run(Func<double[], double> objective, int dim,
        double lower, double upper, int colonySize, int limit, int maxIter, int seed)
    {
        var rng = new Random(seed);
        int n = colonySize;
        var sources = new double[n][];
        for (int i = 0; i < n; i++)
        {
            sources[i] = new double[dim];
            for (int d = 0; d < dim; d++) sources[i][d] = lower + rng.NextDouble() * (upper - lower);
        }
        var values = sources.Select(objective).ToArray();
        var trials = new int[n];
        var bestSource = (double[])sources[0].Clone();
        double bestValue = values[0];

        double Clamp(double v) => Math.Min(Math.Max(v, lower), upper);
        double[] Neighbor(int i)
        {
            int k = rng.Next(dim);
            int j = rng.Next(n - 1);
            if (j >= i) j++;
            double phi = -1 + rng.NextDouble() * 2;
            var cand = (double[])sources[i].Clone();
            cand[k] = Clamp(cand[k] + phi * (cand[k] - sources[j][k]));
            return cand;
        }

        for (int iter = 0; iter < maxIter; iter++)
        {
            for (int i = 0; i < n; i++)
            {
                var cand = Neighbor(i);
                double cval = objective(cand);
                if (cval < values[i]) { sources[i] = cand; values[i] = cval; trials[i] = 0; }
                else trials[i]++;
            }
            var fits = values.Select(Fitness).ToArray();
            double totalFit = fits.Sum();
            for (int s = 0; s < n; s++)
            {
                double r = rng.NextDouble() * totalFit;
                double cum = 0;
                int i = n - 1;
                for (int idx = 0; idx < fits.Length; idx++) { cum += fits[idx]; if (cum >= r) { i = idx; break; } }
                var cand = Neighbor(i);
                double cval = objective(cand);
                if (cval < values[i]) { sources[i] = cand; values[i] = cval; trials[i] = 0; }
                else trials[i]++;
            }
            for (int i = 0; i < n; i++)
            {
                if (trials[i] > limit)
                {
                    var s = new double[dim];
                    for (int d = 0; d < dim; d++) s[d] = lower + rng.NextDouble() * (upper - lower);
                    sources[i] = s;
                    values[i] = objective(s);
                    trials[i] = 0;
                }
            }
            for (int i = 0; i < n; i++)
                if (values[i] < bestValue) { bestValue = values[i]; bestSource = (double[])sources[i].Clone(); }
        }
        return (bestSource, bestValue);
    }
}
```
