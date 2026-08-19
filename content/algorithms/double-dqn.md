---
name: Double DQN(Double Deep Q-Network)
category: 強化学習
subcategory: 価値ベース手法
complexity: O(1)(1ステップの勾配更新あたり、ネットワークの順伝播・逆伝播コストは別途)
summary: 行動の選択にオンラインネットワーク、価値の評価にターゲットネットワークという役割分担を導入し、DQNが抱えるQ値の過大評価バイアスをネットワークを追加せずに緩和する手法。
---

## 概要

[DQN](/algorithms/dqn-deep-q-network)のターゲット値の計算は`y = r + γ・max_a' Q(s',a';θ^-)`という形をしており、ここでも[Double Q学習](/algorithms/double-q-learning)が問題視したのと同じ罠が潜んでいる——`max`という操作が、ノイズによってたまたま過大に見積もられた行動を選びやすくするという**過大評価バイアス**である。DQNはすでにオンラインネットワーク`θ`とターゲットネットワーク`θ^-`という2つのネットワークを持っているが、通常のDQNは両方とも「次状態での最善の行動を選ぶ」のと「その行動の価値を評価する」のを**同じターゲットネットワーク`θ^-`だけ**でまかなっている。Double DQNは、2015年にハド・ヴァン・ハッセルトらが提案した手法で、[Double Q学習](/algorithms/double-q-learning)の「選択」と「評価」を分離するアイデアをそのままDQNに持ち込む。新しいネットワークを追加する必要はなく、**すでにDQNが持っている2つのネットワークの役割分担を変えるだけ**という、驚くほど小さな変更で過大評価バイアスを大きく緩和できる点が特徴である。

## 仕組み

1. [DQN](/algorithms/dqn-deep-q-network)と全く同じ構成でオンラインネットワーク`Q(s,a;θ)`とターゲットネットワーク`Q(s,a;θ^-)`、リプレイバッファ`D`を用意する
2. 通常のDQNと同様に、`Q(s,・;θ)`に基づくε-greedy方策で行動し、経験`(s,a,r,s',done)`をリプレイバッファに蓄積する
3. `D`からミニバッチをランダムサンプルする(ここまではDQNと同一)
4. **ターゲット値の計算がDQNと異なる**。通常のDQNは`max_a' Q(s',a';θ^-)`のように「行動の選択」も「価値の評価」もターゲットネットワーク`θ^-`だけで行うが、Double DQNは2段階に分ける:
   - まず**オンラインネットワーク`θ`**を使って、次状態`s'`での最善の行動を選ぶ:`a* = argmax_a' Q(s',a';θ)`
   - 選んだ行動`a*`の**価値の評価にはターゲットネットワーク`θ^-`**を使う:`y = r + γ・Q(s',a*;θ^-)`(`done`が真のときは`y = r`)
5. このターゲット値`y`を使って、DQNと同様に損失`L(θ) = E[(y - Q(s,a;θ))^2]`を最小化する方向にオンラインネットワーク`θ`を更新する
6. 一定ステップごとにターゲットネットワーク`θ^-`をオンラインネットワーク`θ`に同期する(DQNと同一)

## 特性・トレードオフ

- **追加コストほぼゼロでバイアスを緩和**: [Double Q学習](/algorithms/double-q-learning)がQ値テーブルを2組持つ必要があったのに対し、Double DQNはDQNがもともと持っているオンラインネットワークとターゲットネットワークを流用するだけで済む。パラメータ数もメモリ使用量も通常のDQNとほぼ変わらないまま、Atariベンチマークなどで過大評価の程度が明確に減少し、多くのゲームで最終的なスコアも改善することが報告されている
- **ターゲットネットワークの「ずれ」を逆に利用する設計**: オンラインネットワーク`θ`とターゲットネットワーク`θ^-`は同期のタイミングがずれているため厳密には異なるパラメータを持つ。この「ずれ」があるからこそ、[Double Q学習](/algorithms/double-q-learning)の`Q_A`・`Q_B`のような独立性に近い役割分担が(完全に独立ではないものの)実現できる
- **実装が非常に単純**: DQNのコードに対する変更は、ターゲット値を計算する数行だけであり、リプレイバッファや学習ループの構造は一切変える必要がない。この実装コストの低さから、現在では素朴なDQNよりもDouble DQNをデフォルトの実装として採用することが一般的になっている
- **使いどころ**: DQNを使う場面のほぼ全て(Atariのようなピクセル入力の離散行動タスクなど)で、過大評価バイアスによる性能劣化が気になる場合の標準的な改良として。さらに、状態価値とアドバンテージを分離する[Dueling DQN](/algorithms/dueling-dqn)や優先度付き経験再生([Prioritized Sweeping](/algorithms/prioritized-sweeping)に近い発想)と組み合わせて使われることも多く、これらの改良は互いに独立で併用可能である

## 実装例

