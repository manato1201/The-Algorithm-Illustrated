---
name: Expected SARSA
category: 強化学習
subcategory: 価値ベース手法
complexity: O(|A|)(1ステップの更新あたり、行動数に比例)
summary: 次状態で「実際に選んだ1つの行動」ではなく「方策が選ぶ全行動の期待値」を使ってQ値を更新することで、SARSAの分散を減らしつつ、Q学習とSARSAの中間的な性質を持つ統一的な更新式を実現する。
---

## 概要

[SARSA](/algorithms/sarsa)は次状態`s'`で「実際に選んだ1つの行動`a'`」のQ値を使って更新するが、この`a'`はε-greedy方策のランダムな探索によってたまたま選ばれた1サンプルにすぎず、そのサンプルの偶然性が更新に直接反映されてしまう(分散が大きくなる要因)。Expected SARSAは、この「1つの行動のサンプル」の代わりに、**現在の方策のもとで各行動が選ばれる確率で重み付けした期待値**を使うことで更新の分散を減らす。興味深いことに、この定式化は[Q学習](/algorithms/q-learning)と[SARSA](/algorithms/sarsa)の**両方を特殊ケースとして含む一般化**になっている——方策を完全にグリーディ(探索なし)にすればQ学習と一致し、方策をそのまま使えば通常のSARSAに近い性質になる。

## 仕組み

1. Q値のテーブル`Q(s,a)`を初期化する
2. 現在の状態`s`で、ε-greedy方策に従って行動`a`を選ぶ
3. 行動`a`を実行し、報酬`r`と次の状態`s'`を観測する
4. **次状態での期待値を計算する**: ε-greedy方策のもとで各行動`a'`が選ばれる確率`π(a'|s')`(最良の行動は確率`1-ε+ε/|A|`、それ以外は確率`ε/|A|`)を使い、`E[Q(s',·)] = Σ_a' π(a'|s')・Q(s',a')`を計算する。これは「次にどの行動が実際に選ばれるか」をサンプリングせず、**全行動候補の確率加重平均**として厳密に計算する
5. **Expected SARSAの更新式**でQ値を更新する:
   `Q(s,a) ← Q(s,a) + α・[r + γ・E[Q(s',·)] - Q(s,a)]`
6. `s ← s'`として2〜5を繰り返す

## 特性・トレードオフ

- **[SARSA](/algorithms/sarsa)より分散が小さい**: 次状態の価値を「1つのサンプル行動」ではなく「全行動の期待値」で計算するため、探索のランダム性に起因する更新のばらつきが減り、より安定した学習曲線が得られることが多い。計算コストは行動数`|A|`に比例して増えるが、行動空間が大きすぎなければ実用上の負担は小さい
- **[Q学習](/algorithms/q-learning)・[SARSA](/algorithms/sarsa)を包含する一般化**: 方策`π`をε=0の完全なグリーディ方策にすると、期待値の計算は`max_a' Q(s',a')`と等価になり[Q学習](/algorithms/q-learning)の更新式に一致する。方策をそのまま使えば[SARSA](/algorithms/sarsa)に近い(ただし期待値を取る分、分散はSARSAより小さい)性質になる。この統一的な視点は、価値ベース手法の設計空間を理解する上で重要な位置を占める
- **on-policyとoff-policyの中間的な性質**: 期待値の計算に使う方策`π`と、実際に環境で行動する方策を一致させればon-policy(SARSA的)に、`π`をより貪欲な方策にすればoff-policy(Q学習的)に近づく柔軟性があり、実装次第でどちらの性質も再現できる
- **使いどころ**: SARSAより安定した学習が必要な小〜中規模の強化学習タスク、行動空間がそれほど大きくない環境でのオンライン学習、Q学習とSARSAの違いを理論的に統一して理解するための教育的な題材

## 実装例

```python
import random

class ExpectedSarsaAgent:
    def __init__(self, n_states: int, n_actions: int, alpha: float = 0.1, gamma: float = 0.95, epsilon: float = 0.1):
        self.q = [[0.0] * n_actions for _ in range(n_states)]
        self.n_actions = n_actions
        self.alpha, self.gamma, self.epsilon = alpha, gamma, epsilon

    def choose_action(self, state: int) -> int:
        if random.random() < self.epsilon:
            return random.randrange(self.n_actions)
        return max(range(self.n_actions), key=lambda a: self.q[state][a])

    def action_probabilities(self, state: int) -> list[float]:
        best_action = max(range(self.n_actions), key=lambda a: self.q[state][a])
        probs = [self.epsilon / self.n_actions] * self.n_actions
        probs[best_action] += 1.0 - self.epsilon
        return probs

    def update(self, state: int, action: int, reward: float, next_state: int) -> None:
        probs = self.action_probabilities(next_state)
        expected_q = sum(p * q for p, q in zip(probs, self.q[next_state]))
        td_error = reward + self.gamma * expected_q - self.q[state][action]
        self.q[state][action] += self.alpha * td_error
```

