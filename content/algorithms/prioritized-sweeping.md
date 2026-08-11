---
name: 優先順位付き掃引法(Prioritized Sweeping)
category: 強化学習
subcategory: モデルベース・探索
complexity: O(log n)(1回のプランニング更新あたり、優先度付きキューの操作)
summary: Dyna-Qの「どの状態をプランニングで再計算するか」をランダム選択から改良し、価値が大きく変化した状態から優先的に、かつその状態に影響を与える手前の状態へと逆向きに更新を伝播させる。
---

## 概要

[Dyna-Q](/algorithms/dyna-q)は実経験から学習したモデルを使って、過去に訪れた`(状態, 行動)`の組をランダムに選んでプランニング(架空の経験による追加更新)を行う。しかし、価値がほとんど変化しない状態を何度再計算しても学習の進みは遅く、逆に「価値が大きく変わった状態」の情報は、その状態に到達しうる**手前の状態**にまで伝播させてこそ効果を発揮する。優先順位付き掃引法は、リチャード・サットンらが提案したこの問題への対処法で、**「価値の変化が大きかった状態」を優先度付きキューで管理し、優先度の高い状態から順にプランニングを行い、さらにその状態を導く可能性のある手前の状態の優先度も更新する**ことで、限られたプランニング回数の中で価値の伝播を最も効率よく行う。

## 仕組み

1. Q値テーブル、環境モデル(`Model(s,a) → (r, s')`)に加えて、**優先度付きキュー**(まだプランニングで処理していない、価値の変化が大きい状態のリスト)を用意する
2. **実経験のステップ**: 状態`s`で行動`a`を実行し、報酬`r`、次状態`s'`を観測してモデルを更新する。同時にこの経験によるTD誤差`|r + γ・max_a' Q(s',a') - Q(s,a)|`を計算し、これが閾値`θ`を超えていれば、`(s,a)`を優先度(=TD誤差の大きさ)付きでキューに追加する
3. **プランニングのステップ**: キューが空でない限り、優先度が最も高い`(s,a)`をキューから取り出し、モデルから`(r, s')`を取得して[Q学習](/algorithms/q-learning)と同じ更新式でQ値を更新する
4. **逆伝播**: 更新した状態`s`に「到達しうる手前の状態と行動」(モデルを逆引きして`s`に遷移する`(s_pred, a_pred)`を探す)を全て調べ、それぞれについて`s`の価値が変化したことによる予測TD誤差を計算する。この誤差が閾値`θ`を超えていれば、`(s_pred, a_pred)`もキューに追加する(すでにキューにあればより高い優先度に更新する)
5. 3〜4を、決められたプランニング回数に達するか、キューが空になるまで繰り返す

## 特性・トレードオフ

- **価値の伝播を効率的な順序で行う**: [Dyna-Q](/algorithms/dyna-q)のランダムなプランニングでは、ゴール付近で得られた大きな報酬の情報がスタート地点まで伝わるのに多くの無駄な更新を要することがあるが、優先順位付き掃引法は「価値が変化した場所から逆向きに」効率的にたどることで、同じプランニング回数でもずっと速く価値が収束する
- **優先度付きキューの管理コスト**: 各プランニングステップでキューへの追加・取り出しにO(log n)のコストがかかり、また「ある状態に到達しうる手前の状態」を効率的に逆引きできるよう、モデルを順方向・逆方向の両方でインデックス化しておく必要がある。Dyna-Qのランダム選択に比べると実装はやや複雑になる
- **閾値`θ`によるプランニング量の制御**: TD誤差が閾値`θ`を超えない更新はキューに追加されないため、`θ`を大きくすると計算量が減る代わりに細かい価値の変化を追えなくなり、小さくするとキューが肥大化しやすくなる。この閾値の調整が実務上のチューニングポイントになる
- **使いどころ**: 状態数が多く効率的な価値伝播が求められるモデルベース強化学習、実環境での試行コストが高くプランニングの効率が特に重要になるロボット制御、[Dyna-Q](/algorithms/dyna-q)のランダムプランニングでは収束が遅すぎる大規模な問題

## 実装例

