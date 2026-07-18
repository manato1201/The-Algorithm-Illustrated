---
name: 二分法(区間二分法)
category: 数値計算
subcategory: 求根アルゴリズム
complexity: O(log(1/ε))(εは目標精度)
summary: 符号が反転する区間を半分ずつに絞り込み続けるだけで、必ず根に収束することを保証する最も素朴な求根アルゴリズム。
---

## 概要

連続関数`f(x)`が区間の両端で異符号(`f(a) < 0`かつ`f(b) > 0`、あるいはその逆)であれば、中間値の定理により、区間`[a, b]`の中に必ず`f(x) = 0`となる点が存在する。二分法は、この事実だけを使って根を絞り込む——区間の中点`m`を計算し、`f(m)`の符号を調べて「根は`[a, m]`にあるか`[m, b]`にあるか」を判定し、根を含む方の半区間に絞り込むことを繰り返す。[二分探索](/algorithms/binary-search)が配列の中から値を探すのと全く同じ発想を、連続関数の根探しに応用したものと言える。

## 仕組み

1. `f(a)`と`f(b)`が異符号であることを確認する(この前提が崩れると二分法は使えない)
2. 区間の中点`m = (a + b) / 2`を計算し、`f(m)`を評価する
3. `f(m)`が十分0に近ければ、`m`を根の近似解として終了する
4. `f(a)`と`f(m)`が異符号なら根は`[a, m]`にあるので`b = m`と更新する。そうでなければ根は`[m, b]`にあるので`a = m`と更新する
5. 区間の幅`|b - a|`が目標精度`ε`を下回るまで2〜4を繰り返す

## 特性・トレードオフ

- **計算量**: 区間の幅は1反復ごとに半分になるので、目標精度`ε`に到達するまでの反復回数は`O(log(1/ε))`。桁数を1つ増やすのに毎回同じ回数の反復が必要になる、着実だが控えめな線形収束
- **収束が保証される**: 開始時に「両端で異符号」という条件さえ満たしていれば、関数がどんなに複雑でも(不連続でない限り)必ず根に収束する。[ニュートン法](/algorithms/newton-method)のように発散する心配がない、最も頑健な求根法
- **収束速度は遅い**: 1回の反復で得られる情報は「符号」という1ビットだけなので、[ニュートン法](/algorithms/newton-method)の2次収束と比べると収束は格段に遅い。実用の数値計算ライブラリでは、まず二分法で大まかに絞り込んでからニュートン法に切り替える、というハイブリッド戦略もよく使われる
- **使いどころ**: 導関数が求めにくい・存在しない関数の求根、必ず収束することを優先したい場面(初期値の選び方に神経質にならなくてよい)、二分探索的な「絞り込み」の考え方を連続量に適用する一般的なパターンの原型

## 実装例(f(x) = x³ - x - 2 の根 ≈ 1.521380 を求める)

```python
from typing import Callable


def bisection_method(
    f: Callable[[float], float],
    a: float,
    b: float,
    tol: float = 1e-10,
    max_iter: int = 200,
) -> float:
    fa, fb = f(a), f(b)
    if fa * fb > 0:
        raise ValueError("f(a) and f(b) must have opposite signs")
    for _ in range(max_iter):
        m = (a + b) / 2
        fm = f(m)
        if abs(fm) < tol or (b - a) / 2 < tol:
            return m
        if fa * fm < 0:
            b, fb = m, fm
        else:
            a, fa = m, fm
    return (a + b) / 2


# f(x) = x^3 - x - 2 は f(1) < 0, f(2) > 0 なので [1, 2] に根を持つ
root = bisection_method(lambda x: x**3 - x - 2, 1.0, 2.0)
```

```typescript
function bisectionMethod(
  f: (x: number) => number,
  a: number,
  b: number,
  tol: number = 1e-10,
  maxIter: number = 200
): number {
  let fa = f(a);
  let fb = f(b);
  if (fa * fb > 0) throw new Error("f(a) and f(b) must have opposite signs");
  for (let i = 0; i < maxIter; i++) {
    const m = (a + b) / 2;
    const fm = f(m);
    if (Math.abs(fm) < tol || (b - a) / 2 < tol) return m;
    if (fa * fm < 0) {
      b = m;
      fb = fm;
    } else {
      a = m;
      fa = fm;
    }
  }
  return (a + b) / 2;
}

// f(x) = x^3 - x - 2 は f(1) < 0, f(2) > 0 なので [1, 2] に根を持つ
const root = bisectionMethod((x) => x ** 3 - x - 2, 1.0, 2.0);
```

```cpp
#include <cmath>
#include <functional>
#include <stdexcept>

double bisectionMethod(std::function<double(double)> f, double a, double b,
                        double tol = 1e-10, int maxIter = 200) {
    double fa = f(a), fb = f(b);
    if (fa * fb > 0) throw std::invalid_argument("f(a) and f(b) must have opposite signs");
    for (int i = 0; i < maxIter; i++) {
        double m = (a + b) / 2;
        double fm = f(m);
        if (std::abs(fm) < tol || (b - a) / 2 < tol) return m;
        if (fa * fm < 0) {
            b = m;
            fb = fm;
        } else {
            a = m;
            fa = fm;
        }
    }
    return (a + b) / 2;
}
```

```rust
fn bisection_method<F: Fn(f64) -> f64>(
    f: F,
    mut a: f64,
    mut b: f64,
    tol: f64,
    max_iter: u32,
) -> f64 {
    let mut fa = f(a);
    let mut fb = f(b);
    assert!(fa * fb <= 0.0, "f(a) and f(b) must have opposite signs");
    for _ in 0..max_iter {
        let m = (a + b) / 2.0;
        let fm = f(m);
        if fm.abs() < tol || (b - a) / 2.0 < tol {
            return m;
        }
        if fa * fm < 0.0 {
            b = m;
            fb = fm;
        } else {
            a = m;
            fa = fm;
        }
    }
    (a + b) / 2.0
}
```

```csharp
static double BisectionMethod(Func<double, double> f, double a, double b,
                               double tol = 1e-10, int maxIter = 200)
{
    double fa = f(a), fb = f(b);
    if (fa * fb > 0) throw new ArgumentException("f(a) and f(b) must have opposite signs");
    for (int i = 0; i < maxIter; i++)
    {
        double m = (a + b) / 2;
        double fm = f(m);
        if (Math.Abs(fm) < tol || (b - a) / 2 < tol) return m;
        if (fa * fm < 0)
        {
            b = m; fb = fm;
        }
        else
        {
            a = m; fa = fm;
        }
    }
    return (a + b) / 2;
}
```
