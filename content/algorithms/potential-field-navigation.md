---
name: ポテンシャルフィールド法によるナビゲーション
category: キャラクターAI・空間AI
subcategory: 空間認識・知覚
complexity: O(k)(kは近傍の障害物数、1ステップの力計算あたり)
summary: 目的地を引力の谷、障害物を斥力の丘とする仮想的なポテンシャル場をマップ上に定義し、その勾配(最も急な下り坂の方向)に従って移動するだけで、経路探索なしにリアルタイムな障害物回避を実現する。
---

## 概要

[ナビゲーションメッシュ生成](/algorithms/navmesh-generation)や[A*探索](/algorithms/a-star)のような経路探索は、事前に(または探索時に)経路全体を計算してから移動するアプローチだが、ポテンシャルフィールド法は発想が異なる——**マップ上の各地点に、目的地に近いほど低く、障害物に近いほど高い「仮想的な高さ(ポテンシャル)」を定義**し、キャラクターは単純にその場の「最も急な下り坂の方向」へ進み続けるだけで、自然に目的地へたどり着きながら障害物を避ける。1986年にオサマ・カティブがロボット制御向けに提案したこの手法は、経路全体を事前計算する必要がなく、動く障害物にもリアルタイムに反応できる軽量さから、ロボティクスとゲームAIの両方で使われている。

## 仕組み

1. **引力ポテンシャル**: 目的地に近づくほど値が低くなるポテンシャル関数を定義する。単純には目的地までの距離に比例する`U_attract(p) = k_att・distance(p, goal)`という形が使われる
2. **斥力ポテンシャル**: 各障害物について、障害物に近づくほど値が急激に高くなるポテンシャル関数を定義する。障害物からの距離が一定の影響半径`Q*`を超えると影響がなくなるよう設計されることが多い:`U_repel(p) = k_rep・(1/distance(p, obstacle) - 1/Q*)²`(距離が`Q*`未満の場合のみ)
3. 現在位置`p`における全体のポテンシャル`U(p) = U_attract(p) + Σ_obstacles U_repel(p)`を計算する
4. キャラクターが受ける「力」は、ポテンシャルの**負の勾配**`F(p) = -∇U(p)`として計算される。これは「ポテンシャルが最も急激に下がる方向」を指すベクトルであり、引力(目的地方向)と斥力(障害物から遠ざかる方向)が合成された、その瞬間に進むべき方向を表す
5. この力の方向へキャラクターを1ステップ分移動させ、新しい位置で1〜4を繰り返す。目的地に到達するまで、または一定のタイムアウトまでこれを続ける

## 特性・トレードオフ

- **経路の事前計算が不要な軽量さ**: A*のようなグラフ探索を行わず、現在位置の周辺情報だけから次の一歩を決められるため、計算コストが非常に低く、動的に位置が変わる障害物(他のキャラクターなど)にもリアルタイムに反応できる
- **局所的最小値(ローカルミニマム)問題**: 引力と斥力が釣り合ってしまう地点(例えば目的地の手前にU字型の障害物がある場合の凹みの中心)で力が相殺され、キャラクターがそこで動けなくなる「局所的最小値」に陥ることがある。これはポテンシャルフィールド法が抱える最大の理論的弱点で、乱数によるゆらぎの追加、[A*](/algorithms/a-star)による大域的な経路計画との併用(大域的にはA*で経路を決め、局所的な障害物回避だけポテンシャルフィールド法に任せる)といった対策が取られる
- **[RVO](/algorithms/reciprocal-velocity-obstacles)・[ソーシャルフォースモデル](/algorithms/social-force-model)との類似性**: 「複数の力を合成して次の動きを決める」という発想は、RVOやソーシャルフォースモデルとも共通している。ポテンシャルフィールド法は経路誘導(目的地への到達)に主眼を置く一方、RVOやソーシャルフォースモデルは他のエージェントとの衝突回避によりフォーカスしている、という重点の違いがある
- **使いどころ**: ロボットのリアルタイム障害物回避、単純な追跡・逃走AIの移動制御、[A*](/algorithms/a-star)などの大域経路計画と組み合わせた局所的な回避処理、群れ制御の個々のエージェントの移動則の一部

