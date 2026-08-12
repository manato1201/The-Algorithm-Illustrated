---
name: 最小加加速度軌道(Minimum Jerk Trajectory)
category: 制御・ロボティクス
subcategory: 姿勢・軌道生成
complexity: O(1)(1時刻の軌道評価あたり)
summary: 加速度の変化率(加加速度、ジャーク)の二乗を軌道全体で積分した量を最小化する5次多項式軌道を使うことで、人間の腕の動きに似た、始点・終点で滑らかに静止する自然な動きを生成する。
---

## 概要

[3次スプライン軌道](/algorithms/cubic-spline-trajectory)は複数の経由点をなめらかに結ぶ軌道を生成するが、ロボットアームや自動化された機構が「静止状態から動き出し、また静止状態で止まる」という単純な点対点の動きをする場合、**どれだけ滑らかに加減速すべきか**という問いにはまだ答えていない。最小加加速度軌道は、人間の腕の動きを計測した運動学の研究(フラッシュとホーガンの1985年の研究)に基づき、**加速度の変化率(加加速度、ジャーク)の二乗を軌道全体で積分した値を最小化する**という基準で軌道を設計する。この基準で最適化すると、境界条件(始点・終点で位置・速度・加速度が指定値になる)を満たす軌道は自動的に5次多項式の形になり、人間の自然な腕の動きに近い、始点・終点で滑らかに静止する軌道が得られる。

## 仕組み

1. 始点の位置`x_0`・速度`v_0`(通常0)・加速度`a_0`(通常0)と、終点の位置`x_f`・速度`v_f`(通常0)・加速度`a_f`(通常0)、動作にかける時間`T`を指定する
2. 加加速度の二乗積分`∫[0,T] (d³x/dt³)² dt`を最小化する変分問題を解くと、最適な軌道`x(t)`は**5次多項式**`x(t) = a_0 + a_1 t + a_2 t² + a_3 t³ + a_4 t⁴ + a_5 t⁵`の形になることが数学的に導かれる(境界条件が位置・速度・加速度の3つずつ、合計6個あるため、6個の係数を持つ5次多項式でちょうど決定できる)
3. 6個の境界条件(`x(0)=x_0`, `ẋ(0)=v_0`, `ẍ(0)=a_0`, `x(T)=x_f`, `ẋ(T)=v_f`, `ẍ(T)=a_f`)を使って、6個の多項式係数`a_0, ..., a_5`を連立方程式として解く
4. 典型的な「静止から静止へ」の動き(始点・終点で速度・加速度がともに0)の場合、係数は正規化した時間`τ = t/T`を使って`x(τ) = x_0 + (x_f - x_0)・(10τ³ - 15τ⁴ + 6τ⁵)`という、よく知られたシンプルな形に簡略化できる
5. 求めた多項式`x(t)`を使い、任意の時刻`t`における目標位置・速度・加速度を評価し、[フィードフォワード制御](/algorithms/feedforward-control)や[フィードバック制御](/algorithms/pid-control)への目標値として使う

## 特性・トレードオフ

- **人間の運動に近い自然さ**: ジャーク最小化という基準は、人間の到達運動(手を伸ばして物を取るような動き)の計測データをよく説明することが知られており、ロボットやアニメーションキャラクターの動きを「機械的」ではなく「自然」に見せたい場面で好まれる
- **加速度の急変を避けることによる機械的なメリット**: ジャーク(加加速度)が滑らかであることは、モーターへの負荷変動が急激でないことを意味し、機構への機械的なストレスや振動の励起を減らす効果もある。エレベーターの加減速制御など、乗り心地が重要な用途でも同様の基準が使われる
- **境界条件が単純な場合に閉じた形の解が得られる**: 始点・終点の速度・加速度が0という一般的な設定では、多項式の係数が非常にシンプルな形になり、計算コストがほぼゼロで軌道を生成できる。より複雑な境界条件(経由点を通る、速度制限がある等)を扱う場合は、[3次スプライン軌道](/algorithms/cubic-spline-trajectory)や[ベジェ曲線による軌道生成](/algorithms/bezier-curve-trajectory)のような、より柔軟な表現が必要になる
- **使いどころ**: ロボットアームのピック&プレース動作(始点から終点への単純な到達運動)、CGキャラクターアニメーションの自然な動きの生成、エレベーター・搬送機構の乗り心地を考慮した加減速制御、リハビリテーションロボットにおける人間らしい補助動作の生成

## 実装例

