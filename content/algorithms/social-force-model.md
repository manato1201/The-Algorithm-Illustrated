---
name: ソーシャルフォースモデル(Social Force Model)
category: キャラクターAI・空間AI
subcategory: 群衆・マルチエージェント
complexity: O(n²)(単純実装、nはエージェント数)
summary: 歩行者の移動を「目的地への引力」「他者・障害物からの斥力」といった仮想的な力の合成としてモデル化し、群衆の自然な流れや詰まりを物理シミュレーションとして再現する。
---

## 概要

[Boidsアルゴリズム](/algorithms/boids)が鳥や魚のような群れの創発的な動きを表現するのに対し、人間の雑踷(群衆)には「目的地に向かって歩く」「他人とぶつからないよう避ける」「壁に沿って歩く」といった、より目的指向的な振る舞いが必要になる。ソーシャルフォースモデルは、1995年にディルク・ヘルビングとペーター・モルナーが提案した手法で、歩行者の運動を**物理学の力学系になぞらえて記述**する。各歩行者に対して「目的地へ向かう引力」「他の歩行者や壁からの斥力」といった仮想的な「社会的な力」を計算し、それらをニュートン力学の運動方程式のように合成することで、群衆の自然な流れ、出入口での詰まり(ボトルネック)、パニック時の将棋倒しのような現象までも同じ枠組みでシミュレーションできる。避難シミュレーション・交通工学の分野で広く採用されている。

## 仕組み

各歩行者`i`にかかる合力`F_i`は、複数の力の合成として計算される。

1. **目的地への駆動力**: 歩行者が希望する速度`v_i^desired`(目的地方向・希望速率)へ向かおうとする力。現在の速度`v_i`との差を緩和時間`τ`で割った形で表される: `F_i^drive = (v_i^desired - v_i) / τ`
2. **他の歩行者からの斥力**: 他の歩行者`j`との距離が近いほど強く働く反発力。典型的には距離に対して指数的に減衰する形`F_ij^social = A・exp((r_ij - d_ij)/B)・n_ij`(`d_ij`は歩行者間の距離、`r_ij`は互いの物理的な半径の和、`n_ij`は`j`から`i`への単位ベクトル)で、パーソナルスペースを侵害されるほど強く押し返す
3. **壁・障害物からの斥力**: 壁との距離に応じて同様の反発力が働き、歩行者が壁にめり込まないようにする
4. これら全ての力を合成し`F_i = F_i^drive + Σ_j F_ij^social + Σ_walls F_i^wall`を求め、これを加速度として扱い、1ステップ分の時間で速度・位置を更新する(ニュートンの運動方程式`m・dv/dt = F`を離散的に解く)
5. 全歩行者について1〜4を繰り返し、時間発展させる

## 特性・トレードオフ

- **物理シミュレーションとしての解釈しやすさ**: 力の合成という直感的な枠組みでモデル化されているため、パラメータ(力の強さ・減衰係数)を物理量として調整しやすく、実測データ(実際の群衆の密度-速度関係など)とのフィッティングがしやすい
- **群衆特有の創発現象を再現できる**: 個々の歩行者の単純な力の合成だけから、出入口での「詰まり(クロッギング)」、二方向の流れが自然に分かれる「レーン形成」、パニック時の将棋倒しのような、実際の群衆で観測される現象が創発的に現れる。これはモデルの妥当性の重要な検証材料になっている
- **計算コストと[RVO](/algorithms/reciprocal-velocity-obstacles)との対比**: 単純な実装では全歩行者ペアの力を計算するためO(n²)かかり、大規模な群衆では空間分割による近傍探索の絞り込みが必要になる。RVOが「衝突を起こさない速度を直接選ぶ」幾何学的なアプローチであるのに対し、ソーシャルフォースモデルは力の合成という物理ベースのアプローチであり、密集した群衆の圧力・詰まりのような現象の再現に強みがある
- **使いどころ**: 建物・駅・スタジアムの避難シミュレーション、都市計画における歩行者流動の解析、ゲーム・映像制作における雑踏シーンの群衆表現、交通工学における歩行者-車両相互作用のモデリング

## 実装例

```python
import math

def social_force(
    pos_i: tuple[float, float], vel_i: tuple[float, float], desired_vel: tuple[float, float],
    others: list[tuple[float, float]], tau: float = 0.5, a: float = 2.0, b: float = 0.3,
) -> tuple[float, float]:
    fx = (desired_vel[0] - vel_i[0]) / tau
    fy = (desired_vel[1] - vel_i[1]) / tau

    for ox, oy in others:
        dx, dy = pos_i[0] - ox, pos_i[1] - oy
        dist = math.hypot(dx, dy)
        if dist < 1e-6:
            continue
        magnitude = a * math.exp(-dist / b)
        fx += magnitude * dx / dist
        fy += magnitude * dy / dist

    return fx, fy

def step_pedestrian(
    pos: tuple[float, float], vel: tuple[float, float], force: tuple[float, float], dt: float = 0.1,
) -> tuple[tuple[float, float], tuple[float, float]]:
    new_vel = (vel[0] + force[0] * dt, vel[1] + force[1] * dt)
    new_pos = (pos[0] + new_vel[0] * dt, pos[1] + new_vel[1] * dt)
    return new_pos, new_vel
```

