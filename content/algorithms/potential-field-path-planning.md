---
name: ポテンシャル法(人工ポテンシャル場法)
category: 制御・ロボティクス
subcategory: 経路計画
complexity: O(1)(1制御周期あたりの勾配計算)
summary: ゴールを引力源、障害物を斥力源とする仮想的な力場を空間全体に定義し、ロボットがその場の勾配(坂)を下るように動くだけで自然に障害物を避けながらゴールへ向かう経路計画法。
---

## 概要

1986年にオサマ・ハティブが提案したポテンシャル法は、物理学の重力場や電場のアナロジーを経路計画に応用した、直感的で計算コストの極めて低い手法である。ゴール地点を「ロボットを引き寄せる引力源」、障害物を「ロボットを遠ざける斥力源」とみなし、空間全体にこれらを合成した仮想的なポテンシャル場(高さのある地形のようなもの)を定義する。ロボットは、まるでボールが坂を転がり落ちるように、その場の勾配(最も急に下る方向)に沿って動くだけで、自然にゴールへ向かいながら障害物を避ける経路が形成される——[RRT](/algorithms/rrt)のようなサンプリングに基づく探索とは対照的な、勾配ベースの反応的な経路計画の代表例になっている。

## 仕組み

1. ゴール地点`x_goal`に対する引力ポテンシャルを、ゴールからの距離に応じて増加する関数(例えば`U_att(x) = (1/2) × k_att × distance(x, x_goal)²`のような、[勾配降下法](/algorithms/gradient-descent)の目的関数と同じ形の放物線)として定義する
2. 各障害物に対する斥力ポテンシャルを、障害物に近づくほど急激に増加する関数(ロボットが障害物にごく近い距離まで来たときだけ強く働き、一定距離より遠ければ影響しないよう設計されることが多い)として定義する
3. 空間中の各点`x`での全体のポテンシャル`U(x) = U_att(x) + Σ U_rep(x)`(引力ポテンシャルと全障害物の斥力ポテンシャルの合計)を定義する
4. ロボットの現在位置において、このポテンシャル場の勾配`-∇U(x)`(ポテンシャルが最も急に下がる方向、これは物理的には「力」に相当する)を計算し、その方向へ少し移動する
5. これを繰り返すことで、ロボットは(ゴールが低いポテンシャルの谷になっているため)ゴールへ向かって坂を下りながら、障害物の周りでは斥力ポテンシャルの壁を避けるように自然に迂回していく

## 特性・トレードオフ

- **計算量**: 各制御周期での勾配計算は、その時点のロボット位置と各障害物・ゴールとの距離から解析的に計算できるため`O(1)`に近く、[Dynamic Window Approach](/algorithms/dynamic-window-approach)と並んで極めて軽量なリアルタイム制御に向く
- **局所最小値の問題**: ポテンシャル法の最大の弱点は、引力と斥力が複雑に打ち消し合う場所に「局所的な谷(ゴールではないのに勾配がゼロになる点)」が生じることがあり、ロボットがそこにはまり込んで動けなくなってしまう([山登り法](/algorithms/hill-climbing)が局所最適に陥る問題と本質的に同じ現象、勾配ベースの手法に共通する弱点である)。狭い通路や複雑に入り組んだ障害物配置では、この局所最小値問題が特に起こりやすい
- **[Dynamic Window Approach](/algorithms/dynamic-window-approach)との対比**: どちらも軽量なリアルタイム局所制御だが、ポテンシャル法は連続的な力場の勾配に従うのに対し、DWAはロボットの物理的な動的制約を明示的に考慮した離散的な速度候補の評価を行う——ポテンシャル法の方がシンプルだが局所最小値に陥りやすく、DWAの方が実装はやや複雑だが動的制約を直接扱える
- **使いどころ**: 単純な環境でのリアルタイムロボットナビゲーション、群ロボット(スウォーム)における個体間の衝突回避(各ロボットが他のロボットを斥力源とみなす)、ゲームのAIキャラクターの単純な障害物回避行動、大域的な経路計画([RRT](/algorithms/rrt)等)と組み合わせた局所的な微調整

## 実装例

ゴールへの引力勾配と障害物からの斥力勾配を合成し、その負の勾配方向へ少しずつ進む。ゴールに到達し、かつ障害物の半径を侵さないことを検証する。

