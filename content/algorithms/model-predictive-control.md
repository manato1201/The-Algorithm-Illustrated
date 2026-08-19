---
name: モデル予測制御(Model Predictive Control, MPC)
category: 制御・ロボティクス
subcategory: フィードバック制御
complexity: O(N³)(1ステップあたり、Nはホライズン長×状態次元に依存する最適化問題の規模)
summary: 現在から一定のホライズン先までの未来の挙動をシステムモデルで予測し、その区間での評価関数を最小化する制御入力列を毎ステップ最適化計算で求めながら、実際には最初の1ステップだけを適用し続けるレシーディングホライズン制御手法。
---

## 概要

[LQR](/algorithms/lqr-control)はコスト関数を最小化する最適なフィードバックゲインを一度計算すれば、あとは`u = -Kx`という単純な線形則を適用し続けるだけでよい。しかし、この定式化には「制御入力や状態にはこれ以上の値を取ってはいけない」という**制約条件**(モーターのトルク上限、関節の可動域、衝突を避けるための位置制限など)を直接組み込む方法がない。モデル予測制御(MPC)は、この制約条件を明示的に扱えるように設計された最適制御手法である——現在の状態から未来へ一定の時間区間(予測ホライズン)だけシステムモデルで挙動をシミュレーションし、その区間全体での評価関数(コスト)を最小化する制御入力の列を、制約条件を満たす範囲で毎回の制御周期ごとに最適化計算し直す。そして計算された入力列のうち**最初の1ステップ分だけ**を実際に適用し、次の周期になったら観測した最新の状態から再び同じ計算をやり直す——この「常に一歩だけ実行して、見通す範囲を1コマずつ前にずらしながら計算し直す」性質は**レシーディングホライズン制御(receding horizon control)**と呼ばれ、MPCの最大の特徴である。

## 仕組み

1. 制御対象のシステムモデル(状態方程式、線形でも非線形でもよい)と、状態・制御入力それぞれに課したい制約条件(上下限、線形不等式など)を定義する
2. 現在時刻`t`での状態`x(t)`を観測する
3. `t`から予測ホライズン`N`ステップ先(`t+N`)までの未来を、システムモデルを使ってシミュレーションしながら、その区間全体でのコスト(目標軌道からのずれ、制御入力の大きさなど、[LQR](/algorithms/lqr-control)と同様の二次形式コストがよく使われる)を最小化する制御入力の列`u(t), u(t+1), …, u(t+N-1)`を、制約条件を満たす範囲で数値最適化(二次計画法など)によって求める
4. 求めた入力列のうち、**最初の1ステップ分`u(t)`だけ**を実際のシステムに適用する
5. 1制御周期分だけ時間を進め(`t ← t+1`)、新しく観測された状態`x(t+1)`から、手順3〜4を再び最初からやり直す——予測ホライズンの「窓」を1ステップずつ未来へずらしながら、毎回すべてを再計算し直す

この「毎回全部計算し直す」という一見無駄に思える手順が、外乱やモデル誤差によって実際の挙動が予測とずれても、次の周期で最新の観測値をもとに軌道修正できるフィードバック機構として働く。

## 特性・トレードオフ

- **計算量**: 1制御周期あたりの最適化問題は、予測ホライズン`N`と状態次元・制御入力次元に依存する二次計画問題(制約なしの線形二次コストなら)で、変数の総数のオーダーに対しておおむね`O(N³)`程度——[LQR](/algorithms/lqr-control)の`u=-Kx`が定数時間の掛け算で済むのに対し、MPCは**制御周期ごとに毎回最適化ソルバーを走らせる**必要があり、計算負荷は大幅に重い。この計算コストの高さが、MPCを高速な制御周期が必要な系(モーターの電流制御など)に直接適用しにくい理由になっている
- **[LQR](/algorithms/lqr-control)との最大の違いは制約条件の明示的な扱い**: LQRは理論上「どんな大きさの制御入力も許される」という前提で解析的にゲインを導出するため、実際のアクチュエータの出力上限や関節の可動域といった物理的な制約を組み込めない(結果を後からクリッピングするなどの対症療法しかない)。MPCは最適化問題そのものに不等式制約として組み込むため、制約を満たす範囲での最適解が保証される——この一点が、実世界の制約が多いシステム(自動運転、化学プラント、ドローンの姿勢制御など)でMPCが広く採用される理由である
- **予測ホライズンの長さというトレードオフ**: ホライズン`N`を長くするほど、より先の未来まで見通して制約違反を予見・回避できるようになり制御性能は向上するが、最適化問題の規模が大きくなり計算コストが増大する。実務では制御周期内に計算が収まる範囲でできるだけ長いホライズンを取る、というチューニングが必要になる
- **モデルの正確さへの依存と非線形MPC**: 線形なシステムモデルを使う線形MPCは二次計画法で効率よく解けるが、実際のロボットや車両の挙動は非線形であることが多く、その場合は非線形計画法を毎周期解く非線形MPC(NMPC)が必要になり、計算コストはさらに増す。モデル誤差や外乱に対しては、都度観測値で軌道修正するレシーディングホライズンの仕組み自体がある程度の頑健性を持つが、モデルが大きく間違っていれば予測そのものが破綻する
- **使いどころ**: 自動運転車の経路追従とレーンキープ(車線逸脱や車間距離といった制約を扱える)、化学プラントやビル空調のプロセス制御(応答が遅くリアルタイム性の要求が緩いため計算コストの高さが許容されやすい)、ドローンやロケットの姿勢制御、[LQR](/algorithms/lqr-control)ではモデル化しにくい可動域制限のあるロボットアームの軌道制御

