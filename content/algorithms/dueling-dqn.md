---
name: Dueling DQN(価値・アドバンテージ分離アーキテクチャ)
category: 強化学習
subcategory: 価値ベース手法
complexity: O(1)(1ステップの順伝播・逆伝播あたり、ネットワーク構造以外はDQNと同一)
summary: ネットワークの出力層を状態価値V(s)とアドバンテージA(s,a)の2つのストリームに分離し、それらを合成してQ値を求めることで、行動によらず重要な状態の価値評価を効率的に学習できるようにしたネットワーク構造。
---

## 概要

[DQN](/algorithms/dqn-deep-q-network)は状態`s`と行動`a`の組を入力として、直接Q(s,a)を1本の出力層で予測する構造を取る。しかし多くの環境では、「その状態自体がどれだけ良いか」(状態価値`V(s)`)と「その状態でどの行動を選ぶかが結果にどれだけ影響するか」(行動間の優劣、アドバンテージ`A(s,a) = Q(s,a) - V(s)`)は本質的に別の情報である。例えば道路にたまたま障害物がない場面では、どのハンドル操作を選んでも大差はなく`V(s)`が支配的だが、障害物の直前では行動の選択が生死を分け`A(s,a)`の差が大きくなる。Dueling DQNは、2016年にワンらが提案したネットワークアーキテクチャで、**出力層を`V(s)`を予測するストリームと`A(s,a)`を予測するストリームの2つに分離**し、それらを合成してQ(s,a)を求める。学習アルゴリズム自体([DQN](/algorithms/dqn-deep-q-network)や[Double DQN](/algorithms/double-dqn)の経験再生・ターゲットネットワーク)は変えず、**ネットワークの出力層の構造だけを変える**という点で、他の改良と独立に組み合わせられるのが特徴である。

## 仕組み

1. 状態`s`を入力として、共通の特徴抽出層(畳み込み層など)を通した後、ネットワークを2つのストリームに分岐させる:
   - **価値ストリーム**: スカラー値`V(s;θ,β)`を1つ出力する(行動に依存しない、状態そのものの価値)
   - **アドバンテージストリーム**: 行動数分のベクトル`A(s,a;θ,α)`を出力する(各行動が状態の平均的な価値からどれだけ得か)
2. 2つのストリームの出力を**合成**してQ値を得る。単純に`Q(s,a) = V(s) + A(s,a)`とすると、`V`と`A`の分解が一意に定まらない(`V`に定数を足して`A`から同じ定数を引いても同じQになる)という**識別可能性(identifiability)の問題**が生じるため、実際にはアドバンテージの平均を引いて正規化する:
   `Q(s,a;θ,α,β) = V(s;θ,β) + [A(s,a;θ,α) - (1/|A|)・Σ_a' A(s,a';θ,α)]`
   (平均の代わりに最大値を引く`A(s,a) - max_a' A(s,a')`という定式化も提案されているが、平均を使う方が学習が安定しやすいとされる)
3. 合成されたQ(s,a)を使って、[DQN](/algorithms/dqn-deep-q-network)や[Double DQN](/algorithms/double-dqn)と全く同じ手順(ε-greedy行動選択、経験再生、ターゲットネットワークによるTD誤差の計算、勾配降下)で学習する。**アーキテクチャが変わるだけで学習アルゴリズムは変わらない**
4. 逆伝播の際、勾配は共通の特徴抽出層まで2つのストリームから合流して伝わるため、`V`と`A`は別々の出力でありながら共有された特徴表現を通じて互いに影響し合いながら学習される

## 特性・トレードオフ

