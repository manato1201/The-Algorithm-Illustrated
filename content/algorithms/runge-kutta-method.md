---
name: ルンゲ・クッタ法(RK4)
category: 数値計算
subcategory: 数値積分・微分方程式
complexity: O(n)(nステップ、1ステップあたり4回の関数評価)
summary: 区間内の複数地点で傾きをサンプリングし加重平均を取ることで、オイラー法より桁違いに高精度な常微分方程式の数値解法。
---

## 概要

[オイラー法](/algorithms/eulers-method)は各ステップの開始点での傾きだけを使うため、区間内で傾きが変化する状況をうまく捉えられず誤差が蓄積しやすい。ルンゲ・クッタ法(特に広く使われる4次のRK4)は、1ステップを進む際に区間の始点・中間点(2回)・終点という4つの地点でそれぞれ傾きを評価し、それらを重み付き平均することで「区間内での傾きの変化」を織り込んだ、はるかに正確な更新を行う。天体力学のシミュレーションからゲームの物理演算まで、常微分方程式を解く場面のデファクトスタンダードとして広く使われている。

## 仕組み

1. 初期値`(x₀, y₀)`とステップ幅`h`を決める
2. 現在の点`(xₙ, yₙ)`から、以下の4つの傾き(勾配の推定値)を順に計算する:
   - `k₁ = f(xₙ, yₙ)`(区間の始点での傾き)
   - `k₂ = f(xₙ + h/2, yₙ + h×k₁/2)`(`k₁`を使って区間の中間点まで仮に進んだ場合の傾き)
   - `k₃ = f(xₙ + h/2, yₙ + h×k₂/2)`(`k₂`を使って中間点まで仮に進んだ場合の傾き、より精度の高い中間点の推定)
   - `k₄ = f(xₙ + h, yₙ + h×k₃)`(`k₃`を使って区間の終点まで仮に進んだ場合の傾き)
3. 4つの傾きの加重平均で次の点を求める: `yₙ₊₁ = yₙ + h/6 × (k₁ + 2k₂ + 2k₃ + k₄)`(中間点の推定値`k₂`、`k₃`を2倍重視するのが特徴)
4. 目的の`x`まで2〜3を繰り返す

## 特性・トレードオフ

- **計算量**: 1ステップあたり4回の関数評価が必要なので[オイラー法](/algorithms/eulers-method)の4倍のコストがかかるが、誤差はステップ幅`h`の4乗に比例して減少する(4次の精度)ため、同程度の精度を得るのに必要な総ステップ数ははるかに少なくて済む——結果として全体の計算コストはオイラー法よりずっと少なくなることが多い
- **精度とコストの優れたバランス**: さらに高次の手法(次数を上げるほど1ステップのコストが増える)も存在するが、RK4は精度と実装の単純さのバランスが良く、常微分方程式の数値解法の「まず選ぶべき定番」として広く定着している
- **固定ステップ幅の限界**: 標準的なRK4はステップ幅`h`を固定するため、解の変化が急激な区間と緩やかな区間で同じ精度・コストの配分をしてしまう。実用のライブラリでは誤差を推定してステップ幅を自動調整する適応型のルンゲ・クッタ法(Runge-Kutta-Fehlberg法等)が使われることが多い
- **使いどころ**: 物理シミュレーション(天体軌道、剛体力学)、化学反応の速度論モデル、制御工学のシステムシミュレーション。ゲームエンジンの物理演算でも、単純なオイラー積分より安定した動きを得るために採用されることがある

## 実装例(dy/dx = y, y(0) = 1 を解く。真の解は y = eˣ)

```python
from typing import Callable, List, Tuple


def runge_kutta_method(
    f: Callable[[float, float], float], x0: float, y0: float, h: float, n: int
) -> List[Tuple[float, float]]:
    points = [(x0, y0)]
    x, y = x0, y0
    for _ in range(n):
        k1 = f(x, y)
        k2 = f(x + h / 2, y + h * k1 / 2)
        k3 = f(x + h / 2, y + h * k2 / 2)
        k4 = f(x + h, y + h * k3)
        y = y + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
        x = x + h
        points.append((x, y))
    return points


# dy/dx = y, y(0) = 1 (真の解 y = e^x)
result = runge_kutta_method(lambda x, y: y, x0=0.0, y0=1.0, h=0.01, n=200)
```

```typescript
function rungeKuttaMethod(
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
    const k1 = f(x, y);
    const k2 = f(x + h / 2, y + (h * k1) / 2);
    const k3 = f(x + h / 2, y + (h * k2) / 2);
    const k4 = f(x + h, y + h * k3);
    y = y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    x = x + h;
    points.push([x, y]);
  }
  return points;
}

// dy/dx = y, y(0) = 1 (真の解 y = e^x)
const result = rungeKuttaMethod((_x, y) => y, 0.0, 1.0, 0.01, 200);
```

```cpp
#include <vector>
#include <utility>
#include <functional>

std::vector<std::pair<double, double>> rungeKuttaMethod(
    std::function<double(double, double)> f, double x0, double y0, double h, int n) {
    std::vector<std::pair<double, double>> points;
    points.push_back({x0, y0});
    double x = x0, y = y0;
    for (int i = 0; i < n; i++) {
        double k1 = f(x, y);
        double k2 = f(x + h / 2, y + h * k1 / 2);
        double k3 = f(x + h / 2, y + h * k2 / 2);
        double k4 = f(x + h, y + h * k3);
        y = y + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
        x = x + h;
        points.push_back({x, y});
    }
    return points;
}
```

```rust
fn runge_kutta_method<F: Fn(f64, f64) -> f64>(
    f: F,
    x0: f64,
    y0: f64,
    h: f64,
    n: u32,
) -> Vec<(f64, f64)> {
    let mut points = vec![(x0, y0)];
    let (mut x, mut y) = (x0, y0);
    for _ in 0..n {
        let k1 = f(x, y);
        let k2 = f(x + h / 2.0, y + h * k1 / 2.0);
        let k3 = f(x + h / 2.0, y + h * k2 / 2.0);
        let k4 = f(x + h, y + h * k3);
        y += h / 6.0 * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
        x += h;
        points.push((x, y));
    }
    points
}
```

```csharp
static List<(double x, double y)> RungeKuttaMethod(Func<double, double, double> f,
                                                     double x0, double y0, double h, int n)
{
    var points = new List<(double, double)> { (x0, y0) };
    double x = x0, y = y0;
    for (int i = 0; i < n; i++)
    {
        double k1 = f(x, y);
        double k2 = f(x + h / 2, y + h * k1 / 2);
        double k3 = f(x + h / 2, y + h * k2 / 2);
        double k4 = f(x + h, y + h * k3);
        y = y + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
        x = x + h;
        points.Add((x, y));
    }
    return points;
}
```
