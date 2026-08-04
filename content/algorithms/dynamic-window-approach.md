---
name: Dynamic Window Approach(動的窓法)
category: 制御・ロボティクス
subcategory: 経路計画
complexity: O(速度サンプル数 × 予測ステップ数)(1制御周期あたり)
summary: ロボットの加減速能力の物理的な限界を考慮した「実現可能な速度の窓」の中から、障害物回避・目標への接近・速度維持を評価して最良の速度指令を毎周期選び直す、リアルタイムな局所回避手法。
---

## 概要

[RRT](/algorithms/rrt)や[A*探索](/algorithms/a-star)は静的な地図上での大域的な経路を事前に計画するが、実際のロボットは動いている障害物や予期しない物体に、走行中にリアルタイムで反応して回避する必要がある。1997年にフォックスらが発表したDynamic Window Approach(DWA)は、大域的な経路全体を考えるのではなく、「次の一瞬に、ロボットの物理的な加減速能力を踏まえて実際に取りうる速度・角速度の組み合わせ」だけに候補を絞り込み、その中から最も良さそうな1つを毎制御周期選び直す、高速でリアルタイム性に優れた局所的な障害物回避手法である。

## 仕組み

1. ロボットの現在の速度・角速度と、モーターの加減速能力の限界から、「次の制御周期で実際に到達可能な速度・角速度の組み合わせの範囲(動的窓)」を計算する——急に止まれない、急に曲がれないといった物理的制約をこの段階で反映する
2. 動的窓の中から、複数の速度・角速度の候補をサンプリングする
3. 各候補について、その速度・角速度でしばらく(数秒程度)進んだ場合の予測軌道をシミュレートする
4. 各予測軌道を、複数の評価基準で採点する: (a) 目標地点にどれだけ近づけるか、(b) 障害物にどれだけ近づかずに済むか(安全マージン)、(c) 速度をどれだけ維持できるか(不必要な減速を避ける)。これらを重み付けして合成したスコアを各候補に与える
5. 最もスコアの高い速度・角速度の組み合わせを選び、それを実際にロボットへの制御指令として送る
6. 次の制御周期(通常は数十ミリ秒〜数百ミリ秒ごと)で1〜5を再度繰り返す——常に「今この瞬間に取れる最良の行動」を選び直し続ける、極めて反応性の高い制御になっている

## 特性・トレードオフ

- **計算量**: 速度・角速度のサンプル数と、各候補の予測ステップ数の積に比例する程度で、非常に軽量な計算に収まる。ロボットの制御ループ(数十Hz〜数百Hz)の中で毎周期実行できる速さが求められるため、この軽さが実用上不可欠になっている
- **局所最適性と大域的な行き詰まりのリスク**: DWAは次の一瞬の最良行動だけを考える近視眼的な手法であるため、部屋の隅に迷い込むようなU字型の障害物配置では、局所的には「これ以上近づけない」という判断から抜け出せず、大域的にはゴールへの道が存在するのに立ち往生してしまうことがある——この弱点を補うため、実務では[A*](/algorithms/a-star)や[RRT](/algorithms/rrt)による大域的な経路計画と組み合わせ、DWAはその経路に沿った局所的な障害物回避だけを担当する、階層的な設計がよく使われる
- **評価基準の重み調整**: 目標への接近・安全性・速度維持という複数の評価基準の重み付けバランスが、ロボットの実際の走行挙動(積極的に進むか、慎重に回避を優先するか)を大きく左右する、実務上のチューニングの勘所になる
- **使いどころ**: 移動ロボット(掃除ロボット、倉庫内搬送ロボット)のリアルタイム障害物回避、自動運転車の局所的な走行制御、動的環境(人や他のロボットが動き回る空間)での安全なナビゲーション

## 実装例

差動二輪モデル(速度`v`・角速度`w`)を仮定し、動的窓内の`(v, w)`候補をサンプリングして予測軌道を評価し、ゴールへの接近・障害物からの安全マージン・速度維持を重み付け合成したスコアで最良の1つを選ぶ。

