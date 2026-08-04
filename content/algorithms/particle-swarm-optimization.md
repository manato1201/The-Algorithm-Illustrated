---
name: 粒子群最適化(PSO)
category: シミュレーション・群知能
subcategory: 群知能最適化
complexity: O(問題依存)
summary: 各粒子が自分のベストと群れ全体のベストに引き寄せられながら探索空間を飛び回る、群知能に基づく最適化手法。
---

## 概要

鳥の群れが餌場を探して飛び回る様子から着想を得た最適化手法。1995年にJames KennedyとRussell Eberhartが考案した。探索空間を「粒子(particle)」と呼ばれる多数の候補解が同時に飛び回り、**「自分自身が今まで見つけた最良の位置」**と**「群れ全体が今まで見つけた最良の位置」**という2つの記憶に引き寄せられながら、徐々により良い解の周辺に群れが収束していく。

## 仕組み

各粒子は「現在の位置(=解の候補)」と「速度」を持ち、以下を繰り返す。

1. 各粒子の現在位置における目的関数の値を評価する
2. その粒子にとっての「自己ベスト(pbest)」と、群れ全体の「全体ベスト(gbest)」を、必要なら更新する
3. 各粒子の速度を、**慣性(それまでの勢いを維持しようとする力)**・**自己ベストへ向かう力**・**全体ベストへ向かう力**の3つを組み合わせて更新する(それぞれにランダムな重みをかけることで、探索に多様性を持たせる)
4. 更新された速度に従って、各粒子の位置を移動させる
5. 終了条件(反復回数の上限や、十分良い解が見つかったなど)を満たすまで1〜4を繰り返す

「自分の経験(自己ベスト)」と「集団の知恵(全体ベスト)」の両方から学びながら位置を更新する、という発想が、探索の効率と多様性のバランスを取っている。

## 特性・トレードオフ

- **計算量**: 問題依存。目的関数の評価コストと反復回数、粒子数の積で決まる。厳密解の保証はなく、実用的な近似解法として使われる
- **蟻コロニー最適化との違い**: 蟻コロニー最適化が「間接的なコミュニケーション(フェロモン)」を介するのに対し、粒子群最適化は「グローバルな最良解の情報」を全粒子が直接参照する、より直接的な情報共有の構造を持つ
- **連続最適化に強い**: 巡回セールスマン問題のような離散的な組み合わせ問題よりも、パラメータチューニングのような**連続値の最適化問題**に自然に適用しやすい
- **使いどころ**: 機械学習モデルのハイパーパラメータ最適化、ニューラルネットワークの重みの学習、制御システムのパラメータ調整、工学設計における多変数最適化問題など

## 実装例

球面関数(sphere function、`f(x) = Σxᵢ²`。最小値は原点でゼロ)を目的関数として、固定シードで粒子群最適化を実行し、大域最適解である原点付近に収束することを検証する。

```python
import random


def sphere(x: list[float]) -> float:
    return sum(xi**2 for xi in x)


def pso(
    objective,
    dim: int,
    bounds: tuple[float, float],
    n_particles: int = 30,
    iterations: int = 100,
    seed: int = 0,
    w: float = 0.7,
    c1: float = 1.5,
    c2: float = 1.5,
) -> tuple[list[float], float]:
    rnd = random.Random(seed)
    lo, hi = bounds
    positions = [[rnd.uniform(lo, hi) for _ in range(dim)] for _ in range(n_particles)]
    velocities = [[0.0] * dim for _ in range(n_particles)]
    pbest = [list(p) for p in positions]
    pbest_val = [objective(p) for p in positions]
    gbest_idx = min(range(n_particles), key=lambda i: pbest_val[i])
    gbest, gbest_val = list(pbest[gbest_idx]), pbest_val[gbest_idx]

    for _ in range(iterations):
        for i in range(n_particles):
            for d in range(dim):
                r1, r2 = rnd.random(), rnd.random()
                # 慣性 + 自己ベストへ向かう力 + 全体ベストへ向かう力
                velocities[i][d] = (
                    w * velocities[i][d]
                    + c1 * r1 * (pbest[i][d] - positions[i][d])
                    + c2 * r2 * (gbest[d] - positions[i][d])
                )
                positions[i][d] += velocities[i][d]
            val = objective(positions[i])
            if val < pbest_val[i]:
                pbest_val[i], pbest[i] = val, list(positions[i])
                if val < gbest_val:
                    gbest_val, gbest = val, list(positions[i])
    return gbest, gbest_val
```

