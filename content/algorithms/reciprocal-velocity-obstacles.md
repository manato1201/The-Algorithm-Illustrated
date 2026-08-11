---
name: RVO(相互速度障害物法)
category: キャラクターAI・空間AI
subcategory: 群衆・マルチエージェント
complexity: O(n・k)(nはエージェント数、kは近傍候補数)
summary: 各エージェントが「相手も自分と半分ずつ回避する」と仮定して自分の速度だけを調整することで、振動なく滑らかに衝突を回避する群衆シミュレーション手法。
---

## 概要

[Boidsアルゴリズム](/algorithms/boids)は生物の群れらしい創発的な動きを作るのには向いているが、「多数のエージェントが互いに衝突せず、それぞれの目的地へ最短に近い経路で向かう」という群衆シミュレーションの要求には別のアプローチが必要になる。各エージェントが単純に「相手の現在位置を避ける」ように速度を決めると、双方が同時に同じ側へ避けようとして振動したり、逆に避けきれず衝突したりする問題が起きる。速度障害物法(VO: Velocity Obstacles)は、相手の位置だけでなく**速度**も考慮して「このまま進むと衝突する速度の集合」を計算し、相互速度障害物法(RVO: Reciprocal Velocity Obstacles)はさらに「相手も自分と同じように振る舞い、回避コストを半分ずつ負担する」と仮定することで、振動のない滑らかな回避を実現する。群衆シミュレーションゲーム・マルチロボット制御で広く使われる。

## 仕組み

1. 自分`A`と近傍の各エージェント`B`について、**衝突円錐(Collision Cone)** を計算する。これは「このまま進み続けると2つのエージェントの安全半径の和以内に近づいてしまう相対速度の集合」を表す
2. 単純なVOでは、この衝突円錐を`A`の現在位置を頂点として自分の速度空間に丸ごと投影し、それを避けるように速度を選ぶ。しかし双方が同時にこれをやると、互いに相手が避けてくれることを見込まずに大きく回避行動を取り、行き違いや振動が起きる
3. RVOでは、衝突円錐を**相手との相対速度の中間点(自分の現在速度と相手の現在速度の平均)を頂点として半分だけシフトした領域**として扱う。これは「衝突回避の責任を自分と相手で半分ずつ負担する」という仮定に相当する
4. 自分の望ましい速度(目的地方向への速度)が、シフトされた衝突円錐(RVOの禁止領域)の外にあればそのまま採用する。内側にあれば、禁止領域の境界上で望ましい速度に最も近い速度を選ぶ
5. 近傍の全エージェントについて2〜4を行い、全ての禁止領域を同時に満たす(または最も制約に近い)速度を選んで1ステップ分移動する。これを毎フレーム繰り返す

## 特性・トレードオフ

- **振動の抑制**: 「相手も自分と同じルールで半分ずつ回避する」という相互性の仮定により、単純なVOで起きがちな「互いに避け合って振動する」現象を大きく減らせる。ただし全エージェントが同じアルゴリズムに従っている前提が崩れる(例: 一部が静止障害物)場合は別途扱いが必要
- **局所的な最適化であり大域的な最短路ではない**: RVOは「次の1ステップでどの速度を取るか」を近傍のエージェントとの関係だけで決める局所的な手法であり、大域的な経路計画(A*やナビゲーションメッシュ上の経路探索)と組み合わせて、その経路に沿って進みながら局所的な衝突回避にRVOを使うのが一般的な構成
- **拡張手法ORCA**: RVOをさらに発展させ、各エージェントの禁止領域を線形制約(半平面)として定式化し、線形計画法で解を求める「ORCA(Optimal Reciprocal Collision Avoidance)」が提案されており、より数値的に安定した回避を実現する。多くの実装ではRVOの発展形としてORCAが採用される
- **使いどころ**: 群衆シミュレーション(避難シミュレーション、雑踏の再現)、マルチロボットの分散的な衝突回避、RTS/MOBAゲームにおける多数ユニットの移動制御(ORCAベースのライブラリRVO2が実用で広く使われている)

## 実装例

簡略化した2エージェント間のRVO速度選択(禁止領域内なら境界上の最近点へ射影する)を示す。

```python
import math

def rvo_velocity(
    pos_a: tuple[float, float], vel_a: tuple[float, float], desired_a: tuple[float, float],
    pos_b: tuple[float, float], vel_b: tuple[float, float], combined_radius: float,
) -> tuple[float, float]:
    rel_pos = (pos_b[0] - pos_a[0], pos_b[1] - pos_a[1])
    dist = math.hypot(*rel_pos)
    if dist < 1e-9 or dist > combined_radius * 6:
        return desired_a  # 十分遠ければ回避不要

    # RVOの頂点: 自分と相手の現在速度の中間点
    apex = ((vel_a[0] + vel_b[0]) / 2, (vel_a[1] + vel_b[1]) / 2)
    to_desired = (desired_a[0] - apex[0], desired_a[1] - apex[1])

    # 衝突円錐の半頂角(安全半径から幾何学的に求まる)
    half_angle = math.asin(min(1.0, combined_radius / dist))
    center_angle = math.atan2(rel_pos[1], rel_pos[0])
    desired_angle = math.atan2(to_desired[1], to_desired[0])

    diff = (desired_angle - center_angle + math.pi) % (2 * math.pi) - math.pi
    if abs(diff) >= half_angle:
        return desired_a  # 望ましい速度は既に禁止領域の外

    # 禁止領域の境界(近い方の縁)まで角度を押し出す
    edge_angle = center_angle + (half_angle if diff >= 0 else -half_angle)
    speed = math.hypot(*to_desired)
    vx = apex[0] + speed * math.cos(edge_angle)
    vy = apex[1] + speed * math.sin(edge_angle)
    return (vx, vy)
```

