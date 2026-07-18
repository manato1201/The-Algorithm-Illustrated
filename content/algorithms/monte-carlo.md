---
name: モンテカルロ法
category: 最適化・確率的手法
subcategory: 進化的・確率的手法
complexity: O(問題依存)
summary: 乱数を大量に用いたサンプリングで、解析的に解きにくい問題を確率的に近似する。
---

## 概要

解析的に(数式を解いて)厳密に求めるのが難しい問題を、**大量の乱数によるランダムサンプリング**で近似的に解く手法の総称。名前はモナコ公国のカジノで有名な「モンテカルロ」地区に由来し、1940年代にマンハッタン計画に関わったスタニスワフ・ウラムとジョン・フォン・ノイマンが、中性子の挙動をシミュレーションする際に体系化した。

## 仕組み

基本的な発想は、**「解きたい問題を、乱数によって再現できる確率的な実験に置き換え、その実験を大量に繰り返して統計的な答えを得る」**というもの。

代表的な例として、円周率πの推定を考える:
1. 一辺2の正方形の中にランダムな点を大量に打つ
2. その正方形に内接する円の中に入った点の割合を数える
3. 円の面積と正方形の面積の比(π/4)は、この割合にほぼ等しくなるはずなので、割合から π を逆算できる

点を打つ回数を増やすほど、この推定値は真の値に近づいていく(大数の法則)。同じ発想を、積分の近似計算、複雑なシステムのシミュレーション、機械学習における不確実性の推定などに応用できる。

## 特性・トレードオフ

- **計算量**: サンプル数に比例し、精度を上げるにはサンプル数を増やす必要がある。一般に、誤差はサンプル数の平方根に反比例して小さくなる(サンプル数を4倍にすると誤差が半分になる、という緩やかな収束)
- **次元の呪いに強い**: 高次元の積分やシミュレーションでは、格子状に細かく分割する数値計算手法が「次元の呪い」で破綻しやすいのに対し、モンテカルロ法の収束速度は次元数にあまり依存しないという利点がある
- **並列化が容易**: 各サンプルの計算は互いに独立しているため、並列計算機やGPUで大量のサンプルを同時に処理しやすい
- **使いどころ**: 金融工学におけるオプション価格のシミュレーション、原子炉や粒子物理学におけるシミュレーション、ゲームAIの意思決定(モンテカルロ木探索、囲碁AIのAlphaGoにも使われた技術の源流)、複雑な確率分布からのサンプリング(マルコフ連鎖モンテカルロ法など)

## 実装例

一辺2の正方形にランダムな点を打ち、内接円に入った割合からπを推定する例。

```python
import random


def estimate_pi(n_samples: int = 200_000, seed: int = 42) -> float:
    rng = random.Random(seed)
    inside = 0
    for _ in range(n_samples):
        x = rng.uniform(-1, 1)
        y = rng.uniform(-1, 1)
        if x * x + y * y <= 1:
            inside += 1
    return 4 * inside / n_samples
```

```typescript
function estimatePi(nSamples = 200_000): number {
  let inside = 0;
  for (let i = 0; i < nSamples; i++) {
    const x = Math.random() * 2 - 1;
    const y = Math.random() * 2 - 1;
    if (x * x + y * y <= 1) inside++;
  }
  return (4 * inside) / nSamples;
}
```

```cpp
#include <random>

double estimatePi(int nSamples = 200000, unsigned seed = 42) {
    std::mt19937 rng(seed);
    std::uniform_real_distribution<double> dist(-1.0, 1.0);

    int inside = 0;
    for (int i = 0; i < nSamples; i++) {
        double x = dist(rng);
        double y = dist(rng);
        if (x * x + y * y <= 1.0) inside++;
    }
    return 4.0 * inside / nSamples;
}
```

```rust
use rand::Rng;

fn estimate_pi(n_samples: u32, rng: &mut impl Rng) -> f64 {
    let mut inside = 0u32;
    for _ in 0..n_samples {
        let x: f64 = rng.gen_range(-1.0..1.0);
        let y: f64 = rng.gen_range(-1.0..1.0);
        if x * x + y * y <= 1.0 {
            inside += 1;
        }
    }
    4.0 * inside as f64 / n_samples as f64
}
```

```csharp
using System;

static double EstimatePi(int nSamples = 200000, int seed = 42)
{
    var rng = new Random(seed);
    int inside = 0;
    for (int i = 0; i < nSamples; i++)
    {
        double x = rng.NextDouble() * 2 - 1;
        double y = rng.NextDouble() * 2 - 1;
        if (x * x + y * y <= 1.0) inside++;
    }
    return 4.0 * inside / nSamples;
}
```
