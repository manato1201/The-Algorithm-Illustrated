---
name: 魚群のミリング行動モデル(渦巻き形成)
category: シミュレーション・群知能
subcategory: 群れ行動シミュレーション
complexity: O(n²)(単純実装、nは個体数)
summary: 引力・斥力・整列力の働く距離帯(ゾーン)を個体ごとに使い分けるだけで、魚群が同じ方向にまとまって泳ぐ「極性群れ」だけでなく、群れ全体がドーナツ状に回転し続ける「ミリング(渦巻き)」状態も再現できる、ゾーンモデルによる集団運動シミュレーション。
---

## 概要

[Boidsアルゴリズム](/algorithms/boids)は分離・整列・結合という3つの力を常に同時に働かせるが、実際の魚群の観察研究(クレイグ・ロイターらの研究が有名)では、これらの力を**個体からの距離に応じた同心円状の「ゾーン」ごとに切り替える**というモデルが、より豊かな集団運動パターンを再現することが示されている。このゾーンモデルは、パラメータ次第で単に群れがバラバラに泳ぐ状態、全員が同じ方向を向いて一体となって泳ぐ「極性群れ(polarized school)」、そして群れ全体が中心の周りをドーナツ状に回転し続ける「**ミリング(milling)**」と呼ばれる渦巻き状の集団運動という、質的に異なる複数の集団パターンを生み出せる。イワシの大群が捕食者から身を守るために作る渦巻き隊形は、このミリング状態の代表的な実例として知られる。

## 仕組み

1. 各個体の周囲に、中心からの距離が近い順に**3つの同心円状のゾーン**を定義する:「反発ゾーン(Zone of Repulsion)」「整列ゾーン(Zone of Orientation)」「引力ゾーン(Zone of Attraction)」
2. 各個体`i`について、近傍の個体`j`との距離を計算し、その距離がどのゾーンに該当するかを判定する
3. **反発ゾーン**内の個体からは、[Boidsアルゴリズム](/algorithms/boids)の分離と同様、遠ざかる方向の力を受ける(このゾーンの反発は他のどのゾーンの効果よりも優先される、と実装されることが多い)
4. 反発ゾーンに誰もいなければ、**整列ゾーン**内の個体の平均進行方向に自分の向きを合わせようとする力と、**引力ゾーン**内の個体の重心へ向かう力を、両方の重みに応じて合成する
5. 合成した力の方向へ各個体を1ステップ分移動させる。この手続きを全個体について繰り返し、時間発展させる
6. 整列ゾーンと引力ゾーンの相対的な大きさ・強さのバランスを変えることで、群れ全体が同じ方向に揃って進む「極性群れ」と、群れが中心の周りを周回し続ける「ミリング」という、質的に異なる2つの安定状態を再現できる

## 特性・トレードオフ

- **距離帯による力の切り替えが生む多様な集団パターン**: [Boidsアルゴリズム](/algorithms/boids)が3つの力を常に線形に合成するのに対し、ゾーンモデルは「最も近い個体からは反発を最優先する」という非線形な優先順位を導入することで、極性群れ・ミリング・不規則な群れといった、実際の魚群観察で報告されている複数の質的に異なる集団パターンを、同じモデルの枠組みの中でパラメータの調整だけで再現できる
- **ミリングという特徴的な渦巻き状態**: 整列ゾーンの効果が引力ゾーンに対して相対的に弱い場合、個体は「近くの仲間の重心には引き寄せられるが、全体の進行方向には強く同調しない」ため、群れ全体が1つの方向にまとまって進む代わりに、中心の周りをぐるぐると回転し続ける準安定なドーナツ状の構造(ミリング)に落ち着くことがある。この現象は捕食者を混乱させる防御行動としても機能すると考えられている
- **物理モデルとしての魚群行動研究への応用**: ゾーンモデルは、実際のニシン・イワシなどの魚群の観察データ(近傍個体との距離分布、群れ全体の形状の統計)と比較検証されており、単なる視覚的な演出以上に、生物学的に妥当な集団運動モデルとして研究に使われている
- **使いどころ**: 水族館展示やCG映像における写実的な魚群シミュレーション、捕食者-被食者相互作用における防御的集団行動の研究、群知能アルゴリズムにおける多様な集団パターン生成の理論的基盤、ロボット群における隊形制御(周回パトロール隊形としてのミリング状態の応用)

## 実装例

