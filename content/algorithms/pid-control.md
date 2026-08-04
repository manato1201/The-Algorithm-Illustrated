---
name: PID制御
category: 制御・ロボティクス
subcategory: フィードバック制御
complexity: O(1)(1制御周期あたり)
summary: 目標値との誤差そのもの・誤差の蓄積・誤差の変化率の3つを組み合わせることで、行き過ぎず、定常偏差も残さず、素早く目標値に収束させる最も広く使われるフィードバック制御法。
---

## 概要

エアコンの温度調整、ドローンの姿勢制御、ロボットアームの位置決めなど、「現在の状態を目標値に近づけ続ける」制御は、産業界で最も頻繁に現れる問題である。PID制御は、目標値と現在値の差(誤差)に対して、比例(Proportional)・積分(Integral)・微分(Derivative)という3種類の異なる性質を持つ項を組み合わせることで、単純な仕組みでありながら極めて幅広い制御対象に適用できる、フィードバック制御の事実上のデファクトスタンダードである。実装が比較的容易でありながら十分な性能を発揮するため、産業制御システムの大多数がこのPID制御(またはその部分集合であるP制御・PI制御)を採用している。

## 仕組み

1. 各制御周期で、目標値と現在の測定値の差(誤差`e(t)`)を計算する
2. **比例項(P)**: 誤差の大きさにそのまま比例した制御量`Kp × e(t)`を出力する。誤差が大きいほど強く補正する、最も直感的な項だが、これだけでは目標値にぴったり収束せず、わずかなズレ(定常偏差)が残ることが多い
3. **積分項(I)**: これまでの誤差の累積(蓄積された誤差の総和)に比例した制御量`Ki × Σe(t)`を出力する。比例項だけでは埋まらない定常偏差を、誤差が蓄積し続ける限り徐々に押し戻すことで解消する。ただし過剰に働くと、目標値を行き過ぎてから戻ってくる振動(オーバーシュート)を招くことがある
4. **微分項(D)**: 誤差の変化率(どれだけ急速に誤差が変化しているか)に比例した制御量`Kd × d(e(t))/dt`を出力する。誤差が急激に縮まっている(目標値に近づきつつある)ときにあらかじめブレーキをかけることで、行き過ぎ(オーバーシュート)を抑える働きをする
5. 3つの項の合計`u(t) = Kp×e(t) + Ki×Σe(t) + Kd×d(e(t))/dt`を、実際にモーターやアクチュエータへ送る制御信号として出力する

## 特性・トレードオフ

- **計算量**: 各制御周期での計算は、現在の誤差・累積誤差・誤差の変化率という3つの値の加重和を取るだけなので`O(1)`。組み込みマイコンのような限られた計算資源でも容易に実装できる
- **ゲイン(Kp、Ki、Kd)の調整という職人技**: PID制御の性能は、3つの係数(ゲイン)の設定に大きく左右される。ゲインが小さすぎると反応が遅く、大きすぎると振動が起きやすい——チューニング(Ziegler-Nichols法のような体系的手法もあるが、実務では試行錯誤による微調整もよく行われる)が制御性能を左右する実践的な課題として残る
- **[Bang-Bang制御](/algorithms/bang-bang-control)との対比**: Bang-Bang制御が「オンかオフか」の極端な2値制御であるのに対し、PID制御は誤差の大きさに応じて連続的に調整量を変える、より滑らかで精密な制御を可能にする——制御対象の特性(高速な切り替えが必要か、滑らかな追従が必要か)に応じて使い分けられる
- **使いどころ**: 産業用ロボットアームの位置・速度制御、ドローン・自動運転車の姿勢・速度制御、エアコン・オーブンのような温度制御機器、ほぼ全ての自動制御システムにおける最も基本的で広く使われる制御アルゴリズム

## 実装例

単純な一次系(制御量がそのまま状態の変化速度になるプラント)にPID制御器を接続し、初期値0から目標値10へ収束することを検証する。

