---
name: アダムス・バシュフォース法(線形多段階法)
category: 数値計算
subcategory: 数値積分・微分方程式
complexity: O(n)(nステップ、各ステップO(1)、過去の微分値は再利用)
summary: 現在の1点だけでなく過去複数ステップで既に計算済みの微分値を再利用して次の値を予測する、常微分方程式の多段階数値解法。
---

## 概要

[オイラー法](/algorithms/eulers-method)や[ルンゲ・クッタ法](/algorithms/runge-kutta-method)は、常微分方程式`dy/dx = f(x,y)`を数値的に解く際、次のステップの値を求めるために**現在の1点の情報だけ**を使う「1段階法」である——[ルンゲ・クッタ法](/algorithms/runge-kutta-method)は精度を上げるために現在のステップ内で`f`を複数回評価するが、それでも「過去のステップで既に計算した微分値」は使い捨てにしている。アダムス・バシュフォース法は、この「過去に計算済みで既にわかっている微分値」を捨てずに再利用するという発想に基づく**線形多段階法**で、直近`k`ステップ分の微分値`f(xₙ, yₙ), f(xₙ₋₁, yₙ₋₁), ...`を使って多項式で補間し、その多項式を積分することで次の値を予測する。新たな関数評価は1ステップにつき1回で済むため、[ルンゲ・クッタ法](/algorithms/runge-kutta-method)と同程度の精度をより少ない関数評価回数で達成できる。

## 仕組み

1. `dy/dx = f(x, y)`、初期値`y(x₀) = y₀`が与えられているとする。多段階法は過去`k`ステップ分の値が必要なため、最初の`k-1`ステップは[ルンゲ・クッタ法](/algorithms/runge-kutta-method)など1段階法で計算しておく(**起動処理**)
2. `k`ステップ分の微分値`f(xₙ, yₙ), f(xₙ₋₁, yₙ₋₁), ..., f(xₙ₋ₖ₊₁, yₙ₋ₖ₊₁)`が揃ったら、これらの点を通る`k-1`次多項式で`f(x,y(x))`を近似し、それを区間`[xₙ, xₙ₊₁]`で積分することで`yₙ₊₁`を予測する
3. 例えば2段階(k=2)のアダムス・バシュフォース法の更新式は
   `yₙ₊₁ = yₙ + h・(3/2・f(xₙ,yₙ) - 1/2・f(xₙ₋₁,yₙ₋₁))`
   4段階(k=4、最も広く使われる)では
   `yₙ₊₁ = yₙ + h/24・(55fₙ - 59fₙ₋₁ + 37fₙ₋₂ - 9fₙ₋₃)`
   という係数(ラグランジュ補間の積分から導かれる定数)を使う
4. `xₙ ← xₙ₊₁`として、最新の`k`個の微分値を保持しながら2〜3を繰り返す。新しいステップで必要な関数評価は`f(xₙ₊₁,yₙ₊₁)`の1回だけで、過去の`f`の値はキャッシュを使い回す

## 特性・トレードオフ

- **1段階法との違い**: [オイラー法](/algorithms/eulers-method)は毎ステップ`f`を1回、[ルンゲ・クッタ法](/algorithms/runge-kutta-method)(4次)は毎ステップ`f`を4回評価する。アダムス・バシュフォース法(k段階)は毎ステップ`f`を1回評価するだけで済み、`f`の計算コストが高い(大規模シミュレーションなど)場合ほど有利になる
- **起動処理が必要**: 過去`k`ステップ分の情報がないと計算を始められないため、最初の数ステップだけは[ルンゲ・クッタ法](/algorithms/runge-kutta-method)など別の1段階法に頼る必要がある——常に1段階法を必要とする点は純粋な多段階法特有の弱点
- **陽解法ゆえの安定性の制約**: 未来の値`yₙ₊₁`を過去の値だけから直接計算する陽解法であるため、[ルンゲ・クッタ法](/algorithms/runge-kutta-method)と同様に硬い方程式(stiff equation、急激に変化する成分を含む微分方程式)では刻み幅`h`を極端に小さくしないと数値的に不安定になりやすい。安定性が求められる硬い方程式には、未来の`f`の値も使うアダムス・モールトン法(陰解法)との組み合わせ(予測子修正子法)がよく使われる
- **精度と段数の関係**: `k`段階のアダムス・バシュフォース法の打ち切り誤差は`O(h^k)`で、段数を増やすほど精度が上がるが、起動処理の手間や刻み幅変更時の再起動コストも増える
- **使いどころ**: 天体力学のような同じ方程式を長時間・多数ステップにわたって積分するシミュレーション(関数評価コストの削減効果が積み重なりやすい)、常微分方程式ソルバーライブラリの内部実装(SciPyの`odeint`やCVODEなど)、[ルンゲ・クッタ法](/algorithms/runge-kutta-method)より計算コストを抑えたい大規模シミュレーション