```python
import math

def zone_model_step(
    positions: list[tuple[float, float]], velocities: list[tuple[float, float]],
    repulsion_radius: float = 1.0, orientation_radius: float = 4.0, attraction_radius: float = 10.0,
    speed: float = 1.0, turn_rate: float = 0.3,
) -> tuple[list[tuple[float, float]], list[tuple[float, float]]]:
    n = len(positions)
    new_velocities = []

    for i in range(n):
        rep_x = rep_y = 0.0
        ori_x = ori_y = 0.0
        att_x = att_y = 0.0
        has_repulsion = False

        for j in range(n):
            if i == j:
                continue
            dx = positions[j][0] - positions[i][0]
            dy = positions[j][1] - positions[i][1]
            dist = math.hypot(dx, dy)
            if dist == 0:
                continue

            if dist < repulsion_radius:
                rep_x -= dx / dist
                rep_y -= dy / dist
                has_repulsion = True
            elif dist < orientation_radius:
                ori_x += velocities[j][0]
                ori_y += velocities[j][1]
            elif dist < attraction_radius:
                att_x += dx / dist
                att_y += dy / dist

        if has_repulsion:
            desired = (rep_x, rep_y)
        else:
            desired = (ori_x + att_x, ori_y + att_y)

        desired_mag = math.hypot(*desired) or 1e-9
        desired_dir = (desired[0] / desired_mag, desired[1] / desired_mag)

        cur_vx, cur_vy = velocities[i]
        new_vx = cur_vx + turn_rate * (desired_dir[0] * speed - cur_vx)
        new_vy = cur_vy + turn_rate * (desired_dir[1] * speed - cur_vy)
        mag = math.hypot(new_vx, new_vy) or 1e-9
        new_velocities.append((new_vx / mag * speed, new_vy / mag * speed))

    new_positions = [
        (positions[i][0] + new_velocities[i][0], positions[i][1] + new_velocities[i][1]) for i in range(n)
    ]
    return new_positions, new_velocities
```

```typescript
type Vec2 = [number, number];

function zoneModelStep(
  positions: Vec2[],
  velocities: Vec2[],
  repulsionRadius = 1.0,
  orientationRadius = 4.0,
  attractionRadius = 10.0,
  speed = 1.0,
  turnRate = 0.3,
): { positions: Vec2[]; velocities: Vec2[] } {
  const n = positions.length;
  const newVelocities: Vec2[] = [];

  for (let i = 0; i < n; i++) {
    let repX = 0,
      repY = 0,
      oriX = 0,
      oriY = 0,
      attX = 0,
      attY = 0;
    let hasRepulsion = false;

    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const dx = positions[j][0] - positions[i][0];
      const dy = positions[j][1] - positions[i][1];
      const dist = Math.hypot(dx, dy);
      if (dist === 0) continue;

      if (dist < repulsionRadius) {
        repX -= dx / dist;
        repY -= dy / dist;
        hasRepulsion = true;
      } else if (dist < orientationRadius) {
        oriX += velocities[j][0];
        oriY += velocities[j][1];
      } else if (dist < attractionRadius) {
        attX += dx / dist;
        attY += dy / dist;
      }
    }

    const desired: Vec2 = hasRepulsion
      ? [repX, repY]
      : [oriX + attX, oriY + attY];
    const desiredMag = Math.hypot(...desired) || 1e-9;
    const desiredDir: Vec2 = [desired[0] / desiredMag, desired[1] / desiredMag];

    const [curVx, curVy] = velocities[i];
    let newVx = curVx + turnRate * (desiredDir[0] * speed - curVx);
    let newVy = curVy + turnRate * (desiredDir[1] * speed - curVy);
    const mag = Math.hypot(newVx, newVy) || 1e-9;
    newVelocities.push([(newVx / mag) * speed, (newVy / mag) * speed]);
  }

  const newPositions: Vec2[] = positions.map((p, i) => [
    p[0] + newVelocities[i][0],
    p[1] + newVelocities[i][1],
  ]);
  return { positions: newPositions, velocities: newVelocities };
}
```

```cpp
#include <vector>
#include <cmath>

using Vec2 = std::pair<double, double>;

std::pair<std::vector<Vec2>, std::vector<Vec2>> zoneModelStep(
    const std::vector<Vec2>& positions, const std::vector<Vec2>& velocities,
    double repulsionRadius, double orientationRadius, double attractionRadius, double speed, double turnRate) {
    int n = static_cast<int>(positions.size());
    std::vector<Vec2> newVelocities(n);

    for (int i = 0; i < n; i++) {
        double repX = 0, repY = 0, oriX = 0, oriY = 0, attX = 0, attY = 0;
        bool hasRepulsion = false;

        for (int j = 0; j < n; j++) {
            if (i == j) continue;
            double dx = positions[j].first - positions[i].first, dy = positions[j].second - positions[i].second;
            double dist = std::hypot(dx, dy);
            if (dist == 0) continue;

            if (dist < repulsionRadius) { repX -= dx / dist; repY -= dy / dist; hasRepulsion = true; }
            else if (dist < orientationRadius) { oriX += velocities[j].first; oriY += velocities[j].second; }
            else if (dist < attractionRadius) { attX += dx / dist; attY += dy / dist; }
        }

        double desiredX = hasRepulsion ? repX : oriX + attX;
        double desiredY = hasRepulsion ? repY : oriY + attY;
        double desiredMag = std::hypot(desiredX, desiredY);
        if (desiredMag < 1e-9) desiredMag = 1e-9;

        double newVx = velocities[i].first + turnRate * ((desiredX / desiredMag) * speed - velocities[i].first);
        double newVy = velocities[i].second + turnRate * ((desiredY / desiredMag) * speed - velocities[i].second);
        double mag = std::hypot(newVx, newVy);
        if (mag < 1e-9) mag = 1e-9;
        newVelocities[i] = {newVx / mag * speed, newVy / mag * speed};
    }

    std::vector<Vec2> newPositions(n);
    for (int i = 0; i < n; i++) {
        newPositions[i] = {positions[i].first + newVelocities[i].first, positions[i].second + newVelocities[i].second};
    }
    return {newPositions, newVelocities};
}
```

