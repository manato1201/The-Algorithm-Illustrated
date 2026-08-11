---
name: Advantage Actor-Critic(A2C)
category: 強化学習
subcategory: 方策勾配法
complexity: O(1)(1ステップの更新あたり)
summary: TD誤差の代わりに「アドバンテージ(その行動が平均よりどれだけ良かったか)」を使ってActorを更新することで、Actor-Criticの学習信号をより解釈しやすく、分散の少ない形に整理した発展形。
---

## 概要

[Actor-Critic法](/algorithms/actor-critic)はTD誤差`δ = r + γ・V(s') - V(s)`を使って方策(Actor)を更新するが、このTD誤差は実質的に**アドバンテージ関数**`A(s,a) = Q(s,a) - V(s)`の推定値になっている——「行動`a`を取ることが、その状態の平均的な価値`V(s)`と比べてどれだけ得だったか」を表す量である。Advantage Actor-Critic(A2C)は、この解釈を前面に押し出し、複数の環境のロールアウトを束ねてバッチ更新することで学習を安定させた、[Actor-Critic法](/algorithms/actor-critic)の実務的な洗練版である。非同期に多数の環境を並列実行する発展形A3C(Asynchronous Advantage Actor-Critic)から、同期的にバッチ処理する形に整理されたA2Cは、実装のシンプルさと学習の安定性のバランスから、深層強化学習の基本的なベースライン手法として広く使われている。

## 仕組み

1. Actor(方策`π_θ(a|s)`)とCritic(状態価値`V_w(s)`)の2つのネットワーク(またはパラメータ集合)を用意する
2. 現在の方策で複数ステップ(または複数の並列環境)分の軌跡`(s_t, a_t, r_t)`を集める(A2Cはミニバッチのようにある程度まとめてから更新する点が、1ステップごとに更新する素朴な[Actor-Critic法](/algorithms/actor-critic)との実務上の違い)
3. 各時刻`t`について、**アドバンテージ**を計算する:`A_t = r_t + γ・V_w(s_{t+1}) - V_w(s_t)`(1ステップのTD誤差をそのままアドバンテージ推定として使う、より高度な実装ではN-step収益やGAE(Generalized Advantage Estimation)でバイアスと分散のバランスを調整する)
4. **Criticの更新**: 価値の予測誤差を最小化する方向(`A_t`を目標との差とみなした二乗誤差の最小化)にパラメータ`w`を更新する
5. **Actorの更新**: `θ ← θ + α・Σ_t A_t・∇_θ log π_θ(a_t|s_t)`のように、アドバンテージで重み付けした方策勾配でパラメータ`θ`を更新する。アドバンテージが正(平均より良い行動)ならその行動の確率を上げ、負(平均より悪い行動)なら下げる
6. しばしば方策の**エントロピー正則化**(方策が特定の行動に偏りすぎないようにするボーナス項)を損失関数に加え、探索を維持しながら学習を進める

## 特性・トレードオフ

- **アドバンテージによる解釈のしやすさと分散削減**: 「行動の絶対的な良さ」ではなく「平均と比べた相対的な良さ」を学習信号にすることで、[REINFORCEアルゴリズム](/algorithms/reinforce-algorithm)がそのまま持つ高分散の問題をさらに軽減できる。状態自体の価値が高い/低いという情報が行動選択の学習信号から差し引かれるため、行動間の相対的な優劣がより明確に伝わる
- **同期バッチ処理による安定性と効率**: 元となったA3Cは複数のワーカーが非同期にパラメータを更新する設計だったが、A2Cは複数環境のロールアウトを同期的に集めてから1回にまとめて更新することで、GPU上でのバッチ処理と相性が良く、学習の再現性・安定性も高まることが分かっている
- **[PPO](/algorithms/ppo)への発展**: A2Cは方策の更新幅を明示的に制限する仕組みを持たないため、1回の更新が大きすぎると学習が崩壊するリスクがある。この問題に対処し、更新幅を安全な範囲にクリッピングして安定化させたのがPPO(Proximal Policy Optimization)であり、A2Cはその理論的な土台になっている
- **使いどころ**: Atariゲームやロボット制御などの深層強化学習ベンチマークの標準的なベースライン、比較的シンプルな実装で安定した学習が求められる研究・教育用途、より高度な手法(PPO、SAC)を学ぶ前段階としての基礎的な発展形

## 実装例

ソフトマックス方策(Actor)と状態価値の線形近似(Critic)を使い、複数ステップ分のロールアウトをまとめてアドバンテージで更新する簡易版を示す。

```python
import math

def softmax(scores: list[float]) -> list[float]:
    m = max(scores)
    exps = [math.exp(s - m) for s in scores]
    total = sum(exps)
    return [e / total for e in exps]

def a2c_update(
    theta: list[list[float]], v: list[float],
    rollout: list[tuple[int, int, float, int]],  # (state, action, reward, next_state)
    alpha: float = 0.1, beta: float = 0.1, gamma: float = 0.99,
) -> None:
    advantages = []
    for state, action, reward, next_state in rollout:
        advantage = reward + gamma * v[next_state] - v[state]
        advantages.append(advantage)

    # Criticの更新: 全ステップのアドバンテージ(TD誤差)で状態価値を補正
    for (state, _, _, _), advantage in zip(rollout, advantages):
        v[state] += beta * advantage

    # Actorの更新: アドバンテージで重み付けした方策勾配
    for (state, action, _, _), advantage in zip(rollout, advantages):
        probs = softmax(theta[state])
        for a in range(len(theta[state])):
            grad_log_pi = (1.0 if a == action else 0.0) - probs[a]
            theta[state][a] += alpha * advantage * grad_log_pi
```

