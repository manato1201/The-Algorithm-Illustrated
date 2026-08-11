---
name: Dyna-Q
category: 強化学習
subcategory: モデルベース・探索
complexity: O(1)(1回の実経験の更新)+O(k)(kは1ステップあたりのプランニング回数)
summary: 実際の環境から得た経験でQ値を更新するだけでなく、その経験から学習した簡易モデルを使って架空の経験を大量に生成し、モデルフリーとモデルベースの学習を1つのループに統合する。
---

## 概要

[Q学習](/algorithms/q-learning)のようなモデルフリー手法は環境のモデルを必要としない代わりに、実際に何度も試行しないと学習が進まない。一方[価値反復法](/algorithms/value-iteration)や[方策反復法](/algorithms/policy-iteration)のようなモデルベース手法は、環境のモデル(遷移確率)が既知であれば試行錯誤なしで最適方策を計算できるが、モデルが未知の場合には使えない。Dyna-Qは、リチャード・サットンが1990年に提案した統合アーキテクチャで、**実際の経験からモデルフリーにQ値を更新すると同時に、その経験を使って簡易な環境モデルを学習し、そのモデルを使って架空の(シミュレートされた)経験を大量に生成してさらにQ値を更新する**という、両者の良いとこ取りをする枠組みである。実環境での試行回数が限られている(高コストな)場面で、限られた経験を最大限に活用するための古典的な手法として知られる。

## 仕組み

1. Q値テーブル`Q(s,a)`と、環境モデル`Model(s,a) → (r, s')`(状態`s`で行動`a`を取ったときの報酬と次状態を記憶するテーブル)を用意する
2. **実経験のステップ**: 現在の状態`s`でε-greedy方策により行動`a`を選び、実際に環境で実行して報酬`r`と次状態`s'`を観測する
3. [Q学習](/algorithms/q-learning)と同じ更新式でQ値を更新する:`Q(s,a) ← Q(s,a) + α・[r + γ・max_a' Q(s',a') - Q(s,a)]`
4. 観測した`(s, a, r, s')`をそのままモデルに記憶する:`Model(s,a) ← (r, s')`(決定的な環境を仮定した最も単純な形。確率的な環境では出現頻度に応じた確率テーブルとして保持することもある)
5. **プランニングのステップ**: 過去に一度でも訪れた`(s,a)`の組をランダムに`k`回選び、それぞれについてモデルから`(r, s')`を取得し、3と同じQ学習の更新式を適用する(**実際に環境と相互作用せず、記憶したモデルの中だけで**架空の経験としてQ値を更新する)
6. 2〜5を繰り返す。`k`(1回の実経験あたりのプランニング回数)を大きくするほど、少ない実環境での試行から多くの学習が得られる

## 特性・トレードオフ

- **限られた実経験を使い回して学習を加速する**: 実環境での1回の行動から得られる情報は`(s,a,r,s')`という1組だけだが、その経験をモデルに記憶しておけば、その後何度でも「架空の再体験」としてQ値の更新に使い回せる。実環境での試行コストが高い(ロボットの物理試行、時間のかかるシミュレーションなど)場合に特に効果を発揮する
- **モデルの精度が学習の質を左右する**: 学習したモデルが不正確(特に学習初期でまだ十分な経験がない状態)だと、そのモデルに基づくプランニングが誤った方向にQ値を更新してしまうことがある。実経験の更新(必ず正しい情報)とプランニングの更新(モデルの精度に依存)のバランスを取る必要がある
- **優先順位付きプランニングへの拡張**: 基本のDyna-Qは`(s,a)`をランダムに選んでプランニングするが、[優先順位付き掃引法](/algorithms/prioritized-sweeping)のように「TD誤差が大きく変化した状態を優先的に再計算する」という改良を加えることで、同じプランニング回数でもより効率的に価値を伝播できる
- **使いどころ**: 実環境での試行コストが高いロボット制御・シミュレーション、限られたデータから効率的に学習したい強化学習タスク、モデルベースとモデルフリーの手法を組み合わせるハイブリッド強化学習アーキテクチャの理論的な原型

## 実装例

```python
import random

class DynaQAgent:
    def __init__(self, n_states: int, n_actions: int, alpha: float = 0.1, gamma: float = 0.95, epsilon: float = 0.1, planning_steps: int = 10):
        self.q = [[0.0] * n_actions for _ in range(n_states)]
        self.model: dict[tuple[int, int], tuple[float, int]] = {}
        self.n_actions = n_actions
        self.alpha, self.gamma, self.epsilon, self.planning_steps = alpha, gamma, epsilon, planning_steps

    def choose_action(self, state: int) -> int:
        if random.random() < self.epsilon:
            return random.randrange(self.n_actions)
        return max(range(self.n_actions), key=lambda a: self.q[state][a])

    def q_update(self, state: int, action: int, reward: float, next_state: int) -> None:
        best_next = max(self.q[next_state])
        td_error = reward + self.gamma * best_next - self.q[state][action]
        self.q[state][action] += self.alpha * td_error

    def step(self, state: int, action: int, reward: float, next_state: int) -> None:
        # 1. 実経験からQ値を更新
        self.q_update(state, action, reward, next_state)
        # 2. モデルに経験を記憶
        self.model[(state, action)] = (reward, next_state)
        # 3. プランニング: 過去の経験をランダムに再生してさらに更新
        for _ in range(self.planning_steps):
            (s, a), (r, s2) = random.choice(list(self.model.items()))
            self.q_update(s, a, r, s2)
```

