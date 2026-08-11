---
name: Double Q学習(Double Q-Learning)
category: 強化学習
subcategory: 価値ベース手法
complexity: O(1)(1ステップの更新あたり)
summary: 2組のQ値テーブルを用意し、一方で最善の行動を選び、もう一方でその行動の価値を評価するという役割分担により、通常のQ学習が持つ「価値の過大評価バイアス」を緩和する。
---

## 概要

[Q学習](/algorithms/q-learning)の更新式は`max_a' Q(s',a')`という「次状態での最大Q値」を使うが、この`max`という操作自体に統計的な罠がある——Q値の推定には常にノイズ(誤差)が乗っているため、複数の行動候補の中から最大値を選ぶと、**たまたま過大に見積もられた行動が選ばれやすくなる**という系統的な偏り(過大評価バイアス、Maximization Bias)が生じる。これは推定誤差が完全に対称でも起こる統計的な現象で、学習が誤って楽観的な方向に偏る原因になる。Double Q学習は、2010年にハド・ヴァン・ハッセルトが提案した手法で、**「どの行動が最善かを選ぶ」役割と「その行動の価値を評価する」役割を、2組の独立したQ値テーブルに分担**させることで、このバイアスを緩和する。

## 仕組み

1. 独立した2組のQ値テーブル`Q_A`と`Q_B`を用意し、両方とも0で初期化する
2. 現在の状態`s`で、`Q_A + Q_B`(または一方だけ)を使ってε-greedy方策で行動`a`を選ぶ
3. 行動`a`を実行し、報酬`r`と次の状態`s'`を観測する
4. 確率1/2で、**`Q_A`を更新する**ケースを実行する:
   - 次状態での最善の行動を`Q_A`で選ぶ:`a* = argmax_a' Q_A(s',a')`
   - しかしその行動の**価値の評価には`Q_B`を使う**:`target = r + γ・Q_B(s', a*)`
   - `Q_A(s,a) ← Q_A(s,a) + α・[target - Q_A(s,a)]`
5. 残り確率1/2で、`Q_A`と`Q_B`の役割を入れ替えて同様に**`Q_B`を更新する**(次状態の最善行動を`Q_B`で選び、価値の評価は`Q_A`で行う)
6. 2〜5をエピソードを通じて繰り返す。行動選択には常に両方のテーブルの和(または平均)を使う

## 特性・トレードオフ

- **「選ぶ」と「評価する」の分離によるバイアス緩和**: 通常のQ学習では同じテーブルで「どの行動が最善か」と「その行動の価値」の両方を決めるため、ノイズによって偶然高く評価された行動がそのまま選ばれ、さらにその高い評価がそのまま更新に使われるという自己強化的な過大評価が起きやすい。Double Q学習は選択と評価に別々のテーブルを使うことで、この自己強化のループを断ち切る
- **メモリコストは2倍だが、学習の安定性が向上**: Q値テーブル(またはニューラルネットワーク)を2組保持する必要があり、メモリと計算コストはQ学習のおよそ2倍になる。その代わり、特に報酬にノイズが多い環境や、行動の選択肢が多い環境で、過大評価バイアスの影響を大きく減らし、より安定した学習曲線が得られることが実験的に示されている
- **深層強化学習への波及**: この「選択と評価の分離」というアイデアは、Q値をニューラルネットワークで近似するDQNに応用され、Double DQN(ターゲットネットワークとオンラインネットワークで役割を分担する)として大きな成功を収めた。Atariゲームのベンチマークで、通常のDQNより高い性能を示すことが報告されている
- **使いどころ**: 報酬や環境の遷移にノイズが多い強化学習タスク、行動の選択肢数が多く過大評価の影響が出やすい問題、Double DQNをはじめとする深層強化学習アルゴリズムの理論的基盤

## 実装例

