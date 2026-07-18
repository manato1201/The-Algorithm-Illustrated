---
name: 台形則
category: 数値計算
subcategory: 数値積分・微分方程式
complexity: O(n)(n分割の場合)
summary: 関数を短い区間ごとに台形で近似し、その面積の合計で定積分を数値的に見積もる最も基本的な数値積分法。
---

## 概要

定積分`∫f(x)dx`は「グラフとx軸に挟まれた面積」を表すが、`f(x)`が複雑だったり、そもそも数式ではなく離散的な測定データ(センサーの記録など)しかない場合、解析的に積分を計算することはできない。台形則は、積分区間を細かく等分し、各小区間で関数を直線(台形の上辺)で近似することで、面積の合計を数値的に見積もる、最も直感的でシンプルな数値積分法である。

## 仕組み

1. 積分区間`[a, b]`を`n`個の等幅の小区間に分割する(幅`h = (b - a) / n`)
2. 各分割点`xᵢ = a + i×h`(`i = 0, 1, ..., n`)における関数値`f(xᵢ)`を計算する
3. 隣接する2点`(xᵢ, f(xᵢ))`と`(xᵢ₊₁, f(xᵢ₊₁))`を結ぶ台形の面積`h × (f(xᵢ) + f(xᵢ₊₁)) / 2`を計算する
4. 全ての小区間の台形の面積を合計する: `∫f(x)dx ≈ h × [f(x₀)/2 + f(x₁) + f(x₂) + ... + f(xₙ₋₁) + f(xₙ)/2]`(両端だけ半分の重みになるのは、隣接する台形同士で内部の点の値が2回ずつ数えられるため)

## 特性・トレードオフ

- **計算量**: `n`個の分割点それぞれで関数を1回評価するだけなので`O(n)`。分割数`n`を増やすほど誤差は小さくなるが(誤差はおおよそ`O(h²)`で減少)、計算コストも線形に増える
- **直線近似の限界**: 各区間を直線(1次関数)で近似するため、関数が急激に曲がっている区間では誤差が大きくなりやすい。より高次の曲線(放物線)で近似する[シンプソンの公式](/algorithms/simpsons-rule)を使うと、同じ分割数でも大幅に精度が向上する
- **離散データにも適用できる**: 数式で表せない、センサーなどから得た離散的なサンプル点の列にもそのまま適用できる汎用性がある(シンプソンの公式は偶数個の区間が必要などの制約があるのに対し、台形則はどんな分割数でも使える)
- **使いどころ**: 数式が複雑または存在しない積分の近似計算、実験データから面積・累積量を見積もる場面(速度データから移動距離を求める等)、より高精度な数値積分法(シンプソンの公式、ガウス求積法等)を理解する前段の基礎

## 実装例(f(x) = x² を区間[0, 4]で積分する。真値は64/3 ≈ 21.333)

```python
from typing import Callable


def trapezoidal_rule(f: Callable[[float], float], a: float, b: float, n: int) -> float:
    h = (b - a) / n
    total = (f(a) + f(b)) / 2
    for i in range(1, n):
        total += f(a + i * h)
    return total * h


# f(x) = x^2 を [0, 4] で積分する(真値は 64/3 ≈ 21.333)
result = trapezoidal_rule(lambda x: x**2, 0, 4, 1000)
```

```typescript
function trapezoidalRule(
  f: (x: number) => number,
  a: number,
  b: number,
  n: number
): number {
  const h = (b - a) / n;
  let total = (f(a) + f(b)) / 2;
  for (let i = 1; i < n; i++) {
    total += f(a + i * h);
  }
  return total * h;
}

// f(x) = x^2 を [0, 4] で積分する(真値は 64/3 ≈ 21.333)
const result = trapezoidalRule((x) => x ** 2, 0, 4, 1000);
```

```cpp
#include <functional>

double trapezoidalRule(std::function<double(double)> f, double a, double b, int n) {
    double h = (b - a) / n;
    double total = (f(a) + f(b)) / 2;
    for (int i = 1; i < n; i++) {
        total += f(a + i * h);
    }
    return total * h;
}
```

```rust
fn trapezoidal_rule<F: Fn(f64) -> f64>(f: F, a: f64, b: f64, n: u32) -> f64 {
    let h = (b - a) / n as f64;
    let mut total = (f(a) + f(b)) / 2.0;
    for i in 1..n {
        total += f(a + i as f64 * h);
    }
    total * h
}
```

```csharp
static double TrapezoidalRule(Func<double, double> f, double a, double b, int n)
{
    double h = (b - a) / n;
    double total = (f(a) + f(b)) / 2;
    for (int i = 1; i < n; i++)
    {
        total += f(a + i * h);
    }
    return total * h;
}
```
