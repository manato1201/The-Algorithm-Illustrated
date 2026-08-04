---
name: パーティクルフィルタ
category: 制御・ロボティクス
subcategory: 状態推定
complexity: O(N)(1ステップあたり、N粒子数)
summary: 状態の確率分布を多数の仮想的な「粒子」のサンプル集合で近似することで、非線形・非ガウス的な状況でも状態推定を可能にするカルマンフィルタの汎用的な代替手法。
---

## 概要

[カルマンフィルタ](/algorithms/kalman-filter)は線形システムとガウス分布を仮定した上で数学的に最適な解を与えるが、ロボットが複数の部屋がある建物内で自己位置を推定する場合のように、「今どの部屋にいるか」という状態の確率分布が単純な釣鐘型(ガウス分布)にならず、複数の山を持つ複雑な形になることがある。パーティクルフィルタ(モンテカルロ位置推定法とも呼ばれる)は、状態の確率分布を数式で表現する代わりに、大量の仮想的な「粒子」(それぞれが「もしかしたらこの状態かもしれない」という仮説)の集合として近似する、[モンテカルロ法](/algorithms/monte-carlo)の考え方を状態推定に応用した、より汎用的な手法である。

## 仕組み

1. 状態空間上に、`N`個の粒子(それぞれが「現在の状態はこうかもしれない」という仮説の候補)をランダムに配置する。各粒子には等しい重み(尤もらしさ)を割り当てる
2. **予測ステップ**: システムの動きのモデルに従って、各粒子を個別に(ノイズを加えながら)動かす——[カルマンフィルタ](/algorithms/kalman-filter)が確率分布のパラメータを1回更新するのに対し、パーティクルフィルタは`N`個の粒子それぞれを個別にシミュレートする
3. **重み付け(更新)ステップ**: 新しい観測値が得られたら、各粒子について「もしこの粒子が表す状態が正しいとしたら、この観測値がどれだけ観測されやすいか」という尤度を計算し、それを粒子の重みとする。観測値とよく整合する粒子ほど重みが大きくなる
4. **リサンプリング**: 重みに比例した確率で粒子を再抽出し(重みの大きい粒子は複数回選ばれ、重みの小さい粒子はほとんど選ばれなくなる)、新しい等重みの粒子集合を作る——これにより、尤もらしくない仮説(粒子)は自然に淘汰され、尤もらしい仮説の周辺に粒子が集中していく
5. 2〜4を繰り返すことで、粒子の分布そのものが、真の状態の確率分布を近似的に表現し続ける。粒子の重心(または最も密集している場所)が、その時点での最良の状態推定になる

## 特性・トレードオフ

- **計算量**: 各ステップで`N`個の粒子それぞれを更新・評価するため`O(N)`。粒子数`N`が精度と計算コストのトレードオフを直接決める——多いほど精度が上がるが計算コストも増える
- **非線形・非ガウス分布への対応力**: [カルマンフィルタ](/algorithms/kalman-filter)が苦手とする、複数の山を持つ複雑な確率分布や、非線形な動きのモデルにも、粒子のサンプリングという柔軟な表現方法によって自然に対応できる——線形性やガウス性の仮定を一切必要としない汎用性の高さが最大の利点
- **粒子の枯渇(degeneracy)問題**: リサンプリングを繰り返すうちに、多様性のあった粒子集合が徐々に少数の粒子に収束し、状態空間の広い範囲をカバーできなくなる(粒子の枯渇)ことがある。適切なタイミングでのリサンプリングや、粒子数の動的な調整といった実装上の工夫が、この問題への対処として重要になる
- **使いどころ**: ロボットの自己位置推定(SLAM、モンテカルロ位置推定法)、[Lucas-Kanade法](/algorithms/lucas-kanade-optical-flow)や[Mean-Shift法](/algorithms/mean-shift-tracking)では捉えにくい複雑な動きをする物体の視覚追跡、金融工学における非線形なリスクモデルの状態推定

## 実装例

1次元空間を一定速度で移動する物体を、ノイズを含む観測値だけからパーティクルフィルタで追跡する。予測・重み付け・リサンプリングの3ステップを固定シードで実行し、推定値が真の位置に十分近づくことを検証する。