```python
class PID:
    def __init__(self, kp: float, ki: float, kd: float, setpoint: float) -> None:
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self.setpoint = setpoint
        self.integral = 0.0
        self.prev_error = 0.0
        self.first = True

    def update(self, measurement: float, dt: float) -> float:
        error = self.setpoint - measurement
        self.integral += error * dt
        derivative = 0.0 if self.first else (error - self.prev_error) / dt
        self.first = False
        self.prev_error = error
        return self.kp * error + self.ki * self.integral + self.kd * derivative


def simulate_plant(pid: PID, initial: float, dt: float, steps: int) -> list[float]:
    value = initial
    history = [value]
    for _ in range(steps):
        control = pid.update(value, dt)
        value += control * dt  # 制御量をそのまま状態変化速度とみなす一次系プラント
        history.append(value)
    return history
```

```typescript
class PID {
  kp: number; ki: number; kd: number; setpoint: number;
  integral = 0; prevError = 0; first = true;

  constructor(kp: number, ki: number, kd: number, setpoint: number) {
    this.kp = kp; this.ki = ki; this.kd = kd; this.setpoint = setpoint;
  }

  update(measurement: number, dt: number): number {
    const error = this.setpoint - measurement;
    this.integral += error * dt;
    const derivative = this.first ? 0 : (error - this.prevError) / dt;
    this.first = false;
    this.prevError = error;
    return this.kp * error + this.ki * this.integral + this.kd * derivative;
  }
}

function simulatePlant(pid: PID, initial: number, dt: number, steps: number): number[] {
  let value = initial;
  const history = [value];
  for (let i = 0; i < steps; i++) {
    const control = pid.update(value, dt);
    value += control * dt;
    history.push(value);
  }
  return history;
}
```

```cpp
#include <vector>

class PID {
public:
    double kp, ki, kd, setpoint;
    double integral = 0.0;
    double prevError = 0.0;
    bool first = true;

    PID(double kp, double ki, double kd, double setpoint)
        : kp(kp), ki(ki), kd(kd), setpoint(setpoint) {}

    double update(double measurement, double dt) {
        double error = setpoint - measurement;
        integral += error * dt;
        double derivative = first ? 0.0 : (error - prevError) / dt;
        first = false;
        prevError = error;
        return kp * error + ki * integral + kd * derivative;
    }
};

std::vector<double> simulatePlant(PID& pid, double initial, double dt, int steps) {
    double value = initial;
    std::vector<double> history = {value};
    for (int i = 0; i < steps; i++) {
        double control = pid.update(value, dt);
        value += control * dt;
        history.push_back(value);
    }
    return history;
}
```

```rust
struct Pid {
    kp: f64,
    ki: f64,
    kd: f64,
    setpoint: f64,
    integral: f64,
    prev_error: f64,
    first: bool,
}

impl Pid {
    fn new(kp: f64, ki: f64, kd: f64, setpoint: f64) -> Self {
        Pid { kp, ki, kd, setpoint, integral: 0.0, prev_error: 0.0, first: true }
    }

    fn update(&mut self, measurement: f64, dt: f64) -> f64 {
        let error = self.setpoint - measurement;
        self.integral += error * dt;
        let derivative = if self.first { 0.0 } else { (error - self.prev_error) / dt };
        self.first = false;
        self.prev_error = error;
        self.kp * error + self.ki * self.integral + self.kd * derivative
    }
}

fn simulate_plant(pid: &mut Pid, initial: f64, dt: f64, steps: usize) -> Vec<f64> {
    let mut value = initial;
    let mut history = vec![value];
    for _ in 0..steps {
        let control = pid.update(value, dt);
        value += control * dt;
        history.push(value);
    }
    history
}
```

```csharp
class PID
{
    public double Kp, Ki, Kd, Setpoint, Integral = 0, PrevError = 0;
    public bool First = true;

    public PID(double kp, double ki, double kd, double setpoint)
    {
        Kp = kp; Ki = ki; Kd = kd; Setpoint = setpoint;
    }

    public double Update(double measurement, double dt)
    {
        double error = Setpoint - measurement;
        Integral += error * dt;
        double derivative = First ? 0 : (error - PrevError) / dt;
        First = false;
        PrevError = error;
        return Kp * error + Ki * Integral + Kd * derivative;
    }

    public static List<double> SimulatePlant(PID pid, double initial, double dt, int steps)
    {
        double value = initial;
        var history = new List<double> { value };
        for (int i = 0; i < steps; i++)
        {
            double control = pid.Update(value, dt);
            value += control * dt;
            history.Add(value);
        }
        return history;
    }
}
```