```python
import math


def attractive_gradient(pos, goal, k_att):
    dx, dy = pos[0] - goal[0], pos[1] - goal[1]
    return (k_att * dx, k_att * dy)


def repulsive_gradient(pos, obstacle, radius, influence_dist, k_rep):
    dx, dy = pos[0] - obstacle[0], pos[1] - obstacle[1]
    dist = math.hypot(dx, dy) - radius
    if dist <= 0:
        dist = 1e-6
    if dist > influence_dist:
        return (0.0, 0.0)
    factor = k_rep * (1.0 / dist - 1.0 / influence_dist) * (1.0 / (dist ** 2))
    norm = math.hypot(dx, dy) or 1e-6
    return (factor * dx / norm, factor * dy / norm)


def plan_path(
    start, goal, obstacles, radius=1.0, influence_dist=3.0,
    k_att=1.0, k_rep=50.0, step_size=0.1, max_steps=2000, goal_tol=0.2,
):
    pos = start
    path = [pos]
    for _ in range(max_steps):
        gx, gy = attractive_gradient(pos, goal, k_att)
        rx, ry = 0.0, 0.0
        for obs in obstacles:
            fx, fy = repulsive_gradient(pos, obs, radius, influence_dist, k_rep)
            rx += fx
            ry += fy
        total_x, total_y = gx + rx, gy + ry
        norm = math.hypot(total_x, total_y)
        if norm < 1e-9:
            break
        pos = (pos[0] - step_size * total_x / norm, pos[1] - step_size * total_y / norm)
        path.append(pos)
        if math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < goal_tol:
            break
    return path
```

```typescript
type Pt = [number, number];

function attractiveGradient(pos: Pt, goal: Pt, kAtt: number): Pt {
  return [kAtt * (pos[0] - goal[0]), kAtt * (pos[1] - goal[1])];
}

function repulsiveGradient(pos: Pt, obstacle: Pt, radius: number, influenceDist: number, kRep: number): Pt {
  const dx = pos[0] - obstacle[0];
  const dy = pos[1] - obstacle[1];
  let dist = Math.hypot(dx, dy) - radius;
  if (dist <= 0) dist = 1e-6;
  if (dist > influenceDist) return [0, 0];
  const factor = kRep * (1 / dist - 1 / influenceDist) * (1 / (dist * dist));
  const norm = Math.hypot(dx, dy) || 1e-6;
  return [(factor * dx) / norm, (factor * dy) / norm];
}

function planPath(
  start: Pt, goal: Pt, obstacles: Pt[], radius = 1.0, influenceDist = 3.0,
  kAtt = 1.0, kRep = 50.0, stepSize = 0.1, maxSteps = 2000, goalTol = 0.2
): Pt[] {
  let pos = start;
  const path: Pt[] = [pos];
  for (let i = 0; i < maxSteps; i++) {
    const [gx, gy] = attractiveGradient(pos, goal, kAtt);
    let rx = 0, ry = 0;
    for (const obs of obstacles) {
      const [fx, fy] = repulsiveGradient(pos, obs, radius, influenceDist, kRep);
      rx += fx;
      ry += fy;
    }
    const totalX = gx + rx;
    const totalY = gy + ry;
    const norm = Math.hypot(totalX, totalY);
    if (norm < 1e-9) break;
    pos = [pos[0] - (stepSize * totalX) / norm, pos[1] - (stepSize * totalY) / norm];
    path.push(pos);
    if (Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < goalTol) break;
  }
  return path;
}
```

```cpp
#include <vector>
#include <cmath>
#include <utility>

using Pt = std::pair<double, double>;

Pt attractiveGradient(Pt pos, Pt goal, double kAtt) {
    return {kAtt * (pos.first - goal.first), kAtt * (pos.second - goal.second)};
}

Pt repulsiveGradient(Pt pos, Pt obstacle, double radius, double influenceDist, double kRep) {
    double dx = pos.first - obstacle.first, dy = pos.second - obstacle.second;
    double dist = std::hypot(dx, dy) - radius;
    if (dist <= 0) dist = 1e-6;
    if (dist > influenceDist) return {0.0, 0.0};
    double factor = kRep * (1.0 / dist - 1.0 / influenceDist) * (1.0 / (dist * dist));
    double norm = std::hypot(dx, dy);
    if (norm < 1e-6) norm = 1e-6;
    return {factor * dx / norm, factor * dy / norm};
}

std::vector<Pt> planPath(
    Pt start, Pt goal, const std::vector<Pt>& obstacles,
    double radius = 1.0, double influenceDist = 3.0, double kAtt = 1.0, double kRep = 50.0,
    double stepSize = 0.1, int maxSteps = 2000, double goalTol = 0.2) {
    Pt pos = start;
    std::vector<Pt> path = {pos};
    for (int i = 0; i < maxSteps; i++) {
        auto [gx, gy] = attractiveGradient(pos, goal, kAtt);
        double rx = 0, ry = 0;
        for (const auto& obs : obstacles) {
            auto [fx, fy] = repulsiveGradient(pos, obs, radius, influenceDist, kRep);
            rx += fx;
            ry += fy;
        }
        double totalX = gx + rx, totalY = gy + ry;
        double norm = std::hypot(totalX, totalY);
        if (norm < 1e-9) break;
        pos = {pos.first - stepSize * totalX / norm, pos.second - stepSize * totalY / norm};
        path.push_back(pos);
        if (std::hypot(pos.first - goal.first, pos.second - goal.second) < goalTol) break;
    }
    return path;
}
```