```typescript
function rvoVelocity(
  posA: [number, number],
  velA: [number, number],
  desiredA: [number, number],
  posB: [number, number],
  velB: [number, number],
  combinedRadius: number,
): [number, number] {
  const relPos: [number, number] = [posB[0] - posA[0], posB[1] - posA[1]];
  const dist = Math.hypot(relPos[0], relPos[1]);
  if (dist < 1e-9 || dist > combinedRadius * 6) return desiredA;

  const apex: [number, number] = [
    (velA[0] + velB[0]) / 2,
    (velA[1] + velB[1]) / 2,
  ];
  const toDesired: [number, number] = [
    desiredA[0] - apex[0],
    desiredA[1] - apex[1],
  ];

  const halfAngle = Math.asin(Math.min(1.0, combinedRadius / dist));
  const centerAngle = Math.atan2(relPos[1], relPos[0]);
  const desiredAngle = Math.atan2(toDesired[1], toDesired[0]);

  let diff = ((desiredAngle - centerAngle + Math.PI) % (2 * Math.PI)) - Math.PI;
  if (Math.abs(diff) >= halfAngle) return desiredA;

  const edgeAngle = centerAngle + (diff >= 0 ? halfAngle : -halfAngle);
  const speed = Math.hypot(toDesired[0], toDesired[1]);
  return [
    apex[0] + speed * Math.cos(edgeAngle),
    apex[1] + speed * Math.sin(edgeAngle),
  ];
}
```

```cpp
#include <cmath>
#include <utility>
#include <algorithm>

std::pair<double, double> rvoVelocity(
    std::pair<double, double> posA, std::pair<double, double> velA, std::pair<double, double> desiredA,
    std::pair<double, double> posB, std::pair<double, double> velB, double combinedRadius) {
    double relX = posB.first - posA.first, relY = posB.second - posA.second;
    double dist = std::hypot(relX, relY);
    if (dist < 1e-9 || dist > combinedRadius * 6) return desiredA;

    double apexX = (velA.first + velB.first) / 2, apexY = (velA.second + velB.second) / 2;
    double toDesX = desiredA.first - apexX, toDesY = desiredA.second - apexY;

    double halfAngle = std::asin(std::min(1.0, combinedRadius / dist));
    double centerAngle = std::atan2(relY, relX);
    double desiredAngle = std::atan2(toDesY, toDesX);

    double diff = std::fmod(desiredAngle - centerAngle + M_PI, 2 * M_PI) - M_PI;
    if (diff < -M_PI) diff += 2 * M_PI;
    if (std::abs(diff) >= halfAngle) return desiredA;

    double edgeAngle = centerAngle + (diff >= 0 ? halfAngle : -halfAngle);
    double speed = std::hypot(toDesX, toDesY);
    return {apexX + speed * std::cos(edgeAngle), apexY + speed * std::sin(edgeAngle)};
}
```

```rust
fn rvo_velocity(
    pos_a: (f64, f64), vel_a: (f64, f64), desired_a: (f64, f64),
    pos_b: (f64, f64), vel_b: (f64, f64), combined_radius: f64,
) -> (f64, f64) {
    let rel = (pos_b.0 - pos_a.0, pos_b.1 - pos_a.1);
    let dist = rel.0.hypot(rel.1);
    if dist < 1e-9 || dist > combined_radius * 6.0 {
        return desired_a;
    }

    let apex = ((vel_a.0 + vel_b.0) / 2.0, (vel_a.1 + vel_b.1) / 2.0);
    let to_desired = (desired_a.0 - apex.0, desired_a.1 - apex.1);

    let half_angle = (combined_radius / dist).min(1.0).asin();
    let center_angle = rel.1.atan2(rel.0);
    let desired_angle = to_desired.1.atan2(to_desired.0);

    let mut diff = (desired_angle - center_angle + std::f64::consts::PI).rem_euclid(2.0 * std::f64::consts::PI) - std::f64::consts::PI;
    if diff.abs() >= half_angle {
        return desired_a;
    }

    let edge_angle = center_angle + if diff >= 0.0 { half_angle } else { -half_angle };
    let speed = to_desired.0.hypot(to_desired.1);
    (apex.0 + speed * edge_angle.cos(), apex.1 + speed * edge_angle.sin())
}
```

```csharp
static (double x, double y) RvoVelocity(
    (double x, double y) posA, (double x, double y) velA, (double x, double y) desiredA,
    (double x, double y) posB, (double x, double y) velB, double combinedRadius)
{
    double relX = posB.x - posA.x, relY = posB.y - posA.y;
    double dist = Math.Sqrt(relX * relX + relY * relY);
    if (dist < 1e-9 || dist > combinedRadius * 6) return desiredA;

    double apexX = (velA.x + velB.x) / 2, apexY = (velA.y + velB.y) / 2;
    double toDesX = desiredA.x - apexX, toDesY = desiredA.y - apexY;

    double halfAngle = Math.Asin(Math.Min(1.0, combinedRadius / dist));
    double centerAngle = Math.Atan2(relY, relX);
    double desiredAngle = Math.Atan2(toDesY, toDesX);

    double diff = (desiredAngle - centerAngle + Math.PI) % (2 * Math.PI) - Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;
    if (Math.Abs(diff) >= halfAngle) return desiredA;

    double edgeAngle = centerAngle + (diff >= 0 ? halfAngle : -halfAngle);
    double speed = Math.Sqrt(toDesX * toDesX + toDesY * toDesY);
    return (apexX + speed * Math.Cos(edgeAngle), apexY + speed * Math.Sin(edgeAngle));
}
```
