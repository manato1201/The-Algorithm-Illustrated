---
name: N-step TD学習(N-step Temporal Difference Learning)
category: 強化学習
subcategory: 価値ベース手法
complexity: O(n)(1回の更新あたり、nは先読みステップ数)
summary: 1ステップ先の報酬だけで更新するTD(0)と、エピソード終了まで実際の報酬を使い切るモンテカルロ法の中間に位置し、先読みステップ数nを調整することでバイアスと分散のトレードオフを連続的に制御できる価値推定手法。
---

## 概要

[Q学習](/algorithms/q-learning)や[SARSA](/algorithms/sarsa)が使うTD(0)の更新は、「1ステップ先の報酬`r`」と「1ステップ先の状態の推定価値」だけを使ってターゲットを組み立てる。これは少ない実際の観測(1ステップ分の報酬)と多くの推定(残りは現在のQ値やV値による見積もり)を組み合わせるため、更新の分散は小さいが、初期の不正確な価値関数に引きずられるバイアスを持つ。対極にあるモンテカルロ法は、エピソードが終わるまでの**実際に得られた報酬を全て使う**ためバイアスはゼロだが、長いエピソードでは報酬の合計の分散が非常に大きくなる。N-step TD学習は、この2つの極端な手法の中間に位置する一般化であり、「nステップ先までは実際の報酬を使い、それ以降は現在の価値関数による推定で打ち切る」という形でターゲットを構成する。nを1にすればTD(0)に、nをエピソード長まで大きくすればモンテカルロ法に一致するため、nは「バイアスと分散のトレードオフ」を直接調整するツマミとして機能する。

## 仕組み

1. 状態価値`V(s)`(またはQ値`Q(s,a)`)のテーブルを初期化する
2. 方策(ε-greedyなど)に従って行動し、状態・行動・報酬の系列`s_0, a_0, r_1, s_1, a_1, r_2, s_2, ...`を生成する
3. **n-step収益(n-step return)**を定義する。時刻`t`から始めて、実際に観測したn個分の報酬を割引しながら合計し、n番目の状態の価値の推定値で打ち切る:
   `G_t^(n) = r_{t+1} + γ・r_{t+2} + γ^2・r_{t+3} + ... + γ^(n-1)・r_{t+n} + γ^n・V(s_{t+n})`
   n=1のときは `G_t^(1) = r_{t+1} + γ・V(s_{t+1})` となり、これはTD(0)のターゲットそのものである
4. **n-step TD更新式**でV(またはQ)を更新する:
   `V(s_t) ← V(s_t) + α・[G_t^(n) - V(s_t)]`
5. 実装上は、時刻`t`の更新に`s_{t+n}`の情報が必要になるため、更新自体はnステップ遅れて行われる(オンラインで報酬を観測しながら、直近n個の`(s,a,r)`をバッファに保持しておき、n個目の報酬とその先の状態が揃った時点で最も古い状態を更新する)
6. エピソード終端に達したら、バッファに残っている「まだn個揃っていない」状態についても、実際に得られた残り全ての報酬を使って(打ち切りなしで)更新する

## 特性・トレードオフ