```typescript
function softmax(scores: number[]): number[] {
  const m = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - m));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / total);
}

function a2cUpdate(
  theta: number[][],
  v: number[],
  rollout: [number, number, number, number][],
  alpha = 0.1,
  beta = 0.1,
  gamma = 0.99,
): void {
  const advantages = rollout.map(
    ([state, , reward, nextState]) => reward + gamma * v[nextState] - v[state],
  );

  rollout.forEach(([state], i) => {
    v[state] += beta * advantages[i];
  });

  rollout.forEach(([state, action], i) => {
    const advantage = advantages[i];
    const probs = softmax(theta[state]);
    for (let a = 0; a < theta[state].length; a++) {
      const gradLogPi = (a === action ? 1 : 0) - probs[a];
      theta[state][a] += alpha * advantage * gradLogPi;
    }
  });
}
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>
#include <tuple>

std::vector<double> softmaxVec(const std::vector<double>& scores) {
    double m = *std::max_element(scores.begin(), scores.end());
    std::vector<double> exps(scores.size());
    double total = 0.0;
    for (size_t i = 0; i < scores.size(); i++) { exps[i] = std::exp(scores[i] - m); total += exps[i]; }
    for (auto& e : exps) e /= total;
    return exps;
}

void a2cUpdate(
    std::vector<std::vector<double>>& theta, std::vector<double>& v,
    const std::vector<std::tuple<int, int, double, int>>& rollout,
    double alpha = 0.1, double beta = 0.1, double gamma = 0.99) {
    std::vector<double> advantages;
    for (auto& [state, action, reward, nextState] : rollout) {
        advantages.push_back(reward + gamma * v[nextState] - v[state]);
    }

    for (size_t i = 0; i < rollout.size(); i++) {
        int state = std::get<0>(rollout[i]);
        v[state] += beta * advantages[i];
    }

    for (size_t i = 0; i < rollout.size(); i++) {
        auto [state, action, reward, nextState] = rollout[i];
        auto probs = softmaxVec(theta[state]);
        for (size_t a = 0; a < theta[state].size(); a++) {
            double gradLogPi = (static_cast<int>(a) == action ? 1.0 : 0.0) - probs[a];
            theta[state][a] += alpha * advantages[i] * gradLogPi;
        }
    }
}
```

```rust
fn softmax(scores: &[f64]) -> Vec<f64> {
    let m = scores.iter().cloned().fold(f64::MIN, f64::max);
    let exps: Vec<f64> = scores.iter().map(|s| (s - m).exp()).collect();
    let total: f64 = exps.iter().sum();
    exps.iter().map(|e| e / total).collect()
}

fn a2c_update(
    theta: &mut [Vec<f64>], v: &mut [f64], rollout: &[(usize, usize, f64, usize)],
    alpha: f64, beta: f64, gamma: f64,
) {
    let advantages: Vec<f64> = rollout
        .iter()
        .map(|&(state, _, reward, next_state)| reward + gamma * v[next_state] - v[state])
        .collect();

    for (i, &(state, _, _, _)) in rollout.iter().enumerate() {
        v[state] += beta * advantages[i];
    }

    for (i, &(state, action, _, _)) in rollout.iter().enumerate() {
        let probs = softmax(&theta[state]);
        for a in 0..theta[state].len() {
            let grad_log_pi = if a == action { 1.0 } else { 0.0 } - probs[a];
            theta[state][a] += alpha * advantages[i] * grad_log_pi;
        }
    }
}
```

```csharp
static double[] Softmax(double[] scores)
{
    double m = scores.Max();
    var exps = scores.Select(s => Math.Exp(s - m)).ToArray();
    double total = exps.Sum();
    return exps.Select(e => e / total).ToArray();
}

static void A2CUpdate(double[][] theta, double[] v, List<(int state, int action, double reward, int nextState)> rollout, double alpha = 0.1, double beta = 0.1, double gamma = 0.99)
{
    var advantages = rollout.Select(r => r.reward + gamma * v[r.nextState] - v[r.state]).ToArray();

    for (int i = 0; i < rollout.Count; i++)
    {
        v[rollout[i].state] += beta * advantages[i];
    }

    for (int i = 0; i < rollout.Count; i++)
    {
        var (state, action, _, _) = rollout[i];
        var probs = Softmax(theta[state]);
        for (int a = 0; a < theta[state].Length; a++)
        {
            double gradLogPi = (a == action ? 1.0 : 0.0) - probs[a];
            theta[state][a] += alpha * advantages[i] * gradLogPi;
        }
    }
}
```
