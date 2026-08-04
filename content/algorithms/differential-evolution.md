---
name: 差分進化(Differential Evolution)
category: 最適化・確率的手法
subcategory: 進化的・確率的手法
complexity: O(g × p × d)(gは世代数、pは個体数、dは次元数)
summary: 集団内の個体同士のベクトル差分を使って新しい候補解を生成する、勾配情報を一切必要とせず連続値の最適化問題に強い進化的アルゴリズムで、パラメータが少なくチューニングしやすいことで知られる。
---

## 概要

[遺伝的アルゴリズム](/algorithms/genetic-algorithm)が交叉・突然変異という生物学的な比喩に基づいて新しい個体を生み出すのに対し、1997年にケネス・プライス(Price)とライナー・ストーン(Storn)が発表した差分進化(DE)は、より直接的で幾何学的な発想を取る——集団内からランダムに選んだ2つの個体の「差分ベクトル」を計算し、それを別の個体に加えることで新しい候補解を生成する。この単純な操作だけで、連続値パラメータの最適化において驚くほど強力な探索性能を発揮することが知られており、勾配(微分)の情報を一切必要としないため、目的関数が微分不可能・不連続・ノイズを含むような「ブラックボックス最適化」問題に特に強い、実務でも広く使われる進化的アルゴリズムである。

## 仕組み

1. 探索空間内にランダムに`p`個の個体(候補解ベクトル)からなる集団を初期化する
2. 各世代で、集団内の各個体`x`(ターゲットベクトルと呼ぶ)ごとに以下を行う
3. **変異(Mutation)**: `x`とは異なる3つの個体`a`、`b`、`c`をランダムに選び、変異ベクトル`v = a + F × (b - c)`を計算する(`F`はスケーリング係数、通常0.5〜1程度の定数)——`b`と`c`の差分ベクトルが、探索空間のどの方向にどれだけ動けば良さそうかという「集団の現在の分布が示す方向感覚」を表現している
4. **交叉(Crossover)**: ターゲットベクトル`x`と変異ベクトル`v`の各成分を、確率`CR`(交叉率)でランダムに混ぜ合わせ、試行ベクトル`u`を生成する
5. **選択**: 試行ベクトル`u`の目的関数値がターゲットベクトル`x`より良ければ、次世代の集団で`x`を`u`に置き換える。そうでなければ`x`をそのまま残す
6. 全個体についてこの変異・交叉・選択を行うことを1世代とし、収束条件を満たすか世代数の上限に達するまで繰り返す

## 特性・トレードオフ

- **計算量**: 1世代あたり`O(p × d)`(`p`は個体数、`d`は次元数)、これを`g`世代繰り返すので全体で`O(g × p × d)`——勾配計算が不要なため1回の評価コストは低いが、良い解に到達するまでに必要な世代数は問題に依存する
- **勾配不要という強み**: 目的関数の微分が定義できない、あるいは計算コストが高い(シミュレーションベースの評価関数など)ブラックボックス最適化問題において、[勾配降下法](/algorithms/gradient-descent)のような微分ベースの手法が使えない場面で威力を発揮する
- **パラメータの少なさとチューニングしやすさ**: 主要なパラメータが個体数`p`・スケーリング係数`F`・交叉率`CR`の3つだけとシンプルであり、[遺伝的アルゴリズム](/algorithms/genetic-algorithm)や[粒子群最適化](/algorithms/particle-swarm-optimization)と比べても実務でチューニングしやすいことが利点として挙げられる
- **使いどころ**: 機械学習モデルのハイパーパラメータ最適化、工学設計における連続パラメータの最適化(回路設計・構造設計)、目的関数がシミュレーションでしか評価できない制御システムのパラメータ調整、[粒子群最適化](/algorithms/particle-swarm-optimization)や[遺伝的アルゴリズム](/algorithms/genetic-algorithm)と並ぶ実用的な進化的アルゴリズムの選択肢

## 実装例

DE/rand/1/binと呼ばれる標準的な変種(個体をランダムに選び、差分ベクトルを1つ使い、二項交叉を行う)。目的関数はスフィア関数(`f(x) = Σx_i²`、最小値0)で検証する。

