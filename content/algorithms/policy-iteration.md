---
name: 方策反復法(Policy Iteration)
category: 強化学習
subcategory: モデルベース・探索
complexity: O(反復回数 × (|S|³ + |S|²・|A|))
summary: 「今の方策のもとでの価値を正確に計算する(方策評価)」と「その価値をもとに方策を改善する(方策改善)」を交互に完全収束させながら繰り返し、有限回の反復で最適方策に到達するモデルベース強化学習の厳密解法。
---

## 概要

[価値反復法](/algorithms/value-iteration)は、各状態の価値を更新する処理を1回行うごとにすぐ次の状態に進むという、いわば「評価を早めに打ち切りながら」最適価値関数に収束させる手法だった。方策反復法はこれとは異なるアプローチを取る——**現在の方策のもとでの価値を完全に収束するまで正確に計算する(方策評価)フェーズ**と、**その正確な価値をもとに各状態で最善の行動に切り替える(方策改善)フェーズ**を明確に分離し、これを交互に繰り返す。1960年にロナルド・ハワードが提案したこの手法は、価値関数ではなく方策そのものを直接改善していくという発想の違いにより、**有限のマルコフ決定過程(MDP)であれば有限回の反復で厳密に最適方策に到達する**という強い収束性を持つ。

## 仕組み

1. 任意の初期方策`π`(例えばランダムな方策、または全ての状態で同じ行動を取る方策)から始める
2. **方策評価(Policy Evaluation)**: 現在の方策`π`に従い続けた場合の価値関数`V^π(s)`を求める。これは連立方程式`V^π(s) = Σ_s' P(s'|s,π(s))・[R(s,π(s),s') + γ・V^π(s')]`を解くことに相当し、実務上は価値の更新`V(s) ← Σ_s' P(s'|s,π(s))・[R + γ・V(s')]`を変化が閾値以下になるまで反復して近似的に解く(この内側のループ自体は[価値反復法](/algorithms/value-iteration)に似ているが、`max`を取らず**現在の方策が指定する行動だけ**で更新する点が異なる)
3. **方策改善(Policy Improvement)**: 収束した`V^π`を使い、各状態`s`について「1手だけ全ての行動を試し、その後は`V^π`に従う」と仮定した場合に最も価値が高くなる行動を選び直す:`π'(s) = argmax_a Σ_s' P(s'|s,a)・[R(s,a,s') + γ・V^π(s')]`
4. 方策が2の直前と全く変わらなければ(`π' = π`)、その方策はすでに最適方策であるとして終了する。変わっていれば`π ← π'`として2に戻る
5. 各反復で方策が真に改善する(悪化しない)ことが理論的に保証されており、有限状態のMDPでは有限回の反復で必ず最適方策に到達する

## 特性・トレードオフ

- **[価値反復法](/algorithms/value-iteration)との構造的な違い**: 価値反復法は「1回の価値更新→次の状態」を繰り返す1段階のループだが、方策反復法は「価値評価が完全に収束するまで内側で反復→そこで初めて方策を改善」という2段階のループを持つ。方策評価のフェーズが線形連立方程式を解くのと等価な処理であるため、1回あたりのコストは方策反復法の方が高いが、外側の反復回数(方策が変化する回数)は状態数に対して少なく済むことが多い
- **反復回数の理論的な有限性**: 状態数・行動数が有限であれば、方策反復法は有限個しか存在しない決定的方策の中を、価値が真に改善する方向にしか進まないため、理論上は有限回で必ず終了する(価値反復法は閾値による打ち切りに依存する近似的な収束であるのに対し、方策反復法はより明確な終了条件を持つ)
- **[Q学習](/algorithms/q-learning)・[Actor-Critic法](/algorithms/actor-critic)との関係**: 方策反復法は環境の遷移確率`P`と報酬関数`R`が既知であることを前提とするモデルベース手法だが、その「評価→改善」という2段階構造の発想は、モデルフリーの手法にも受け継がれている。Actor-CriticのCriticが方策評価に、Actorの更新が方策改善におおまかに対応すると理解すると両者のつながりが見える
- **使いどころ**: 遷移確率が完全にわかっている小〜中規模MDPの厳密解法、在庫管理・保守計画のようなオペレーションズリサーチ分野の意思決定最適化、強化学習アルゴリズム設計における「評価と改善を分離する」という基本アイデアの理論的な出発点

## 実装例

