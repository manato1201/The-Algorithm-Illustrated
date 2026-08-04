---
name: Pure Pursuit(純追跡法)による経路追従
category: 制御・ロボティクス
subcategory: 姿勢・軌道生成
complexity: O(n)(nは経路上の点数、最近傍点の探索)
summary: "[RRT](/algorithms/rrt)や[ボロノイ図による経路計画](/algorithms/voronoi-path-planning)が「どこを通るか」という経路そのものを決めるのに対し、決定済みの経路上に置いた「先読み点」を追いかけ続けるだけで、車両やロボットが滑らかにその経路に追従できるようにする、実装の単純さで広く使われる経路追従制御手法。"
---

## 概要

[RRT](/algorithms/rrt)や[ボロノイ図による経路計画](/algorithms/voronoi-path-planning)によって「通るべき経路」が決まったとしても、実際の車両やロボットがその経路を物理的にどう辿るか(操舵角をどう決めるか)という別の問題が残る。1990年代にカーネギーメロン大学で開発されたPure Pursuit(純追跡法)は、この経路追従問題に対する直感的で実装の単純な解法を提供する——現在位置から一定の距離(先読み距離)だけ前方の、経路上の1点を「目標点」として選び、その目標点へ向かう円弧(現在の車両の向きから目標点へ滑らかにつながる円弧)を計算し、その円弧に沿うために必要な操舵角を決定する。目標点を経路に沿って常に「一歩先」に置き続けることで、車両は自然と経路全体をなぞるように走行する。

## 仕組み

1. 車両の現在位置・向きと、追従したい経路(連続する点の並びとして与えられる)を用意する
2. 経路上の点の中から、現在位置から一定の「先読み距離(look-ahead distance)」だけ離れた点を「目標点」として選ぶ(現在位置に最も近い経路上の点から、先読み距離ぶん先へ進んだ点を探す)
3. 現在の車両の位置・向きから、この目標点へ滑らかに到達する円弧の曲率を、円弧の幾何学的な性質(現在の向きと目標点への方向のなす角度から)から計算する——これは「現在の姿勢から目標点を通る唯一の円弧」を求める単純な幾何計算である
4. 計算された曲率に応じて、車両の操舵角(ステアリング角)を決定する(曲率が大きいほど大きく舵を切る)
5. 車両が実際に動いて位置が更新されるたびに、手順2〜4を繰り返し、常に「現在位置から先読み距離だけ先の経路上の点」を新しい目標点として追いかけ続ける

## 特性・トレードオフ

- **計算量**: 各制御サイクルでの目標点の探索は経路上の点数`n`に対して`O(n)`(経路が長い場合は、前回の目標点付近から探索を始めるなどの効率化が可能)——操舵角の計算自体は単純な幾何計算で`O(1)`、リアルタイム制御に十分な軽さを持つ
- **先読み距離が制御の性質を決める重要なパラメータ**: 先読み距離を短くすると経路への追従精度は上がるが、急なカーブで振動的な挙動(ふらつき)が起こりやすくなる。先読み距離を長くすると滑らかな走行になるが、カーブの内側を切ってショートカットしてしまい経路からのずれが大きくなる——実務では車両の速度に応じて先読み距離を動的に調整する(速度が速いほど先読み距離を長くする)ことで、この安定性と精度のトレードオフをバランスさせることが多い
- **[LQR制御](/algorithms/lqr-control)のような最適制御との対比**: [LQR](/algorithms/lqr-control)がコスト関数を数学的に最小化する理論的に最適な制御則を導出するのに対し、Pure Pursuitは幾何学的な直感に基づく簡便な発見的手法(ヒューリスティック)である——理論的な最適性の保証はないが、実装が単純でパラメータ(先読み距離)も1つだけであるため、実務のロボットや自動運転車のプロトタイピングで広く使われている
- **経路計画と経路追従の役割分担という設計思想**: Pure Pursuitは「どこを通るべきか」(経路計画、[RRT](/algorithms/rrt)や[ボロノイ図による経路計画](/algorithms/voronoi-path-planning)が担当)と「決まった経路をどう物理的になぞるか」(経路追従、Pure Pursuitが担当)という2つの異なる問題を分離する、自律移動ロボットの制御スタックにおける典型的な階層構造を体現している
- **使いどころ**: 自動運転車の車線追従制御、農業用自動運転トラクター(実際にPure Pursuitが広く実用化されている分野)、DARPA Grand Challengeに端を発する自律走行車両の経路追従、倉庫内搬送ロボット(AGV)の経路追従制御

## 実装例

経路上で現在位置から先読み距離だけ離れた目標点を選び、車両ローカル座標系での横方向オフセットから旋回曲率`κ = 2y'/L²`を計算して姿勢を更新する。直線経路からオフセットした初期位置が経路に収束すること、および曲線経路をゴールまで追従できることを検証する。