```python
import math
import random


def particle_filter_1d(
    observations: list[float],
    n_particles: int = 200,
    process_noise: float = 1.0,
    obs_noise: float = 2.0,
    seed: int = 42,
) -> list[float]:
    rnd = random.Random(seed)
    particles = [rnd.uniform(-10, 10) for _ in range(n_particles)]
    estimates = []

    for z in observations:
        # 予測ステップ: 動きのモデルに従い各粒子をノイズ付きで動かす
        particles = [p + rnd.gauss(0, process_noise) for p in particles]

        # 重み付け(更新)ステップ: 観測値との整合性が高い粒子ほど重みが大きくなる
        raw_weights = [math.exp(-((z - p) ** 2) / (2 * obs_noise**2)) for p in particles]
        total_weight = sum(raw_weights)
        weights = (
            [1.0 / n_particles] * n_particles
            if total_weight == 0
            else [w / total_weight for w in raw_weights]
        )
        estimates.append(sum(p * w for p, w in zip(particles, weights)))

        # リサンプリング: 重みに比例した確率で粒子を再抽出する
        cumulative, running = [], 0.0
        for w in weights:
            running += w
            cumulative.append(running)
        step = 1.0 / n_particles
        start = rnd.uniform(0, step)
        new_particles, idx = [], 0
        for i in range(n_particles):
            target = start + i * step
            while cumulative[idx] < target:
                idx += 1
            new_particles.append(particles[idx])
        particles = new_particles

    return estimates
```

```typescript
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

function gaussian(rnd: () => number, mean: number, std: number): number {
  const u1 = Math.max(rnd(), 1e-12);
  const u2 = rnd();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

function particleFilter1d(
  observations: number[],
  nParticles = 200,
  processNoise = 1.0,
  obsNoise = 2.0,
  seed = 42,
): number[] {
  const rnd = mulberry32(seed);
  let particles = Array.from({ length: nParticles }, () => rnd() * 20 - 10);
  const estimates: number[] = [];

  for (const z of observations) {
    // 予測ステップ: 動きのモデルに従い各粒子をノイズ付きで動かす
    particles = particles.map((p) => p + gaussian(rnd, 0, processNoise));

    // 重み付け(更新)ステップ: 観測値との整合性が高い粒子ほど重みが大きくなる
    const rawWeights = particles.map((p) => Math.exp(-((z - p) ** 2) / (2 * obsNoise ** 2)));
    const totalWeight = rawWeights.reduce((a, b) => a + b, 0);
    const weights =
      totalWeight === 0
        ? new Array(nParticles).fill(1 / nParticles)
        : rawWeights.map((w) => w / totalWeight);
    estimates.push(particles.reduce((sum, p, i) => sum + p * weights[i], 0));

    // リサンプリング: 重みに比例した確率で粒子を再抽出する
    const cumulative: number[] = [];
    let running = 0;
    for (const w of weights) {
      running += w;
      cumulative.push(running);
    }
    const step = 1 / nParticles;
    const start = rnd() * step;
    const newParticles: number[] = [];
    let idx = 0;
    for (let i = 0; i < nParticles; i++) {
      const target = start + i * step;
      while (cumulative[idx] < target) idx++;
      newParticles.push(particles[idx]);
    }
    particles = newParticles;
  }

  return estimates;
}
```

```cpp
#include <vector>
#include <random>
#include <cmath>

std::vector<double> particleFilter1d(
    const std::vector<double>& observations,
    int nParticles = 200,
    double processNoise = 1.0,
    double obsNoise = 2.0,
    unsigned int seed = 42) {
    std::mt19937 rng(seed);
    std::uniform_real_distribution<double> initDist(-10.0, 10.0);
    std::normal_distribution<double> processDist(0.0, processNoise);
    std::uniform_real_distribution<double> unitDist(0.0, 1.0);

    std::vector<double> particles(nParticles);
    for (auto& p : particles) p = initDist(rng);

    std::vector<double> estimates;
    for (double z : observations) {
        // 予測ステップ: 動きのモデルに従い各粒子をノイズ付きで動かす
        for (auto& p : particles) p += processDist(rng);

        // 重み付け(更新)ステップ: 観測値との整合性が高い粒子ほど重みが大きくなる
        std::vector<double> weights(nParticles);
        double totalWeight = 0.0;
        for (int i = 0; i < nParticles; i++) {
            weights[i] = std::exp(-std::pow(z - particles[i], 2) / (2 * obsNoise * obsNoise));
            totalWeight += weights[i];
        }
        if (totalWeight == 0.0) {
            for (auto& w : weights) w = 1.0 / nParticles;
        } else {
            for (auto& w : weights) w /= totalWeight;
        }

        double estimate = 0.0;
        for (int i = 0; i < nParticles; i++) estimate += particles[i] * weights[i];
        estimates.push_back(estimate);

        // リサンプリング: 重みに比例した確率で粒子を再抽出する
        std::vector<double> cumulative(nParticles);
        double running = 0.0;
        for (int i = 0; i < nParticles; i++) { running += weights[i]; cumulative[i] = running; }
        double step = 1.0 / nParticles;
        double start = unitDist(rng) * step;
        std::vector<double> newParticles(nParticles);
        int idx = 0;
        for (int i = 0; i < nParticles; i++) {
            double target = start + i * step;
            while (cumulative[idx] < target) idx++;
            newParticles[i] = particles[idx];
        }
        particles = newParticles;
    }
    return estimates;
}
```

