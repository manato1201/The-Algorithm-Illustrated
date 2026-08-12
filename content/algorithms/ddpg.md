---
name: Deep Deterministic Policy Gradient(DDPG)
category: 強化学習
subcategory: 方策勾配法
complexity: O(1)(1ステップの勾配更新あたり、ネットワークの順伝播・逆伝播コストは別途)
summary: 連続行動空間向けに、決定論的な方策をActor、その価値を評価するCriticをQ学習型に学習させ、経験再生とターゲットネットワークを組み合わせて安定化させたoff-policy Actor-Critic手法。
---

## 概要

[DQN](/algorithms/dqn-deep-q-network)は`max_a' Q(s',a')`という「全ての行動候補を列挙して最大値を取る」操作に依存しており、ロボットの関節角度のような**連続値の行動空間**にはそのままでは適用できない(行動が無限に存在し列挙できないため)。一方[REINFORCE](/algorithms/reinforce-algorithm)や[A2C](/algorithms/a2c)のような方策勾配法は連続行動を扱えるが、多くは確率的な方策(行動の確率分布)を学習し、on-policy的にサンプル効率が低い。Deep Deterministic Policy Gradient(DDPG)は、Lillicrapらが2015年に提案した手法で、**決定論的な方策**`μ(s;θ)`(状態を受け取ると1つの行動を直接出力する関数)を、DQNで培われた安定化の技法(経験再生・ターゲットネットワーク)と組み合わせることで、連続行動空間でもoff-policyでサンプル効率よく学習できるようにした。Actor(方策)とCritic(価値関数)を同時に学習するActor-Critic構造を取り、Criticが「Actorの出力する行動が良いか」を評価し、その評価の勾配を使ってActorを直接改善するという、決定論的方策勾配定理に基づく更新を行う。

## 仕組み

1. **Actor**(決定論的方策)`μ(s;θ^μ)`と**Critic**(行動価値関数)`Q(s,a;θ^Q)`という2つのネットワーク、およびそれぞれのターゲットネットワーク`μ'(s;θ^μ')`・`Q'(s,a;θ^Q')`を用意する(ターゲットネットワークは最初オンライン側と同じ重みで初期化する)
2. リプレイバッファ`D`を用意する
3. 現在の状態`s`で、Actorの出力に**探索ノイズ**`N`を加えた行動を実行する: `a = μ(s;θ^μ) + N`(ノイズにはOrnstein-Uhlenbeck過程や単純なガウスノイズが使われる。決定論的方策は放っておくと同じ行動しか出さないため、探索のためにこの加算ノイズが不可欠)
4. 経験`(s, a, r, s', done)`をリプレイバッファ`D`に追加する
5. `D`からミニバッチをランダムにサンプルし、**Criticのターゲット値**を計算する。次状態の行動選択には**ターゲットActor**`μ'`を使う点がDQNのmaxと対応する:
   `y = r + γ・(1 - done)・Q'(s', μ'(s';θ^μ');θ^Q')`
6. **Criticの更新**: ターゲット`y`とCriticの現在の予測との平均二乗誤差を最小化するように`θ^Q`を勾配降下で更新する:
   `L(θ^Q) = E[(y - Q(s,a;θ^Q))^2]`
7. **Actorの更新(決定論的方策勾配)**: Criticを使って、Actorが出力する行動の価値をできるだけ高くする方向にActorを更新する。連鎖律により、Criticの出力を行動`a`について微分し、さらに行動をActorのパラメータについて微分したものを掛け合わせる:
   `∇_θ^μ J ≈ E[ ∇_a Q(s,a;θ^Q)|_{a=μ(s)} ・ ∇_θ^μ μ(s;θ^μ) ]`
   これは「Criticが評価する価値が高くなる方向に、Actorの出力する行動をずらす」という更新であり、方策勾配法にあるような対数尤度や確率比は登場しない(方策が決定論的で、行動を直接出力するため)
8. **ターゲットネットワークのソフト更新**: DQNの「一定間隔で丸ごとコピー」とは異なり、DDPGでは毎ステップ小さな割合`τ`(例: 0.001〜0.01)だけターゲットを追従させる:
   `θ^Q' ← τθ^Q + (1-τ)θ^Q'`、 `θ^μ' ← τθ^μ + (1-τ)θ^μ'`
   これにより「教師信号が急に動く」ことをさらに抑え、学習を滑らかにする
9. `s ← s'`として3〜8を繰り返す

