---
name: 勾配降下法
category: 機械学習
subcategory: 最適化基礎
complexity: O(反復回数×n)
summary: 損失関数の勾配と逆方向にパラメータを更新し続けることで最小値に近づく、機械学習全般を支える最適化の基盤。
---

## 概要

霧の中で谷底を目指すとき、「今立っている場所で最も急に下っている方向へ、少しずつ進む」というのが最も自然な戦略だろう。勾配降下法は、この直感を機械学習の**モデルの学習**に応用したもの。モデルの予測がどれだけ間違っているかを表す「損失関数」を、パラメータ空間の"谷"とみなし、その谷底(損失が最小になる場所)を目指してパラメータを少しずつ更新していく。線形回帰からディープラーニングまで、現代の機械学習のほぼ全てを支える最適化の基盤技術。

## 仕組み

1. モデルのパラメータ(重み)を適当な初期値で開始する
2. 現在のパラメータにおける、損失関数の**勾配**(各パラメータをわずかに動かしたときに、損失がどれだけ・どちら向きに変化するか)を計算する
3. 勾配が示す方向とは**逆方向**(損失が小さくなる方向)に、パラメータを一定の歩幅(学習率)だけ動かす
4. 損失が十分小さくなるか、変化がほとんどなくなるまで、2〜3を繰り返す

「勾配は、その地点で最も急に上る方向を指す」という微分の性質を利用し、その真逆に進み続けることで、谷底(損失の最小値)へと少しずつ近づいていく。

## 特性・トレードオフ

- **計算量**: 1回の更新に、全訓練データを使う場合はO(n)(nはデータ数)。反復回数×nが総計算量になる
- **学習率という重要なパラメータ**: 歩幅(学習率)が小さすぎると収束が非常に遅く、大きすぎると谷底を飛び越えて発散してしまう。この調整が実践上の大きな課題で、Adamなどの適応的な学習率調整手法が広く使われている
- **確率的勾配降下法(SGD)という改良**: 毎回全データで勾配を計算する代わりに、少数のサンプル(ミニバッチ)だけで勾配を近似計算することで、1回の更新を高速化し、局所最適から抜け出しやすくする改良版が実務ではほぼ標準になっている
- **使いどころ**: 線形回帰・ロジスティック回帰のパラメータ学習、ニューラルネットワークの全ての重みの学習(誤差逆伝播法と組み合わせて使われる)、機械学習における最適化問題全般の解法の基盤

## 実装例(f(x) = (x - 3)² の最小化)

```python
from typing import Callable


def gradient_descent(
    grad: Callable[[float], float],
    x0: float,
    learning_rate: float = 0.1,
    n_iter: int = 100,
) -> float:
    x = x0
    for _ in range(n_iter):
        x = x - learning_rate * grad(x)
    return x


# f(x) = (x - 3)^2, f'(x) = 2(x - 3)
result = gradient_descent(lambda x: 2 * (x - 3), x0=0.0)
```

```typescript
function gradientDescent(
  grad: (x: number) => number,
  x0: number,
  learningRate: number = 0.1,
  nIter: number = 100,
): number {
  let x = x0;
  for (let i = 0; i < nIter; i++) {
    x = x - learningRate * grad(x);
  }
  return x;
}

// f(x) = (x - 3)^2, f'(x) = 2(x - 3)
const result = gradientDescent((x) => 2 * (x - 3), 0.0);
```

```cpp
#include <functional>

double gradientDescent(std::function<double(double)> grad, double x0,
                        double learningRate = 0.1, int nIter = 100) {
    double x = x0;
    for (int i = 0; i < nIter; i++) {
        x = x - learningRate * grad(x);
    }
    return x;
}

// f(x) = (x - 3)^2, f'(x) = 2(x - 3)
// double result = gradientDescent([](double x) { return 2 * (x - 3); }, 0.0);
```

```rust
fn gradient_descent<F: Fn(f64) -> f64>(
    grad: F,
    x0: f64,
    learning_rate: f64,
    n_iter: u32,
) -> f64 {
    let mut x = x0;
    for _ in 0..n_iter {
        x -= learning_rate * grad(x);
    }
    x
}

// f(x) = (x - 3)^2, f'(x) = 2(x - 3)
// let result = gradient_descent(|x| 2.0 * (x - 3.0), 0.0, 0.1, 100);
```

```csharp
static double GradientDescent(Func<double, double> grad, double x0,
                               double learningRate = 0.1, int nIter = 100)
{
    double x = x0;
    for (int i = 0; i < nIter; i++)
    {
        x = x - learningRate * grad(x);
    }
    return x;
}

// f(x) = (x - 3)^2, f'(x) = 2(x - 3)
// double result = GradientDescent(x => 2 * (x - 3), 0.0);
```
