---
name: Deep Q-Network(DQN)
category: 強化学習
subcategory: 価値ベース手法
complexity: O(1)(1ステップの勾配更新あたり、ネットワークの順伝播・逆伝播コストは別途)
summary: Q値をテーブルではなくニューラルネットワークで近似し、経験再生とターゲットネットワークという2つの工夫で学習を安定させることで、画像入力のような巨大な状態空間でも動くようにした深層強化学習の先駆け。
---

## 概要

[Q学習](/algorithms/q-learning)は状態×行動のテーブル`Q(s,a)`を持つことで理論的に美しい収束保証を持つが、状態空間が爆発的に大きい問題(例えばAtariのゲーム画面のような高次元の画像入力)では、そもそもテーブルをメモリに載せることができない。Deep Q-Network(DQN)は、DeepMindが2015年に発表した手法で、Q値のテーブルをニューラルネットワーク`Q(s,a;θ)`(パラメータ`θ`)による関数近似に置き換えることで、この限界を突破した。しかし単純にQ学習の更新則をニューラルネットの勾配降下に置き換えるだけでは学習が発散してしまう。DQNの本質的な貢献は、**経験再生(Experience Replay)**と**ターゲットネットワーク(Target Network)**という2つの工夫によって、この発散を抑え学習を安定させた点にある。この安定化のアイデアは以後のほぼ全ての深層強化学習手法([DDPG](/algorithms/ddpg)や[SAC](/algorithms/sac-soft-actor-critic)を含む)に受け継がれている。

## 仕組み

1. Q値を近似するニューラルネットワーク`Q(s,a;θ)`(オンラインネットワーク)と、そのコピーである`Q(s,a;θ^-)`(ターゲットネットワーク)を用意する。両者は同じ構造だがパラメータθを別々に保持する
2. 経験を貯めておく**リプレイバッファ**`D`を用意する(固定容量のリングバッファが典型的)
3. 現在の状態`s`で、`Q(s,・;θ)`に基づくε-greedy方策で行動`a`を選ぶ
4. 行動`a`を実行し、報酬`r`・次状態`s'`・終端フラグ`done`を観測し、経験`(s,a,r,s',done)`をリプレイバッファ`D`に追加する
5. **経験再生**: `D`から過去の経験をランダムに一定数(ミニバッチサイズ`N`)サンプルする。時系列で連続して発生した経験は互いに強く相関しており、そのまま順番に学習に使うと勾配が偏ってしまう(かつ、直前の少数の経験を「忘れて」しまう)。ランダムサンプリングによってこの相関を壊し、独立同分布に近いデータで学習できるようにする
6. サンプルした各経験について**ターゲット値**を計算する。ターゲットの計算には**ターゲットネットワーク**`θ^-`を使う(オンラインネットワーク`θ`は使わない):
   `y = r`(`done`が真のとき)、または `y = r + γ・max_a' Q(s',a';θ^-)`(それ以外)
7. **損失関数**(通常は平均二乗誤差、または外れ値に頑健なHuber損失)を最小化するようにオンラインネットワーク`θ`を勾配降下で更新する:
   `L(θ) = E[(y - Q(s,a;θ))^2]`
   ここでターゲット`y`の計算に使う`θ^-`は勾配計算の対象にせず定数として扱う(そうしないと「動く標的」を自分自身で追いかける形になり学習が発散しやすい)
8. **ターゲットネットワークの同期**: 一定ステップ数ごと(または一定間隔でのソフト更新`θ^- ← τθ + (1-τ)θ^-`)に、オンラインネットワークのパラメータ`θ`をターゲットネットワーク`θ^-`にコピーする。これにより「ターゲット値自体が毎ステップ動いてしまう」ことを防ぎ、学習を安定させる
9. `s ← s'`として3〜8をエピソードが終わるまで、または十分なステップ数繰り返す

## 特性・トレードオフ

- **関数近似による汎化**: テーブル型Q学習は訪れたことのない状態には何も言えないが、ニューラルネットワークは似た状態間で価値を汎化できる。これにより状態空間が事実上無限(画像入力など)の問題にも適用できる
- **経験再生とターゲットネットワークがセットで必要**: どちらか一方を欠くと学習は不安定になりやすい。経験再生はデータの相関を断ち切り、ターゲットネットワークは「教師信号自体が学習によって動いてしまう」という自己参照的な不安定性を抑える。両者は独立した工夫だが、深層強化学習を実用的に安定させるためにはほぼ常にセットで使われる
- **過大評価バイアスは残る**: DQNは依然として`max_a' Q(s',a';θ^-)`という最大化操作を使うため、[Double Q学習](/algorithms/double-q-learning)と同様の過大評価バイアスの問題を抱える。この弱点は「行動選択にオンラインネットワーク、価値評価にターゲットネットワークを使う」Double DQNによって緩和される
- **離散行動空間に限られる**: DQNの`max_a' Q(s',a')`という操作は、行動の候補を全て列挙して最大値を取ることを前提としており、行動が連続値(ロボットの関節角度など)の場合はそのままでは適用できない。連続行動空間には[DDPG](/algorithms/ddpg)や[SAC](/algorithms/sac-soft-actor-critic)のような別系統の手法が使われる
- **使いどころ**: Atariのようなピクセル入力からの学習、状態空間が大きく離散行動を持つゲームAI、[Q学習](/algorithms/q-learning)や[Double Q学習](/algorithms/double-q-learning)で培われたテーブル型手法の考え方をニューラルネットに橋渡しする教育的な題材

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


class DQNAgent:
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

class DQNAgent {
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
