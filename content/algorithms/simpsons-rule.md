---
name: シンプソンの公式
category: 数値計算
subcategory: 数値積分・微分方程式
complexity: O(n)(n分割の場合)
summary: 各区間を直線ではなく放物線で近似することで、台形則よりも大幅に高い精度を同じ分割数で達成する数値積分法。
---

## 概要

[台形則](/algorithms/trapezoidal-rule)は各小区間を直線で近似するため、関数が曲がっている箇所では系統的に誤差が生じる。シンプソンの公式は、隣り合う2つの小区間(3つの分割点)ごとに、その3点を通る放物線(2次関数)を当てはめて面積を近似する。直線よりも放物線の方が関数の曲がり具合を表現できるため、同じ分割数であっても台形則よりずっと高い精度が得られる——実際、シンプソンの公式は3次関数までなら**誤差なく**厳密に積分できるという驚くべき性質を持つ。

## 仕組み

1. 積分区間`[a, b]`を偶数個`n`(2の倍数である必要がある)の等幅の小区間に分割する(幅`h = (b - a) / n`)
2. 各分割点`xᵢ = a + i×h`における関数値`f(xᵢ)`を計算する
3. 隣接する3点`(xᵢ₋₁, f(xᵢ₋₁))`、`(xᵢ, f(xᵢ))`、`(xᵢ₊₁, f(xᵢ₊₁))`を通る放物線の下の面積を積分すると、`h/3 × (f(xᵢ₋₁) + 4f(xᵢ) + f(xᵢ₊₁))`という美しい形の式が導ける
4. これを2区間ずつペアにして全区間で合計すると、シンプソンの公式`∫f(x)dx ≈ h/3 × [f(x₀) + 4f(x₁) + 2f(x₂) + 4f(x₃) + 2f(x₄) + ... + 4f(xₙ₋₁) + f(xₙ)]`が得られる(奇数番目の点の係数は4、偶数番目(端を除く)の点の係数は2という規則的な重み付けになる)

## 特性・トレードオフ

- **計算量**: [台形則](/algorithms/trapezoidal-rule)と同じく`O(n)`(関数評価の回数は変わらない)だが、誤差はおおよそ`O(h⁴)`で減少し、台形則の`O(h²)`よりもはるかに速く精度が向上する——同じ計算コストでより高精度、または同じ精度をより少ない分割数で達成できる
- **3次関数まで厳密**: 放物線での近似にもかかわらず、実は3次関数(3次多項式)までは丸め誤差を除いて完全に正確な値が求まるという理論的な強みがある
- **分割数に制約がある**: 2区間を1組として扱うため、分割数`n`は偶数でなければならない(台形則にはこの制約がない)
- **使いどころ**: 台形則よりも高精度が必要な数値積分全般。工学シミュレーション・統計計算ライブラリの数値積分関数のデフォルト実装としてよく採用される、実務で最も使われる数値積分法のひとつ

## 実装例(f(x) = x² を区間[0, 4]で積分する。真値は64/3 ≈ 21.333)

```python
from typing import Callable


def simpsons_rule(f: Callable[[float], float], a: float, b: float, n: int) -> float:
    if n % 2 != 0:
        raise ValueError("n must be even")
    h = (b - a) / n
    total = f(a) + f(b)
    for i in range(1, n):
        weight = 4 if i % 2 != 0 else 2
        total += weight * f(a + i * h)
    return total * h / 3


# f(x) = x^2 を [0, 4] で積分する(真値は 64/3 ≈ 21.333)
result = simpsons_rule(lambda x: x**2, 0, 4, 100)
```

```typescript
function simpsonsRule(
  f: (x: number) => number,
  a: number,
  b: number,
  n: number
): number {
  if (n % 2 !== 0) throw new Error("n must be even");
  const h = (b - a) / n;
  let total = f(a) + f(b);
  for (let i = 1; i < n; i++) {
    const weight = i % 2 !== 0 ? 4 : 2;
    total += weight * f(a + i * h);
  }
  return (total * h) / 3;
}

// f(x) = x^2 を [0, 4] で積分する(真値は 64/3 ≈ 21.333)
const result = simpsonsRule((x) => x ** 2, 0, 4, 100);
```

```cpp
#include <functional>
#include <stdexcept>

double simpsonsRule(std::function<double(double)> f, double a, double b, int n) {
    if (n % 2 != 0) throw std::invalid_argument("n must be even");
    double h = (b - a) / n;
    double total = f(a) + f(b);
    for (int i = 1; i < n; i++) {
        double weight = (i % 2 != 0) ? 4 : 2;
        total += weight * f(a + i * h);
    }
    return total * h / 3;
}
```

```rust
fn simpsons_rule<F: Fn(f64) -> f64>(f: F, a: f64, b: f64, n: u32) -> f64 {
    assert!(n % 2 == 0, "n must be even");
    let h = (b - a) / n as f64;
    let mut total = f(a) + f(b);
    for i in 1..n {
        let weight = if i % 2 != 0 { 4.0 } else { 2.0 };
        total += weight * f(a + i as f64 * h);
    }
    total * h / 3.0
}
```

```csharp
static double SimpsonsRule(Func<double, double> f, double a, double b, int n)
{
    if (n % 2 != 0) throw new ArgumentException("n must be even");
    double h = (b - a) / n;
    double total = f(a) + f(b);
    for (int i = 1; i < n; i++)
    {
        double weight = (i % 2 != 0) ? 4 : 2;
        total += weight * f(a + i * h);
    }
    return total * h / 3;
}
```