```python
def minimum_jerk_position(t: float, T: float, x0: float, xf: float) -> float:
    """始点・終点で速度・加速度がともに0という一般的なケースの位置を計算する。"""
    if t <= 0:
        return x0
    if t >= T:
        return xf
    tau = t / T
    return x0 + (xf - x0) * (10 * tau ** 3 - 15 * tau ** 4 + 6 * tau ** 5)

def minimum_jerk_velocity(t: float, T: float, x0: float, xf: float) -> float:
    if t <= 0 or t >= T:
        return 0.0
    tau = t / T
    return (xf - x0) / T * (30 * tau ** 2 - 60 * tau ** 3 + 30 * tau ** 4)

def minimum_jerk_acceleration(t: float, T: float, x0: float, xf: float) -> float:
    if t <= 0 or t >= T:
        return 0.0
    tau = t / T
    return (xf - x0) / (T ** 2) * (60 * tau - 180 * tau ** 2 + 120 * tau ** 3)
```

```typescript
function minimumJerkPosition(t: number, T: number, x0: number, xf: number): number {
  if (t <= 0) return x0;
  if (t >= T) return xf;
  const tau = t / T;
  return x0 + (xf - x0) * (10 * tau ** 3 - 15 * tau ** 4 + 6 * tau ** 5);
}

function minimumJerkVelocity(t: number, T: number, x0: number, xf: number): number {
  if (t <= 0 || t >= T) return 0;
  const tau = t / T;
  return ((xf - x0) / T) * (30 * tau ** 2 - 60 * tau ** 3 + 30 * tau ** 4);
}

function minimumJerkAcceleration(t: number, T: number, x0: number, xf: number): number {
  if (t <= 0 || t >= T) return 0;
  const tau = t / T;
  return ((xf - x0) / T ** 2) * (60 * tau - 180 * tau ** 2 + 120 * tau ** 3);
}
```

```cpp
double minimumJerkPosition(double t, double T, double x0, double xf) {
    if (t <= 0) return x0;
    if (t >= T) return xf;
    double tau = t / T;
    return x0 + (xf - x0) * (10 * std::pow(tau, 3) - 15 * std::pow(tau, 4) + 6 * std::pow(tau, 5));
}

double minimumJerkVelocity(double t, double T, double x0, double xf) {
    if (t <= 0 || t >= T) return 0.0;
    double tau = t / T;
    return (xf - x0) / T * (30 * std::pow(tau, 2) - 60 * std::pow(tau, 3) + 30 * std::pow(tau, 4));
}

double minimumJerkAcceleration(double t, double T, double x0, double xf) {
    if (t <= 0 || t >= T) return 0.0;
    double tau = t / T;
    return (xf - x0) / (T * T) * (60 * tau - 180 * std::pow(tau, 2) + 120 * std::pow(tau, 3));
}
```

```rust
fn minimum_jerk_position(t: f64, t_total: f64, x0: f64, xf: f64) -> f64 {
    if t <= 0.0 {
        return x0;
    }
    if t >= t_total {
        return xf;
    }
    let tau = t / t_total;
    x0 + (xf - x0) * (10.0 * tau.powi(3) - 15.0 * tau.powi(4) + 6.0 * tau.powi(5))
}

fn minimum_jerk_velocity(t: f64, t_total: f64, x0: f64, xf: f64) -> f64 {
    if t <= 0.0 || t >= t_total {
        return 0.0;
    }
    let tau = t / t_total;
    (xf - x0) / t_total * (30.0 * tau.powi(2) - 60.0 * tau.powi(3) + 30.0 * tau.powi(4))
}

fn minimum_jerk_acceleration(t: f64, t_total: f64, x0: f64, xf: f64) -> f64 {
    if t <= 0.0 || t >= t_total {
        return 0.0;
    }
    let tau = t / t_total;
    (xf - x0) / t_total.powi(2) * (60.0 * tau - 180.0 * tau.powi(2) + 120.0 * tau.powi(3))
}
```

```csharp
static double MinimumJerkPosition(double t, double T, double x0, double xf)
{
    if (t <= 0) return x0;
    if (t >= T) return xf;
    double tau = t / T;
    return x0 + (xf - x0) * (10 * Math.Pow(tau, 3) - 15 * Math.Pow(tau, 4) + 6 * Math.Pow(tau, 5));
}

static double MinimumJerkVelocity(double t, double T, double x0, double xf)
{
    if (t <= 0 || t >= T) return 0.0;
    double tau = t / T;
    return (xf - x0) / T * (30 * Math.Pow(tau, 2) - 60 * Math.Pow(tau, 3) + 30 * Math.Pow(tau, 4));
}

static double MinimumJerkAcceleration(double t, double T, double x0, double xf)
{
    if (t <= 0 || t >= T) return 0.0;
    double tau = t / T;
    return (xf - x0) / (T * T) * (60 * tau - 180 * Math.Pow(tau, 2) + 120 * Math.Pow(tau, 3));
}
```