```python
def policy_evaluation(
    states: list[int], policy: dict[int, int],
    transition: dict[tuple[int, int], list[tuple[float, int, float]]],
    gamma: float = 0.95, theta: float = 1e-6,
) -> dict[int, float]:
    v = {s: 0.0 for s in states}
    while True:
        delta = 0.0
        for s in states:
            a = policy[s]
            new_v = sum(p * (r + gamma * v[s2]) for p, s2, r in transition.get((s, a), []))
            delta = max(delta, abs(new_v - v[s]))
            v[s] = new_v
        if delta < theta:
            break
    return v

def policy_iteration(
    states: list[int], actions: list[int],
    transition: dict[tuple[int, int], list[tuple[float, int, float]]],
    gamma: float = 0.95,
) -> tuple[dict[int, int], dict[int, float]]:
    policy = {s: actions[0] for s in states}
    while True:
        v = policy_evaluation(states, policy, transition, gamma)

        policy_stable = True
        for s in states:
            old_action = policy[s]
            best_a, best_q = actions[0], float("-inf")
            for a in actions:
                q_sa = sum(p * (r + gamma * v[s2]) for p, s2, r in transition.get((s, a), []))
                if q_sa > best_q:
                    best_q, best_a = q_sa, a
            policy[s] = best_a
            if best_a != old_action:
                policy_stable = False

        if policy_stable:
            return policy, v
```

```typescript
type Transition = Map<string, [number, number, number][]>;

function policyEvaluation(
  states: number[],
  policy: Map<number, number>,
  transition: Transition,
  gamma = 0.95,
  theta = 1e-6,
): Map<number, number> {
  const v = new Map(states.map((s) => [s, 0]));
  while (true) {
    let delta = 0;
    for (const s of states) {
      const a = policy.get(s)!;
      const outcomes = transition.get(`${s},${a}`) ?? [];
      const newV = outcomes.reduce(
        (sum, [p, s2, r]) => sum + p * (r + gamma * v.get(s2)!),
        0,
      );
      delta = Math.max(delta, Math.abs(newV - v.get(s)!));
      v.set(s, newV);
    }
    if (delta < theta) break;
  }
  return v;
}

function policyIteration(
  states: number[],
  actions: number[],
  transition: Transition,
  gamma = 0.95,
): { policy: Map<number, number>; v: Map<number, number> } {
  const policy = new Map(states.map((s) => [s, actions[0]]));
  while (true) {
    const v = policyEvaluation(states, policy, transition, gamma);

    let policyStable = true;
    for (const s of states) {
      const oldAction = policy.get(s);
      let bestA = actions[0];
      let bestQ = -Infinity;
      for (const a of actions) {
        const outcomes = transition.get(`${s},${a}`) ?? [];
        const qsa = outcomes.reduce(
          (sum, [p, s2, r]) => sum + p * (r + gamma * v.get(s2)!),
          0,
        );
        if (qsa > bestQ) {
          bestQ = qsa;
          bestA = a;
        }
      }
      policy.set(s, bestA);
      if (bestA !== oldAction) policyStable = false;
    }

    if (policyStable) return { policy, v };
  }
}
```

```cpp
#include <vector>
#include <map>
#include <tuple>
#include <cmath>
#include <limits>

using Outcome = std::tuple<double, int, double>;

std::map<int, double> policyEvaluation(
    const std::vector<int>& states, std::map<int, int>& policy,
    const std::map<std::pair<int, int>, std::vector<Outcome>>& transition,
    double gamma = 0.95, double theta = 1e-6) {
    std::map<int, double> v;
    for (int s : states) v[s] = 0.0;

    while (true) {
        double delta = 0.0;
        for (int s : states) {
            int a = policy[s];
            double newV = 0.0;
            auto it = transition.find({s, a});
            if (it != transition.end()) {
                for (auto& [p, s2, r] : it->second) newV += p * (r + gamma * v[s2]);
            }
            delta = std::max(delta, std::abs(newV - v[s]));
            v[s] = newV;
        }
        if (delta < theta) break;
    }
    return v;
}

std::pair<std::map<int, int>, std::map<int, double>> policyIteration(
    const std::vector<int>& states, const std::vector<int>& actions,
    const std::map<std::pair<int, int>, std::vector<Outcome>>& transition, double gamma = 0.95) {
    std::map<int, int> policy;
    for (int s : states) policy[s] = actions[0];

    while (true) {
        auto v = policyEvaluation(states, policy, transition, gamma);

        bool policyStable = true;
        for (int s : states) {
            int oldAction = policy[s];
            int bestA = actions[0];
            double bestQ = -std::numeric_limits<double>::infinity();
            for (int a : actions) {
                double qsa = 0.0;
                auto it = transition.find({s, a});
                if (it != transition.end()) {
                    for (auto& [p, s2, r] : it->second) qsa += p * (r + gamma * v[s2]);
                }
                if (qsa > bestQ) { bestQ = qsa; bestA = a; }
            }
            policy[s] = bestA;
            if (bestA != oldAction) policyStable = false;
        }

        if (policyStable) return {policy, v};
    }
}
```