```python
import math


def predict_trajectory(x, y, theta, v, w, dt, steps):
    traj = []
    for _ in range(steps):
        x += v * math.cos(theta) * dt
        y += v * math.sin(theta) * dt
        theta += w * dt
        traj.append((x, y, theta))
    return traj


def dwa_select(state, goal, obstacles, config):
    x, y, theta, v, w = state
    v_min = max(config["v_min"], v - config["accel"] * config["dt"])
    v_max = min(config["v_max"], v + config["accel"] * config["dt"])
    w_min = max(-config["w_max"], w - config["w_accel"] * config["dt"])
    w_max = min(config["w_max"], w + config["w_accel"] * config["dt"])

    best_score = -float("inf")
    best_v, best_w = 0.0, 0.0
    found_any = False

    for iv in range(config["v_samples"]):
        cv = v_min + (v_max - v_min) * iv / max(config["v_samples"] - 1, 1)
        for iw in range(config["w_samples"]):
            cw = w_min + (w_max - w_min) * iw / max(config["w_samples"] - 1, 1)
            traj = predict_trajectory(x, y, theta, cv, cw, config["predict_dt"], config["predict_steps"])
            fx, fy, _ = traj[-1]
            goal_dist = math.hypot(goal[0] - fx, goal[1] - fy)
            min_obs = min(
                (math.hypot(ox - px, oy - py) for (px, py, _) in traj for (ox, oy) in obstacles),
                default=float("inf"),
            )
            if min_obs < config["robot_radius"]:
                continue  # 衝突コースなので候補から除外
            found_any = True
            score = (
                -config["goal_weight"] * goal_dist
                + config["obstacle_weight"] * min(min_obs, config["obstacle_clip"])
                + config["speed_weight"] * cv
            )
            if score > best_score:
                best_score = score
                best_v, best_w = cv, cw

    return (best_v, best_w) if found_any else (0.0, 0.0)
```

```typescript
function predictTrajectory(x: number, y: number, theta: number, v: number, w: number, dt: number, steps: number): [number, number, number][] {
  const traj: [number, number, number][] = [];
  for (let i = 0; i < steps; i++) {
    x += v * Math.cos(theta) * dt;
    y += v * Math.sin(theta) * dt;
    theta += w * dt;
    traj.push([x, y, theta]);
  }
  return traj;
}

interface DwaConfig {
  vMin: number; vMax: number; accel: number;
  wMax: number; wAccel: number;
  dt: number; predictDt: number; predictSteps: number;
  vSamples: number; wSamples: number;
  goalWeight: number; obstacleWeight: number; obstacleClip: number;
  speedWeight: number; robotRadius: number;
}

function dwaSelect(
  state: [number, number, number, number, number],
  goal: [number, number],
  obstacles: [number, number][],
  config: DwaConfig
): [number, number] {
  const [x, y, theta, v, w] = state;
  const vMin = Math.max(config.vMin, v - config.accel * config.dt);
  const vMax = Math.min(config.vMax, v + config.accel * config.dt);
  const wMin = Math.max(-config.wMax, w - config.wAccel * config.dt);
  const wMax = Math.min(config.wMax, w + config.wAccel * config.dt);

  let bestScore = -Infinity;
  let bestV = 0, bestW = 0;
  let foundAny = false;

  for (let iv = 0; iv < config.vSamples; iv++) {
    const cv = vMin + (vMax - vMin) * iv / Math.max(config.vSamples - 1, 1);
    for (let iw = 0; iw < config.wSamples; iw++) {
      const cw = wMin + (wMax - wMin) * iw / Math.max(config.wSamples - 1, 1);
      const traj = predictTrajectory(x, y, theta, cv, cw, config.predictDt, config.predictSteps);
      const [fx, fy] = traj[traj.length - 1];
      const goalDist = Math.hypot(goal[0] - fx, goal[1] - fy);
      let minObs = Infinity;
      for (const [px, py] of traj) {
        for (const [ox, oy] of obstacles) {
          minObs = Math.min(minObs, Math.hypot(ox - px, oy - py));
        }
      }
      if (minObs < config.robotRadius) continue;
      foundAny = true;
      const score = -config.goalWeight * goalDist
        + config.obstacleWeight * Math.min(minObs, config.obstacleClip)
        + config.speedWeight * cv;
      if (score > bestScore) { bestScore = score; bestV = cv; bestW = cw; }
    }
  }
  return foundAny ? [bestV, bestW] : [0, 0];
}
```

