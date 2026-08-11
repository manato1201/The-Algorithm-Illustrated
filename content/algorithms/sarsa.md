---
name: SARSA
category: 強化学習
subcategory: 価値ベース手法
complexity: O(1)(1ステップの更新あたり)
summary: 「次に実際に取る行動」を使ってQ値を更新するon-policy型のTD学習法。Q学習と1文字の違いに見えるが、探索中の危険を学習結果に反映するかどうかという本質的な性質の違いを生む。
---

## 概要

[Q学習](/algorithms/q-learning)は「次の状態で最善の行動を取ったと仮定して」Q値を更新するoff-policy法だったが、これは裏を返せば「実際に探索でどんな行動を取ったか」を無視して常に理想的な行動を仮定するということでもある。SARSA(State-Action-Reward-State-Actionの頭文字)は、Q学習とほぼ同じ更新式を使いながら、**次の状態で"実際に取る行動"のQ値を使って更新する**on-policy法である。この違いにより、SARSAは「探索方策(ε-greedyなどでたまにランダムな行動も取る)」自身の挙動を学習に織り込む。崖沿いを歩くような「探索中にランダムな行動を取ると危険な行動につながる」環境では、Q学習とSARSAが学習する方策が明確に異なることが、強化学習の教科書で頻出する「崖歩き問題(Cliff Walking)」でよく示される。

## 仕組み

1. Q値のテーブル`Q(s,a)`を初期化する
2. 現在の状態`s`で、ε-greedy方策に従って行動`a`を選ぶ
3. 行動`a`を実行し、報酬`r`と次の状態`s'`を観測する
4. **次の状態`s'`でも同じε-greedy方策に従って、次に実際に取る行動`a'`を選んでおく**(ここがQ学習との決定的な違い——Q学習は`max_a' Q(s',a')`という「理想の行動」の価値を使うが、SARSAは「実際に選ばれた`a'`」の価値を使う)
5. **SARSAの更新式**でQ値を更新する:
   `Q(s,a) ← Q(s,a) + α・[r + γ・Q(s',a') - Q(s,a)]`
6. `s ← s'`、`a ← a'`として2〜5を繰り返す(既に選んでおいた`a'`をそのまま次のステップの行動として使うため、行動選択が1ステップ先読みされた形になる)

## 特性・トレードオフ

- **on-policyの意味**: SARSAは「学習しているQ値」と「実際に環境で行動を選ぶのに使っている方策(ε-greedyなど探索を含む)」が同じ(on-policy)である。これに対しQ学習は、探索方策でデータを集めながらも、学習するQ値は探索を一切含まない貪欲な方策を仮定する(off-policy)という非対称な構造を持つ
- **崖歩き問題での挙動の違い**: 崖のすぐ横を歩く最短経路と、崖から離れた安全な迂回路がある環境で、Q学習は「理想的に行動すれば」という前提でQ値を更新するため最短経路(崖際)を学習するが、実際の探索(ε-greedy)ではたまにランダムに動いて崖に落ちることがある。SARSAは自分自身の探索の危険性をQ値に織り込むため、多少遠回りでも安全な経路を学習する傾向がある——同じ更新式に見えて、学習される「性格」が異なる
- **収束後の理論的な保証**: 探索率εを適切に減衰させれば、SARSAもQ学習と同様に最適方策に収束することが理論的に示されている。違いが顕著に現れるのは、探索を続けている学習過程の途中(またはε>0を維持し続ける設定)においてである
- **使いどころ**: 安全性が重視される環境(ロボット制御、探索中の失敗が致命的なシミュレーション)でのオンライン学習、[Q学習](/algorithms/q-learning)との比較によるon-policy/off-policyの違いの教育的な題材、SARSA(λ)のような適格度トレース(eligibility trace)を使った拡張手法の基礎

## 実装例

```python
import random

class SarsaAgent:
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

    def update(self, state: int, action: int, reward: float, next_state: int, next_action: int) -> None:
        # Q学習と異なり、次状態の「最大値」ではなく「実際に選んだ次の行動」の価値を使う
        target = reward + self.gamma * self.q[next_state][next_action]
        td_error = target - self.q[state][action]
        self.q[state][action] += self.alpha * td_error
```

```typescript
class SarsaAgent {
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
    nextAction: number,
  ): void {
    const target = reward + this.gamma * this.q[nextState][nextAction];
    const tdError = target - this.q[state][action];
    this.q[state][action] += this.alpha * tdError;
  }
}
```

```cpp
#include <vector>
#include <random>
#include <algorithm>

class SarsaAgent {
    std::vector<std::vector<double>> q;
    int nActions;
    double alpha, gamma, epsilon;
    std::mt19937 rng{std::random_device{}()};

public:
    SarsaAgent(int nStates, int nActions_, double alpha_ = 0.1, double gamma_ = 0.95, double epsilon_ = 0.1)
        : q(nStates, std::vector<double>(nActions_, 0.0)), nActions(nActions_), alpha(alpha_), gamma(gamma_), epsilon(epsilon_) {}

    int chooseAction(int state) {
        std::uniform_real_distribution<double> uni(0.0, 1.0);
        if (uni(rng) < epsilon) {
            std::uniform_int_distribution<int> actDist(0, nActions - 1);
            return actDist(rng);
        }
        return std::max_element(q[state].begin(), q[state].end()) - q[state].begin();
    }

    void update(int state, int action, double reward, int nextState, int nextAction) {
        double target = reward + gamma * q[nextState][nextAction];
        double tdError = target - q[state][action];
        q[state][action] += alpha * tdError;
    }
};
```

```rust
use rand::Rng;

struct SarsaAgent {
    q: Vec<Vec<f64>>,
    n_actions: usize,
    alpha: f64,
    gamma: f64,
    epsilon: f64,
}

impl SarsaAgent {
    fn new(n_states: usize, n_actions: usize, alpha: f64, gamma: f64, epsilon: f64) -> Self {
        SarsaAgent { q: vec![vec![0.0; n_actions]; n_states], n_actions, alpha, gamma, epsilon }
    }

    fn choose_action(&self, state: usize, rng: &mut impl Rng) -> usize {
        if rng.gen::<f64>() < self.epsilon {
            return rng.gen_range(0..self.n_actions);
        }
        (0..self.n_actions)
            .max_by(|&a, &b| self.q[state][a].partial_cmp(&self.q[state][b]).unwrap())
            .unwrap()
    }

    fn update(&mut self, state: usize, action: usize, reward: f64, next_state: usize, next_action: usize) {
        let target = reward + self.gamma * self.q[next_state][next_action];
        let td_error = target - self.q[state][action];
        self.q[state][action] += self.alpha * td_error;
    }
}
```

```csharp
class SarsaAgent
{
    double[][] q;
    int nActions;
    double alpha, gamma, epsilon;
    Random rand = new();

    public SarsaAgent(int nStates, int nActions, double alpha = 0.1, double gamma = 0.95, double epsilon = 0.1)
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

    public void Update(int state, int action, double reward, int nextState, int nextAction)
    {
        double target = reward + gamma * q[nextState][nextAction];
        double tdError = target - q[state][action];
        q[state][action] += alpha * tdError;
    }
}
```