```rust
use std::collections::HashMap;

type Outcome = (f64, i32, f64);

fn policy_evaluation(
    states: &[i32], policy: &HashMap<i32, i32>,
    transition: &HashMap<(i32, i32), Vec<Outcome>>,
    gamma: f64, theta: f64,
) -> HashMap<i32, f64> {
    let mut v: HashMap<i32, f64> = states.iter().map(|&s| (s, 0.0)).collect();
    loop {
        let mut delta = 0.0;
        for &s in states {
            let a = policy[&s];
            let new_v: f64 = transition.get(&(s, a)).map_or(0.0, |outcomes| {
                outcomes.iter().map(|&(p, s2, r)| p * (r + gamma * v[&s2])).sum()
            });
            delta = f64::max(delta, (new_v - v[&s]).abs());
            v.insert(s, new_v);
        }
        if delta < theta {
            break;
        }
    }
    v
}

fn policy_iteration(
    states: &[i32], actions: &[i32],
    transition: &HashMap<(i32, i32), Vec<Outcome>>, gamma: f64,
) -> (HashMap<i32, i32>, HashMap<i32, f64>) {
    let mut policy: HashMap<i32, i32> = states.iter().map(|&s| (s, actions[0])).collect();
    loop {
        let v = policy_evaluation(states, &policy, transition, gamma, 1e-6);

        let mut policy_stable = true;
        for &s in states {
            let old_action = policy[&s];
            let mut best_a = actions[0];
            let mut best_q = f64::MIN;
            for &a in actions {
                let qsa: f64 = transition.get(&(s, a)).map_or(0.0, |outcomes| {
                    outcomes.iter().map(|&(p, s2, r)| p * (r + gamma * v[&s2])).sum()
                });
                if qsa > best_q {
                    best_q = qsa;
                    best_a = a;
                }
            }
            policy.insert(s, best_a);
            if best_a != old_action {
                policy_stable = false;
            }
        }

        if policy_stable {
            return (policy, v);
        }
    }
}
```

```csharp
static Dictionary<int, double> PolicyEvaluation(
    List<int> states, Dictionary<int, int> policy,
    Dictionary<(int, int), List<(double prob, int next, double reward)>> transition,
    double gamma = 0.95, double theta = 1e-6)
{
    var v = states.ToDictionary(s => s, s => 0.0);
    while (true)
    {
        double delta = 0;
        foreach (int s in states)
        {
            int a = policy[s];
            double newV = transition.TryGetValue((s, a), out var outcomes)
                ? outcomes.Sum(o => o.prob * (o.reward + gamma * v[o.next]))
                : 0.0;
            delta = Math.Max(delta, Math.Abs(newV - v[s]));
            v[s] = newV;
        }
        if (delta < theta) break;
    }
    return v;
}

static (Dictionary<int, int> Policy, Dictionary<int, double> V) PolicyIteration(
    List<int> states, List<int> actions,
    Dictionary<(int, int), List<(double prob, int next, double reward)>> transition, double gamma = 0.95)
{
    var policy = states.ToDictionary(s => s, s => actions[0]);
    while (true)
    {
        var v = PolicyEvaluation(states, policy, transition, gamma);

        bool policyStable = true;
        foreach (int s in states)
        {
            int oldAction = policy[s];
            int bestA = actions[0];
            double bestQ = double.NegativeInfinity;
            foreach (int a in actions)
            {
                double qsa = transition.TryGetValue((s, a), out var outcomes)
                    ? outcomes.Sum(o => o.prob * (o.reward + gamma * v[o.next]))
                    : 0.0;
                if (qsa > bestQ) { bestQ = qsa; bestA = a; }
            }
            policy[s] = bestA;
            if (bestA != oldAction) policyStable = false;
        }

        if (policyStable) return (policy, v);
    }
}
```
