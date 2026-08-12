---
name: 相補フィルタ(センサフュージョンの基礎)
category: 制御・ロボティクス
subcategory: 状態推定
complexity: O(1)(1ステップあたり)
summary: 「短時間は正確だがドリフトするジャイロスコープ」と「長期的には安定するがノイズが多い加速度計」を、ハイパスとローパスのフィルタで補い合わせるだけで、[カルマンフィルタ](/algorithms/kalman-filter)より遥かに軽量にドローンやロボットの姿勢を推定する。
---

## 概要

[カルマンフィルタ](/algorithms/kalman-filter)や[拡張カルマンフィルタ](/algorithms/extended-kalman-filter)は統計的に最適な状態推定を与えるが、共分散行列の計算を伴うためそれなりの計算資源を必要とする。ドローンや小型ロボットの姿勢推定のように、マイコン上でリアルタイムに動かす必要がある場面では、もっと軽量な手法が重宝される。相補フィルタは、姿勢推定に使う2種類のセンサーが持つ**互いに補い合う誤差特性**に着目したシンプルな手法である——ジャイロスコープ(角速度センサー)は短時間では正確だが、積分して角度を求める過程で誤差が蓄積していく(ドリフト)。一方、加速度計は重力方向から傾きを直接測れるので長期的には安定しているが、振動や急な動きの影響を受けやすく瞬間的なノイズが大きい。相補フィルタは、**ジャイロの出力にはハイパスフィルタ(短期的な変化を信頼する)を、加速度計の出力にはローパスフィルタ(長期的な傾向を信頼する)を掛けて足し合わせる**ことで、両者の弱点を打ち消し合わせる。

## 仕組み

1. ジャイロスコープから角速度`ω`を、加速度計から重力方向に基づく傾き角`θ_acc`(加速度ベクトルの向きから三角関数で計算する)を、それぞれ一定周期で取得する
2. 前回の推定角度`θ`にジャイロの角速度を積分して、今回の「ジャイロだけに基づく」角度予測を計算する:`θ_gyro = θ + ω・dt`
3. **相補フィルタの核心となる融合式**を適用する:`θ = α・θ_gyro + (1-α)・θ_acc`。`α`(典型的には0.95〜0.98)は、ジャイロの積分値をどれだけ信頼するかを表す重みで、`α`に近いほどジャイロ主体(高周波の変化に敏感、低周波のドリフトが残る)、`1-α`が大きいほど加速度計主体(低周波の傾向に敏感、高周波のノイズに弱い)になる
4. この重み付き平均が、実質的に「ジャイロの積分値にはハイパスフィルタ(急な変化=高周波成分を信頼)、加速度計の傾きにはローパスフィルタ(緩やかな変化=低周波成分を信頼)をかけて足し合わせる」ことと数学的に等価になっている
5. 1〜4を一定周期(数百Hz程度)で繰り返し、姿勢角の推定値`θ`を継続的に更新する

## 特性・トレードオフ

- **計算コストの圧倒的な軽さ**: [カルマンフィルタ](/algorithms/kalman-filter)が共分散行列の更新(行列演算)を必要とするのに対し、相補フィルタは単純な重み付き平均の計算だけで済み、非力なマイコンでも数百Hzの高頻度で実行できる。ドローンの姿勢制御ループのように、極めて高い更新頻度が要求される用途で重宝される
- **統計的な最適性は保証されない**: [カルマンフィルタ](/algorithms/kalman-filter)がセンサーノイズの統計モデルに基づいて理論的に最適なゲインを計算するのに対し、相補フィルタの重み`α`は経験的に調整されるパラメータであり、統計的な最適性の保証はない。ただし実務上は、適切に調整された`α`で十分実用的な精度が得られることが多い
- **[カルマンフィルタ](/algorithms/kalman-filter)との関係**: 相補フィルタは、センサーノイズの分散が一定であるという単純化した仮定のもとでは、定常状態のカルマンフィルタと等価になることが示されている。つまり相補フィルタは、カルマンフィルタの特殊ケース(かつ計算コストを大幅に削減したもの)とみなすこともできる
- **使いどころ**: 小型ドローン・クアッドコプターの姿勢推定(多くのフライトコントローラのファームウェアが採用)、スマートフォン・ウェアラブルデバイスの姿勢センサー処理、[LQR](/algorithms/lqr-control)や[PID制御](/algorithms/pid-control)への入力として使う軽量な姿勢推定、マイコンベースの自作ロボットプロジェクト

## 実装例

```python
import math

class ComplementaryFilter:
    def __init__(self, alpha: float = 0.98):
        self.alpha = alpha
        self.angle = 0.0

    def update(self, gyro_rate: float, accel_x: float, accel_y: float, dt: float) -> float:
        angle_gyro = self.angle + gyro_rate * dt
        angle_acc = math.atan2(accel_y, accel_x)
        self.angle = self.alpha * angle_gyro + (1 - self.alpha) * angle_acc
        return self.angle
```

```typescript
class ComplementaryFilter {
  private angle = 0;
  constructor(private alpha = 0.98) {}

  update(gyroRate: number, accelX: number, accelY: number, dt: number): number {
    const angleGyro = this.angle + gyroRate * dt;
    const angleAcc = Math.atan2(accelY, accelX);
    this.angle = this.alpha * angleGyro + (1 - this.alpha) * angleAcc;
    return this.angle;
  }
}
```

```cpp
#include <cmath>

class ComplementaryFilter {
    double alpha;
    double angle = 0.0;

public:
    explicit ComplementaryFilter(double alpha_ = 0.98) : alpha(alpha_) {}

    double update(double gyroRate, double accelX, double accelY, double dt) {
        double angleGyro = angle + gyroRate * dt;
        double angleAcc = std::atan2(accelY, accelX);
        angle = alpha * angleGyro + (1 - alpha) * angleAcc;
        return angle;
    }
};
```

```rust
struct ComplementaryFilter {
    alpha: f64,
    angle: f64,
}

impl ComplementaryFilter {
    fn new(alpha: f64) -> Self {
        ComplementaryFilter { alpha, angle: 0.0 }
    }

    fn update(&mut self, gyro_rate: f64, accel_x: f64, accel_y: f64, dt: f64) -> f64 {
        let angle_gyro = self.angle + gyro_rate * dt;
        let angle_acc = accel_y.atan2(accel_x);
        self.angle = self.alpha * angle_gyro + (1.0 - self.alpha) * angle_acc;
        self.angle
    }
}
```

```csharp
class ComplementaryFilter
{
    double alpha;
    double angle = 0.0;

    public ComplementaryFilter(double alpha = 0.98)
    {
        this.alpha = alpha;
    }

    public double Update(double gyroRate, double accelX, double accelY, double dt)
    {
        double angleGyro = angle + gyroRate * dt;
        double angleAcc = Math.Atan2(accelY, accelX);
        angle = alpha * angleGyro + (1 - alpha) * angleAcc;
        return angle;
    }
}
```