## 特性・トレードオフ

- **連続行動空間への対応**: `max_a Q(s,a)`という列挙操作を、Actorという別のネットワークで「今のCriticのもとで最良に見える行動を直接出力する」ことに置き換えており、行動が連続値でも(離散化を経ずに)扱える。この設計は後続の連続制御向け深層強化学習の標準パターンになった
- **off-policyによるサンプル効率**: DQNと同じく経験再生を使うため、過去の(古い方策で集めた)データを再利用でき、on-policyな方策勾配法([PPO](/algorithms/ppo)や[A2C](/algorithms/a2c)など、データを1回使ったら捨てる)よりサンプル効率が高くなりやすい
- **ハイパーパラメータへの敏感さ**: 探索ノイズの大きさ、ソフト更新の`τ`、学習率など多くのハイパーパラメータが学習の安定性に強く影響し、シード(乱数の初期値)によって学習曲線が大きくばらつくことが知られている。決定論的方策ゆえにCriticの過大評価バイアスの影響を受けやすく、これがDDPGの実務上の弱点としてしばしば指摘される
- **後継手法による改善**: DDPGのCriticの過大評価バイアス問題は、[Double Q学習](/algorithms/double-q-learning)の発想を取り入れた2つのCriticを使うTD3(Twin Delayed DDPG)によって緩和された。さらに、方策の探索をエントロピー正則化によって内在的に促す[Soft Actor-Critic(SAC)](/algorithms/sac-soft-actor-critic)は、DDPGより安定した学習を実現する後継として広く使われている
- **使いどころ**: ロボットの関節制御・自動運転のステアリングなど連続行動空間の制御タスク、[DQN](/algorithms/dqn-deep-q-network)の考え方を連続行動に拡張する教材、TD3やSACのようなより発展的な連続制御向けActor-Critic手法を理解する土台

## 実装例

```python
import random

class TinyLinearNet:
    """状態(特徴ベクトル)を線形変換するだけの最小ネットワーク(説明用)。"""

    def __init__(self, n_in: int, n_out: int):
        self.weights = [[0.0] * n_in for _ in range(n_out)]

    def forward(self, x: list[float]) -> list[float]:
        return [sum(w * xi for w, xi in zip(row, x)) for row in self.weights]

    def clone(self) -> "TinyLinearNet":
        c = TinyLinearNet(len(self.weights[0]), len(self.weights))
        c.weights = [row[:] for row in self.weights]
        return c

    def soft_update_from(self, source: "TinyLinearNet", tau: float) -> None:
        for i in range(len(self.weights)):
            for j in range(len(self.weights[i])):
                self.weights[i][j] = tau * source.weights[i][j] + (1 - tau) * self.weights[i][j]


class DDPGAgent:
    def __init__(self, state_dim: int, action_dim: int,
                 actor_lr: float = 0.001, critic_lr: float = 0.001,
                 gamma: float = 0.99, tau: float = 0.005, noise_std: float = 0.1):
        self.actor = TinyLinearNet(state_dim, action_dim)
        self.actor_target = self.actor.clone()
        # Criticは状態+行動を連結した特徴を1つのQ値に線形写像する
        self.critic = TinyLinearNet(state_dim + action_dim, 1)
        self.critic_target = self.critic.clone()

        self.gamma = gamma
        self.tau = tau
        self.noise_std = noise_std
        self.actor_lr = actor_lr
        self.critic_lr = critic_lr

    def select_action(self, state: list[float], explore: bool = True) -> list[float]:
        action = self.actor.forward(state)
        if explore:
            action = [a + random.gauss(0, self.noise_std) for a in action]
        return action

    def _critic_forward(self, net: TinyLinearNet, state: list[float], action: list[float]) -> float:
        return net.forward(state + action)[0]

    def update(self, batch: list[tuple]) -> None:
        for s, a, r, s_next, done in batch:
            a_next_target = self.actor_target.forward(s_next)
            q_next_target = self._critic_forward(self.critic_target, s_next, a_next_target)
            y = r if done else r + self.gamma * q_next_target

            q_pred = self._critic_forward(self.critic, s, a)
            td_error = y - q_pred
            features = s + a
            for i, f in enumerate(features):
                self.critic.weights[0][i] += self.critic_lr * td_error * f

            # Actor更新: Criticの評価を高める方向に行動出力をずらす(簡略化した勾配近似)
            a_pred = self.actor.forward(s)
            q_at_pred = self._critic_forward(self.critic, s, a_pred)
            h = 1e-3
            for out_idx in range(len(self.actor.weights)):
                for in_idx in range(len(self.actor.weights[out_idx])):
                    perturbed = [row[:] for row in self.actor.weights]
                    perturbed[out_idx][in_idx] += h
                    a_perturbed = [sum(w * xi for w, xi in zip(row, s)) for row in perturbed]
                    q_perturbed = self._critic_forward(self.critic, s, a_perturbed)
                    grad = (q_perturbed - q_at_pred) / h
                    self.actor.weights[out_idx][in_idx] += self.actor_lr * grad

        self.actor_target.soft_update_from(self.actor, self.tau)
        self.critic_target.soft_update_from(self.critic, self.tau)
```

