---
name: Q学習(Q-Learning)
category: 強化学習
subcategory: 価値ベース手法
complexity: O(1)(1ステップの更新あたり)
summary: 環境のモデル(遷移確率)を知らなくても、試行錯誤から得た報酬だけで「状態と行動の組の価値」Q(s,a)を学習し、最適な行動選択に収束させるモデルフリー強化学習の基本形。
---

## 概要

強化学習は「エージェントが環境と相互作用し、報酬を手がかりに試行錯誤しながら最適な行動を学ぶ」という枠組みだが、多くの現実的な問題では環境の遷移確率(ある行動を取ると次にどの状態に移るか)を事前には知り得ない。Q学習は、この遷移確率のモデルを一切必要とせず(モデルフリー)、実際に行動して得た報酬だけから「状態`s`で行動`a`を取ることの価値」Q(s,a)を推定していく手法として1989年にクリス・ワトキンスによって提案された。さらに、実際に取った行動ではなく「次の状態で最善の行動を取った場合」を仮定して更新する**off-policy**な性質を持つため、探索のために時々ランダムな行動(ε-greedy)を混ぜながら学習しても、最終的には最適方策に収束するという理論的保証がある。

## 仕組み

1. 全ての状態`s`・行動`a`の組についてQ値のテーブル`Q(s,a)`を(通常0で)初期化する
2. 現在の状態`s`で、**ε-greedy方策**に従って行動を選ぶ(確率εでランダムな行動を選び探索、確率1-εで現時点のQ値が最大の行動を選び活用)
3. 選んだ行動`a`を実行し、報酬`r`と次の状態`s'`を観測する
4. **Q学習の更新式(ベルマン方程式に基づく)** でQ値を更新する:
   `Q(s,a) ← Q(s,a) + α・[r + γ・max_a' Q(s',a') - Q(s,a)]`
   ここで`α`は学習率、`γ`は割引率。`max_a' Q(s',a')`は「次の状態で最善の行動を取ったと仮定した価値」であり、**実際に次にどの行動を取るかとは無関係に**この最大値を使う点がQ学習の核心(この特徴からoff-policyと呼ばれる)
5. `s ← s'`として2〜4を、エピソードが終わるまで、または十分な回数繰り返す。十分な探索と適切な学習率のもとでQ値は最適な行動価値関数に収束することが理論的に保証されている

## 特性・トレードオフ

- **モデルフリー**: 環境の遷移確率や報酬関数を事前に知らなくても、実際に行動して観測した`(s, a, r, s')`の組だけから学習できる。ロボット制御やゲームAIのように環境のモデルを厳密に書き下すのが難しい問題に強い
- **off-policyゆえの安定性と探索の自由度**: 探索のためにランダムな行動を混ぜても、更新式は常に「最善の行動を取った場合」を仮定するため、探索方策と学習される最適方策を分離できる。この性質はより高度な手法(DQNなど)にも受け継がれている
- **状態空間が大きいとテーブルが破綻する**: Q値をテーブル(状態×行動の表)で持つ素朴な実装は、状態数が爆発的に増える問題(画像入力など)には使えない。ニューラルネットワークでQ値を近似するDQN(Deep Q-Network)はこの弱点を克服する発展形
- **使いどころ**: 迷路探索・グリッドワールドのような小さな状態空間の強化学習、ゲームAIの基礎学習、DQNなど深層強化学習の理論的基盤。方策反復法・[価値反復法](/algorithms/value-iteration)が環境のモデルを既知として解くのに対し、Q学習は経験だけから同じ最適方策に到達しようとする

## 実装例

```python
import random

class QLearningAgent:
    def __init__(self, n_states: int, n_actions: int, alpha: float = 0.1, gamma: float = 0.95, epsilon: float = 0.1):
        self.q = [[0.0] * n_actions for _ in range(n_states)]
        self.n_actions = n_actions
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon

    def choose_action(self, state: int) -> int:
        if random.random() < self.epsilon:
            return random.randrange(self.n_actions)
        return max(range(self.n_actions), key=lambda a: self.q[state][a])

    def update(self, state: int, action: int, reward: float, next_state: int) -> None:
        best_next = max(self.q[next_state])
        td_target = reward + self.gamma * best_next
        td_error = td_target - self.q[state][action]
        self.q[state][action] += self.alpha * td_error
```