## 実装例

```python
import math

def attractive_force(pos: tuple[float, float], goal: tuple[float, float], k_att: float = 1.0) -> tuple[float, float]:
    dx, dy = goal[0] - pos[0], goal[1] - pos[1]
    dist = math.hypot(dx, dy) or 1e-6
    return (k_att * dx / dist, k_att * dy / dist)

def repulsive_force(
    pos: tuple[float, float], obstacles: list[tuple[float, float]], k_rep: float = 50.0, q_star: float = 5.0,
) -> tuple[float, float]:
    fx = fy = 0.0
    for ox, oy in obstacles:
        dx, dy = pos[0] - ox, pos[1] - oy
        dist = math.hypot(dx, dy)
        if 0 < dist < q_star:
            magnitude = k_rep * (1 / dist - 1 / q_star) * (1 / dist ** 2)
            fx += magnitude * dx / dist
            fy += magnitude * dy / dist
    return (fx, fy)

def potential_field_step(
    pos: tuple[float, float], goal: tuple[float, float], obstacles: list[tuple[float, float]], step_size: float = 0.5,
) -> tuple[float, float]:
    ax, ay = attractive_force(pos, goal)
    rx, ry = repulsive_force(pos, obstacles)
    fx, fy = ax + rx, ay + ry
    mag = math.hypot(fx, fy) or 1e-6
    return (pos[0] + step_size * fx / mag, pos[1] + step_size * fy / mag)
```

```typescript
function attractiveForce(
  pos: [number, number],
  goal: [number, number],
  kAtt = 1.0,
): [number, number] {
  const dx = goal[0] - pos[0],
    dy = goal[1] - pos[1];
  const dist = Math.hypot(dx, dy) || 1e-6;
  return [(kAtt * dx) / dist, (kAtt * dy) / dist];
}

function repulsiveForce(
  pos: [number, number],
  obstacles: [number, number][],
  kRep = 50.0,
  qStar = 5.0,
): [number, number] {
  let fx = 0,
    fy = 0;
  for (const [ox, oy] of obstacles) {
    const dx = pos[0] - ox,
      dy = pos[1] - oy;
    const dist = Math.hypot(dx, dy);
    if (dist > 0 && dist < qStar) {
      const magnitude = kRep * (1 / dist - 1 / qStar) * (1 / (dist * dist));
      fx += (magnitude * dx) / dist;
      fy += (magnitude * dy) / dist;
    }
  }
  return [fx, fy];
}

function potentialFieldStep(
  pos: [number, number],
  goal: [number, number],
  obstacles: [number, number][],
  stepSize = 0.5,
): [number, number] {
  const [ax, ay] = attractiveForce(pos, goal);
  const [rx, ry] = repulsiveForce(pos, obstacles);
  const fx = ax + rx,
    fy = ay + ry;
  const mag = Math.hypot(fx, fy) || 1e-6;
  return [pos[0] + (stepSize * fx) / mag, pos[1] + (stepSize * fy) / mag];
}
```