```python
import math


def find_target_point(path, pos, lookahead):
    """posに最も近い経路上の点から、lookahead以上離れた最初の点を目標点にする。"""
    closest_idx = min(range(len(path)), key=lambda i: math.hypot(path[i][0] - pos[0], path[i][1] - pos[1]))
    for i in range(closest_idx, len(path)):
        if math.hypot(path[i][0] - pos[0], path[i][1] - pos[1]) >= lookahead:
            return path[i]
    return path[-1]


def compute_curvature(pos, heading, target):
    """kappa = 2*y' / L^2 (y'は目標点の車両ローカル座標系での横方向オフセット、Lは直線距離)。"""
    dx, dy = target[0] - pos[0], target[1] - pos[1]
    local_x = dx * math.cos(-heading) - dy * math.sin(-heading)
    local_y = dx * math.sin(-heading) + dy * math.cos(-heading)
    length_sq = local_x ** 2 + local_y ** 2
    if length_sq < 1e-9:
        return 0.0
    return 2 * local_y / length_sq


def simulate(path, start_pos, start_heading, lookahead=2.0, speed=1.0, dt=0.1, max_steps=2000, goal_tol=0.3):
    pos, heading = start_pos, start_heading
    trace = [pos]
    goal = path[-1]
    for _ in range(max_steps):
        target = find_target_point(path, pos, lookahead)
        curvature = compute_curvature(pos, heading, target)
        heading += curvature * speed * dt
        pos = (pos[0] + speed * math.cos(heading) * dt, pos[1] + speed * math.sin(heading) * dt)
        trace.append(pos)
        if math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < goal_tol:
            break
    return trace
```

```typescript
type Pt = [number, number];

function findTargetPoint(path: Pt[], pos: Pt, lookahead: number): Pt {
  let closestIdx = 0;
  let closestDist = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = Math.hypot(path[i][0] - pos[0], path[i][1] - pos[1]);
    if (d < closestDist) {
      closestDist = d;
      closestIdx = i;
    }
  }
  for (let i = closestIdx; i < path.length; i++) {
    if (Math.hypot(path[i][0] - pos[0], path[i][1] - pos[1]) >= lookahead) return path[i];
  }
  return path[path.length - 1];
}

function computeCurvature(pos: Pt, heading: number, target: Pt): number {
  const dx = target[0] - pos[0];
  const dy = target[1] - pos[1];
  const localX = dx * Math.cos(-heading) - dy * Math.sin(-heading);
  const localY = dx * Math.sin(-heading) + dy * Math.cos(-heading);
  const lengthSq = localX * localX + localY * localY;
  if (lengthSq < 1e-9) return 0;
  return (2 * localY) / lengthSq;
}

function simulate(
  path: Pt[], startPos: Pt, startHeading: number, lookahead = 2.0, speed = 1.0, dt = 0.1,
  maxSteps = 2000, goalTol = 0.3
): Pt[] {
  let pos = startPos;
  let heading = startHeading;
  const trace: Pt[] = [pos];
  const goal = path[path.length - 1];
  for (let i = 0; i < maxSteps; i++) {
    const target = findTargetPoint(path, pos, lookahead);
    const curvature = computeCurvature(pos, heading, target);
    heading += curvature * speed * dt;
    pos = [pos[0] + speed * Math.cos(heading) * dt, pos[1] + speed * Math.sin(heading) * dt];
    trace.push(pos);
    if (Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < goalTol) break;
  }
  return trace;
}
```

```cpp
#include <vector>
#include <cmath>
#include <utility>
#include <limits>

using Pt = std::pair<double, double>;

Pt findTargetPoint(const std::vector<Pt>& path, Pt pos, double lookahead) {
    size_t closestIdx = 0;
    double closestDist = std::numeric_limits<double>::max();
    for (size_t i = 0; i < path.size(); i++) {
        double d = std::hypot(path[i].first - pos.first, path[i].second - pos.second);
        if (d < closestDist) { closestDist = d; closestIdx = i; }
    }
    for (size_t i = closestIdx; i < path.size(); i++) {
        double d = std::hypot(path[i].first - pos.first, path[i].second - pos.second);
        if (d >= lookahead) return path[i];
    }
    return path.back();
}

double computeCurvature(Pt pos, double heading, Pt target) {
    double dx = target.first - pos.first, dy = target.second - pos.second;
    double localX = dx * std::cos(-heading) - dy * std::sin(-heading);
    double localY = dx * std::sin(-heading) + dy * std::cos(-heading);
    double lengthSq = localX * localX + localY * localY;
    if (lengthSq < 1e-9) return 0.0;
    return 2 * localY / lengthSq;
}

std::vector<Pt> simulate(
    const std::vector<Pt>& path, Pt startPos, double startHeading,
    double lookahead = 2.0, double speed = 1.0, double dt = 0.1, int maxSteps = 2000, double goalTol = 0.3) {
    Pt pos = startPos;
    double heading = startHeading;
    std::vector<Pt> trace = {pos};
    Pt goal = path.back();
    for (int i = 0; i < maxSteps; i++) {
        Pt target = findTargetPoint(path, pos, lookahead);
        double curvature = computeCurvature(pos, heading, target);
        heading += curvature * speed * dt;
        pos = {pos.first + speed * std::cos(heading) * dt, pos.second + speed * std::sin(heading) * dt};
        trace.push_back(pos);
        if (std::hypot(pos.first - goal.first, pos.second - goal.second) < goalTol) break;
    }
    return trace;
}
```