```typescript
class TinyLinearNet {
  weights: number[][];
  constructor(nIn: number, nOut: number) {
    this.weights = Array.from({ length: nOut }, () => new Array(nIn).fill(0));
  }

  forward(x: number[]): number[] {
    return this.weights.map((row) => row.reduce((sum, w, i) => sum + w * x[i], 0));
  }

  clone(): TinyLinearNet {
    const c = new TinyLinearNet(this.weights[0].length, this.weights.length);
    c.weights = this.weights.map((row) => [...row]);
    return c;
  }

  softUpdateFrom(source: TinyLinearNet, tau: number): void {
    for (let i = 0; i < this.weights.length; i++) {
      for (let j = 0; j < this.weights[i].length; j++) {
        this.weights[i][j] = tau * source.weights[i][j] + (1 - tau) * this.weights[i][j];
      }
    }
  }
}

type Transition = { s: number[]; a: number[]; r: number; sNext: number[]; done: boolean };

class DDPGAgent {
  actor: TinyLinearNet;
  actorTarget: TinyLinearNet;
  critic: TinyLinearNet;
  criticTarget: TinyLinearNet;

  constructor(
    stateDim: number,
    actionDim: number,
    private actorLr = 0.001,
    private criticLr = 0.001,
    private gamma = 0.99,
    private tau = 0.005,
    private noiseStd = 0.1,
  ) {
    this.actor = new TinyLinearNet(stateDim, actionDim);
    this.actorTarget = this.actor.clone();
    this.critic = new TinyLinearNet(stateDim + actionDim, 1);
    this.criticTarget = this.critic.clone();
  }

  selectAction(state: number[], explore = true, gauss: () => number = () => (Math.random() - 0.5) * 2): number[] {
    const action = this.actor.forward(state);
    if (explore) return action.map((a) => a + gauss() * this.noiseStd);
    return action;
  }

  private criticForward(net: TinyLinearNet, state: number[], action: number[]): number {
    return net.forward([...state, ...action])[0];
  }

  update(batch: Transition[]): void {
    for (const { s, a, r, sNext, done } of batch) {
      const aNextTarget = this.actorTarget.forward(sNext);
      const qNextTarget = this.criticForward(this.criticTarget, sNext, aNextTarget);
      const y = done ? r : r + this.gamma * qNextTarget;

      const qPred = this.criticForward(this.critic, s, a);
      const tdError = y - qPred;
      const features = [...s, ...a];
      for (let i = 0; i < features.length; i++) {
        this.critic.weights[0][i] += this.criticLr * tdError * features[i];
      }

      // Actor更新: Criticの評価を高める方向に行動出力をずらす(簡略化した数値勾配)
      const aPred = this.actor.forward(s);
      const qAtPred = this.criticForward(this.critic, s, aPred);
      const h = 1e-3;
      for (let outIdx = 0; outIdx < this.actor.weights.length; outIdx++) {
        for (let inIdx = 0; inIdx < this.actor.weights[outIdx].length; inIdx++) {
          const perturbed = this.actor.weights.map((row) => [...row]);
          perturbed[outIdx][inIdx] += h;
          const aPerturbed = perturbed.map((row) => row.reduce((sum, w, i) => sum + w * s[i], 0));
          const qPerturbed = this.criticForward(this.critic, s, aPerturbed);
          const grad = (qPerturbed - qAtPred) / h;
          this.actor.weights[outIdx][inIdx] += this.actorLr * grad;
        }
      }
    }

    this.actorTarget.softUpdateFrom(this.actor, this.tau);
    this.criticTarget.softUpdateFrom(this.critic, this.tau);
  }
}
```
