---
name: Box-Muller変換(正規分布乱数生成)
category: ゲーム/競技プログラミング
subcategory: ゲームバランス・乱数制御
complexity: O(1)(1組の正規乱数生成あたり)
summary: 2つの独立な一様乱数から、対数と三角関数を使った変数変換によって2つの独立な標準正規分布乱数を同時に生成する手法。ダメージ量やドロップ量に「平均値付近に集中しつつ稀に大きく外れる」自然なばらつきを持たせる用途に使われる。
---

## 概要

[メルセンヌ・ツイスタ](/algorithms/mersenne-twister)や[XorShift法](/algorithms/xorshift)のような一般的な擬似乱数生成器は、`[0, 1)`のような区間に一様に分布する乱数を生成する。しかし「ダメージ量に自然なばらつきを持たせたい」「平均値付近には多く出現し、稀に大きく外れた値も出てほしい」というゲームデザイン上の要求には、一様分布ではなく**正規分布(ガウス分布)**に従う乱数の方が適している。Box-Muller変換は、George E. P. BoxとMervin E. Mullerが1958年に発表した手法で、**2つの独立な一様乱数`u1, u2`を入力として、対数関数と三角関数を組み合わせた変数変換を1回適用するだけで、2つの独立な標準正規分布N(0,1)に従う乱数を同時に生成できる**。乱数の分布そのものを変換する数理的な手法であり、シミュレーションやプロシージャル生成、ゲームバランス調整など幅広い場面で使われる。

## 仕組み

1. **一様乱数を2個用意する**: 既存の一様乱数生成器([メルセンヌ・ツイスタ](/algorithms/mersenne-twister)や[XorShift法](/algorithms/xorshift)など)から、`u1, u2 ∈ (0, 1)`となる独立な一様乱数を2個取得する(`u1`は対数を取るため厳密に0より大きい必要がある)
2. **極形式(基本形)による変換**: 以下の式で2つの標準正規分布乱数`z0, z1`を計算する:
   `z0 = √(-2 ln u1) · cos(2π u2)`
   `z1 = √(-2 ln u1) · sin(2π u2)`
   直感的には、`√(-2 ln u1)`が2次元平面上の点の「原点からの距離(動径)」を、`2π u2`が「角度」を決めており、この動径分布と角度分布の組み合わせが、2次元の標準正規分布(x, y成分が互いに独立なN(0,1))と数学的に一致することが導出できる
3. **平均・標準偏差の変換**: 標準正規分布`z`から、任意の平均`μ`・標準偏差`σ`を持つ正規分布の乱数`x`を得るには`x = μ + σ・z`とスケーリングする
4. **2個同時に得られることの活用**: 1回の変換で`z0, z1`という独立な2個の正規乱数が得られるため、実装では1個をすぐ返し、もう1個をキャッシュしておいて次回の呼び出しで再計算なしに返す、という最適化がよく行われる
5. **Marsaglia極座標法(発展形)**: 三角関数の計算コストを避けたい場合、単位円内に一様分布する点をリジェクションサンプリングで生成し(円の外側の点は棄却し再サンプリング)、`sin`/`cos`の代わりに円内の点の座標比を使う変種(Marsaglia polar method)が広く使われる。平均で`4/π ≈ 1.27`回のサンプリングが必要になるが、`sin`/`cos`の呼び出しを避けられる

## 特性・トレードオフ

- **正確な正規分布が得られる**: 中心極限定理を利用した近似法(複数の一様乱数の和を使う手法など)と異なり、Box-Muller変換は理論上**厳密に**標準正規分布に従う乱数を生成する
- **計算コスト**: `ln`・`sqrt`・`sin`・`cos`という比較的重い関数呼び出しが必要になる。三角関数のコストを避けたい場合はMarsaglia極座標法が代替になるが、リジェクションサンプリングのため呼び出し回数が非決定的になる
- **一様乱数生成器への依存**: Box-Muller変換自体は分布の変換手法であり、入力となる一様乱数の品質(周期の長さ、統計的偏りのなさ)にそのまま依存する。土台の一様乱数生成器には[メルセンヌ・ツイスタ](/algorithms/mersenne-twister)や[XorShift法](/algorithms/xorshift)のような十分な品質を持つものを選ぶ必要がある
- **ゲームデザインでの使いどころ**: 単純な一様乱数でダメージ幅を決めると「最小値と最大値が同じくらいの頻度で出る」不自然な体感になりやすいが、正規分布を使うと「平均ダメージ付近が頻出し、会心の一撃のような外れ値は稀に起こる」という直感に合った分布を作れる。ドロップ量の変動、敵の出現間隔のゆらぎ、プロシージャル地形生成でのパラメータのばらつきにも応用できる
- **使いどころ**: RPGのダメージ計算式に自然な分散を持たせる、モンテカルロシミュレーションの入力ノイズ生成、統計的検証を伴う物理演算・AIの意思決定への揺らぎ付与、[モンテカルロ法](/algorithms/monte-carlo)における正規分布サンプリング