- **行動に依存しない状態評価を効率的に学習できる**: 行動を変えても結果がほぼ変わらない状態(多くの行動が同程度に安全/危険な局面)では、通常のDQNは全ての行動それぞれについてQ値を個別に学習し直す必要があるが、Dueling DQNは`V(s)`を行動と無関係に1本のストリームで学習できるため、行動数が多い環境ほどこの効率化の恩恵が大きい
- **正規化(平均を引く操作)が学習の安定性を左右する**: 単純な加算`Q = V + A`は数学的に不良設定(ill-posed)であり、そのままでは`V`と`A`の値が任意にずれても同じQ値を再現できてしまい勾配が不安定になる。アドバンテージの平均(または最大値)を引く正規化によってこの不定性を解消し、`V`が実際に状態価値らしい値に、`A`が実際に相対的な優劣を表す値に収束するよう誘導する
- **他の改良と独立に併用できる**: Dueling DQNはネットワークの出力層の構造だけの変更であり、[Double DQN](/algorithms/double-dqn)のターゲット計算の工夫や優先度付き経験再生とは独立した軸の改良である。実際にAtariベンチマークでは「Dueling + Double DQN + 優先度付き経験再生」のように複数の改良を積み重ねて使うことが一般的である
- **使いどころ**: 行動の選択肢が多く、かつ状態によって「どの行動を選んでも大差ない局面」と「行動の選択が決定的に重要な局面」が混在するタスク(自動運転のようなゲーム・シミュレーション)、[DQN](/algorithms/dqn-deep-q-network)系のアルゴリズムの学習効率を、アルゴリズム自体を変えずにアーキテクチャの工夫だけで底上げしたい場合

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


class DuelingQNetwork:
    """状態価値Vとアドバンテージ列Aを別々の線形層で予測し、合成してQ値を出す説明用の最小実装。"""

    def __init__(self, n_features: int, n_actions: int):
        self.n_actions = n_actions
        self.value_weights = [0.0] * n_features          # V(s) 用の重み(スカラー出力)
        self.advantage_weights = [[0.0] * n_features for _ in range(n_actions)]  # A(s,a) 用の重み

    def q_values(self, features: list[float]) -> list[float]:
        v = sum(w * f for w, f in zip(self.value_weights, features))
        advantages = [sum(w * f for w, f in zip(row, features)) for row in self.advantage_weights]
        mean_advantage = sum(advantages) / self.n_actions
        # 正規化: アドバンテージの平均を引いてV/Aの不定性を解消する
        return [v + (a - mean_advantage) for a in advantages]

    def clone(self) -> "DuelingQNetwork":
        clone = DuelingQNetwork(len(self.value_weights), self.n_actions)
        clone.value_weights = self.value_weights[:]
        clone.advantage_weights = [row[:] for row in self.advantage_weights]
        return clone

    def gradient_step(self, features: list[float], action: int, td_error: float, lr: float) -> None:
        # 簡易化のため、V側とA側の両方に同じTD誤差を分配して更新する
        for i, f in enumerate(features):
            self.value_weights[i] += lr * td_error * f
            self.advantage_weights[action][i] += lr * td_error * f


class DuelingDQNAgent:
    def __init__(self, n_features: int, n_actions: int, gamma: float = 0.95,
                 epsilon: float = 0.1, lr: float = 0.01, target_sync_every: int = 200):
        self.online = DuelingQNetwork(n_features, n_actions)
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
            target_q_next = self.target.q_values(s_next)
            y = r if done else r + self.gamma * max(target_q_next)
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

class DuelingQNetwork {
  valueWeights: number[];
  advantageWeights: number[][];

  constructor(nFeatures: number, private nActions: number) {
    this.valueWeights = new Array(nFeatures).fill(0);
    this.advantageWeights = Array.from({ length: nActions }, () => new Array(nFeatures).fill(0));
  }

  qValues(features: number[]): number[] {
    const v = this.valueWeights.reduce((sum, w, i) => sum + w * features[i], 0);
    const advantages = this.advantageWeights.map((row) =>
      row.reduce((sum, w, i) => sum + w * features[i], 0),
    );
    const meanAdvantage = advantages.reduce((a, b) => a + b, 0) / this.nActions;
    // 正規化: アドバンテージの平均を引いてV/Aの不定性を解消する
    return advantages.map((a) => v + (a - meanAdvantage));
  }

  clone(): DuelingQNetwork {
    const c = new DuelingQNetwork(this.valueWeights.length, this.nActions);
    c.valueWeights = [...this.valueWeights];
    c.advantageWeights = this.advantageWeights.map((row) => [...row]);
    return c;
  }

  gradientStep(features: number[], action: number, tdError: number, lr: number): void {
    for (let i = 0; i < features.length; i++) {
      this.valueWeights[i] += lr * tdError * features[i];
      this.advantageWeights[action][i] += lr * tdError * features[i];
    }
  }
}

class DuelingDQNAgent {
  online: DuelingQNetwork;
  target: DuelingQNetwork;
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
    this.online = new DuelingQNetwork(nFeatures, nActions);
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
      const targetQNext = this.target.qValues(nextFeatures);
      const y = done ? reward : reward + this.gamma * Math.max(...targetQNext);
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