```python
import random


def differential_evolution(
    objective, bounds: list[tuple[float, float]],
    pop_size: int = 20, f: float = 0.8, cr: float = 0.9,
    generations: int = 200, seed: int | None = None,
) -> tuple[list[float], float]:
    rng = random.Random(seed)
    dim = len(bounds)
    pop = [[rng.uniform(lo, hi) for (lo, hi) in bounds] for _ in range(pop_size)]
    fitness = [objective(ind) for ind in pop]

    for _ in range(generations):
        for i in range(pop_size):
            candidates = [idx for idx in range(pop_size) if idx != i]
            a, b, c = rng.sample(candidates, 3)
            mutant = [pop[a][j] + f * (pop[b][j] - pop[c][j]) for j in range(dim)]
            for j in range(dim):
                lo, hi = bounds[j]
                mutant[j] = min(max(mutant[j], lo), hi)

            trial = list(pop[i])
            r = rng.randrange(dim)
            for j in range(dim):
                if rng.random() < cr or j == r:
                    trial[j] = mutant[j]

            trial_fitness = objective(trial)
            if trial_fitness <= fitness[i]:
                pop[i] = trial
                fitness[i] = trial_fitness

    best_idx = min(range(pop_size), key=lambda i: fitness[i])
    return pop[best_idx], fitness[best_idx]
```

```typescript
function differentialEvolution(
  objective: (x: number[]) => number,
  bounds: [number, number][],
  popSize = 20, f = 0.8, cr = 0.9, generations = 200, seed = 1
): [number[], number] {
  const rng = mulberry32(seed);
  const dim = bounds.length;
  const randInt = (n: number) => Math.floor(rng() * n);
  const pop: number[][] = Array.from({ length: popSize }, () =>
    bounds.map(([lo, hi]) => lo + rng() * (hi - lo))
  );
  const fitness = pop.map(objective);

  for (let gen = 0; gen < generations; gen++) {
    for (let i = 0; i < popSize; i++) {
      const candidates = [...Array(popSize).keys()].filter((idx) => idx !== i);
      const chosen: number[] = [];
      while (chosen.length < 3) {
        const c = candidates[randInt(candidates.length)];
        if (!chosen.includes(c)) chosen.push(c);
      }
      const [a, b, c] = chosen;
      const mutant = Array.from({ length: dim }, (_, j) => pop[a][j] + f * (pop[b][j] - pop[c][j]));
      for (let j = 0; j < dim; j++) {
        const [lo, hi] = bounds[j];
        mutant[j] = Math.min(Math.max(mutant[j], lo), hi);
      }

      const trial = [...pop[i]];
      const r = randInt(dim);
      for (let j = 0; j < dim; j++) {
        if (rng() < cr || j === r) trial[j] = mutant[j];
      }

      const tf = objective(trial);
      if (tf <= fitness[i]) {
        pop[i] = trial;
        fitness[i] = tf;
      }
    }
  }

  let bestIdx = 0;
  for (let i = 1; i < popSize; i++) if (fitness[i] < fitness[bestIdx]) bestIdx = i;
  return [pop[bestIdx], fitness[bestIdx]];
}

// 決定的な擬似乱数生成器(検証・再現性のため)
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

```cpp
#include <vector>
#include <random>
#include <functional>
#include <algorithm>

std::pair<std::vector<double>, double> differentialEvolution(
    const std::function<double(const std::vector<double>&)>& objective,
    const std::vector<std::pair<double, double>>& bounds,
    int popSize = 20, double f = 0.8, double cr = 0.9,
    int generations = 200, unsigned seed = 1) {

    std::mt19937 rng(seed);
    std::uniform_real_distribution<double> unit(0.0, 1.0);
    int dim = static_cast<int>(bounds.size());

    std::vector<std::vector<double>> pop(popSize, std::vector<double>(dim));
    for (auto& ind : pop) {
        for (int j = 0; j < dim; j++) {
            ind[j] = bounds[j].first + unit(rng) * (bounds[j].second - bounds[j].first);
        }
    }
    std::vector<double> fitness(popSize);
    for (int i = 0; i < popSize; i++) fitness[i] = objective(pop[i]);

    std::uniform_int_distribution<int> dimDist(0, dim - 1);
    std::uniform_int_distribution<int> popDist(0, popSize - 1);

    for (int gen = 0; gen < generations; gen++) {
        for (int i = 0; i < popSize; i++) {
            int a, b, c;
            do { a = popDist(rng); } while (a == i);
            do { b = popDist(rng); } while (b == i || b == a);
            do { c = popDist(rng); } while (c == i || c == a || c == b);

            std::vector<double> mutant(dim);
            for (int j = 0; j < dim; j++) {
                mutant[j] = pop[a][j] + f * (pop[b][j] - pop[c][j]);
                mutant[j] = std::min(std::max(mutant[j], bounds[j].first), bounds[j].second);
            }

            std::vector<double> trial = pop[i];
            int r = dimDist(rng);
            for (int j = 0; j < dim; j++) {
                if (unit(rng) < cr || j == r) trial[j] = mutant[j];
            }

            double tf = objective(trial);
            if (tf <= fitness[i]) {
                pop[i] = trial;
                fitness[i] = tf;
            }
        }
    }

    int bestIdx = 0;
    for (int i = 1; i < popSize; i++) if (fitness[i] < fitness[bestIdx]) bestIdx = i;
    return { pop[bestIdx], fitness[bestIdx] };
}
```

```rust
use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};