## 実装例(4段階アダムス・バシュフォース法、起動は4次ルンゲ・クッタ法)

```python
from typing import Callable


def rk4_step(f: Callable[[float, float], float], x: float, y: float, h: float) -> float:
    k1 = f(x, y)
    k2 = f(x + h / 2, y + h / 2 * k1)
    k3 = f(x + h / 2, y + h / 2 * k2)
    k4 = f(x + h, y + h * k3)
    return y + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4)


def adams_bashforth_4(
    f: Callable[[float, float], float], x0: float, y0: float, h: float, n_steps: int
) -> list[tuple[float, float]]:
    xs = [x0]
    ys = [y0]
    # 起動処理: 最初の3ステップは4次ルンゲ・クッタ法で計算
    for _ in range(3):
        y_next = rk4_step(f, xs[-1], ys[-1], h)
        xs.append(xs[-1] + h)
        ys.append(y_next)

    fs = [f(xs[i], ys[i]) for i in range(4)]
    for _ in range(n_steps - 3):
        y_next = ys[-1] + h / 24 * (55 * fs[-1] - 59 * fs[-2] + 37 * fs[-3] - 9 * fs[-4])
        x_next = xs[-1] + h
        xs.append(x_next)
        ys.append(y_next)
        fs.append(f(x_next, y_next))

    return list(zip(xs, ys))


# 例: dy/dx = -y (解析解 y = e^-x)、y(0) = 1
result = adams_bashforth_4(lambda x, y: -y, 0.0, 1.0, 0.1, 20)
```

```typescript
type Derivative = (x: number, y: number) => number;

function rk4Step(f: Derivative, x: number, y: number, h: number): number {
  const k1 = f(x, y);
  const k2 = f(x + h / 2, y + (h / 2) * k1);
  const k3 = f(x + h / 2, y + (h / 2) * k2);
  const k4 = f(x + h, y + h * k3);
  return y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
}

function adamsBashforth4(
  f: Derivative,
  x0: number,
  y0: number,
  h: number,
  nSteps: number,
): [number, number][] {
  const xs = [x0];
  const ys = [y0];
  // 起動処理: 最初の3ステップは4次ルンゲ・クッタ法で計算
  for (let i = 0; i < 3; i++) {
    const yNext = rk4Step(f, xs[xs.length - 1], ys[ys.length - 1], h);
    xs.push(xs[xs.length - 1] + h);
    ys.push(yNext);
  }

  const fs = [0, 1, 2, 3].map((i) => f(xs[i], ys[i]));
  for (let i = 0; i < nSteps - 3; i++) {
    const last = fs.length;
    const yNext =
      ys[ys.length - 1] +
      (h / 24) *
        (55 * fs[last - 1] -
          59 * fs[last - 2] +
          37 * fs[last - 3] -
          9 * fs[last - 4]);
    const xNext = xs[xs.length - 1] + h;
    xs.push(xNext);
    ys.push(yNext);
    fs.push(f(xNext, yNext));
  }

  return xs.map((x, i) => [x, ys[i]]);
}

// 例: dy/dx = -y (解析解 y = e^-x)、y(0) = 1
const result = adamsBashforth4((x, y) => -y, 0, 1, 0.1, 20);
```