```python
import random

class DoubleQLearningAgent:
    def __init__(self, n_states: int, n_actions: int, alpha: float = 0.1, gamma: float = 0.95, epsilon: float = 0.1):
        self.q_a = [[0.0] * n_actions for _ in range(n_states)]
        self.q_b = [[0.0] * n_actions for _ in range(n_states)]
        self.n_actions = n_actions
        self.alpha, self.gamma, self.epsilon = alpha, gamma, epsilon

    def choose_action(self, state: int) -> int:
        if random.random() < self.epsilon:
            return random.randrange(self.n_actions)
        combined = [a + b for a, b in zip(self.q_a[state], self.q_b[state])]
        return max(range(self.n_actions), key=lambda a: combined[a])

    def update(self, state: int, action: int, reward: float, next_state: int) -> None:
        if random.random() < 0.5:
            best_next = max(range(self.n_actions), key=lambda a: self.q_a[next_state][a])
            target = reward + self.gamma * self.q_b[next_state][best_next]
            self.q_a[state][action] += self.alpha * (target - self.q_a[state][action])
        else:
            best_next = max(range(self.n_actions), key=lambda a: self.q_b[next_state][a])
            target = reward + self.gamma * self.q_a[next_state][best_next]
            self.q_b[state][action] += self.alpha * (target - self.q_b[state][action])
```

```typescript
class DoubleQLearningAgent {
  qA: number[][];
  qB: number[][];
  constructor(
    nStates: number,
    private nActions: number,
    private alpha = 0.1,
    private gamma = 0.95,
    private epsilon = 0.1,
  ) {
    this.qA = Array.from({ length: nStates }, () =>
      new Array(nActions).fill(0),
    );
    this.qB = Array.from({ length: nStates }, () =>
      new Array(nActions).fill(0),
    );
  }

  chooseAction(state: number, rand: () => number = Math.random): number {
    if (rand() < this.epsilon) return Math.floor(rand() * this.nActions);
    let best = 0;
    let bestVal = this.qA[state][0] + this.qB[state][0];
    for (let a = 1; a < this.nActions; a++) {
      const val = this.qA[state][a] + this.qB[state][a];
      if (val > bestVal) {
        bestVal = val;
        best = a;
      }
    }
    return best;
  }

  update(
    state: number,
    action: number,
    reward: number,
    nextState: number,
    rand: () => number = Math.random,
  ): void {
    const argmax = (arr: number[]) =>
      arr.reduce((bi, v, i, a) => (v > a[bi] ? i : bi), 0);
    if (rand() < 0.5) {
      const bestNext = argmax(this.qA[nextState]);
      const target = reward + this.gamma * this.qB[nextState][bestNext];
      this.qA[state][action] += this.alpha * (target - this.qA[state][action]);
    } else {
      const bestNext = argmax(this.qB[nextState]);
      const target = reward + this.gamma * this.qA[nextState][bestNext];
      this.qB[state][action] += this.alpha * (target - this.qB[state][action]);
    }
  }
}
```

```cpp
#include <vector>
#include <random>
#include <algorithm>

class DoubleQLearningAgent {
    std::vector<std::vector<double>> qA, qB;
    int nActions;
    double alpha, gamma, epsilon;
    std::mt19937 rng{std::random_device{}()};

    int argmax(const std::vector<double>& v) { return std::max_element(v.begin(), v.end()) - v.begin(); }

public:
    DoubleQLearningAgent(int nStates, int nActions_, double alpha_ = 0.1, double gamma_ = 0.95, double epsilon_ = 0.1)
        : qA(nStates, std::vector<double>(nActions_, 0.0)), qB(nStates, std::vector<double>(nActions_, 0.0)),
          nActions(nActions_), alpha(alpha_), gamma(gamma_), epsilon(epsilon_) {}

    int chooseAction(int state) {
        std::uniform_real_distribution<double> uni(0.0, 1.0);
        if (uni(rng) < epsilon) {
            std::uniform_int_distribution<int> dist(0, nActions - 1);
            return dist(rng);
        }
        std::vector<double> combined(nActions);
        for (int a = 0; a < nActions; a++) combined[a] = qA[state][a] + qB[state][a];
        return argmax(combined);
    }

    void update(int state, int action, double reward, int nextState) {
        std::uniform_real_distribution<double> uni(0.0, 1.0);
        if (uni(rng) < 0.5) {
            int bestNext = argmax(qA[nextState]);
            double target = reward + gamma * qB[nextState][bestNext];
            qA[state][action] += alpha * (target - qA[state][action]);
        } else {
            int bestNext = argmax(qB[nextState]);
            double target = reward + gamma * qA[nextState][bestNext];
            qB[state][action] += alpha * (target - qB[state][action]);
        }
    }
};
```