```cpp
#include <vector>
#include <cmath>
#include <limits>

struct DwaConfig {
    double vMin, vMax, accel;
    double wMax, wAccel;
    double dt, predictDt; int predictSteps;
    int vSamples, wSamples;
    double goalWeight, obstacleWeight, obstacleClip;
    double speedWeight, robotRadius;
};

std::vector<std::array<double, 3>> predictTrajectory(double x, double y, double theta, double v, double w, double dt, int steps) {
    std::vector<std::array<double, 3>> traj;
    traj.reserve(steps);
    for (int i = 0; i < steps; i++) {
        x += v * std::cos(theta) * dt;
        y += v * std::sin(theta) * dt;
        theta += w * dt;
        traj.push_back({ x, y, theta });
    }
    return traj;
}

std::pair<double, double> dwaSelect(const std::array<double, 5>& state, std::pair<double, double> goal,
                                     const std::vector<std::pair<double, double>>& obstacles, const DwaConfig& config) {
    double x = state[0], y = state[1], theta = state[2], v = state[3], w = state[4];
    double vMin = std::max(config.vMin, v - config.accel * config.dt);
    double vMax = std::min(config.vMax, v + config.accel * config.dt);
    double wMin = std::max(-config.wMax, w - config.wAccel * config.dt);
    double wMax = std::min(config.wMax, w + config.wAccel * config.dt);

    double bestScore = -std::numeric_limits<double>::infinity();
    double bestV = 0, bestW = 0;
    bool foundAny = false;

    for (int iv = 0; iv < config.vSamples; iv++) {
        double cv = vMin + (vMax - vMin) * iv / std::max(config.vSamples - 1, 1);
        for (int iw = 0; iw < config.wSamples; iw++) {
            double cw = wMin + (wMax - wMin) * iw / std::max(config.wSamples - 1, 1);
            auto traj = predictTrajectory(x, y, theta, cv, cw, config.predictDt, config.predictSteps);
            auto [fx, fy, ftheta] = traj.back();
            double goalDist = std::hypot(goal.first - fx, goal.second - fy);
            double minObs = std::numeric_limits<double>::infinity();
            for (const auto& pt : traj) {
                for (const auto& [ox, oy] : obstacles) {
                    minObs = std::min(minObs, std::hypot(ox - pt[0], oy - pt[1]));
                }
            }
            if (minObs < config.robotRadius) continue;
            foundAny = true;
            double score = -config.goalWeight * goalDist
                + config.obstacleWeight * std::min(minObs, config.obstacleClip)
                + config.speedWeight * cv;
            if (score > bestScore) { bestScore = score; bestV = cv; bestW = cw; }
        }
    }
    if (!foundAny) return { 0.0, 0.0 };
    return { bestV, bestW };
}
```

```rust
struct DwaConfig {
    v_min: f64, v_max: f64, accel: f64,
    w_max: f64, w_accel: f64,
    dt: f64, predict_dt: f64, predict_steps: usize,
    v_samples: usize, w_samples: usize,
    goal_weight: f64, obstacle_weight: f64, obstacle_clip: f64,
    speed_weight: f64, robot_radius: f64,
}

fn predict_trajectory(mut x: f64, mut y: f64, mut theta: f64, v: f64, w: f64, dt: f64, steps: usize) -> Vec<(f64, f64, f64)> {
    let mut traj = Vec::with_capacity(steps);
    for _ in 0..steps {
        x += v * theta.cos() * dt;
        y += v * theta.sin() * dt;
        theta += w * dt;
        traj.push((x, y, theta));
    }
    traj
}

fn dwa_select(state: (f64, f64, f64, f64, f64), goal: (f64, f64), obstacles: &[(f64, f64)], config: &DwaConfig) -> (f64, f64) {
    let (x, y, theta, v, w) = state;
    let v_min = (v - config.accel * config.dt).max(config.v_min);
    let v_max = (v + config.accel * config.dt).min(config.v_max);
    let w_min = (w - config.w_accel * config.dt).max(-config.w_max);
    let w_max = (w + config.w_accel * config.dt).min(config.w_max);

    let mut best_score = f64::NEG_INFINITY;
    let mut best_v = 0.0;
    let mut best_w = 0.0;
    let mut found_any = false;

    let v_denom = (config.v_samples.max(2) - 1) as f64;
    let w_denom = (config.w_samples.max(2) - 1) as f64;

    for iv in 0..config.v_samples {
        let cv = v_min + (v_max - v_min) * iv as f64 / v_denom;
        for iw in 0..config.w_samples {
            let cw = w_min + (w_max - w_min) * iw as f64 / w_denom;
            let traj = predict_trajectory(x, y, theta, cv, cw, config.predict_dt, config.predict_steps);
            let (fx, fy, _) = *traj.last().unwrap();
            let goal_dist = ((goal.0 - fx).powi(2) + (goal.1 - fy).powi(2)).sqrt();
            let mut min_obs = f64::INFINITY;
            for &(px, py, _) in &traj {
                for &(ox, oy) in obstacles {
                    let d = ((ox - px).powi(2) + (oy - py).powi(2)).sqrt();
                    if d < min_obs {
                        min_obs = d;
                    }
                }
            }
            if min_obs < config.robot_radius {
                continue;
            }
            found_any = true;
            let score = -config.goal_weight * goal_dist
                + config.obstacle_weight * min_obs.min(config.obstacle_clip)
                + config.speed_weight * cv;
            if score > best_score {
                best_score = score;
                best_v = cv;
                best_w = cw;
            }
        }
    }

    if found_any { (best_v, best_w) } else { (0.0, 0.0) }
}
```

