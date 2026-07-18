---
name: オイラー法
category: 数値計算
subcategory: 数値積分・微分方程式
complexity: O(n)(nステップの場合)
summary: 現在の傾きの方向へ小さく直進することを繰り返すだけで常微分方程式の解曲線を数値的にたどる、最も単純な数値解法。
---

## 概要

「速度が時刻と位置に応じて変化する」というような常微分方程式`dy/dx = f(x, y)`は、解析的に(数式として)解けないことが非常に多い——物理シミュレーションや化学反応のモデルなど、実世界の現象を記述する微分方程式の大半がこれに該当する。オイラー法は、初期値`y(x₀) = y₀`から出発し、「現在の点での傾き`f(x, y)`の方向へ、ごく小さな一定の距離(ステップ幅)だけ直進する」ことを繰り返すだけで、解曲線を近似的にたどっていく、最も基本的な数値解法である。発想としては、地図もGPSもない状態で「今向いている方角にまっすぐ少し進んでは、そこで方角を確認し直す」というナビゲーションに近い。

## 仕組み

1. 初期値`(x₀, y₀)`とステップ幅`h`を決める
2. 現在の点`(xₙ, yₙ)`における傾き`f(xₙ, yₙ)`を計算する
3. その傾きの方向へステップ幅`h`だけ進んだ点を次の点とする: `xₙ₊₁ = xₙ + h`、`yₙ₊₁ = yₙ + h × f(xₙ, yₙ)`
4. 目的の`x`の値に到達するまで2〜3を繰り返す

各ステップで「その瞬間の傾き」だけを使い、区間の途中で傾きが変化することを考慮しないため、ステップ幅`h`を大きく取ると解曲線から大きくずれてしまう。

## 特性・トレードオフ

- **計算量**: `n`ステップで解を求めるには`O(n)`回の関数評価(各ステップ1回)が必要。誤差はステップ幅`h`に比例して減少する(1次の精度)ため、精度を10倍にするにはステップ数をおおよそ10倍にする必要がある
- **精度が低い**: 各ステップで「開始点での傾き」だけを使い、区間内での傾きの変化を無視するため、誤差が蓄積しやすい。同じ計算コストでより高精度な[ルンゲ・クッタ法](/algorithms/runge-kutta-method)がしばしば代わりに使われる
- **実装の単純さ**: 更新式が四則演算だけで書けるため、教育目的や「まず動くものを作る」プロトタイピングには最適。数値解法の考え方(初期値問題を離散的なステップに分解して逐次計算する)を理解する出発点として最も重要
- **使いどころ**: 常微分方程式の概念を学ぶ教材、精度よりも実装の速さ・単純さが優先される簡易シミュレーション。実務での高精度計算には[ルンゲ・クッタ法](/algorithms/runge-kutta-method)や適応的ステップ幅制御を持つ発展的な手法が使われる

## 実装例(dy/dx = y, y(0) = 1 を解く。真の解は y = eˣ)

```python
from typing import Callable, List, Tuple


def euler_method(
    f: Callable[[float, float], float], x0: float, y0: float, h: float, n: int
) -> List[Tuple[float, float]]:
    points = [(x0, y0)]
    x, y = x0, y0
    for _ in range(n):
        y = y + h * f(x, y)
        x = x + h
        points.append((x, y))
    return points


# dy/dx = y, y(0) = 1 (真の解 y = e^x)
result = euler_method(lambda x, y: y, x0=0.0, y0=1.0, h=0.01, n=200)
```

```typescript
function eulerMethod(
  f: (x: number, y: number) => number,
  x0: number,
  y0: number,
  h: number,
  n: number
): [number, number][] {
  const points: [number, number][] = [[x0, y0]];
  let x = x0;
  let y = y0;
  for (let i = 0; i < n; i++) {
    y = y + h * f(x, y);
    x = x + h;
    points.push([x, y]);
  }
  return points;
}

// dy/dx = y, y(0) = 1 (真の解 y = e^x)
const result = eulerMethod((_x, y) => y, 0.0, 1.0, 0.01, 200);
```

```cpp
#include <vector>
#include <utility>
#include <functional>

std::vector<std::pair<double, double>> eulerMethod(
    std::function<double(double, double)> f, double x0, double y0, double h, int n) {
    std::vector<std::pair<double, double>> points;
    points.push_back({x0, y0});
    double x = x0, y = y0;
    for (int i = 0; i < n; i++) {
        y = y + h * f(x, y);
        x = x + h;
        points.push_back({x, y});
    }
    return points;
}

// dy/dx = y, y(0) = 1 (真の解 y = e^x)
// auto result = eulerMethod([](double x, double y) { return y; }, 0.0, 1.0, 0.01, 200);
```

```rust
fn euler_method<F: Fn(f64, f64) -> f64>(
    f: F,
    x0: f64,
    y0: f64,
    h: f64,
    n: u32,
) -> Vec<(f64, f64)> {
    let mut points = vec![(x0, y0)];
    let (mut x, mut y) = (x0, y0);
    for _ in 0..n {
        y += h * f(x, y);
        x += h;
        points.push((x, y));
    }
    points
}

// dy/dx = y, y(0) = 1 (真の解 y = e^x)
// let result = euler_method(|_x, y| y, 0.0, 1.0, 0.01, 200);
```

```csharp
static List<(double x, double y)> EulerMethod(Func<double, double, double> f,
                                               double x0, double y0, double h, int n)
{
    var points = new List<(double, double)> { (x0, y0) };
    double x = x0, y = y0;
    for (int i = 0; i < n; i++)
    {
        y = y + h * f(x, y);
        x = x + h;
        points.Add((x, y));
    }
    return points;
}

// dy/dx = y, y(0) = 1 (真の解 y = e^x)
// var result = EulerMethod((x, y) => y, 0.0, 1.0, 0.01, 200);
```