- **バイアス・分散トレードオフの連続的な制御**: nが小さいほど(TD(0)に近いほど)価値関数の推定誤差に強く依存するためバイアスが乗りやすいが、更新1回あたりの分散は小さく学習が安定しやすい。nが大きいほど(モンテカルロ法に近いほど)実際の報酬をより多く使うためバイアスは減るが、確率的な環境や長い系列では分散が急増する。実務上は中間的なn(例えばn=3〜10程度)が両者の良いバランスを取ることが多い
- **伝播の速さ**: TD(0)は1ステップごとにしか価値の更新情報が伝わらないため、報酬が得られた地点から離れた状態に情報が伝わるまで多くのエピソードを要することがある。nを大きくすると、1回の更新でより広い範囲の状態に価値の情報が一気に伝わるため、学習の初期段階での収束が速くなることが多い
- **実装のわずかな複雑化**: 更新にnステップ先の情報が必要なため、直近n個分の`(s,a,r)`を保持するバッファが必要になり、TD(0)のような完全にオンラインな1ステップ更新に比べて実装がやや複雑になる。またエピソード終端付近では打ち切り長がnに満たないため特別扱いが必要になる
- **TD(λ)との関係**: n-step TD学習はnという離散的なパラメータで先読み長を選ぶが、[TD(λ)学習](/algorithms/td-lambda)はあらゆるnのn-step収益を指数重み`λ^(n-1)`で連続的に混合することで、特定のnを選ぶ手間そのものをなくした一般化になっている。n-step TD学習はTD(λ)を理解するための中間ステップとして位置づけられる
- **使いどころ**: 報酬が疎(まれにしか発生しない)でTD(0)では価値の伝播が遅すぎる環境、モンテカルロ法では分散が大きすぎる長いエピソードのタスク、[TD(λ)学習](/algorithms/td-lambda)や適格度トレースを理解する前段階の教材

## 実装例

```python
from collections import deque

class NStepTDAgent:
    def __init__(self, n_states: int, n: int = 3, alpha: float = 0.1, gamma: float = 0.95):
        self.v = [0.0] * n_states
        self.n = n
        self.alpha = alpha
        self.gamma = gamma
        self.buffer: deque[tuple[int, float]] = deque()  # (state, reward)のペア。最初のstateはreward=Noneに相当

    def start_episode(self, s0: int) -> None:
        self.buffer.clear()
        self.buffer.append((s0, 0.0))  # 先頭は報酬なしのダミー

    def step(self, reward: float, next_state: int) -> None:
        self.buffer.append((next_state, reward))
        if len(self.buffer) >= self.n + 1:
            self._update(done=False)

    def end_episode(self) -> None:
        # 残っている全ての状態を、打ち切りなしで(バッファの終わりまでの実報酬だけで)更新する
        while len(self.buffer) > 1:
            self._update(done=True)
            self.buffer.popleft()

    def _update(self, done: bool) -> None:
        states = list(self.buffer)
        s_t = states[0][0]
        rewards = [r for _, r in states[1:]]  # r_{t+1}, r_{t+2}, ...

        g = 0.0
        for i, r in enumerate(rewards):
            g += (self.gamma ** i) * r

        if not done:
            s_last = states[-1][0]
            g += (self.gamma ** len(rewards)) * self.v[s_last]

        self.v[s_t] += self.alpha * (g - self.v[s_t])
        if not done:
            self.buffer.popleft()
```

```typescript
class NStepTDAgent {
  v: number[];
  private buffer: { state: number; reward: number }[] = [];

  constructor(
    nStates: number,
    private n: number = 3,
    private alpha = 0.1,
    private gamma = 0.95,
  ) {
    this.v = new Array(nStates).fill(0);
  }

  startEpisode(s0: number): void {
    this.buffer = [{ state: s0, reward: 0 }];
  }

  step(reward: number, nextState: number): void {
    this.buffer.push({ state: nextState, reward });
    if (this.buffer.length >= this.n + 1) {
      this.update(false);
    }
  }

  endEpisode(): void {
    while (this.buffer.length > 1) {
      this.update(true);
      this.buffer.shift();
    }
  }

  private update(done: boolean): void {
    const sT = this.buffer[0].state;
    const rewards = this.buffer.slice(1).map((b) => b.reward);

    let g = 0;
    for (let i = 0; i < rewards.length; i++) {
      g += Math.pow(this.gamma, i) * rewards[i];
    }

    if (!done) {
      const sLast = this.buffer[this.buffer.length - 1].state;
      g += Math.pow(this.gamma, rewards.length) * this.v[sLast];
    }

    this.v[sT] += this.alpha * (g - this.v[sT]);
    if (!done) {
      this.buffer.shift();
    }
  }
}
```