```csharp
class DwaConfig
{
    public double VMin, VMax, Accel;
    public double WMax, WAccel;
    public double Dt, PredictDt; public int PredictSteps;
    public int VSamples, WSamples;
    public double GoalWeight, ObstacleWeight, ObstacleClip;
    public double SpeedWeight, RobotRadius;
}

static class DynamicWindowApproach
{
    public static List<(double, double, double)> PredictTrajectory(double x, double y, double theta, double v, double w, double dt, int steps)
    {
        var traj = new List<(double, double, double)>();
        for (int i = 0; i < steps; i++)
        {
            x += v * Math.Cos(theta) * dt;
            y += v * Math.Sin(theta) * dt;
            theta += w * dt;
            traj.Add((x, y, theta));
        }
        return traj;
    }

    public static (double V, double W) SelectVelocity(
        (double x, double y, double theta, double v, double w) state,
        (double, double) goal, List<(double, double)> obstacles, DwaConfig config)
    {
        var (x, y, theta, v, w) = state;
        double vMin = Math.Max(config.VMin, v - config.Accel * config.Dt);
        double vMax = Math.Min(config.VMax, v + config.Accel * config.Dt);
        double wMin = Math.Max(-config.WMax, w - config.WAccel * config.Dt);
        double wMax = Math.Min(config.WMax, w + config.WAccel * config.Dt);

        double bestScore = double.NegativeInfinity;
        double bestV = 0, bestW = 0;
        bool foundAny = false;

        for (int iv = 0; iv < config.VSamples; iv++)
        {
            double cv = vMin + (vMax - vMin) * iv / Math.Max(config.VSamples - 1, 1);
            for (int iw = 0; iw < config.WSamples; iw++)
            {
                double cw = wMin + (wMax - wMin) * iw / Math.Max(config.WSamples - 1, 1);
                var traj = PredictTrajectory(x, y, theta, cv, cw, config.PredictDt, config.PredictSteps);
                var (fx, fy, _) = traj[^1];
                double goalDist = Math.Sqrt(Math.Pow(goal.Item1 - fx, 2) + Math.Pow(goal.Item2 - fy, 2));
                double minObs = double.PositiveInfinity;
                foreach (var (px, py, _) in traj)
                {
                    foreach (var (ox, oy) in obstacles)
                    {
                        minObs = Math.Min(minObs, Math.Sqrt(Math.Pow(ox - px, 2) + Math.Pow(oy - py, 2)));
                    }
                }
                if (minObs < config.RobotRadius) continue;
                foundAny = true;
                double score = -config.GoalWeight * goalDist
                    + config.ObstacleWeight * Math.Min(minObs, config.ObstacleClip)
                    + config.SpeedWeight * cv;
                if (score > bestScore) { bestScore = score; bestV = cv; bestW = cw; }
            }
        }
        return foundAny ? (bestV, bestW) : (0, 0);
    }
}
```