fn differential_evolution<F: Fn(&[f64]) -> f64>(
    objective: F,
    bounds: &[(f64, f64)],
    pop_size: usize,
    f: f64,
    cr: f64,
    generations: usize,
    seed: u64,
) -> (Vec<f64>, f64) {
    let mut rng = StdRng::seed_from_u64(seed);
    let dim = bounds.len();

    let mut pop: Vec<Vec<f64>> = (0..pop_size)
        .map(|_| bounds.iter().map(|&(lo, hi)| rng.gen_range(lo..hi)).collect())
        .collect();
    let mut fitness: Vec<f64> = pop.iter().map(|ind| objective(ind)).collect();

    for _ in 0..generations {
        for i in 0..pop_size {
            let mut idxs = [0usize; 3];
            let mut k = 0;
            while k < 3 {
                let cand = rng.gen_range(0..pop_size);
                if cand != i && !idxs[..k].contains(&cand) {
                    idxs[k] = cand;
                    k += 1;
                }
            }
            let (a, b, c) = (idxs[0], idxs[1], idxs[2]);

            let mut mutant: Vec<f64> = (0..dim)
                .map(|j| pop[a][j] + f * (pop[b][j] - pop[c][j]))
                .collect();
            for j in 0..dim {
                let (lo, hi) = bounds[j];
                mutant[j] = mutant[j].max(lo).min(hi);
            }

            let mut trial = pop[i].clone();
            let r = rng.gen_range(0..dim);
            for j in 0..dim {
                if rng.gen::<f64>() < cr || j == r {
                    trial[j] = mutant[j];
                }
            }

            let tf = objective(&trial);
            if tf <= fitness[i] {
                pop[i] = trial;
                fitness[i] = tf;
            }
        }
    }

    let best_idx = (0..pop_size)
        .min_by(|&i, &j| fitness[i].partial_cmp(&fitness[j]).unwrap())
        .unwrap();
    (pop[best_idx].clone(), fitness[best_idx])
}
```

```csharp
static class DifferentialEvolution
{
    public static (double[] Best, double Fitness) Optimize(
        Func<double[], double> objective,
        (double Lo, double Hi)[] bounds,
        int popSize = 20, double f = 0.8, double cr = 0.9, int generations = 200, int seed = 1)
    {
        var rng = new Random(seed);
        int dim = bounds.Length;
        var pop = new double[popSize][];
        for (int i = 0; i < popSize; i++)
        {
            pop[i] = new double[dim];
            for (int j = 0; j < dim; j++) pop[i][j] = bounds[j].Lo + rng.NextDouble() * (bounds[j].Hi - bounds[j].Lo);
        }
        var fitness = pop.Select(objective).ToArray();

        for (int gen = 0; gen < generations; gen++)
        {
            for (int i = 0; i < popSize; i++)
            {
                var candidates = Enumerable.Range(0, popSize).Where(idx => idx != i).ToList();
                var chosen = new List<int>();
                while (chosen.Count < 3)
                {
                    int c = candidates[rng.Next(candidates.Count)];
                    if (!chosen.Contains(c)) chosen.Add(c);
                }
                var a = pop[chosen[0]]; var b = pop[chosen[1]]; var c2 = pop[chosen[2]];
                var mutant = new double[dim];
                for (int j = 0; j < dim; j++) mutant[j] = a[j] + f * (b[j] - c2[j]);
                for (int j = 0; j < dim; j++) mutant[j] = Math.Min(Math.Max(mutant[j], bounds[j].Lo), bounds[j].Hi);

                var trial = (double[])pop[i].Clone();
                int r = rng.Next(dim);
                for (int j = 0; j < dim; j++)
                {
                    if (rng.NextDouble() < cr || j == r) trial[j] = mutant[j];
                }
                double tf = objective(trial);
                if (tf <= fitness[i]) { pop[i] = trial; fitness[i] = tf; }
            }
        }

        int bestIdx = 0;
        for (int i = 1; i < popSize; i++) if (fitness[i] < fitness[bestIdx]) bestIdx = i;
        return (pop[bestIdx], fitness[bestIdx]);
    }
}
```
