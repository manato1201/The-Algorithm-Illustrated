---
name: 価値反復法(Value Iteration)
category: 強化学習
subcategory: モデルベース・探索
complexity: O(反復回数 × |S|² × |A|)
summary: マルコフ決定過程(MDP)の遷移確率・報酬関数が既知であることを利用し、ベルマン最適方程式を不動点になるまで反復適用することで最適価値関数を直接計算する動的計画法。
---

## 概要

[Q学習](/algorithms/q-learning)は環境のモデル(遷移確率)を知らないまま試行錯誤で学習するモデルフリー手法だったが、迷路の地図やボードゲームのルールのように**環境の遷移確率と報酬関数があらかじめ完全にわかっている**場合には、実際に行動を試さなくても、動的計画法だけで最適な価値関数と方策を直接計算できる。価値反復法は、各状態の価値`V(s)`を「ベルマン最適方程式」の右辺で繰り返し置き換えていくというシンプルな反復計算で、この価値関数を不動点(それ以上更新しても変化しない値)まで収束させる。マルコフ決定過程(MDP)がきちんと定義できる問題(ボードゲームの盤面評価、ロボットのグリッド世界での経路計画など)における最も基本的な厳密解法の一つ。

## 仕組み

1. 全ての状態`s`について価値`V(s)`を(通常0で)初期化する
2. **ベルマン最適方程式による更新**を全状態に対して同時に(または順番に)適用する:
   `V(s) ← max_a Σ_s' P(s'|s,a)・[R(s,a,s') + γ・V(s')]`
   これは「状態`s`にいるとき、各行動`a`を取った場合の期待収益(即時報酬+割引後の次状態の価値)を比較し、最善の行動を取った場合の価値」を表す
3. 全状態の更新前後での価値の変化量(最大差分)を計算し、それが十分小さい閾値`θ`を下回るまで2を繰り返す(価値関数は割引率γ<1のもとで唯一の不動点に収束することが理論的に保証されている)
4. 収束した`V(s)`から、最適方策`π*(s) = argmax_a Σ_s' P(s'|s,a)・[R(s,a,s') + γ・V(s')]`を1回だけ計算して取り出す(価値さえ収束していれば、そこから方策を抽出するのは1ステップの計算で済む)

## 特性・トレードオフ

- **モデルが既知なら試行錯誤が不要**: 遷移確率`P(s'|s,a)`と報酬関数`R`が既知であれば、実際に環境と相互作用することなく、純粋な計算だけで最適方策に到達できる。Q学習のような探索(ε-greedyなど)や大量のエピソードを必要としない
- **状態数・行動数に対するスケーラビリティの限界**: 1回の反復がO(|S|²・|A|)かかるため、状態空間が非常に大きい問題(高次元の連続状態など)には向かない。このスケーラビリティの問題を、モンテカルロ木探索のようなサンプリングベースの手法や、価値関数を関数近似(ニューラルネットワーク)で置き換える深層強化学習が補う
- **[方策反復法](/algorithms/policy-iteration)との比較**: 方策反復法は「方策評価(価値関数の計算)」と「方策改善」を交互に完全収束させながら繰り返すのに対し、価値反復法は価値の更新を1回だけ行ってすぐ次の状態に進む、いわば「方策評価を1回で打ち切った方策反復法」とみなせる。どちらも同じ最適方策に収束するが、収束の速さは問題設定によって異なる
- **使いどころ**: グリッドワールドのような小〜中規模MDPの厳密解法、モデルベース強化学習の理論的基盤、ロボットの経路計画(占有格子地図が既知の場合)、ボードゲームの局面評価の理論的背景

## 実装例

```python
def value_iteration(
    states: list[int], actions: list[int],
    transition: dict[tuple[int, int], list[tuple[float, int, float]]],  # (s,a) -> [(prob, s', reward), ...]
    gamma: float = 0.95, theta: float = 1e-6,
) -> tuple[dict[int, float], dict[int, int]]:
    v = {s: 0.0 for s in states}
    while True:
        delta = 0.0
        for s in states:
            best = float("-inf")
            for a in actions:
                q_sa = sum(p * (r + gamma * v[s2]) for p, s2, r in transition.get((s, a), []))
                best = max(best, q_sa)
            delta = max(delta, abs(best - v[s]))
            v[s] = best
        if delta < theta:
            break

    policy = {}
    for s in states:
        best_a, best_q = actions[0], float("-inf")
        for a in actions:
            q_sa = sum(p * (r + gamma * v[s2]) for p, s2, r in transition.get((s, a), []))
            if q_sa > best_q:
                best_q, best_a = q_sa, a
        policy[s] = best_a
    return v, policy
```