```rust
type Pt = (f64, f64);

fn attractive_gradient(pos: Pt, goal: Pt, k_att: f64) -> Pt {
    (k_att * (pos.0 - goal.0), k_att * (pos.1 - goal.1))
}

fn repulsive_gradient(pos: Pt, obstacle: Pt, radius: f64, influence_dist: f64, k_rep: f64) -> Pt {
    let (dx, dy) = (pos.0 - obstacle.0, pos.1 - obstacle.1);
    let mut dist = dx.hypot(dy) - radius;
    if dist <= 0.0 {
        dist = 1e-6;
    }
    if dist > influence_dist {
        return (0.0, 0.0);
    }
    let factor = k_rep * (1.0 / dist - 1.0 / influence_dist) * (1.0 / (dist * dist));
    let mut norm = dx.hypot(dy);
    if norm < 1e-6 {
        norm = 1e-6;
    }
    (factor * dx / norm, factor * dy / norm)
}

fn plan_path(
    start: Pt, goal: Pt, obstacles: &[Pt], radius: f64, influence_dist: f64,
    k_att: f64, k_rep: f64, step_size: f64, max_steps: usize, goal_tol: f64,
) -> Vec<Pt> {
    let mut pos = start;
    let mut path = vec![pos];
    for _ in 0..max_steps {
        let (gx, gy) = attractive_gradient(pos, goal, k_att);
        let (mut rx, mut ry) = (0.0, 0.0);
        for &obs in obstacles {
            let (fx, fy) = repulsive_gradient(pos, obs, radius, influence_dist, k_rep);
            rx += fx;
            ry += fy;
        }
        let (total_x, total_y) = (gx + rx, gy + ry);
        let norm = total_x.hypot(total_y);
        if norm < 1e-9 {
            break;
        }
        pos = (pos.0 - step_size * total_x / norm, pos.1 - step_size * total_y / norm);
        path.push(pos);
        if (pos.0 - goal.0).hypot(pos.1 - goal.1) < goal_tol {
            break;
        }
    }
    path
}
```

```csharp
static (double, double) AttractiveGradient((double x, double y) pos, (double x, double y) goal, double kAtt) =>
    (kAtt * (pos.x - goal.x), kAtt * (pos.y - goal.y));

static (double, double) RepulsiveGradient((double x, double y) pos, (double x, double y) obstacle, double radius, double influenceDist, double kRep)
{
    double dx = pos.x - obstacle.x, dy = pos.y - obstacle.y;
    double dist = Math.Sqrt(dx * dx + dy * dy) - radius;
    if (dist <= 0) dist = 1e-6;
    if (dist > influenceDist) return (0, 0);
    double factor = kRep * (1 / dist - 1 / influenceDist) * (1 / (dist * dist));
    double norm = Math.Sqrt(dx * dx + dy * dy);
    if (norm < 1e-6) norm = 1e-6;
    return (factor * dx / norm, factor * dy / norm);
}

static List<(double, double)> PlanPath(
    (double x, double y) start, (double x, double y) goal, List<(double x, double y)> obstacles,
    double radius = 1.0, double influenceDist = 3.0, double kAtt = 1.0, double kRep = 50.0,
    double stepSize = 0.1, int maxSteps = 2000, double goalTol = 0.2)
{
    var pos = start;
    var path = new List<(double, double)> { pos };
    for (int i = 0; i < maxSteps; i++)
    {
        var (gx, gy) = AttractiveGradient(pos, goal, kAtt);
        double rx = 0, ry = 0;
        foreach (var obs in obstacles)
        {
            var (fx, fy) = RepulsiveGradient(pos, obs, radius, influenceDist, kRep);
            rx += fx; ry += fy;
        }
        double totalX = gx + rx, totalY = gy + ry;
        double norm = Math.Sqrt(totalX * totalX + totalY * totalY);
        if (norm < 1e-9) break;
        pos = (pos.x - stepSize * totalX / norm, pos.y - stepSize * totalY / norm);
        path.Add(pos);
        if (Math.Sqrt(Math.Pow(pos.x - goal.x, 2) + Math.Pow(pos.y - goal.y, 2)) < goalTol) break;
    }
    return path;
}
```