```python
import heapq

class PrioritizedSweepingAgent:
    def __init__(self, n_states: int, n_actions: int, alpha: float = 0.1, gamma: float = 0.95, theta: float = 0.01, planning_steps: int = 10):
        self.q = [[0.0] * n_actions for _ in range(n_states)]
        self.model: dict[tuple[int, int], tuple[float, int]] = {}
        self.predecessors: dict[int, set[tuple[int, int]]] = {}
        self.queue: list[tuple[float, int, int]] = []  # (-priority, state, action)
        self.n_actions = n_actions
        self.alpha, self.gamma, self.theta, self.planning_steps = alpha, gamma, theta, planning_steps

    def td_error(self, state: int, action: int, reward: float, next_state: int) -> float:
        best_next = max(self.q[next_state])
        return abs(reward + self.gamma * best_next - self.q[state][action])

    def step(self, state: int, action: int, reward: float, next_state: int) -> None:
        self.model[(state, action)] = (reward, next_state)
        self.predecessors.setdefault(next_state, set()).add((state, action))

        priority = self.td_error(state, action, reward, next_state)
        if priority > self.theta:
            heapq.heappush(self.queue, (-priority, state, action))

        for _ in range(self.planning_steps):
            if not self.queue:
                break
            _, s, a = heapq.heappop(self.queue)
            r, s2 = self.model[(s, a)]
            best_next = max(self.q[s2])
            self.q[s][a] += self.alpha * (r + self.gamma * best_next - self.q[s][a])

            for (s_pred, a_pred) in self.predecessors.get(s, set()):
                r_pred, _ = self.model[(s_pred, a_pred)]
                pred_priority = self.td_error(s_pred, a_pred, r_pred, s)
                if pred_priority > self.theta:
                    heapq.heappush(self.queue, (-pred_priority, s_pred, a_pred))
```

```typescript
class PrioritizedSweepingAgent {
  q: number[][];
  model = new Map<string, [number, number]>();
  predecessors = new Map<number, Set<string>>();
  queue: [number, number, number][] = []; // [priority(降順ソート用に負値管理はせず都度ソート), state, action]

  constructor(
    nStates: number,
    private nActions: number,
    private alpha = 0.1,
    private gamma = 0.95,
    private theta = 0.01,
    private planningSteps = 10,
  ) {
    this.q = Array.from({ length: nStates }, () => new Array(nActions).fill(0));
  }

  private tdError(
    state: number,
    action: number,
    reward: number,
    nextState: number,
  ): number {
    const bestNext = Math.max(...this.q[nextState]);
    return Math.abs(reward + this.gamma * bestNext - this.q[state][action]);
  }

  step(state: number, action: number, reward: number, nextState: number): void {
    this.model.set(`${state},${action}`, [reward, nextState]);
    if (!this.predecessors.has(nextState))
      this.predecessors.set(nextState, new Set());
    this.predecessors.get(nextState)!.add(`${state},${action}`);

    const priority = this.tdError(state, action, reward, nextState);
    if (priority > this.theta) this.queue.push([priority, state, action]);

    for (let i = 0; i < this.planningSteps && this.queue.length > 0; i++) {
      this.queue.sort((a, b) => b[0] - a[0]);
      const [, s, a] = this.queue.shift()!;
      const [r, s2] = this.model.get(`${s},${a}`)!;
      const bestNext = Math.max(...this.q[s2]);
      this.q[s][a] += this.alpha * (r + this.gamma * bestNext - this.q[s][a]);

      for (const key of this.predecessors.get(s) ?? []) {
        const [sPred, aPred] = key.split(",").map(Number);
        const [rPred] = this.model.get(key)!;
        const predPriority = this.tdError(sPred, aPred, rPred, s);
        if (predPriority > this.theta)
          this.queue.push([predPriority, sPred, aPred]);
      }
    }
  }
}
```

```cpp
#include <vector>
#include <map>
#include <set>
#include <queue>
#include <algorithm>

class PrioritizedSweepingAgent {
    std::vector<std::vector<double>> q;
    std::map<std::pair<int, int>, std::pair<double, int>> model;
    std::map<int, std::set<std::pair<int, int>>> predecessors;
    std::vector<std::tuple<double, int, int>> queue;
    int nActions, planningSteps;
    double alpha, gamma, theta;

    double tdError(int state, int action, double reward, int nextState) {
        double bestNext = *std::max_element(q[nextState].begin(), q[nextState].end());
        return std::abs(reward + gamma * bestNext - q[state][action]);
    }

public:
    PrioritizedSweepingAgent(int nStates, int nActions_, double alpha_, double gamma_, double theta_, int planningSteps_)
        : q(nStates, std::vector<double>(nActions_, 0.0)), nActions(nActions_), planningSteps(planningSteps_),
          alpha(alpha_), gamma(gamma_), theta(theta_) {}

    void step(int state, int action, double reward, int nextState) {
        model[{state, action}] = {reward, nextState};
        predecessors[nextState].insert({state, action});

        double priority = tdError(state, action, reward, nextState);
        if (priority > theta) queue.push_back({priority, state, action});

        for (int i = 0; i < planningSteps && !queue.empty(); i++) {
            std::sort(queue.begin(), queue.end(), [](auto& a, auto& b) { return std::get<0>(a) > std::get<0>(b); });
            auto [pr, s, a] = queue.front();
            queue.erase(queue.begin());
            auto [r, s2] = model[{s, a}];
            double bestNext = *std::max_element(q[s2].begin(), q[s2].end());
            q[s][a] += alpha * (r + gamma * bestNext - q[s][a]);

            for (auto& [sPred, aPred] : predecessors[s]) {
                auto [rPred, _] = model[{sPred, aPred}];
                double predPriority = tdError(sPred, aPred, rPred, s);
                if (predPriority > theta) queue.push_back({predPriority, sPred, aPred});
            }
        }
    }
};
```