```rust
type Pt = (f64, f64);

fn find_target_point(path: &[Pt], pos: Pt, lookahead: f64) -> Pt {
    let closest_idx = (0..path.len())
        .min_by(|&a, &b| {
            let da = (path[a].0 - pos.0).hypot(path[a].1 - pos.1);
            let db = (path[b].0 - pos.0).hypot(path[b].1 - pos.1);
            da.partial_cmp(&db).unwrap()
        })
        .unwrap();
    for i in closest_idx..path.len() {
        if (path[i].0 - pos.0).hypot(path[i].1 - pos.1) >= lookahead {
            return path[i];
        }
    }
    *path.last().unwrap()
}

fn compute_curvature(pos: Pt, heading: f64, target: Pt) -> f64 {
    let (dx, dy) = (target.0 - pos.0, target.1 - pos.1);
    let local_x = dx * (-heading).cos() - dy * (-heading).sin();
    let local_y = dx * (-heading).sin() + dy * (-heading).cos();
    let length_sq = local_x * local_x + local_y * local_y;
    if length_sq < 1e-9 {
        return 0.0;
    }
    2.0 * local_y / length_sq
}

fn simulate(
    path: &[Pt], start_pos: Pt, start_heading: f64,
    lookahead: f64, speed: f64, dt: f64, max_steps: usize, goal_tol: f64,
) -> Vec<Pt> {
    let mut pos = start_pos;
    let mut heading = start_heading;
    let mut trace = vec![pos];
    let goal = *path.last().unwrap();
    for _ in 0..max_steps {
        let target = find_target_point(path, pos, lookahead);
        let curvature = compute_curvature(pos, heading, target);
        heading += curvature * speed * dt;
        pos = (pos.0 + speed * heading.cos() * dt, pos.1 + speed * heading.sin() * dt);
        trace.push(pos);
        if (pos.0 - goal.0).hypot(pos.1 - goal.1) < goal_tol {
            break;
        }
    }
    trace
}
```

```csharp
static (double, double) FindTargetPoint(List<(double x, double y)> path, (double x, double y) pos, double lookahead)
{
    int closestIdx = 0; double closestDist = double.MaxValue;
    for (int i = 0; i < path.Count; i++)
    {
        double d = Math.Sqrt(Math.Pow(path[i].x - pos.x, 2) + Math.Pow(path[i].y - pos.y, 2));
        if (d < closestDist) { closestDist = d; closestIdx = i; }
    }
    for (int i = closestIdx; i < path.Count; i++)
    {
        double d = Math.Sqrt(Math.Pow(path[i].x - pos.x, 2) + Math.Pow(path[i].y - pos.y, 2));
        if (d >= lookahead) return path[i];
    }
    return path[^1];
}

static double ComputeCurvature((double x, double y) pos, double heading, (double x, double y) target)
{
    double dx = target.x - pos.x, dy = target.y - pos.y;
    double localX = dx * Math.Cos(-heading) - dy * Math.Sin(-heading);
    double localY = dx * Math.Sin(-heading) + dy * Math.Cos(-heading);
    double lengthSq = localX * localX + localY * localY;
    if (lengthSq < 1e-9) return 0;
    return 2 * localY / lengthSq;
}

static List<(double, double)> Simulate(
    List<(double x, double y)> path, (double x, double y) startPos, double startHeading,
    double lookahead = 2.0, double speed = 1.0, double dt = 0.1, int maxSteps = 2000, double goalTol = 0.3)
{
    var pos = startPos; double heading = startHeading;
    var trace = new List<(double, double)> { pos };
    var goal = path[^1];
    for (int i = 0; i < maxSteps; i++)
    {
        var target = FindTargetPoint(path, pos, lookahead);
        double curvature = ComputeCurvature(pos, heading, target);
        heading += curvature * speed * dt;
        pos = (pos.x + speed * Math.Cos(heading) * dt, pos.y + speed * Math.Sin(heading) * dt);
        trace.Add(pos);
        if (Math.Sqrt(Math.Pow(pos.x - goal.x, 2) + Math.Pow(pos.y - goal.y, 2)) < goalTol) break;
    }
    return trace;
}
```