## 実装例

```python
import math
import random


class BoxMuller:
    def __init__(self, rng: random.Random | None = None) -> None:
        self._rng = rng or random.Random()
        self._cached: float | None = None

    def next_gaussian(self, mean: float = 0.0, stddev: float = 1.0) -> float:
        """標準正規分布から生成した値をmean, stddevでスケーリングして返す。"""
        if self._cached is not None:
            z = self._cached
            self._cached = None
            return mean + stddev * z

        u1 = self._rng.random()
        while u1 <= 1e-12:  # ln(0)を避ける
            u1 = self._rng.random()
        u2 = self._rng.random()

        radius = math.sqrt(-2.0 * math.log(u1))
        theta = 2.0 * math.pi * u2

        z0 = radius * math.cos(theta)
        z1 = radius * math.sin(theta)
        self._cached = z1
        return mean + stddev * z0
```

```typescript
class BoxMuller {
  private cached: number | null = null;
  constructor(private rand: () => number = Math.random) {}

  nextGaussian(mean = 0, stddev = 1): number {
    if (this.cached !== null) {
      const z = this.cached;
      this.cached = null;
      return mean + stddev * z;
    }

    let u1 = this.rand();
    while (u1 <= 1e-12) u1 = this.rand(); // ln(0)を避ける
    const u2 = this.rand();

    const radius = Math.sqrt(-2 * Math.log(u1));
    const theta = 2 * Math.PI * u2;

    const z0 = radius * Math.cos(theta);
    const z1 = radius * Math.sin(theta);
    this.cached = z1;
    return mean + stddev * z0;
  }
}
```

```cpp
#include <cmath>
#include <optional>
#include <random>

class BoxMuller {
    std::mt19937 rng;
    std::uniform_real_distribution<double> uni{0.0, 1.0};
    std::optional<double> cached;

public:
    explicit BoxMuller(uint32_t seed) : rng(seed) {}

    double nextGaussian(double mean = 0.0, double stddev = 1.0) {
        if (cached) {
            double z = *cached;
            cached.reset();
            return mean + stddev * z;
        }

        double u1 = uni(rng);
        while (u1 <= 1e-12) u1 = uni(rng);
        double u2 = uni(rng);

        double radius = std::sqrt(-2.0 * std::log(u1));
        double theta = 2.0 * M_PI * u2;

        double z0 = radius * std::cos(theta);
        double z1 = radius * std::sin(theta);
        cached = z1;
        return mean + stddev * z0;
    }
};
```

```rust
use rand::Rng;
use std::f64::consts::PI;

struct BoxMuller {
    cached: Option<f64>,
}

impl BoxMuller {
    fn new() -> Self {
        BoxMuller { cached: None }
    }

    fn next_gaussian(&mut self, rng: &mut impl Rng, mean: f64, stddev: f64) -> f64 {
        if let Some(z) = self.cached.take() {
            return mean + stddev * z;
        }

        let mut u1: f64 = rng.gen();
        while u1 <= 1e-12 {
            u1 = rng.gen();
        }
        let u2: f64 = rng.gen();

        let radius = (-2.0 * u1.ln()).sqrt();
        let theta = 2.0 * PI * u2;

        let z0 = radius * theta.cos();
        let z1 = radius * theta.sin();
        self.cached = Some(z1);
        mean + stddev * z0
    }
}
```

```csharp
class BoxMuller
{
    readonly Random rand;
    double? cached;

    public BoxMuller(Random rand)
    {
        this.rand = rand;
    }

    public double NextGaussian(double mean = 0.0, double stddev = 1.0)
    {
        if (cached.HasValue)
        {
            double z = cached.Value;
            cached = null;
            return mean + stddev * z;
        }

        double u1 = rand.NextDouble();
        while (u1 <= 1e-12) u1 = rand.NextDouble();
        double u2 = rand.NextDouble();

        double radius = Math.Sqrt(-2.0 * Math.Log(u1));
        double theta = 2.0 * Math.PI * u2;

        double z0 = radius * Math.Cos(theta);
        double z1 = radius * Math.Sin(theta);
        cached = z1;
        return mean + stddev * z0;
    }
}
```