```rust
use rand::Rng;

struct DoubleQLearningAgent {
    q_a: Vec<Vec<f64>>,
    q_b: Vec<Vec<f64>>,
    n_actions: usize,
    alpha: f64,
    gamma: f64,
    epsilon: f64,
}

fn argmax(v: &[f64]) -> usize {
    v.iter().enumerate().max_by(|a, b| a.1.partial_cmp(b.1).unwrap()).unwrap().0
}

impl DoubleQLearningAgent {
    fn choose_action(&self, state: usize, rng: &mut impl Rng) -> usize {
        if rng.gen::<f64>() < self.epsilon {
            return rng.gen_range(0..self.n_actions);
        }
        let combined: Vec<f64> = (0..self.n_actions).map(|a| self.q_a[state][a] + self.q_b[state][a]).collect();
        argmax(&combined)
    }

    fn update(&mut self, state: usize, action: usize, reward: f64, next_state: usize, rng: &mut impl Rng) {
        if rng.gen::<f64>() < 0.5 {
            let best_next = argmax(&self.q_a[next_state]);
            let target = reward + self.gamma * self.q_b[next_state][best_next];
            self.q_a[state][action] += self.alpha * (target - self.q_a[state][action]);
        } else {
            let best_next = argmax(&self.q_b[next_state]);
            let target = reward + self.gamma * self.q_a[next_state][best_next];
            self.q_b[state][action] += self.alpha * (target - self.q_b[state][action]);
        }
    }
}
```

```csharp
class DoubleQLearningAgent
{
    double[][] qA, qB;
    int nActions;
    double alpha, gamma, epsilon;
    Random rand = new();

    public DoubleQLearningAgent(int nStates, int nActions, double alpha = 0.1, double gamma = 0.95, double epsilon = 0.1)
    {
        qA = new double[nStates][]; qB = new double[nStates][];
        for (int i = 0; i < nStates; i++) { qA[i] = new double[nActions]; qB[i] = new double[nActions]; }
        this.nActions = nActions; this.alpha = alpha; this.gamma = gamma; this.epsilon = epsilon;
    }

    static int Argmax(double[] v)
    {
        int best = 0;
        for (int i = 1; i < v.Length; i++) if (v[i] > v[best]) best = i;
        return best;
    }

    public int ChooseAction(int state)
    {
        if (rand.NextDouble() < epsilon) return rand.Next(nActions);
        var combined = new double[nActions];
        for (int a = 0; a < nActions; a++) combined[a] = qA[state][a] + qB[state][a];
        return Argmax(combined);
    }

    public void Update(int state, int action, double reward, int nextState)
    {
        if (rand.NextDouble() < 0.5)
        {
            int bestNext = Argmax(qA[nextState]);
            double target = reward + gamma * qB[nextState][bestNext];
            qA[state][action] += alpha * (target - qA[state][action]);
        }
        else
        {
            int bestNext = Argmax(qB[nextState]);
            double target = reward + gamma * qA[nextState][bestNext];
            qB[state][action] += alpha * (target - qB[state][action]);
        }
    }
}
```