```typescript
class ExpectedSarsaAgent {
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

  actionProbabilities(state: number): number[] {
    let bestAction = 0;
    for (let a = 1; a < this.nActions; a++)
      if (this.q[state][a] > this.q[state][bestAction]) bestAction = a;
    const probs = new Array(this.nActions).fill(this.epsilon / this.nActions);
    probs[bestAction] += 1.0 - this.epsilon;
    return probs;
  }

  update(
    state: number,
    action: number,
    reward: number,
    nextState: number,
  ): void {
    const probs = this.actionProbabilities(nextState);
    const expectedQ = probs.reduce(
      (sum, p, a) => sum + p * this.q[nextState][a],
      0,
    );
    const tdError = reward + this.gamma * expectedQ - this.q[state][action];
    this.q[state][action] += this.alpha * tdError;
  }
}
```

```cpp
#include <vector>
#include <random>
#include <algorithm>

class ExpectedSarsaAgent {
    std::vector<std::vector<double>> q;
    int nActions;
    double alpha, gamma, epsilon;
    std::mt19937 rng{std::random_device{}()};

public:
    ExpectedSarsaAgent(int nStates, int nActions_, double alpha_ = 0.1, double gamma_ = 0.95, double epsilon_ = 0.1)
        : q(nStates, std::vector<double>(nActions_, 0.0)), nActions(nActions_), alpha(alpha_), gamma(gamma_), epsilon(epsilon_) {}

    int chooseAction(int state) {
        std::uniform_real_distribution<double> uni(0.0, 1.0);
        if (uni(rng) < epsilon) {
            std::uniform_int_distribution<int> dist(0, nActions - 1);
            return dist(rng);
        }
        return std::max_element(q[state].begin(), q[state].end()) - q[state].begin();
    }

    std::vector<double> actionProbabilities(int state) {
        int bestAction = std::max_element(q[state].begin(), q[state].end()) - q[state].begin();
        std::vector<double> probs(nActions, epsilon / nActions);
        probs[bestAction] += 1.0 - epsilon;
        return probs;
    }

    void update(int state, int action, double reward, int nextState) {
        auto probs = actionProbabilities(nextState);
        double expectedQ = 0.0;
        for (int a = 0; a < nActions; a++) expectedQ += probs[a] * q[nextState][a];
        double tdError = reward + gamma * expectedQ - q[state][action];
        q[state][action] += alpha * tdError;
    }
};
```

```rust
use rand::Rng;

struct ExpectedSarsaAgent {
    q: Vec<Vec<f64>>,
    n_actions: usize,
    alpha: f64,
    gamma: f64,
    epsilon: f64,
}

impl ExpectedSarsaAgent {
    fn choose_action(&self, state: usize, rng: &mut impl Rng) -> usize {
        if rng.gen::<f64>() < self.epsilon {
            return rng.gen_range(0..self.n_actions);
        }
        (0..self.n_actions).max_by(|&a, &b| self.q[state][a].partial_cmp(&self.q[state][b]).unwrap()).unwrap()
    }

    fn action_probabilities(&self, state: usize) -> Vec<f64> {
        let best_action = (0..self.n_actions).max_by(|&a, &b| self.q[state][a].partial_cmp(&self.q[state][b]).unwrap()).unwrap();
        let mut probs = vec![self.epsilon / self.n_actions as f64; self.n_actions];
        probs[best_action] += 1.0 - self.epsilon;
        probs
    }

    fn update(&mut self, state: usize, action: usize, reward: f64, next_state: usize) {
        let probs = self.action_probabilities(next_state);
        let expected_q: f64 = probs.iter().zip(&self.q[next_state]).map(|(p, q)| p * q).sum();
        let td_error = reward + self.gamma * expected_q - self.q[state][action];
        self.q[state][action] += self.alpha * td_error;
    }
}
```

```csharp
class ExpectedSarsaAgent
{
    double[][] q;
    int nActions;
    double alpha, gamma, epsilon;
    Random rand = new();

    public ExpectedSarsaAgent(int nStates, int nActions, double alpha = 0.1, double gamma = 0.95, double epsilon = 0.1)
    {
        q = new double[nStates][];
        for (int i = 0; i < nStates; i++) q[i] = new double[nActions];
        this.nActions = nActions; this.alpha = alpha; this.gamma = gamma; this.epsilon = epsilon;
    }

    public int ChooseAction(int state)
    {
        if (rand.NextDouble() < epsilon) return rand.Next(nActions);
        int best = 0;
        for (int a = 1; a < nActions; a++) if (q[state][a] > q[state][best]) best = a;
        return best;
    }

    public double[] ActionProbabilities(int state)
    {
        int bestAction = 0;
        for (int a = 1; a < nActions; a++) if (q[state][a] > q[state][bestAction]) bestAction = a;
        var probs = new double[nActions];
        for (int a = 0; a < nActions; a++) probs[a] = epsilon / nActions;
        probs[bestAction] += 1.0 - epsilon;
        return probs;
    }

    public void Update(int state, int action, double reward, int nextState)
    {
        var probs = ActionProbabilities(nextState);
        double expectedQ = 0;
        for (int a = 0; a < nActions; a++) expectedQ += probs[a] * q[nextState][a];
        double tdError = reward + gamma * expectedQ - q[state][action];
        q[state][action] += alpha * tdError;
    }
}
```