## 実装例

1次元の質点(位置・速度が状態、加速度が制御入力)を目標位置へ導くMPCの簡易実装。予測ホライズン`N`ステップ先までのコストを最小化する加速度列を、制御入力の上下限制約を満たす範囲で座標降下法的な数値最適化(勾配を使わない単純な探索)によって求め、最初の1ステップだけ適用する。

```python
import math


def simulate_step(pos: float, vel: float, accel: float, dt: float) -> tuple[float, float]:
    """1次元の質点モデル: 加速度accelを1ステップ適用した後の(位置, 速度)を返す。"""
    new_vel = vel + accel * dt
    new_pos = pos + vel * dt + 0.5 * accel * dt * dt
    return new_pos, new_vel


def predict_cost(pos: float, vel: float, u_seq: list[float], target: float, dt: float,
                  q_pos: float = 1.0, q_vel: float = 0.1, r_u: float = 0.05) -> float:
    """u_seq(制御入力列)を適用した場合の予測ホライズン全体でのコストを計算する。"""
    cost = 0.0
    p, v = pos, vel
    for u in u_seq:
        p, v = simulate_step(p, v, u, dt)
        cost += q_pos * (p - target) ** 2 + q_vel * v ** 2 + r_u * u ** 2
    return cost


def optimize_control_sequence(pos: float, vel: float, target: float, horizon: int, dt: float,
                               u_min: float, u_max: float, iterations: int = 60) -> list[float]:
    """座標降下法で、制約[u_min, u_max]を満たす入力列を探索する(単純な数値最適化)。"""
    u_seq = [0.0] * horizon
    step = (u_max - u_min) * 0.5
    for _ in range(iterations):
        for i in range(horizon):
            best_u, best_cost = u_seq[i], predict_cost(pos, vel, u_seq, target, dt)
            for candidate in (u_seq[i] - step, u_seq[i] + step):
                candidate = max(u_min, min(u_max, candidate))
                trial = u_seq[:]
                trial[i] = candidate
                c = predict_cost(pos, vel, trial, target, dt)
                if c < best_cost:
                    best_u, best_cost = candidate, c
            u_seq[i] = best_u
        step *= 0.7  # 探索幅を徐々に狭める
    return u_seq


def mpc_control_step(pos: float, vel: float, target: float, horizon: int = 10, dt: float = 0.1,
                      u_min: float = -1.0, u_max: float = 1.0) -> float:
    """レシーディングホライズン: 予測ホライズン分を最適化し、最初の1ステップだけを返す。"""
    u_seq = optimize_control_sequence(pos, vel, target, horizon, dt, u_min, u_max)
    return u_seq[0]


def run_mpc(start_pos: float, target: float, steps: int = 80, dt: float = 0.1) -> list[float]:
    pos, vel = start_pos, 0.0
    trace = [pos]
    for _ in range(steps):
        u = mpc_control_step(pos, vel, target, dt=dt)
        pos, vel = simulate_step(pos, vel, u, dt)
        trace.append(pos)
        if abs(pos - target) < 1e-3 and abs(vel) < 1e-3:
            break
    return trace
```

```typescript
function simulateStep(pos: number, vel: number, accel: number, dt: number): [number, number] {
  const newVel = vel + accel * dt;
  const newPos = pos + vel * dt + 0.5 * accel * dt * dt;
  return [newPos, newVel];
}

function predictCost(
  pos: number, vel: number, uSeq: number[], target: number, dt: number,
  qPos = 1.0, qVel = 0.1, rU = 0.05
): number {
  let cost = 0;
  let p = pos, v = vel;
  for (const u of uSeq) {
    [p, v] = simulateStep(p, v, u, dt);
    cost += qPos * (p - target) ** 2 + qVel * v ** 2 + rU * u ** 2;
  }
  return cost;
}

function optimizeControlSequence(
  pos: number, vel: number, target: number, horizon: number, dt: number,
  uMin: number, uMax: number, iterations = 60
): number[] {
  const uSeq = new Array(horizon).fill(0);
  let step = (uMax - uMin) * 0.5;
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < horizon; i++) {
      let bestU = uSeq[i];
      let bestCost = predictCost(pos, vel, uSeq, target, dt);
      for (const raw of [uSeq[i] - step, uSeq[i] + step]) {
        const candidate = Math.max(uMin, Math.min(uMax, raw));
        const trial = [...uSeq];
        trial[i] = candidate;
        const c = predictCost(pos, vel, trial, target, dt);
        if (c < bestCost) {
          bestU = candidate;
          bestCost = c;
        }
      }
      uSeq[i] = bestU;
    }
    step *= 0.7;
  }
  return uSeq;
}

function mpcControlStep(
  pos: number, vel: number, target: number, horizon = 10, dt = 0.1,
  uMin = -1.0, uMax = 1.0
): number {
  const uSeq = optimizeControlSequence(pos, vel, target, horizon, dt, uMin, uMax);
  return uSeq[0];
}

function runMpc(startPos: number, target: number, steps = 80, dt = 0.1): number[] {
  let pos = startPos, vel = 0;
  const trace = [pos];
  for (let i = 0; i < steps; i++) {
    const u = mpcControlStep(pos, vel, target, 10, dt);
    [pos, vel] = simulateStep(pos, vel, u, dt);
    trace.push(pos);
    if (Math.abs(pos - target) < 1e-3 && Math.abs(vel) < 1e-3) break;
  }
  return trace;
}
```