```typescript
type Transition = Map<string, [number, number, number][]>; // "s,a" -> [prob, nextState, reward][]

function valueIteration(
  states: number[],
  actions: number[],
  transition: Transition,
  gamma = 0.95,
  theta = 1e-6,
): { v: Map<number, number>; policy: Map<number, number> } {
  const v = new Map(states.map((s) => [s, 0]));
  while (true) {
    let delta = 0;
    for (const s of states) {
      let best = -Infinity;
      for (const a of actions) {
        const outcomes = transition.get(`${s},${a}`) ?? [];
        const qsa = outcomes.reduce(
          (sum, [p, s2, r]) => sum + p * (r + gamma * v.get(s2)!),
          0,
        );
        best = Math.max(best, qsa);
      }
      delta = Math.max(delta, Math.abs(best - v.get(s)!));
      v.set(s, best);
    }
    if (delta < theta) break;
  }

  const policy = new Map<number, number>();
  for (const s of states) {
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
  }
  return { v, policy };
}
```

```cpp
#include <vector>
#include <map>
#include <tuple>
#include <cmath>
#include <limits>

using Outcome = std::tuple<double, int, double>; // prob, nextState, reward

std::pair<std::map<int, double>, std::map<int, int>> valueIteration(
    const std::vector<int>& states, const std::vector<int>& actions,
    const std::map<std::pair<int, int>, std::vector<Outcome>>& transition,
    double gamma = 0.95, double theta = 1e-6) {
    std::map<int, double> v;
    for (int s : states) v[s] = 0.0;

    while (true) {
        double delta = 0.0;
        for (int s : states) {
            double best = -std::numeric_limits<double>::infinity();
            for (int a : actions) {
                auto it = transition.find({s, a});
                double qsa = 0.0;
                if (it != transition.end()) {
                    for (auto& [p, s2, r] : it->second) qsa += p * (r + gamma * v[s2]);
                }
                best = std::max(best, qsa);
            }
            delta = std::max(delta, std::abs(best - v[s]));
            v[s] = best;
        }
        if (delta < theta) break;
    }

    std::map<int, int> policy;
    for (int s : states) {
        int bestA = actions[0];
        double bestQ = -std::numeric_limits<double>::infinity();
        for (int a : actions) {
            auto it = transition.find({s, a});
            double qsa = 0.0;
            if (it != transition.end()) {
                for (auto& [p, s2, r] : it->second) qsa += p * (r + gamma * v[s2]);
            }
            if (qsa > bestQ) { bestQ = qsa; bestA = a; }
        }
        policy[s] = bestA;
    }
    return {v, policy};
}
```

```rust
use std::collections::HashMap;

type Outcome = (f64, i32, f64); // prob, next_state, reward

fn value_iteration(
    states: &[i32], actions: &[i32],
    transition: &HashMap<(i32, i32), Vec<Outcome>>,
    gamma: f64, theta: f64,
) -> (HashMap<i32, f64>, HashMap<i32, i32>) {
    let mut v: HashMap<i32, f64> = states.iter().map(|&s| (s, 0.0)).collect();

    loop {
        let mut delta = 0.0;
        for &s in states {
            let mut best = f64::MIN;
            for &a in actions {
                let qsa: f64 = transition.get(&(s, a)).map_or(0.0, |outcomes| {
                    outcomes.iter().map(|&(p, s2, r)| p * (r + gamma * v[&s2])).sum()
                });
                best = best.max(qsa);
            }
            delta = f64::max(delta, (best - v[&s]).abs());
            v.insert(s, best);
        }
        if delta < theta {
            break;
        }
    }

    let mut policy = HashMap::new();
    for &s in states {
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
    }
    (v, policy)
}
```

```csharp
static (Dictionary<int, double> V, Dictionary<int, int> Policy) ValueIteration(
    List<int> states, List<int> actions,
    Dictionary<(int, int), List<(double prob, int next, double reward)>> transition,
    double gamma = 0.95, double theta = 1e-6)
{
    var v = states.ToDictionary(s => s, s => 0.0);

    while (true)
    {
        double delta = 0;
        foreach (int s in states)
        {
            double best = double.NegativeInfinity;
            foreach (int a in actions)
            {
                double qsa = transition.TryGetValue((s, a), out var outcomes)
                    ? outcomes.Sum(o => o.prob * (o.reward + gamma * v[o.next]))
                    : 0.0;
                best = Math.Max(best, qsa);
            }
            delta = Math.Max(delta, Math.Abs(best - v[s]));
            v[s] = best;
        }
        if (delta < theta) break;
    }

    var policy = new Dictionary<int, int>();
    foreach (int s in states)
    {
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
    }
    return (v, policy);
}
```