```cpp
#include <vector>
#include <utility>
#include <cmath>

std::pair<double, double> attractiveForce(std::pair<double, double> pos, std::pair<double, double> goal, double kAtt = 1.0) {
    double dx = goal.first - pos.first, dy = goal.second - pos.second;
    double dist = std::hypot(dx, dy);
    if (dist < 1e-6) dist = 1e-6;
    return {kAtt * dx / dist, kAtt * dy / dist};
}

std::pair<double, double> repulsiveForce(
    std::pair<double, double> pos, const std::vector<std::pair<double, double>>& obstacles,
    double kRep = 50.0, double qStar = 5.0) {
    double fx = 0.0, fy = 0.0;
    for (auto& [ox, oy] : obstacles) {
        double dx = pos.first - ox, dy = pos.second - oy;
        double dist = std::hypot(dx, dy);
        if (dist > 0 && dist < qStar) {
            double magnitude = kRep * (1 / dist - 1 / qStar) * (1 / (dist * dist));
            fx += magnitude * dx / dist;
            fy += magnitude * dy / dist;
        }
    }
    return {fx, fy};
}

std::pair<double, double> potentialFieldStep(
    std::pair<double, double> pos, std::pair<double, double> goal,
    const std::vector<std::pair<double, double>>& obstacles, double stepSize = 0.5) {
    auto [ax, ay] = attractiveForce(pos, goal);
    auto [rx, ry] = repulsiveForce(pos, obstacles);
    double fx = ax + rx, fy = ay + ry;
    double mag = std::hypot(fx, fy);
    if (mag < 1e-6) mag = 1e-6;
    return {pos.first + stepSize * fx / mag, pos.second + stepSize * fy / mag};
}
```

```rust
fn attractive_force(pos: (f64, f64), goal: (f64, f64), k_att: f64) -> (f64, f64) {
    let dx = goal.0 - pos.0;
    let dy = goal.1 - pos.1;
    let dist = dx.hypot(dy).max(1e-6);
    (k_att * dx / dist, k_att * dy / dist)
}

fn repulsive_force(pos: (f64, f64), obstacles: &[(f64, f64)], k_rep: f64, q_star: f64) -> (f64, f64) {
    let mut fx = 0.0;
    let mut fy = 0.0;
    for &(ox, oy) in obstacles {
        let dx = pos.0 - ox;
        let dy = pos.1 - oy;
        let dist = dx.hypot(dy);
        if dist > 0.0 && dist < q_star {
            let magnitude = k_rep * (1.0 / dist - 1.0 / q_star) * (1.0 / (dist * dist));
            fx += magnitude * dx / dist;
            fy += magnitude * dy / dist;
        }
    }
    (fx, fy)
}

fn potential_field_step(pos: (f64, f64), goal: (f64, f64), obstacles: &[(f64, f64)], step_size: f64) -> (f64, f64) {
    let (ax, ay) = attractive_force(pos, goal, 1.0);
    let (rx, ry) = repulsive_force(pos, obstacles, 50.0, 5.0);
    let (fx, fy) = (ax + rx, ay + ry);
    let mag = fx.hypot(fy).max(1e-6);
    (pos.0 + step_size * fx / mag, pos.1 + step_size * fy / mag)
}
```

```csharp
static (double x, double y) AttractiveForce((double x, double y) pos, (double x, double y) goal, double kAtt = 1.0)
{
    double dx = goal.x - pos.x, dy = goal.y - pos.y;
    double dist = Math.Max(Math.Sqrt(dx * dx + dy * dy), 1e-6);
    return (kAtt * dx / dist, kAtt * dy / dist);
}

static (double x, double y) RepulsiveForce((double x, double y) pos, List<(double x, double y)> obstacles, double kRep = 50.0, double qStar = 5.0)
{
    double fx = 0, fy = 0;
    foreach (var (ox, oy) in obstacles)
    {
        double dx = pos.x - ox, dy = pos.y - oy;
        double dist = Math.Sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < qStar)
        {
            double magnitude = kRep * (1 / dist - 1 / qStar) * (1 / (dist * dist));
            fx += magnitude * dx / dist;
            fy += magnitude * dy / dist;
        }
    }
    return (fx, fy);
}

static (double x, double y) PotentialFieldStep((double x, double y) pos, (double x, double y) goal, List<(double x, double y)> obstacles, double stepSize = 0.5)
{
    var (ax, ay) = AttractiveForce(pos, goal);
    var (rx, ry) = RepulsiveForce(pos, obstacles);
    double fx = ax + rx, fy = ay + ry;
    double mag = Math.Max(Math.Sqrt(fx * fx + fy * fy), 1e-6);
    return (pos.x + stepSize * fx / mag, pos.y + stepSize * fy / mag);
}
```
