---
name: モンテカルロ積分
category: 数値計算
subcategory: 数値積分・微分方程式
complexity: O(N/ε²)(Nはサンプル数、εは目標精度。次元数に依存しない)
summary: 積分したい領域にランダムな点を大量に打ち込み、その点の割合や関数値の平均から積分値を推定する数値積分法で、[台形則](/algorithms/trapezoidal-rule)や[シンプソンの公式](/algorithms/simpsons-rule)が苦手とする高次元の積分でも次元の呪いを受けにくいという際立った特徴を持つ。
---

## 概要

[台形則](/algorithms/trapezoidal-rule)や[シンプソンの公式](/algorithms/simpsons-rule)は、積分区間を格子状に細かく分割して評価点を配置するが、この「格子分割」というアプローチは次元数が増えるにつれて必要な評価点数が指数的に爆発する(次元の呪い、10次元の空間を各軸10分割するだけで100億通りの格子点が必要になる)。モンテカルロ積分は全く異なる発想を取る——積分したい領域にランダムな点を大量にばら撒き、その点における関数値の平均(または、ある条件を満たす点の割合)から積分値を統計的に推定する。ランダムサンプリングに基づくこの手法は、次元数が増えても必要なサンプル数がほとんど増えないという際立った性質を持ち、金融工学やコンピュータグラフィックスのレンダリングなど、極めて高次元の積分を扱う実務分野で不可欠な技術になっている。

## 仕組み

1. **面積・体積の推定(単純な例)**: 関数`f(x)`の下の面積(積分値)を求めたい区間`[a,b]`を囲む長方形を用意し、その長方形内にランダムな点を`N`個打つ
2. 各点が「関数`f(x)`の下側(積分したい領域の内側)」に入るかどうかを判定し、内側に入った点の割合を数える
3. 積分値は「長方形の面積 × 内側に入った点の割合」として推定できる(これは円周率をランダムな点で推定する古典的なモンテカルロ法と全く同じ発想である)
4. **より一般的な期待値ベースの計算**: 積分区間`[a,b]`から一様ランダムに`N`個の点`x₁,...,x_N`をサンプリングし、`(b-a) × (1/N)Σf(xᵢ)`(区間の幅×関数値の標本平均)として積分値を推定する——これは「関数値の平均×区間の幅」が積分の定義そのものであることを直接利用した推定量になっている
5. サンプル数`N`を増やすほど、大数の法則により推定値は真の積分値に確率的に収束していく

## 特性・トレードオフ

- **計算量**: 誤差を`ε`まで減らすのに必要なサンプル数は`O(1/ε²)`——[台形則](/algorithms/trapezoidal-rule)の`O(1/ε)`(誤差が分割数の逆数に比例)と比べると1次元では効率が悪いが、この`O(1/ε²)`という収束率は**次元数に依存しない**という決定的な強みがある
- **「次元の呪い」を受けないという際立った特徴**: [台形則](/algorithms/trapezoidal-rule)や[シンプソンの公式](/algorithms/simpsons-rule)は次元数`d`に対して必要な評価点数が指数的に増加する(`O(1/ε^d)`)のに対し、モンテカルロ積分は次元数に関わらず`O(1/ε²)`のまま——10次元・100次元のような高次元積分では、モンテカルロ積分が現実的に唯一実行可能な手法になることが多い
- **収束が遅く精度の低い結果しか得られないという代償**: 1次元・低次元の積分では、[シンプソンの公式](/algorithms/simpsons-rule)のような決定論的手法の方がずっと少ない評価点数で高精度な結果を得られる。モンテカルロ積分は「次元が高くて他の手法が使えない」場面でこそ真価を発揮する、用途が限定された特殊な道具である
- **分散削減技法による効率化**: 単純なランダムサンプリングは収束が遅いため、実務では層別サンプリング・重点サンプリング・準モンテカルロ法(ランダムではなく低食い違い列を使う)などの分散削減技法を組み合わせて、同じ精度をより少ないサンプル数で達成する工夫が広く使われる
- **使いどころ**: 金融工学におけるオプション価格評価(多数の確率変数が絡む高次元の期待値計算)、コンピュータグラフィックスのパストレーシング(光の経路という高次元の積分をレンダリングに応用)、統計物理学における多体系のシミュレーション、機械学習におけるベイズ推論の周辺尤度計算

## 実装例(f(x) = x² を区間[0, 4]で積分する。真値は64/3 ≈ 21.333)

```python
import random
from typing import Callable, Optional


def monte_carlo_integration(
    f: Callable[[float], float], a: float, b: float, n: int, seed: Optional[int] = None
) -> float:
    rng = random.Random(seed)
    total = sum(f(rng.uniform(a, b)) for _ in range(n))
    return (b - a) * total / n


# f(x) = x^2 を [0, 4] で積分する(真値は 64/3 ≈ 21.333)
result = monte_carlo_integration(lambda x: x**2, 0, 4, 200_000, seed=42)
```

```typescript
function monteCarloIntegration(
  f: (x: number) => number,
  a: number,
  b: number,
  n: number,
  random: () => number = Math.random
): number {
  let total = 0;
  for (let i = 0; i < n; i++) {
    const x = a + random() * (b - a);
    total += f(x);
  }
  return ((b - a) * total) / n;
}

// f(x) = x^2 を [0, 4] で積分する(真値は 64/3 ≈ 21.333)
const result = monteCarloIntegration((x) => x ** 2, 0, 4, 200_000);
```

```cpp
#include <random>
#include <functional>

double monteCarloIntegration(std::function<double(double)> f, double a, double b,
                              int n, unsigned int seed) {
    std::mt19937 rng(seed);
    std::uniform_real_distribution<double> dist(a, b);
    double total = 0;
    for (int i = 0; i < n; i++) {
        total += f(dist(rng));
    }
    return (b - a) * total / n;
}
```

```rust
// 標準ライブラリのみで完結させるための簡易xorshift乱数生成器
struct SimpleRng {
    state: u64,
}

impl SimpleRng {
    fn new(seed: u64) -> Self {
        Self { state: if seed == 0 { 1 } else { seed } }
    }

    fn next_f64(&mut self) -> f64 {
        self.state ^= self.state << 13;
        self.state ^= self.state >> 7;
        self.state ^= self.state << 17;
        (self.state >> 11) as f64 / (1u64 << 53) as f64
    }
}

fn monte_carlo_integration<F: Fn(f64) -> f64>(f: F, a: f64, b: f64, n: u32, seed: u64) -> f64 {
    let mut rng = SimpleRng::new(seed);
    let mut total = 0.0;
    for _ in 0..n {
        let x = a + rng.next_f64() * (b - a);
        total += f(x);
    }
    (b - a) * total / n as f64
}
```

```csharp
static double MonteCarloIntegration(Func<double, double> f, double a, double b,
                                     int n, Random rng)
{
    double total = 0;
    for (int i = 0; i < n; i++)
    {
        double x = a + rng.NextDouble() * (b - a);
        total += f(x);
    }
    return (b - a) * total / n;
}
```