```typescript
class DynaQAgent {
  q: number[][];
  model = new Map<string, [number, number]>();
  constructor(
    nStates: number,
    private nActions: number,
    private alpha = 0.1,
    private gamma = 0.95,
    private epsilon = 0.1,
    private planningSteps = 10,
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

  private qUpdate(
    state: number,
    action: number,
    reward: number,
    nextState: number,
  ): void {
    const bestNext = Math.max(...this.q[nextState]);
    const tdError = reward + this.gamma * bestNext - this.q[state][action];
    this.q[state][action] += this.alpha * tdError;
  }

  step(
    state: number,
    action: number,
    reward: number,
    nextState: number,
    rand: () => number = Math.random,
  ): void {
    this.qUpdate(state, action, reward, nextState);
    this.model.set(`${state},${action}`, [reward, nextState]);

    const keys = Array.from(this.model.keys());
    for (let i = 0; i < this.planningSteps; i++) {
      const key = keys[Math.floor(rand() * keys.length)];
      const [s, a] = key.split(",").map(Number);
      const [r, s2] = this.model.get(key)!;
      this.qUpdate(s, a, r, s2);
    }
  }
}
```

```cpp
#include <vector>
#include <map>
#include <random>
#include <algorithm>

class DynaQAgent {
    std::vector<std::vector<double>> q;
    std::map<std::pair<int, int>, std::pair<double, int>> model;
    int nActions, planningSteps;
    double alpha, gamma, epsilon;
    std::mt19937 rng{std::random_device{}()};

    void qUpdate(int state, int action, double reward, int nextState) {
        double bestNext = *std::max_element(q[nextState].begin(), q[nextState].end());
        double tdError = reward + gamma * bestNext - q[state][action];
        q[state][action] += alpha * tdError;
    }

public:
    DynaQAgent(int nStates, int nActions_, double alpha_, double gamma_, double epsilon_, int planningSteps_)
        : q(nStates, std::vector<double>(nActions_, 0.0)), nActions(nActions_), planningSteps(planningSteps_),
          alpha(alpha_), gamma(gamma_), epsilon(epsilon_) {}

    int chooseAction(int state) {
        std::uniform_real_distribution<double> uni(0.0, 1.0);
        if (uni(rng) < epsilon) {
            std::uniform_int_distribution<int> dist(0, nActions - 1);
            return dist(rng);
        }
        return std::max_element(q[state].begin(), q[state].end()) - q[state].begin();
    }

    void step(int state, int action, double reward, int nextState) {
        qUpdate(state, action, reward, nextState);
        model[{state, action}] = {reward, nextState};

        std::vector<std::pair<int, int>> keys;
        for (auto& [k, v] : model) keys.push_back(k);
        std::uniform_int_distribution<size_t> idxDist(0, keys.size() - 1);
        for (int i = 0; i < planningSteps; i++) {
            auto [s, a] = keys[idxDist(rng)];
            auto [r, s2] = model[{s, a}];
            qUpdate(s, a, r, s2);
        }
    }
};
```

```rust
use std::collections::HashMap;
use rand::Rng;

struct DynaQAgent {
    q: Vec<Vec<f64>>,
    model: HashMap<(usize, usize), (f64, usize)>,
    n_actions: usize,
    alpha: f64,
    gamma: f64,
    epsilon: f64,
    planning_steps: usize,
}

impl DynaQAgent {
    fn q_update(&mut self, state: usize, action: usize, reward: f64, next_state: usize) {
        let best_next = self.q[next_state].iter().cloned().fold(f64::MIN, f64::max);
        let td_error = reward + self.gamma * best_next - self.q[state][action];
        self.q[state][action] += self.alpha * td_error;
    }

    fn step(&mut self, state: usize, action: usize, reward: f64, next_state: usize, rng: &mut impl Rng) {
        self.q_update(state, action, reward, next_state);
        self.model.insert((state, action), (reward, next_state));

        let keys: Vec<(usize, usize)> = self.model.keys().cloned().collect();
        for _ in 0..self.planning_steps {
            let &(s, a) = &keys[rng.gen_range(0..keys.len())];
            let (r, s2) = self.model[&(s, a)];
            self.q_update(s, a, r, s2);
        }
    }
}
```

```csharp
class DynaQAgent
{
    double[][] q;
    Dictionary<(int, int), (double reward, int nextState)> model = new();
    int nActions, planningSteps;
    double alpha, gamma, epsilon;
    Random rand = new();

    public DynaQAgent(int nStates, int nActions, double alpha, double gamma, double epsilon, int planningSteps)
    {
        q = new double[nStates][];
        for (int i = 0; i < nStates; i++) q[i] = new double[nActions];
        this.nActions = nActions; this.alpha = alpha; this.gamma = gamma; this.epsilon = epsilon; this.planningSteps = planningSteps;
    }

    void QUpdate(int state, int action, double reward, int nextState)
    {
        double bestNext = q[nextState].Max();
        double tdError = reward + gamma * bestNext - q[state][action];
        q[state][action] += alpha * tdError;
    }

    public int ChooseAction(int state)
    {
        if (rand.NextDouble() < epsilon) return rand.Next(nActions);
        int best = 0;
        for (int a = 1; a < nActions; a++) if (q[state][a] > q[state][best]) best = a;
        return best;
    }

    public void Step(int state, int action, double reward, int nextState)
    {
        QUpdate(state, action, reward, nextState);
        model[(state, action)] = (reward, nextState);

        var keys = model.Keys.ToList();
        for (int i = 0; i < planningSteps; i++)
        {
            var (s, a) = keys[rand.Next(keys.Count)];
            var (r, s2) = model[(s, a)];
            QUpdate(s, a, r, s2);
        }
    }
}
```
