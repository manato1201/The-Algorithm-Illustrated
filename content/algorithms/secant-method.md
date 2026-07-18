---
name: 割線法
category: 数値計算
subcategory: 求根アルゴリズム
complexity: O(反復回数)(超1次収束、黄金比乗)
summary: 導関数の代わりに直近2点を結ぶ割線の傾きを使う、ニュートン法の「導関数不要版」の求根アルゴリズム。
---

## 概要

[ニュートン法](/algorithms/newton-method)は接線を使って高速に収束するが、関数の導関数`f'(x)`を解析的に求められることが前提になる。複雑な関数やブラックボックスとして扱わざるを得ない関数(シミュレーションの出力など)では、導関数の式を用意できないことがある。割線法は、接線の代わりに「直近2つの推定値を通る割線(セカント線)」の傾きを使ってニュートン法と同じ更新式を近似することで、導関数の計算を一切不要にした求根アルゴリズムである。

## 仕組み

1. 2つの初期推定値`x₀`、`x₁`を用意する(二分法のような符号条件は不要)
2. 直近2点`(xₙ₋₁, f(xₙ₋₁))`と`(xₙ, f(xₙ))`を結ぶ直線(割線)の傾きを、導関数の近似値として使う
3. その割線がx軸と交わる点を次の推定値とする: `xₙ₊₁ = xₙ - f(xₙ) × (xₙ - xₙ₋₁) / (f(xₙ) - f(xₙ₋₁))`
4. `|xₙ₊₁ - xₙ|`が十分小さくなるまで2〜3を繰り返す(計算に使う「直近2点」を1つずつスライドさせながら進める)

## 特性・トレードオフ

- **超1次収束**: 収束の速さは黄金比`φ ≈ 1.618`乗のオーダーになる、いわゆる超1次収束(superlinear convergence)。[ニュートン法](/algorithms/newton-method)の2次収束よりは遅いが、[二分法](/algorithms/bisection-method)の線形収束よりは明確に速い
- **導関数が不要**: 関数の値`f(x)`さえ計算できれば使えるため、導関数の式が手に入らない・計算コストが高い場面で[ニュートン法](/algorithms/newton-method)の代替として重宝する
- **収束の保証はない**: [二分法](/algorithms/bisection-method)のような「必ず収束する」保証はなく、初期の2点の選び方によっては発散したり、根から離れた場所に迷い込むことがある
- **使いどころ**: 導関数が未知・入手困難な非線形方程式の求根。表計算ソフトの「ゴールシーク」機能や、多くの数値計算ライブラリのデフォルトの求根アルゴリズムとして採用されている(擬ニュートン法の一種として)

## 実装例(f(x) = x³ - x - 2 の根 ≈ 1.521380 を求める)

```python
from typing import Callable


def secant_method(
    f: Callable[[float], float],
    x0: float,
    x1: float,
    tol: float = 1e-10,
    max_iter: int = 100,
) -> float:
    for _ in range(max_iter):
        fx0, fx1 = f(x0), f(x1)
        if abs(fx1 - fx0) < 1e-15:
            break
        x2 = x1 - fx1 * (x1 - x0) / (fx1 - fx0)
        if abs(x2 - x1) < tol:
            return x2
        x0, x1 = x1, x2
    return x1


# f(x) = x^3 - x - 2, 初期点として1.0と2.0を使う
root = secant_method(lambda x: x**3 - x - 2, 1.0, 2.0)
```

```typescript
function secantMethod(
  f: (x: number) => number,
  x0: number,
  x1: number,
  tol: number = 1e-10,
  maxIter: number = 100
): number {
  for (let i = 0; i < maxIter; i++) {
    const fx0 = f(x0);
    const fx1 = f(x1);
    if (Math.abs(fx1 - fx0) < 1e-15) break;
    const x2 = x1 - (fx1 * (x1 - x0)) / (fx1 - fx0);
    if (Math.abs(x2 - x1) < tol) return x2;
    x0 = x1;
    x1 = x2;
  }
  return x1;
}

// f(x) = x^3 - x - 2, 初期点として1.0と2.0を使う
const root = secantMethod((x) => x ** 3 - x - 2, 1.0, 2.0);
```

```cpp
#include <cmath>
#include <functional>

double secantMethod(std::function<double(double)> f, double x0, double x1,
                     double tol = 1e-10, int maxIter = 100) {
    for (int i = 0; i < maxIter; i++) {
        double fx0 = f(x0), fx1 = f(x1);
        if (std::abs(fx1 - fx0) < 1e-15) break;
        double x2 = x1 - fx1 * (x1 - x0) / (fx1 - fx0);
        if (std::abs(x2 - x1) < tol) return x2;
        x0 = x1;
        x1 = x2;
    }
    return x1;
}
```

```rust
fn secant_method<F: Fn(f64) -> f64>(
    f: F,
    mut x0: f64,
    mut x1: f64,
    tol: f64,
    max_iter: u32,
) -> f64 {
    for _ in 0..max_iter {
        let fx0 = f(x0);
        let fx1 = f(x1);
        if (fx1 - fx0).abs() < 1e-15 {
            break;
        }
        let x2 = x1 - fx1 * (x1 - x0) / (fx1 - fx0);
        if (x2 - x1).abs() < tol {
            return x2;
        }
        x0 = x1;
        x1 = x2;
    }
    x1
}
```

```csharp
static double SecantMethod(Func<double, double> f, double x0, double x1,
                            double tol = 1e-10, int maxIter = 100)
{
    for (int i = 0; i < maxIter; i++)
    {
        double fx0 = f(x0), fx1 = f(x1);
        if (Math.Abs(fx1 - fx0) < 1e-15) break;
        double x2 = x1 - fx1 * (x1 - x0) / (fx1 - fx0);
        if (Math.Abs(x2 - x1) < tol) return x2;
        x0 = x1;
        x1 = x2;
    }
    return x1;
}
```