```python
import random
from collections import deque

class ReplayBuffer:
    def __init__(self, capacity: int = 10000):
        self.buffer = deque(maxlen=capacity)

    def push(self, s, a, r, s_next, done) -> None:
        self.buffer.append((s, a, r, s_next, done))

    def sample(self, batch_size: int) -> list:
        return random.sample(self.buffer, batch_size)

    def __len__(self) -> int:
        return len(self.buffer)


class TinyQNetwork:
    """状態を特徴ベクトルとして線形結合するだけの最小Qネットワーク(説明用)。"""

    def __init__(self, n_features: int, n_actions: int):
        self.n_actions = n_actions
        self.weights = [[0.0] * n_features for _ in range(n_actions)]

    def q_values(self, features: list[float]) -> list[float]:
        return [sum(w * f for w, f in zip(row, features)) for row in self.weights]

    def clone(self) -> "TinyQNetwork":
        clone = TinyQNetwork(len(self.weights[0]), self.n_actions)
        clone.weights = [row[:] for row in self.weights]
        return clone

    def gradient_step(self, features: list[float], action: int, td_error: float, lr: float) -> None:
        for i, f in enumerate(features):
            self.weights[action][i] += lr * td_error * f


class DoubleDQNAgent:
    def __init__(self, n_features: int, n_actions: int, gamma: float = 0.95,
                 epsilon: float = 0.1, lr: float = 0.01, target_sync_every: int = 200):
        self.online = TinyQNetwork(n_features, n_actions)
        self.target = self.online.clone()
        self.buffer = ReplayBuffer()
        self.n_actions = n_actions
        self.gamma = gamma
        self.epsilon = epsilon
        self.lr = lr
        self.target_sync_every = target_sync_every
        self.steps = 0

    def choose_action(self, features: list[float]) -> int:
        if random.random() < self.epsilon:
            return random.randrange(self.n_actions)
        q = self.online.q_values(features)
        return max(range(self.n_actions), key=lambda a: q[a])

    def store(self, s, a, r, s_next, done) -> None:
        self.buffer.push(s, a, r, s_next, done)

    def train_step(self, batch_size: int = 32) -> None:
        if len(self.buffer) < batch_size:
            return
        batch = self.buffer.sample(batch_size)
        for s, a, r, s_next, done in batch:
            # 選択: オンラインネットワークで次状態の最善行動を選ぶ
            online_q_next = self.online.q_values(s_next)
            best_next_action = max(range(self.n_actions), key=lambda a: online_q_next[a])
            # 評価: その行動の価値はターゲットネットワークで評価する
            target_q_next = self.target.q_values(s_next)
            y = r if done else r + self.gamma * target_q_next[best_next_action]

            current_q = self.online.q_values(s)[a]
            td_error = y - current_q
            self.online.gradient_step(s, a, td_error, self.lr)

        self.steps += 1
        if self.steps % self.target_sync_every == 0:
            self.target = self.online.clone()
```

```typescript
class ReplayBuffer<T> {
  private buffer: T[] = [];
  constructor(private capacity: number = 10000) {}

  push(item: T): void {
    this.buffer.push(item);
    if (this.buffer.length > this.capacity) this.buffer.shift();
  }

  sample(batchSize: number, rand: () => number = Math.random): T[] {
    const result: T[] = [];
    for (let i = 0; i < batchSize; i++) {
      result.push(this.buffer[Math.floor(rand() * this.buffer.length)]);
    }
    return result;
  }

  get length(): number {
    return this.buffer.length;
  }
}

type Transition = {
  features: number[];
  action: number;
  reward: number;
  nextFeatures: number[];
  done: boolean;
};

class TinyQNetwork {
  weights: number[][];
  constructor(nFeatures: number, private nActions: number) {
    this.weights = Array.from({ length: nActions }, () => new Array(nFeatures).fill(0));
  }

  qValues(features: number[]): number[] {
    return this.weights.map((row) => row.reduce((sum, w, i) => sum + w * features[i], 0));
  }

  clone(): TinyQNetwork {
    const c = new TinyQNetwork(this.weights[0].length, this.nActions);
    c.weights = this.weights.map((row) => [...row]);
    return c;
  }

  gradientStep(features: number[], action: number, tdError: number, lr: number): void {
    for (let i = 0; i < features.length; i++) {
      this.weights[action][i] += lr * tdError * features[i];
    }
  }
}

class DoubleDQNAgent {
  online: TinyQNetwork;
  target: TinyQNetwork;
  buffer = new ReplayBuffer<Transition>();
  private steps = 0;

  constructor(
    nFeatures: number,
    private nActions: number,
    private gamma = 0.95,
    private epsilon = 0.1,
    private lr = 0.01,
    private targetSyncEvery = 200,
  ) {
    this.online = new TinyQNetwork(nFeatures, nActions);
    this.target = this.online.clone();
  }

  chooseAction(features: number[], rand: () => number = Math.random): number {
    if (rand() < this.epsilon) return Math.floor(rand() * this.nActions);
    const q = this.online.qValues(features);
    let best = 0;
    for (let a = 1; a < this.nActions; a++) if (q[a] > q[best]) best = a;
    return best;
  }

  store(t: Transition): void {
    this.buffer.push(t);
  }

  trainStep(batchSize = 32): void {
    if (this.buffer.length < batchSize) return;
    const batch = this.buffer.sample(batchSize);
    for (const { features, action, reward, nextFeatures, done } of batch) {
      // 選択: オンラインネットワークで次状態の最善行動を選ぶ
      const onlineQNext = this.online.qValues(nextFeatures);
      let bestNextAction = 0;
      for (let a = 1; a < this.nActions; a++)
        if (onlineQNext[a] > onlineQNext[bestNextAction]) bestNextAction = a;

      // 評価: その行動の価値はターゲットネットワークで評価する
      const targetQNext = this.target.qValues(nextFeatures);
      const y = done ? reward : reward + this.gamma * targetQNext[bestNextAction];

      const currentQ = this.online.qValues(features)[action];
      const tdError = y - currentQ;
      this.online.gradientStep(features, action, tdError, this.lr);
    }

    this.steps++;
    if (this.steps % this.targetSyncEvery === 0) {
      this.target = this.online.clone();
    }
  }
}
```