```typescript
function sphere(x: number[]): number {
  return x.reduce((s, xi) => s + xi * xi, 0);
}

function pso(
  objective: (x: number[]) => number,
  dim: number,
  bounds: [number, number],
  nParticles = 30,
  iterations = 100,
  seed = 0,
  w = 0.7,
  c1 = 1.5,
  c2 = 1.5,
): { best: number[]; val: number } {
  const rnd = mulberry32(seed);
  const [lo, hi] = bounds;
  const positions = Array.from({ length: nParticles }, () => Array.from({ length: dim }, () => lo + rnd() * (hi - lo)));
  const velocities = Array.from({ length: nParticles }, () => new Array(dim).fill(0));
  const pbest = positions.map((p) => [...p]);
  const pbestVal = positions.map(objective);
  let gbestIdx = 0;
  for (let i = 1; i < nParticles; i++) if (pbestVal[i] < pbestVal[gbestIdx]) gbestIdx = i;
  let gbest = [...pbest[gbestIdx]];
  let gbestVal = pbestVal[gbestIdx];

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < nParticles; i++) {
      for (let d = 0; d < dim; d++) {
        const [r1, r2] = [rnd(), rnd()];
        // 慣性 + 自己ベストへ向かう力 + 全体ベストへ向かう力
        velocities[i][d] = w * velocities[i][d] + c1 * r1 * (pbest[i][d] - positions[i][d]) + c2 * r2 * (gbest[d] - positions[i][d]);
        positions[i][d] += velocities[i][d];
      }
      const val = objective(positions[i]);
      if (val < pbestVal[i]) {
        pbestVal[i] = val;
        pbest[i] = [...positions[i]];
        if (val < gbestVal) {
          gbestVal = val;
          gbest = [...positions[i]];
        }
      }
    }
  }
  return { best: gbest, val: gbestVal };
}

// 簡易な決定論的PRNG(記事内で共通利用)
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
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
#include <limits>

struct PsoResult {
    std::vector<double> best;
    double val;
};

PsoResult pso(
    const std::function<double(const std::vector<double>&)>& objective,
    int dim, double lo, double hi,
    int nParticles = 30, int iterations = 100, unsigned int seed = 0,
    double w = 0.7, double c1 = 1.5, double c2 = 1.5) {
    std::mt19937 rng(seed);
    std::uniform_real_distribution<double> posDist(lo, hi);
    std::uniform_real_distribution<double> unitDist(0.0, 1.0);

    std::vector<std::vector<double>> positions(nParticles, std::vector<double>(dim));
    std::vector<std::vector<double>> velocities(nParticles, std::vector<double>(dim, 0.0));
    for (auto& p : positions) for (auto& x : p) x = posDist(rng);

    auto pbest = positions;
    std::vector<double> pbestVal(nParticles);
    for (int i = 0; i < nParticles; i++) pbestVal[i] = objective(positions[i]);

    int gbestIdx = 0;
    for (int i = 1; i < nParticles; i++) if (pbestVal[i] < pbestVal[gbestIdx]) gbestIdx = i;
    std::vector<double> gbest = pbest[gbestIdx];
    double gbestVal = pbestVal[gbestIdx];

    for (int iter = 0; iter < iterations; iter++) {
        for (int i = 0; i < nParticles; i++) {
            for (int d = 0; d < dim; d++) {
                double r1 = unitDist(rng), r2 = unitDist(rng);
                // 慣性 + 自己ベストへ向かう力 + 全体ベストへ向かう力
                velocities[i][d] = w * velocities[i][d]
                    + c1 * r1 * (pbest[i][d] - positions[i][d])
                    + c2 * r2 * (gbest[d] - positions[i][d]);
                positions[i][d] += velocities[i][d];
            }
            double val = objective(positions[i]);
            if (val < pbestVal[i]) {
                pbestVal[i] = val;
                pbest[i] = positions[i];
                if (val < gbestVal) { gbestVal = val; gbest = positions[i]; }
            }
        }
    }
    return {gbest, gbestVal};
}
```