```rust
type Vec2 = (f64, f64);

fn zone_model_step(
    positions: &[Vec2], velocities: &[Vec2],
    repulsion_radius: f64, orientation_radius: f64, attraction_radius: f64, speed: f64, turn_rate: f64,
) -> (Vec<Vec2>, Vec<Vec2>) {
    let n = positions.len();
    let mut new_velocities = Vec::with_capacity(n);

    for i in 0..n {
        let (mut rep_x, mut rep_y) = (0.0, 0.0);
        let (mut ori_x, mut ori_y) = (0.0, 0.0);
        let (mut att_x, mut att_y) = (0.0, 0.0);
        let mut has_repulsion = false;

        for j in 0..n {
            if i == j {
                continue;
            }
            let dx = positions[j].0 - positions[i].0;
            let dy = positions[j].1 - positions[i].1;
            let dist = dx.hypot(dy);
            if dist == 0.0 {
                continue;
            }

            if dist < repulsion_radius {
                rep_x -= dx / dist;
                rep_y -= dy / dist;
                has_repulsion = true;
            } else if dist < orientation_radius {
                ori_x += velocities[j].0;
                ori_y += velocities[j].1;
            } else if dist < attraction_radius {
                att_x += dx / dist;
                att_y += dy / dist;
            }
        }

        let (desired_x, desired_y) = if has_repulsion { (rep_x, rep_y) } else { (ori_x + att_x, ori_y + att_y) };
        let desired_mag = desired_x.hypot(desired_y).max(1e-9);

        let new_vx = velocities[i].0 + turn_rate * ((desired_x / desired_mag) * speed - velocities[i].0);
        let new_vy = velocities[i].1 + turn_rate * ((desired_y / desired_mag) * speed - velocities[i].1);
        let mag = new_vx.hypot(new_vy).max(1e-9);
        new_velocities.push((new_vx / mag * speed, new_vy / mag * speed));
    }

    let new_positions: Vec<Vec2> = (0..n).map(|i| (positions[i].0 + new_velocities[i].0, positions[i].1 + new_velocities[i].1)).collect();
    (new_positions, new_velocities)
}
```

```csharp
static (List<(double, double)> positions, List<(double, double)> velocities) ZoneModelStep(
    List<(double x, double y)> positions, List<(double x, double y)> velocities,
    double repulsionRadius, double orientationRadius, double attractionRadius, double speed, double turnRate)
{
    int n = positions.Count;
    var newVelocities = new List<(double, double)>(new (double, double)[n]);

    for (int i = 0; i < n; i++)
    {
        double repX = 0, repY = 0, oriX = 0, oriY = 0, attX = 0, attY = 0;
        bool hasRepulsion = false;

        for (int j = 0; j < n; j++)
        {
            if (i == j) continue;
            double dx = positions[j].x - positions[i].x, dy = positions[j].y - positions[i].y;
            double dist = Math.Sqrt(dx * dx + dy * dy);
            if (dist == 0) continue;

            if (dist < repulsionRadius) { repX -= dx / dist; repY -= dy / dist; hasRepulsion = true; }
            else if (dist < orientationRadius) { oriX += velocities[j].x; oriY += velocities[j].y; }
            else if (dist < attractionRadius) { attX += dx / dist; attY += dy / dist; }
        }

        double desiredX = hasRepulsion ? repX : oriX + attX;
        double desiredY = hasRepulsion ? repY : oriY + attY;
        double desiredMag = Math.Max(Math.Sqrt(desiredX * desiredX + desiredY * desiredY), 1e-9);

        double newVx = velocities[i].x + turnRate * (desiredX / desiredMag * speed - velocities[i].x);
        double newVy = velocities[i].y + turnRate * (desiredY / desiredMag * speed - velocities[i].y);
        double mag = Math.Max(Math.Sqrt(newVx * newVx + newVy * newVy), 1e-9);
        newVelocities[i] = (newVx / mag * speed, newVy / mag * speed);
    }

    var newPositions = new List<(double, double)>();
    for (int i = 0; i < n; i++)
        newPositions.Add((positions[i].x + newVelocities[i].Item1, positions[i].y + newVelocities[i].Item2));

    return (newPositions, newVelocities);
}
```