```rust
use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};

// Box-Muller法による標準正規乱数の生成(randクレートのみで完結させる)
fn next_gaussian(rng: &mut StdRng, mean: f64, std: f64) -> f64 {
    let u1: f64 = rng.gen_range(1e-12..1.0);
    let u2: f64 = rng.gen_range(0.0..1.0);
    let z = (-2.0 * u1.ln()).sqrt() * (2.0 * std::f64::consts::PI * u2).cos();
    mean + z * std
}

fn particle_filter_1d(
    observations: &[f64],
    n_particles: usize,
    process_noise: f64,
    obs_noise: f64,
    seed: u64,
) -> Vec<f64> {
    let mut rng = StdRng::seed_from_u64(seed);

    let mut particles: Vec<f64> = (0..n_particles).map(|_| rng.gen_range(-10.0..10.0)).collect();
    let mut estimates = Vec::with_capacity(observations.len());

    for &z in observations {
        // 予測ステップ: 動きのモデルに従い各粒子をノイズ付きで動かす
        for p in particles.iter_mut() {
            *p += next_gaussian(&mut rng, 0.0, process_noise);
        }

        // 重み付け(更新)ステップ: 観測値との整合性が高い粒子ほど重みが大きくなる
        let raw_weights: Vec<f64> = particles
            .iter()
            .map(|p| (-((z - p).powi(2)) / (2.0 * obs_noise * obs_noise)).exp())
            .collect();
        let total_weight: f64 = raw_weights.iter().sum();
        let weights: Vec<f64> = if total_weight == 0.0 {
            vec![1.0 / n_particles as f64; n_particles]
        } else {
            raw_weights.iter().map(|w| w / total_weight).collect()
        };
        let estimate: f64 = particles.iter().zip(weights.iter()).map(|(p, w)| p * w).sum();
        estimates.push(estimate);

        // リサンプリング: 重みに比例した確率で粒子を再抽出する
        let mut cumulative = Vec::with_capacity(n_particles);
        let mut running = 0.0;
        for &w in &weights {
            running += w;
            cumulative.push(running);
        }
        let step = 1.0 / n_particles as f64;
        let start: f64 = rng.gen_range(0.0..step);
        let mut new_particles = Vec::with_capacity(n_particles);
        let mut idx = 0;
        for i in 0..n_particles {
            let target = start + i as f64 * step;
            while cumulative[idx] < target {
                idx += 1;
            }
            new_particles.push(particles[idx]);
        }
        particles = new_particles;
    }

    estimates
}
```

```csharp
static double NextGaussian(Random rnd, double mean, double std)
{
    double u1 = Math.Max(rnd.NextDouble(), 1e-12);
    double u2 = rnd.NextDouble();
    double z = Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Cos(2.0 * Math.PI * u2);
    return mean + z * std;
}

static List<double> ParticleFilter1d(
    List<double> observations, int nParticles = 200, double processNoise = 1.0, double obsNoise = 2.0, int seed = 42)
{
    var rnd = new Random(seed);
    var particles = Enumerable.Range(0, nParticles).Select(_ => rnd.NextDouble() * 20 - 10).ToArray();
    var estimates = new List<double>();

    foreach (var z in observations)
    {
        // 予測ステップ: 動きのモデルに従い各粒子をノイズ付きで動かす
        for (int i = 0; i < nParticles; i++) particles[i] += NextGaussian(rnd, 0, processNoise);

        // 重み付け(更新)ステップ: 観測値との整合性が高い粒子ほど重みが大きくなる
        var rawWeights = particles.Select(p => Math.Exp(-Math.Pow(z - p, 2) / (2 * obsNoise * obsNoise))).ToArray();
        double totalWeight = rawWeights.Sum();
        var weights = totalWeight == 0
            ? Enumerable.Repeat(1.0 / nParticles, nParticles).ToArray()
            : rawWeights.Select(w => w / totalWeight).ToArray();
        estimates.Add(particles.Zip(weights, (p, w) => p * w).Sum());

        // リサンプリング: 重みに比例した確率で粒子を再抽出する
        var cumulative = new double[nParticles];
        double running = 0;
        for (int i = 0; i < nParticles; i++) { running += weights[i]; cumulative[i] = running; }
        double step = 1.0 / nParticles;
        double start = rnd.NextDouble() * step;
        var newParticles = new double[nParticles];
        int idx = 0;
        for (int i = 0; i < nParticles; i++)
        {
            double target = start + i * step;
            while (cumulative[idx] < target) idx++;
            newParticles[i] = particles[idx];
        }
        particles = newParticles;
    }

    return estimates;
}
```