```rust
use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};

fn sphere(x: &[f64]) -> f64 {
    x.iter().map(|xi| xi * xi).sum()
}

fn pso(
    objective: impl Fn(&[f64]) -> f64,
    dim: usize,
    bounds: (f64, f64),
    n_particles: usize,
    iterations: usize,
    seed: u64,
    w: f64,
    c1: f64,
    c2: f64,
) -> (Vec<f64>, f64) {
    let mut rng = StdRng::seed_from_u64(seed);
    let (lo, hi) = bounds;

    let mut positions: Vec<Vec<f64>> = (0..n_particles)
        .map(|_| (0..dim).map(|_| rng.gen_range(lo..hi)).collect())
        .collect();
    let mut velocities: Vec<Vec<f64>> = vec![vec![0.0; dim]; n_particles];

    let mut pbest = positions.clone();
    let mut pbest_val: Vec<f64> = positions.iter().map(|p| objective(p)).collect();

    let mut gbest_idx = 0;
    for i in 1..n_particles {
        if pbest_val[i] < pbest_val[gbest_idx] {
            gbest_idx = i;
        }
    }
    let mut gbest = pbest[gbest_idx].clone();
    let mut gbest_val = pbest_val[gbest_idx];

    for _ in 0..iterations {
        for i in 0..n_particles {
            for d in 0..dim {
                let (r1, r2): (f64, f64) = (rng.gen_range(0.0..1.0), rng.gen_range(0.0..1.0));
                // 慣性 + 自己ベストへ向かう力 + 全体ベストへ向かう力
                velocities[i][d] = w * velocities[i][d]
                    + c1 * r1 * (pbest[i][d] - positions[i][d])
                    + c2 * r2 * (gbest[d] - positions[i][d]);
                positions[i][d] += velocities[i][d];
            }
            let val = objective(&positions[i]);
            if val < pbest_val[i] {
                pbest_val[i] = val;
                pbest[i] = positions[i].clone();
                if val < gbest_val {
                    gbest_val = val;
                    gbest = positions[i].clone();
                }
            }
        }
    }
    (gbest, gbest_val)
}
```

```csharp
static double Sphere(double[] x) => x.Sum(xi => xi * xi);

static (double[] Best, double Val) Pso(
    Func<double[], double> objective, int dim, (double Lo, double Hi) bounds,
    int nParticles = 30, int iterations = 100, int seed = 0,
    double w = 0.7, double c1 = 1.5, double c2 = 1.5)
{
    var rnd = new Random(seed);
    var (lo, hi) = bounds;
    var positions = Enumerable.Range(0, nParticles)
        .Select(_ => Enumerable.Range(0, dim).Select(_ => lo + rnd.NextDouble() * (hi - lo)).ToArray()).ToArray();
    var velocities = Enumerable.Range(0, nParticles).Select(_ => new double[dim]).ToArray();
    var pbest = positions.Select(p => (double[])p.Clone()).ToArray();
    var pbestVal = positions.Select(objective).ToArray();

    int gbestIdx = 0;
    for (int i = 1; i < nParticles; i++) if (pbestVal[i] < pbestVal[gbestIdx]) gbestIdx = i;
    var gbest = (double[])pbest[gbestIdx].Clone();
    double gbestVal = pbestVal[gbestIdx];

    for (int iter = 0; iter < iterations; iter++)
    {
        for (int i = 0; i < nParticles; i++)
        {
            for (int d = 0; d < dim; d++)
            {
                double r1 = rnd.NextDouble(), r2 = rnd.NextDouble();
                // 慣性 + 自己ベストへ向かう力 + 全体ベストへ向かう力
                velocities[i][d] = w * velocities[i][d] + c1 * r1 * (pbest[i][d] - positions[i][d]) + c2 * r2 * (gbest[d] - positions[i][d]);
                positions[i][d] += velocities[i][d];
            }
            double val = objective(positions[i]);
            if (val < pbestVal[i])
            {
                pbestVal[i] = val;
                pbest[i] = (double[])positions[i].Clone();
                if (val < gbestVal) { gbestVal = val; gbest = (double[])positions[i].Clone(); }
            }
        }
    }
    return (gbest, gbestVal);
}
```