```typescript
class QLearningAgent {
  q: number[][];
  constructor(
    nStates: number,
    private nActions: number,
    private alpha = 0.1,
    private gamma = 0.95,
    private epsilon = 0.1,
  ) {
    this.q = Array.from({ length: nStates }, () => new Array(nActions).fill(0));
  }

  chooseAction(state: number, rand: () => number = Math.random): number {
    if (rand() < this.epsilon) return Math.floor(rand() * this.nActions);
    let best = 0;
    for (let a = 1; a < this.nActions; a++)
      if (this.q[state][a] > this.q[state][best]) best = a;
    return best;
  }

  update(
    state: number,
    action: number,
    reward: number,
    nextState: number,
  ): void {
    const bestNext = Math.max(...this.q[nextState]);
    const tdTarget = reward + this.gamma * bestNext;
    const tdError = tdTarget - this.q[state][action];
    this.q[state][action] += this.alpha * tdError;
  }
}
```

```cpp
#include <vector>
#include <random>
#include <algorithm>

class QLearningAgent {
    std::vector<std::vector<double>> q;
    int nActions;
    double alpha, gamma, epsilon;
    std::mt19937 rng{std::random_device{}()};

public:
    QLearningAgent(int nStates, int nActions_, double alpha_ = 0.1, double gamma_ = 0.95, double epsilon_ = 0.1)
        : q(nStates, std::vector<double>(nActions_, 0.0)), nActions(nActions_), alpha(alpha_), gamma(gamma_), epsilon(epsilon_) {}

    int chooseAction(int state) {
        std::uniform_real_distribution<double> uni(0.0, 1.0);
        if (uni(rng) < epsilon) {
            std::uniform_int_distribution<int> actDist(0, nActions - 1);
            return actDist(rng);
        }
        return std::max_element(q[state].begin(), q[state].end()) - q[state].begin();
    }

    void update(int state, int action, double reward, int nextState) {
        double bestNext = *std::max_element(q[nextState].begin(), q[nextState].end());
        double tdTarget = reward + gamma * bestNext;
        double tdError = tdTarget - q[state][action];
        q[state][action] += alpha * tdError;
    }
};
```

```rust
use rand::Rng;

struct QLearningAgent {
    q: Vec<Vec<f64>>,
    n_actions: usize,
    alpha: f64,
    gamma: f64,
    epsilon: f64,
}

impl QLearningAgent {
    fn new(n_states: usize, n_actions: usize, alpha: f64, gamma: f64, epsilon: f64) -> Self {
        QLearningAgent { q: vec![vec![0.0; n_actions]; n_states], n_actions, alpha, gamma, epsilon }
    }

    fn choose_action(&self, state: usize, rng: &mut impl Rng) -> usize {
        if rng.gen::<f64>() < self.epsilon {
            return rng.gen_range(0..self.n_actions);
        }
        (0..self.n_actions)
            .max_by(|&a, &b| self.q[state][a].partial_cmp(&self.q[state][b]).unwrap())
            .unwrap()
    }

    fn update(&mut self, state: usize, action: usize, reward: f64, next_state: usize) {
        let best_next = self.q[next_state].iter().cloned().fold(f64::MIN, f64::max);
        let td_target = reward + self.gamma * best_next;
        let td_error = td_target - self.q[state][action];
        self.q[state][action] += self.alpha * td_error;
    }
}
```

```csharp
class QLearningAgent
{
    double[][] q;
    int nActions;
    double alpha, gamma, epsilon;
    Random rand = new();

    public QLearningAgent(int nStates, int nActions, double alpha = 0.1, double gamma = 0.95, double epsilon = 0.1)
    {
        q = new double[nStates][];
        for (int i = 0; i < nStates; i++) q[i] = new double[nActions];
        this.nActions = nActions;
        this.alpha = alpha;
        this.gamma = gamma;
        this.epsilon = epsilon;
    }

    public int ChooseAction(int state)
    {
        if (rand.NextDouble() < epsilon) return rand.Next(nActions);
        int best = 0;
        for (int a = 1; a < nActions; a++)
            if (q[state][a] > q[state][best]) best = a;
        return best;
    }

    public void Update(int state, int action, double reward, int nextState)
    {
        double bestNext = q[nextState].Max();
        double tdTarget = reward + gamma * bestNext;
        double tdError = tdTarget - q[state][action];
        q[state][action] += alpha * tdError;
    }
}
```
