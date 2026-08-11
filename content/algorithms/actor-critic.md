---
name: Actor-Critic法
category: 強化学習
subcategory: 方策勾配法
complexity: O(1)(1ステップの更新あたり)
summary: 方策(Actor)と状態価値関数(Critic)という2つの推定器を同時に学習し、Criticが計算する予測誤差(TD誤差)を使ってActorを毎ステップ更新することで、REINFORCEのエピソード全体待ち・高分散という弱点を克服する。
---

## 概要

[REINFORCEアルゴリズム](/algorithms/reinforce-algorithm)は1エピソード分の実測収益`G_t`をそのまま使って方策を更新するため、エピソードが終わるまで更新できず、収益の分散が大きく学習が不安定になりやすいという弱点があった。Actor-Criticは、この`G_t`の代わりに**別途学習した状態価値関数`V(s)`による予測**を使うことで、この2つの弱点を同時に解消する。全体は2つの役割に分かれる——「Actor(行動する者)」は方策`π_θ(a|s)`を持ち実際に行動を選ぶ、「Critic(批評する者)」は状態価値`V_w(s)`を推定し、Actorが取った行動がどれだけ「期待より良かったか」を毎ステップ評価する。Criticの評価(TD誤差)を使ってActorをリアルタイムに更新できるため、エピソード終了を待つ必要がなく、モンテカルロ推定より分散の小さい学習が可能になる。多くの現代的な深層強化学習アルゴリズム(A2C、A3C、PPOなど)の基本構造として使われている。

## 仕組み

1. Actor(方策`π_θ(a|s)`、パラメータ`θ`)とCritic(状態価値関数`V_w(s)`、パラメータ`w`)をそれぞれ初期化する
2. 現在の状態`s`で、Actorの方策`π_θ`に従って行動`a`を選ぶ
3. 行動`a`を実行し、報酬`r`と次の状態`s'`を観測する
4. **Criticによる評価(TD誤差)** を計算する: `δ = r + γ・V_w(s') - V_w(s)`。これは「実際に起きたこと(即時報酬+次状態の推定価値)」と「事前の予測(現状態の推定価値)」の差であり、行動`a`が期待よりどれだけ良かった(δ>0)か悪かった(δ<0)かを表す
5. **Criticの更新**: TD誤差`δ`を使い、状態価値関数のパラメータを`w ← w + β・δ・∇_w V_w(s)`のように更新し、価値の予測精度を上げる
6. **Actorの更新**: [REINFORCEアルゴリズム](/algorithms/reinforce-algorithm)の収益`G_t`の代わりにTD誤差`δ`を使い、`θ ← θ + α・δ・∇_θ log π_θ(a|s)`のように方策を更新する。δが正なら「その行動を選ぶ確率」を上げ、負なら下げる
7. `s ← s'`として2〜6を毎ステップ繰り返す(エピソードの終了を待つ必要がない、オンラインな更新)

## 特性・トレードオフ

- **REINFORCEの高分散問題を軽減する**: エピソード全体の実測収益`G_t`という分散の大きい推定値の代わりに、Criticが学習した価値関数による1ステップ先までの予測(TD誤差)を使うため、更新の分散が大きく下がり、学習が安定しやすくなる(バイアスと分散のトレードオフとしては、多少のバイアスと引き換えに分散を大幅に下げる設計)
- **オンライン学習が可能**: REINFORCEはエピソード終了までパラメータを更新できなかったが、Actor-CriticはTD誤差が計算できる毎ステップで更新できる。連続タスク(エピソードの区切りがない、または非常に長い)にも自然に適用できる
- **2つの推定器を同時に学習する複雑さ**: ActorとCriticという2つの関数近似器(ニューラルネットワークであることが多い)を並行して学習させる必要があり、片方の学習が不安定だともう片方にも悪影響が及ぶ。学習率のバランス調整や、A3C(複数の環境を並列実行して勾配を非同期に集約)、PPO(方策の更新幅を制限して安定化)のような発展手法が、この学習の不安定さを緩和するために提案されている
- **使いどころ**: 連続行動空間のロボット制御、Atariゲームなどの深層強化学習(A2C/A3C/PPOの基礎構造)、対話システムや推薦システムのオンライン方策学習、[方策反復法](/algorithms/policy-iteration)のようなモデルベース手法が使えない(環境モデルが未知の)連続タスク全般

## 実装例

ソフトマックス方策(Actor)と状態価値の線形近似(Critic)を使った、1ステップごとのActor-Critic更新を示す。

```python
import math
import random

def softmax(scores: list[float]) -> list[float]:
    m = max(scores)
    exps = [math.exp(s - m) for s in scores]
    total = sum(exps)
    return [e / total for e in exps]

class ActorCriticAgent:
    def __init__(self, n_states: int, n_actions: int, alpha: float = 0.1, beta: float = 0.1, gamma: float = 0.95):
        self.theta = [[0.0] * n_actions for _ in range(n_states)]  # Actorのパラメータ
        self.v = [0.0] * n_states  # Criticの状態価値
        self.alpha, self.beta, self.gamma = alpha, beta, gamma

    def choose_action(self, state: int) -> int:
        probs = softmax(self.theta[state])
        r = random.random()
        cumulative = 0.0
        for a, p in enumerate(probs):
            cumulative += p
            if r <= cumulative:
                return a
        return len(probs) - 1

    def update(self, state: int, action: int, reward: float, next_state: int, done: bool) -> None:
        next_value = 0.0 if done else self.v[next_state]
        td_error = reward + self.gamma * next_value - self.v[state]

        # Criticの更新: 状態価値をTD誤差の方向へ補正する
        self.v[state] += self.beta * td_error

        # Actorの更新: REINFORCEのG_tの代わりにTD誤差を使う
        probs = softmax(self.theta[state])
        for a in range(len(self.theta[state])):
            grad_log_pi = (1.0 if a == action else 0.0) - probs[a]
            self.theta[state][a] += self.alpha * td_error * grad_log_pi
```

