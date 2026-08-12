---
name: スライディングモード制御
category: 制御・ロボティクス
subcategory: フィードバック制御
complexity: O(1)(1制御ステップあたり)
summary: 状態空間上に「望ましい振る舞いをする面(スライディング面)」を設計し、システムの状態をその面に強制的に引き寄せてから面上を滑らせるように制御することで、モデルの誤差や外乱があっても頑健に目標へ収束させる非線形制御手法。
---

## 概要

[PID制御](/algorithms/pid-control)や[LQR](/algorithms/lqr-control)のような線形制御手法は、システムのモデルが正確で、外乱が小さいことを前提に設計されることが多いが、実際のロボットや機械システムには、モデル化しきれない摩擦・非線形性・パラメータの不確かさが常に存在する。スライディングモード制御は、こうした不確かさに対して**構造的に頑健(ロバスト)** な制御を実現する非線形制御手法である。状態空間上に、システムがその上に乗ってさえいれば望ましい振る舞い(目標への収束)をする「スライディング面」と呼ばれる面を設計し、制御則を**「面から外れていれば面に向かって強制的に引き戻す」**という不連続な(スイッチング的な)形にすることで、モデルの誤差や外乱がある程度の範囲内であれば、システムの状態を確実にスライディング面上に留め続けられる。

## 仕組み

1. システムの状態(位置・速度など)の関数として、**スライディング面**`s(x) = 0`を設計する。例えば1次系の位置制御なら`s = ė + λe`(`e`は目標との誤差、`λ`は正の定数)のような形で、`s=0`が満たされれば誤差`e`が指数的に0へ収束するように設計する
2. 現在の状態から`s(x)`の値を計算する。`s`が0でなければ、システムはまだスライディング面上にいない(到達フェーズ)
3. **制御入力を、`s`の符号に応じて切り替える**:`u = u_eq - K・sign(s)`(`u_eq`はスライディング面上に留まり続けるために必要な等価制御入力、`K`は十分大きな正の定数、`sign(s)`は`s`の符号)。この不連続な切り替え項が、状態をスライディング面に向かって強制的に引き戻す役割を持つ
4. 状態がスライディング面に到達すると(到達フェーズが終わると)、以降は面上を滑るように動き続ける(スライディングフェーズ)。面の設計自体が「面上にいれば目標へ収束する」という性質を持つため、この段階では自動的に目標に収束していく
5. `K`を十分大きく取れば、モデルの誤差や外乱が想定した範囲内である限り、状態は常にスライディング面の近傍に留まり続けることが理論的に保証される(リアプノフ安定性の議論による)

## 特性・トレードオフ

- **モデルの不確かさに対する構造的な頑健性**: [LQR](/algorithms/lqr-control)のような線形最適制御がモデルの正確さに強く依存するのに対し、スライディングモード制御はモデルの誤差や外乱がある範囲内に収まっている限り、性能が理論的に保証される。摩擦や非線形性が大きい機械システムの制御で好まれる理由の一つである
- **チャタリングという実装上の課題**: 制御入力を`sign(s)`という不連続な関数で切り替えるため、実際のシステムでは高周波の振動(チャタリング)が発生しやすい。これはアクチュエータの摩耗や騒音の原因になるため、実務では`sign(s)`を`tanh(s/ε)`のような滑らかな関数で近似する(境界層法)といった対策が取られる
- **[フィードフォワード制御](/algorithms/feedforward-control)との組み合わせ**: スライディングモード制御自体はフィードバックの構造を持つが、目標軌道が急激に変化する場合には[フィードフォワード制御](/algorithms/feedforward-control)による事前補償と組み合わせることで、到達フェーズの時間を短縮し、より滑らかな追従を実現できる
- **使いどころ**: 電気モーターの速度・位置制御、ロボットマニピュレータの精密軌道追従、パワーエレクトロニクス(DC-DCコンバータのスイッチング制御はスライディングモードの考え方そのものと言える)、宇宙機の姿勢制御のような不確かさの大きい環境での頑健な制御

## 実装例

1次系の位置制御(境界層法によるチャタリング抑制付き)を示す。

```python
import math

def sliding_surface(position_error: float, velocity_error: float, lam: float = 2.0) -> float:
    return velocity_error + lam * position_error

def smooth_sign(s: float, epsilon: float = 0.1) -> float:
    """境界層法: sign関数の代わりにtanhで滑らかに近似し、チャタリングを抑える。"""
    return math.tanh(s / epsilon)

def sliding_mode_control(
    target_pos: float, target_vel: float, current_pos: float, current_vel: float,
    lam: float = 2.0, k: float = 5.0, epsilon: float = 0.1,
) -> float:
    position_error = target_pos - current_pos
    velocity_error = target_vel - current_vel
    s = sliding_surface(position_error, velocity_error, lam)
    return -k * smooth_sign(s, epsilon)
```

```typescript
function slidingSurface(positionError: number, velocityError: number, lam = 2.0): number {
  return velocityError + lam * positionError;
}

function smoothSign(s: number, epsilon = 0.1): number {
  return Math.tanh(s / epsilon);
}

function slidingModeControl(
  targetPos: number, targetVel: number, currentPos: number, currentVel: number,
  lam = 2.0, k = 5.0, epsilon = 0.1,
): number {
  const positionError = targetPos - currentPos;
  const velocityError = targetVel - currentVel;
  const s = slidingSurface(positionError, velocityError, lam);
  return -k * smoothSign(s, epsilon);
}
```

```cpp
#include <cmath>

double slidingSurface(double positionError, double velocityError, double lam = 2.0) {
    return velocityError + lam * positionError;
}

double smoothSign(double s, double epsilon = 0.1) {
    return std::tanh(s / epsilon);
}

double slidingModeControl(
    double targetPos, double targetVel, double currentPos, double currentVel,
    double lam = 2.0, double k = 5.0, double epsilon = 0.1) {
    double positionError = targetPos - currentPos;
    double velocityError = targetVel - currentVel;
    double s = slidingSurface(positionError, velocityError, lam);
    return -k * smoothSign(s, epsilon);
}
```

```rust
fn sliding_surface(position_error: f64, velocity_error: f64, lam: f64) -> f64 {
    velocity_error + lam * position_error
}

fn smooth_sign(s: f64, epsilon: f64) -> f64 {
    (s / epsilon).tanh()
}

fn sliding_mode_control(
    target_pos: f64, target_vel: f64, current_pos: f64, current_vel: f64, lam: f64, k: f64, epsilon: f64,
) -> f64 {
    let position_error = target_pos - current_pos;
    let velocity_error = target_vel - current_vel;
    let s = sliding_surface(position_error, velocity_error, lam);
    -k * smooth_sign(s, epsilon)
}
```

```csharp
static double SlidingSurface(double positionError, double velocityError, double lam = 2.0)
    => velocityError + lam * positionError;

static double SmoothSign(double s, double epsilon = 0.1) => Math.Tanh(s / epsilon);

static double SlidingModeControl(
    double targetPos, double targetVel, double currentPos, double currentVel,
    double lam = 2.0, double k = 5.0, double epsilon = 0.1)
{
    double positionError = targetPos - currentPos;
    double velocityError = targetVel - currentVel;
    double s = SlidingSurface(positionError, velocityError, lam);
    return -k * SmoothSign(s, epsilon);
}
```