```rust
use std::collections::{HashMap, HashSet};

struct PrioritizedSweepingAgent {
    q: Vec<Vec<f64>>,
    model: HashMap<(usize, usize), (f64, usize)>,
    predecessors: HashMap<usize, HashSet<(usize, usize)>>,
    queue: Vec<(f64, usize, usize)>,
    alpha: f64,
    gamma: f64,
    theta: f64,
    planning_steps: usize,
}

impl PrioritizedSweepingAgent {
    fn td_error(&self, state: usize, action: usize, reward: f64, next_state: usize) -> f64 {
        let best_next = self.q[next_state].iter().cloned().fold(f64::MIN, f64::max);
        (reward + self.gamma * best_next - self.q[state][action]).abs()
    }

    fn step(&mut self, state: usize, action: usize, reward: f64, next_state: usize) {
        self.model.insert((state, action), (reward, next_state));
        self.predecessors.entry(next_state).or_default().insert((state, action));

        let priority = self.td_error(state, action, reward, next_state);
        if priority > self.theta {
            self.queue.push((priority, state, action));
        }

        for _ in 0..self.planning_steps {
            if self.queue.is_empty() {
                break;
            }
            self.queue.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());
            let (_, s, a) = self.queue.pop().unwrap();
            let (r, s2) = self.model[&(s, a)];
            let best_next = self.q[s2].iter().cloned().fold(f64::MIN, f64::max);
            self.q[s][a] += self.alpha * (r + self.gamma * best_next - self.q[s][a]);

            if let Some(preds) = self.predecessors.get(&s).cloned() {
                for (s_pred, a_pred) in preds {
                    let (r_pred, _) = self.model[&(s_pred, a_pred)];
                    let pred_priority = self.td_error(s_pred, a_pred, r_pred, s);
                    if pred_priority > self.theta {
                        self.queue.push((pred_priority, s_pred, a_pred));
                    }
                }
            }
        }
    }
}
```

```csharp
class PrioritizedSweepingAgent
{
    double[][] q;
    Dictionary<(int, int), (double reward, int nextState)> model = new();
    Dictionary<int, HashSet<(int, int)>> predecessors = new();
    List<(double priority, int state, int action)> queue = new();
    int nActions, planningSteps;
    double alpha, gamma, theta;

    public PrioritizedSweepingAgent(int nStates, int nActions, double alpha, double gamma, double theta, int planningSteps)
    {
        q = new double[nStates][];
        for (int i = 0; i < nStates; i++) q[i] = new double[nActions];
        this.nActions = nActions; this.alpha = alpha; this.gamma = gamma; this.theta = theta; this.planningSteps = planningSteps;
    }

    double TdError(int state, int action, double reward, int nextState)
    {
        double bestNext = q[nextState].Max();
        return Math.Abs(reward + gamma * bestNext - q[state][action]);
    }

    public void Step(int state, int action, double reward, int nextState)
    {
        model[(state, action)] = (reward, nextState);
        if (!predecessors.ContainsKey(nextState)) predecessors[nextState] = new HashSet<(int, int)>();
        predecessors[nextState].Add((state, action));

        double priority = TdError(state, action, reward, nextState);
        if (priority > theta) queue.Add((priority, state, action));

        for (int i = 0; i < planningSteps && queue.Count > 0; i++)
        {
            queue.Sort((a, b) => b.priority.CompareTo(a.priority));
            var (pr, s, a) = queue[0];
            queue.RemoveAt(0);
            var (r, s2) = model[(s, a)];
            double bestNext = q[s2].Max();
            q[s][a] += alpha * (r + gamma * bestNext - q[s][a]);

            if (predecessors.TryGetValue(s, out var preds))
            {
                foreach (var (sPred, aPred) in preds)
                {
                    var (rPred, _) = model[(sPred, aPred)];
                    double predPriority = TdError(sPred, aPred, rPred, s);
                    if (predPriority > theta) queue.Add((predPriority, sPred, aPred));
                }
            }
        }
    }
}
```