```typescript
function softmax(scores: number[]): number[] {
  const m = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - m));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / total);
}

class ActorCriticAgent {
  theta: number[][];
  v: number[];
  constructor(
    nStates: number,
    nActions: number,
    private alpha = 0.1,
    private beta = 0.1,
    private gamma = 0.95,
  ) {
    this.theta = Array.from({ length: nStates }, () =>
      new Array(nActions).fill(0),
    );
    this.v = new Array(nStates).fill(0);
  }

  chooseAction(state: number, rand: () => number = Math.random): number {
    const probs = softmax(this.theta[state]);
    const r = rand();
    let cumulative = 0;
    for (let a = 0; a < probs.length; a++) {
      cumulative += probs[a];
      if (r <= cumulative) return a;
    }
    return probs.length - 1;
  }

  update(
    state: number,
    action: number,
    reward: number,
    nextState: number,
    done: boolean,
  ): void {
    const nextValue = done ? 0 : this.v[nextState];
    const tdError = reward + this.gamma * nextValue - this.v[state];

    this.v[state] += this.beta * tdError;

    const probs = softmax(this.theta[state]);
    for (let a = 0; a < this.theta[state].length; a++) {
      const gradLogPi = (a === action ? 1 : 0) - probs[a];
      this.theta[state][a] += this.alpha * tdError * gradLogPi;
    }
  }
}
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>
#include <random>

std::vector<double> softmaxVec(const std::vector<double>& scores) {
    double m = *std::max_element(scores.begin(), scores.end());
    std::vector<double> exps(scores.size());
    double total = 0.0;
    for (size_t i = 0; i < scores.size(); i++) {
        exps[i] = std::exp(scores[i] - m);
        total += exps[i];
    }
    for (auto& e : exps) e /= total;
    return exps;
}

class ActorCriticAgent {
    std::vector<std::vector<double>> theta;
    std::vector<double> v;
    double alpha, beta, gamma;

public:
    ActorCriticAgent(int nStates, int nActions, double alpha_ = 0.1, double beta_ = 0.1, double gamma_ = 0.95)
        : theta(nStates, std::vector<double>(nActions, 0.0)), v(nStates, 0.0), alpha(alpha_), beta(beta_), gamma(gamma_) {}

    void update(int state, int action, double reward, int nextState, bool done) {
        double nextValue = done ? 0.0 : v[nextState];
        double tdError = reward + gamma * nextValue - v[state];

        v[state] += beta * tdError;

        auto probs = softmaxVec(theta[state]);
        for (size_t a = 0; a < theta[state].size(); a++) {
            double gradLogPi = (static_cast<int>(a) == action ? 1.0 : 0.0) - probs[a];
            theta[state][a] += alpha * tdError * gradLogPi;
        }
    }
};
```

```rust
fn softmax(scores: &[f64]) -> Vec<f64> {
    let m = scores.iter().cloned().fold(f64::MIN, f64::max);
    let exps: Vec<f64> = scores.iter().map(|s| (s - m).exp()).collect();
    let total: f64 = exps.iter().sum();
    exps.iter().map(|e| e / total).collect()
}

struct ActorCriticAgent {
    theta: Vec<Vec<f64>>,
    v: Vec<f64>,
    alpha: f64,
    beta: f64,
    gamma: f64,
}

impl ActorCriticAgent {
    fn update(&mut self, state: usize, action: usize, reward: f64, next_state: usize, done: bool) {
        let next_value = if done { 0.0 } else { self.v[next_state] };
        let td_error = reward + self.gamma * next_value - self.v[state];

        self.v[state] += self.beta * td_error;

        let probs = softmax(&self.theta[state]);
        for a in 0..self.theta[state].len() {
            let grad_log_pi = if a == action { 1.0 } else { 0.0 } - probs[a];
            self.theta[state][a] += self.alpha * td_error * grad_log_pi;
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

class ActorCriticAgent
{
    double[][] theta;
    double[] v;
    double alpha, beta, gamma;

    public ActorCriticAgent(int nStates, int nActions, double alpha = 0.1, double beta = 0.1, double gamma = 0.95)
    {
        theta = new double[nStates][];
        for (int i = 0; i < nStates; i++) theta[i] = new double[nActions];
        v = new double[nStates];
        this.alpha = alpha; this.beta = beta; this.gamma = gamma;
    }

    public void Update(int state, int action, double reward, int nextState, bool done)
    {
        double nextValue = done ? 0.0 : v[nextState];
        double tdError = reward + gamma * nextValue - v[state];

        v[state] += beta * tdError;

        var probs = Softmax(theta[state]);
        for (int a = 0; a < theta[state].Length; a++)
        {
            double gradLogPi = (a == action ? 1.0 : 0.0) - probs[a];
            theta[state][a] += alpha * tdError * gradLogPi;
        }
    }
}
```
