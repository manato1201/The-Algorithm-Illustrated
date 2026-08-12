---
name: フィードフォワード制御(モデルベース補償)
category: 制御・ロボティクス
subcategory: フィードバック制御
complexity: O(1)(1制御ステップあたり)
summary: 誤差を検出してから反応する[PID制御](/algorithms/pid-control)とは逆に、目標の動きとシステムのモデル(逆モデル)から必要な制御入力を先回りして計算することで、誤差が生じる前に補償を加え、フィードバック制御の遅れを補う。
---

## 概要

[PID制御](/algorithms/pid-control)のようなフィードバック制御は、目標値と実際の出力の**誤差を検出してから**制御入力を調整するため、原理的に「誤差が生じてから反応する」という遅れを避けられない。フィードフォワード制御は発想を逆転させ、**システムがどう振る舞うかを表す数学的モデル(順モデル)の逆モデルを使い、目標の動き自体から必要な制御入力を先回りして計算し、印加する**。例えばロボットアームを素早く動かしたい場合、目標の加速度パターンが分かっていれば、そのために必要なモーターのトルクをニュートンの運動方程式の逆算(逆モデル)から直接求めて先に与えることができる。単独では外乱やモデルの誤差に対応できないが、[PID制御](/algorithms/pid-control)のようなフィードバック制御と組み合わせることで、フィードバックだけでは避けられない遅れを大きく減らせる。

## 仕組み

1. 制御対象の**順モデル**(制御入力`u`を加えたときにシステムがどう応答するかを表す数学モデル、例えば`力 = 質量 × 加速度`のような物理法則)を用意する
2. 順モデルを**逆算**し、「望みの出力(目標軌道)を実現するには、どんな制御入力が必要か」を計算する逆モデルを導出する。例えば目標の位置軌道`x_d(t)`が分かっていれば、その2階微分(加速度)にシステムの質量を掛けることで、必要な力(制御入力)`u_ff(t) = m・ẍ_d(t)`が先回りして計算できる
3. 制御ループの各ステップで、この逆モデルから計算したフィードフォワード入力`u_ff`を、システムに直接印加する
4. 多くの実装では、フィードフォワード入力だけでは吸収しきれないモデルの誤差や外乱を補正するため、[PID制御](/algorithms/pid-control)のようなフィードバック制御の出力`u_fb`(実際の誤差に基づく補正)を**加算**する:`u = u_ff + u_fb`。フィードフォワードが「大まかな仕事の大半」を先回りして担い、フィードバックは「モデルが捉えきれなかった細かいズレ」だけを補正する、という役割分担になる

## 特性・トレードオフ

- **フィードバックの構造的な遅れを補う**: フィードバック制御は誤差が生じてから反応するため、目標が急に変化する場面(高速な軌道追従など)では追従が遅れがちになる。フィードフォワードは目標の変化を事前に知っているという情報を活かし、この遅れを原理的に解消できる
- **モデルの精度に性能が直結する**: フィードフォワードの補償の質は、使用する逆モデルがどれだけ正確に実システムを表現しているかに依存する。モデルに誤差があれば、フィードフォワードの補償自体も誤差を含み、その誤差はフィードバックで補正しなければならない。実システムのパラメータ(質量、摩擦係数など)を正確に同定する作業(システム同定)が実務上重要になる
- **フィードバックとの組み合わせが実務上の標準形**: フィードフォワード単体では外乱(予期しない力、モデルにない摩擦の変化など)に対応できないため、実務ではほぼ必ず[PID制御](/algorithms/pid-control)や[LQR](/algorithms/lqr-control)のようなフィードバック制御と組み合わせて使われる。この「フィードフォワード+フィードバック」という構成は、産業用ロボット・CNC工作機械の軌道制御で標準的なパターンである
- **使いどころ**: 産業用ロボットアームの高速・高精度な軌道追従、CNC工作機械の位置決め制御、[純追従法](/algorithms/pure-pursuit-path-tracking)のような経路追従制御の補助、ドローンの姿勢制御における目標軌道の事前補償

## 実装例

質量`m`の物体を目標軌道`x_d(t)`に追従させる、フィードフォワード(逆モデル)+フィードバック(PD制御)の組み合わせを示す。

```python
def feedforward_force(mass: float, target_accel: float) -> float:
    """逆モデル: 目標加速度を実現するために必要な力(ニュートンの運動方程式の逆算)。"""
    return mass * target_accel

def feedback_pd(kp: float, kd: float, position_error: float, velocity_error: float) -> float:
    return kp * position_error + kd * velocity_error

def combined_control(
    mass: float, target_pos: float, target_vel: float, target_accel: float,
    current_pos: float, current_vel: float, kp: float = 50.0, kd: float = 10.0,
) -> float:
    u_ff = feedforward_force(mass, target_accel)
    u_fb = feedback_pd(kp, kd, target_pos - current_pos, target_vel - current_vel)
    return u_ff + u_fb
```

```typescript
function feedforwardForce(mass: number, targetAccel: number): number {
  return mass * targetAccel;
}

function feedbackPd(kp: number, kd: number, positionError: number, velocityError: number): number {
  return kp * positionError + kd * velocityError;
}

function combinedControl(
  mass: number, targetPos: number, targetVel: number, targetAccel: number,
  currentPos: number, currentVel: number, kp = 50.0, kd = 10.0,
): number {
  const uFf = feedforwardForce(mass, targetAccel);
  const uFb = feedbackPd(kp, kd, targetPos - currentPos, targetVel - currentVel);
  return uFf + uFb;
}
```

```cpp
double feedforwardForce(double mass, double targetAccel) {
    return mass * targetAccel;
}

double feedbackPd(double kp, double kd, double positionError, double velocityError) {
    return kp * positionError + kd * velocityError;
}

double combinedControl(
    double mass, double targetPos, double targetVel, double targetAccel,
    double currentPos, double currentVel, double kp = 50.0, double kd = 10.0) {
    double uFf = feedforwardForce(mass, targetAccel);
    double uFb = feedbackPd(kp, kd, targetPos - currentPos, targetVel - currentVel);
    return uFf + uFb;
}
```

```rust
fn feedforward_force(mass: f64, target_accel: f64) -> f64 {
    mass * target_accel
}

fn feedback_pd(kp: f64, kd: f64, position_error: f64, velocity_error: f64) -> f64 {
    kp * position_error + kd * velocity_error
}

fn combined_control(
    mass: f64, target_pos: f64, target_vel: f64, target_accel: f64,
    current_pos: f64, current_vel: f64, kp: f64, kd: f64,
) -> f64 {
    let u_ff = feedforward_force(mass, target_accel);
    let u_fb = feedback_pd(kp, kd, target_pos - current_pos, target_vel - current_vel);
    u_ff + u_fb
}
```

```csharp
static double FeedforwardForce(double mass, double targetAccel) => mass * targetAccel;

static double FeedbackPd(double kp, double kd, double positionError, double velocityError)
    => kp * positionError + kd * velocityError;

static double CombinedControl(
    double mass, double targetPos, double targetVel, double targetAccel,
    double currentPos, double currentVel, double kp = 50.0, double kd = 10.0)
{
    double uFf = FeedforwardForce(mass, targetAccel);
    double uFb = FeedbackPd(kp, kd, targetPos - currentPos, targetVel - currentVel);
    return uFf + uFb;
}
```