```typescript
function socialForce(
  posI: [number, number],
  velI: [number, number],
  desiredVel: [number, number],
  others: [number, number][],
  tau = 0.5,
  a = 2.0,
  b = 0.3,
): [number, number] {
  let fx = (desiredVel[0] - velI[0]) / tau;
  let fy = (desiredVel[1] - velI[1]) / tau;

  for (const [ox, oy] of others) {
    const dx = posI[0] - ox;
    const dy = posI[1] - oy;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-6) continue;
    const magnitude = a * Math.exp(-dist / b);
    fx += (magnitude * dx) / dist;
    fy += (magnitude * dy) / dist;
  }

  return [fx, fy];
}

function stepPedestrian(
  pos: [number, number],
  vel: [number, number],
  force: [number, number],
  dt = 0.1,
): { pos: [number, number]; vel: [number, number] } {
  const newVel: [number, number] = [
    vel[0] + force[0] * dt,
    vel[1] + force[1] * dt,
  ];
  const newPos: [number, number] = [
    pos[0] + newVel[0] * dt,
    pos[1] + newVel[1] * dt,
  ];
  return { pos: newPos, vel: newVel };
}
```

```cpp
#include <vector>
#include <cmath>
#include <utility>

std::pair<double, double> socialForce(
    std::pair<double, double> posI, std::pair<double, double> velI, std::pair<double, double> desiredVel,
    const std::vector<std::pair<double, double>>& others, double tau = 0.5, double a = 2.0, double b = 0.3) {
    double fx = (desiredVel.first - velI.first) / tau;
    double fy = (desiredVel.second - velI.second) / tau;

    for (auto& [ox, oy] : others) {
        double dx = posI.first - ox, dy = posI.second - oy;
        double dist = std::hypot(dx, dy);
        if (dist < 1e-6) continue;
        double magnitude = a * std::exp(-dist / b);
        fx += magnitude * dx / dist;
        fy += magnitude * dy / dist;
    }
    return {fx, fy};
}

std::pair<std::pair<double, double>, std::pair<double, double>> stepPedestrian(
    std::pair<double, double> pos, std::pair<double, double> vel, std::pair<double, double> force, double dt = 0.1) {
    std::pair<double, double> newVel = {vel.first + force.first * dt, vel.second + force.second * dt};
    std::pair<double, double> newPos = {pos.first + newVel.first * dt, pos.second + newVel.second * dt};
    return {newPos, newVel};
}
```

```rust
fn social_force(
    pos_i: (f64, f64), vel_i: (f64, f64), desired_vel: (f64, f64),
    others: &[(f64, f64)], tau: f64, a: f64, b: f64,
) -> (f64, f64) {
    let mut fx = (desired_vel.0 - vel_i.0) / tau;
    let mut fy = (desired_vel.1 - vel_i.1) / tau;

    for &(ox, oy) in others {
        let dx = pos_i.0 - ox;
        let dy = pos_i.1 - oy;
        let dist = dx.hypot(dy);
        if dist < 1e-6 {
            continue;
        }
        let magnitude = a * (-dist / b).exp();
        fx += magnitude * dx / dist;
        fy += magnitude * dy / dist;
    }

    (fx, fy)
}

fn step_pedestrian(
    pos: (f64, f64), vel: (f64, f64), force: (f64, f64), dt: f64,
) -> ((f64, f64), (f64, f64)) {
    let new_vel = (vel.0 + force.0 * dt, vel.1 + force.1 * dt);
    let new_pos = (pos.0 + new_vel.0 * dt, pos.1 + new_vel.1 * dt);
    (new_pos, new_vel)
}
```

```csharp
static (double x, double y) SocialForce(
    (double x, double y) posI, (double x, double y) velI, (double x, double y) desiredVel,
    List<(double x, double y)> others, double tau = 0.5, double a = 2.0, double b = 0.3)
{
    double fx = (desiredVel.x - velI.x) / tau;
    double fy = (desiredVel.y - velI.y) / tau;

    foreach (var (ox, oy) in others)
    {
        double dx = posI.x - ox, dy = posI.y - oy;
        double dist = Math.Sqrt(dx * dx + dy * dy);
        if (dist < 1e-6) continue;
        double magnitude = a * Math.Exp(-dist / b);
        fx += magnitude * dx / dist;
        fy += magnitude * dy / dist;
    }
    return (fx, fy);
}

static ((double x, double y) pos, (double x, double y) vel) StepPedestrian(
    (double x, double y) pos, (double x, double y) vel, (double x, double y) force, double dt = 0.1)
{
    var newVel = (vel.x + force.x * dt, vel.y + force.y * dt);
    var newPos = (pos.x + newVel.Item1 * dt, pos.y + newVel.Item2 * dt);
    return (newPos, newVel);
}
```
