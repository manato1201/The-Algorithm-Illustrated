---
name: ニュートン法(ニュートン・ラフソン法)
category: 数値計算
subcategory: 求根アルゴリズム
complexity: O(反復回数)(1回あたりO(1)、2次収束)
summary: 接線が軸と交わる点へジャンプすることを繰り返し、関数の根に爆発的な速さで収束する求根アルゴリズム。
---

## 概要

方程式`f(x) = 0`を解析的に(手計算の公式で)解けないことは珍しくない——例えば`x = cos(x)`のような超越方程式には代数的な解の公式が存在しない。ニュートン法は、こうした場合でも数値的に根を求めるための最も基本的で強力な手法のひとつで、「現在の推定値における関数の接線を引き、その接線がx軸と交わる点を次の推定値とする」という単純な幾何学的操作を繰り返すだけで、多くの場合わずか数回の反復で根に極めて高い精度で到達する。17世紀にニュートンとラフソンがそれぞれ独立に考案したこの手法は、コンピュータの数値計算ライブラリの内部でも今なお広く使われている。

## 仕組み

1. 初期推定値`x₀`を適当に選ぶ(真の根に近いほど収束が速く、遠すぎたり関数の形が悪いと発散することもある)
2. 現在の推定値`xₙ`における関数の値`f(xₙ)`と導関数の値`f'(xₙ)`を計算する
3. その点での接線(傾き`f'(xₙ)`の直線)がx軸と交わる点を次の推定値とする: `xₙ₊₁ = xₙ - f(xₙ) / f'(xₙ)`
4. `|xₙ₊₁ - xₙ|`が十分小さくなる(収束した)まで、2〜3を繰り返す

導関数`f'(x)`が事前にわかっている(解析的に計算できる)ことが前提になる。手計算できない複雑な関数には、導関数を近似する[割線法](/algorithms/secant-method)が代わりに使われる。

## 特性・トレードオフ

- **2次収束**: 根に十分近づくと、1回の反復ごとに正しい桁数がおおよそ2倍になる(2次収束)。これは[二分法](/algorithms/bisection-method)の1桁ずつ確実に絞り込む線形収束よりも圧倒的に速い
- **収束の保証がない**: 初期値が根から遠い、関数が根の近くで平坦(`f'(x)`がほぼ0)、あるいは関数の形状が悪いと、振動したり発散したりして収束しないことがある。[二分法](/algorithms/bisection-method)のような「必ず収束する」保証はない
- **導関数の計算が必要**: `f'(x)`を解析的に求められない、あるいは計算コストが高い関数には向かない。この制約を避けたい場合は導関数を数値的な差分商で近似する[割線法](/algorithms/secant-method)を使う
- **使いどころ**: 機械学習の最適化([勾配降下法](/algorithms/gradient-descent)の高次元・2階微分版とも言えるニュートン法ベースの最適化手法)、数値計算ライブラリの平方根計算、非線形方程式を含むシミュレーション全般

## 実装例(f(x) = x³ - x - 2 の根 ≈ 1.521380 を求める)

```python
from typing import Callable


def newton_method(
    f: Callable[[float], float],
    fprime: Callable[[float], float],
    x0: float,
    tol: float = 1e-10,
    max_iter: int = 100,
) -> float:
    x = x0
    for _ in range(max_iter):
        fx = f(x)
        if abs(fx) < tol:
            return x
        x = x - fx / fprime(x)
    return x


# f(x) = x^3 - x - 2, f'(x) = 3x^2 - 1
root = newton_method(lambda x: x**3 - x - 2, lambda x: 3 * x**2 - 1, x0=1.5)
```

```typescript
function newtonMethod(
  f: (x: number) => number,
  fprime: (x: number) => number,
  x0: number,
  tol: number = 1e-10,
  maxIter: number = 100
): number {
  let x = x0;
  for (let i = 0; i < maxIter; i++) {
    const fx = f(x);
    if (Math.abs(fx) < tol) return x;
    x = x - fx / fprime(x);
  }
  return x;
}

// f(x) = x^3 - x - 2, f'(x) = 3x^2 - 1
const root = newtonMethod(
  (x) => x ** 3 - x - 2,
  (x) => 3 * x ** 2 - 1,
  1.5
);
```

```cpp
#include <cmath>
#include <functional>

double newtonMethod(std::function<double(double)> f,
                     std::function<double(double)> fprime, double x0,
                     double tol = 1e-10, int maxIter = 100) {
    double x = x0;
    for (int i = 0; i < maxIter; i++) {
        double fx = f(x);
        if (std::abs(fx) < tol) return x;
        x = x - fx / fprime(x);
    }
    return x;
}

// f(x) = x^3 - x - 2, f'(x) = 3x^2 - 1
// double root = newtonMethod(
//     [](double x) { return x * x * x - x - 2; },
//     [](double x) { return 3 * x * x - 1; }, 1.5);
```

```rust
fn newton_method<F: Fn(f64) -> f64, FP: Fn(f64) -> f64>(
    f: F,
    fprime: FP,
    x0: f64,
    tol: f64,
    max_iter: u32,
) -> f64 {
    let mut x = x0;
    for _ in 0..max_iter {
        let fx = f(x);
        if fx.abs() < tol {
            return x;
        }
        x -= fx / fprime(x);
    }
    x
}

// f(x) = x^3 - x - 2, f'(x) = 3x^2 - 1
// let root = newton_method(|x| x.powi(3) - x - 2.0, |x| 3.0 * x.powi(2) - 1.0, 1.5, 1e-10, 100);
```

```csharp
static double NewtonMethod(Func<double, double> f, Func<double, double> fprime,
                            double x0, double tol = 1e-10, int maxIter = 100)
{
    double x = x0;
    for (int i = 0; i < maxIter; i++)
    {
        double fx = f(x);
        if (Math.Abs(fx) < tol) return x;
        x = x - fx / fprime(x);
    }
    return x;
}

// f(x) = x^3 - x - 2, f'(x) = 3x^2 - 1
// double root = NewtonMethod(x => x * x * x - x - 2, x => 3 * x * x - 1, 1.5);
```
