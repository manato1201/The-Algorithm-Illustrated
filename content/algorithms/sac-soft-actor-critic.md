---
name: Soft Actor-Critic(SAC)
category: 強化学習
subcategory: 方策勾配法
complexity: O(1)(1ステップの勾配更新あたり、ネットワークの順伝播・逆伝播コストは別途)
summary: 報酬の最大化に加えて方策のエントロピーも同時に最大化する目的関数を導入し、探索と活用のバランスを自動調整しながら、off-policyで高いサンプル効率と学習の安定性を両立する連続行動空間向けActor-Critic手法。
---

## 概要

[DDPG](/algorithms/ddpg)は連続行動空間でoff-policyかつサンプル効率よく学習できる一方、決定論的な方策ゆえに探索が外部から加えるノイズに依存し、ハイパーパラメータへの敏感さや学習の不安定さが実務上の課題として指摘されてきた。Soft Actor-Critic(SAC)は、Haarnojaらが2018年に提案した手法で、通常の「期待報酬の最大化」という目的に、**方策のエントロピー(行動選択のランダムさ)を最大化する項を加えた「最大エントロピー強化学習」**の枠組みに基づく。方策は「高い報酬を得つつ、できるだけランダムであり続けよ」という2つの目的を同時に追求するように学習され、この結果、探索のために手作業でノイズの大きさを調整する必要がなくなり、**探索と活用のバランスがエントロピー項の重みを通じて自動的に(理想的には自動調整さえされて)決まる**。DDPGの安定化技法(経験再生、ターゲットネットワーク)を引き継ぎつつ、確率的な方策とエントロピー正則化によって、多くの連続制御ベンチマークでDDPGより高い性能と安定性を示すことが報告されている。

## 仕組み

1. **最大エントロピー目的関数**を定義する。通常の期待累積報酬に、各状態での方策のエントロピー`H(π(・|s))`を重み`α`(温度パラメータ)倍して加えたものを最大化する:
   `J(π) = E[ Σ_t γ^t ( r_t + α・H(π(・|s_t)) ) ]`
   `α`が大きいほど「ランダムであること」自体の価値が高くなり、方策はより広く探索するようになる
2. **ソフトQ関数**(2つのCriticネットワーク`Q_1`, `Q_2`、[Double Q学習](/algorithms/double-q-learning)と同様に過大評価バイアスを緩和するため2つ用意する)のターゲットを、エントロピー項を含めた形で計算する:
   `y = r + γ・(1-done)・( min(Q_1'(s',a'), Q_2'(s',a')) - α・log π(a'|s') )`
   ここで`a'`は次状態`s'`で現在の方策`π`からサンプルした行動。`-α・log π(a'|s')`が「その行動を選ぶことの意外性(エントロピー由来の報酬)」を表す
3. **Criticの更新**: 2つのQネットワークそれぞれについて、ターゲット`y`との平均二乗誤差を最小化するように更新する: `L(θ_i) = E[(y - Q_i(s,a;θ_i))^2]`(i=1,2)
4. **Actor(方策)の更新**: 方策`π(・|s;φ)`から**再パラメータ化トリック**(`a = tanh(μ_φ(s) + σ_φ(s)・ε)`、`ε`は標準正規分布からのノイズ)を使って行動をサンプルし、以下を最大化するように方策パラメータ`φ`を更新する:
   `J(φ) = E[ min(Q_1(s,a), Q_2(s,a)) - α・log π(a|s;φ) ]`
   これは「2つのCriticのうち小さい方の評価を高く保ちつつ、方策のエントロピー(ランダムさ)も高く保つ」という2つの力のバランスを取る更新であり、再パラメータ化トリックによって行動のサンプリングを通しても勾配を逆伝播できる
5. **温度パラメータ`α`の自動調整(オプションだが実務ではほぼ標準)**: 目標エントロピー`H_target`(典型的には行動次元数にマイナスを付けた値)を設定し、実際の方策のエントロピーがこの目標に近づくように`α`自体を勾配降下で調整する:
   `L(α) = E[ -α・(log π(a|s) + H_target) ]`
   これにより学習の進行に応じて探索の強さ(エントロピーの重み)が自動的に増減し、`α`を手動でチューニングする必要がなくなる
6. **ターゲットネットワークのソフト更新**: DDPGと同様、`Q_1'`・`Q_2'`を毎ステップ小さな割合`τ`だけオンラインのCriticに追従させる: `θ_i' ← τθ_i + (1-τ)θ_i'`
7. リプレイバッファからミニバッチをサンプルしながら2〜6を繰り返す

## 特性・トレードオフ

- **確率的方策による探索の自動化**: DDPGは決定論的方策に外部ノイズを加えて探索するが、SACは方策自体が確率分布であり、エントロピー最大化という目的関数の一部として探索の強さが学習過程に組み込まれている。探索率やノイズの大きさを手作業で減衰させるスケジュールを設計する必要が(温度自動調整を使えば)ほぼなくなる
- **2つのCriticによる過大評価バイアスの緩和**: [Double Q学習](/algorithms/double-q-learning)や[DQN](/algorithms/dqn-deep-q-network)系の発展形(TD3)と同じ発想で、2つの独立したQネットワークの最小値をターゲット計算に使うことで、単一のCriticを使う場合に生じやすい価値の過大評価を抑える
- **off-policyによる高いサンプル効率**: リプレイバッファに蓄積した過去のデータを繰り返し使って学習できるため、[PPO](/algorithms/ppo)や[TRPO](/algorithms/trpo)のようなon-policy手法に比べて、同じ性能に到達するまでに必要な環境とのやり取り(サンプル数)が少なくて済むことが多い
- **エントロピー項の設計とタスク依存性**: 温度`α`の自動調整によって多くのタスクでロバストに機能するが、報酬のスケールが極端なタスクや、報酬が非常に疎なタスクでは目標エントロピーの設定や報酬のスケーリングに注意が必要になる場合がある
- **使いどころ**: ロボット制御・連続行動空間のシミュレーション環境における深層強化学習の事実上の標準的選択肢の一つ、探索の自動調整が重要な実世界に近いタスク、[DDPG](/algorithms/ddpg)や[TD3]の弱点(探索の手動調整、過大評価バイアス)を克服した発展形としての位置づけを学ぶ教材

## 実装例

```python
import math
import random

class TinyLinearNet:
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


class SACAgent:
    """ガウス方策 + 2つのCritic + 自動温度調整を単純化した最小実装(1次元行動を想定)。"""

    def __init__(self, state_dim: int, gamma: float = 0.99, tau: float = 0.005,
                 actor_lr: float = 0.001, critic_lr: float = 0.001, alpha_lr: float = 0.001,
                 target_entropy: float = -1.0):
        self.mean_net = TinyLinearNet(state_dim, 1)
        self.log_std_net = TinyLinearNet(state_dim, 1)

        self.critic1 = TinyLinearNet(state_dim + 1, 1)
        self.critic2 = TinyLinearNet(state_dim + 1, 1)
        self.critic1_target = self.critic1.clone()
        self.critic2_target = self.critic2.clone()

        self.log_alpha = 0.0  # alpha = exp(log_alpha)
        self.target_entropy = target_entropy

        self.gamma, self.tau = gamma, tau
        self.actor_lr, self.critic_lr, self.alpha_lr = actor_lr, critic_lr, alpha_lr

    @property
    def alpha(self) -> float:
        return math.exp(self.log_alpha)

    def sample_action(self, state: list[float]) -> tuple[float, float]:
        """再パラメータ化トリックで行動とlog確率をサンプルする。"""
        mean = self.mean_net.forward(state)[0]
        log_std = self.log_std_net.forward(state)[0]
        std = math.exp(max(min(log_std, 2.0), -5.0))

        eps = random.gauss(0, 1)
        pre_tanh = mean + std * eps
        action = math.tanh(pre_tanh)

        # tanh変換を含むガウス分布のlog確率(ヤコビアン補正込み)
        log_prob = -0.5 * (eps ** 2 + math.log(2 * math.pi)) - math.log(std)
        log_prob -= math.log(max(1 - action ** 2, 1e-6))
        return action, log_prob

    def update(self, batch: list[tuple]) -> None:
        for s, a, r, s_next, done in batch:
            a_next, log_pi_next = self.sample_action(s_next)
            q1_next = self.critic1_target.forward(s_next + [a_next])[0]
            q2_next = self.critic2_target.forward(s_next + [a_next])[0]
            min_q_next = min(q1_next, q2_next) - self.alpha * log_pi_next
            y = r if done else r + self.gamma * min_q_next

            for critic in (self.critic1, self.critic2):
                q_pred = critic.forward(s + [a])[0]
                td_error = y - q_pred
                for i, f in enumerate(s + [a]):
                    critic.weights[0][i] += self.critic_lr * td_error * f

            # Actor更新: min(Q1,Q2) - alpha*log_pi を高める方向へ(数値勾配による簡略化)
            a_new, log_pi_new = self.sample_action(s)
            q1_new = self.critic1.forward(s + [a_new])[0]
            q2_new = self.critic2.forward(s + [a_new])[0]
            objective = min(q1_new, q2_new) - self.alpha * log_pi_new

            h = 1e-3
            for i in range(len(self.mean_net.weights[0])):
                perturbed = [row[:] for row in self.mean_net.weights]
                perturbed[0][i] += h
                mean_p = sum(w * xi for w, xi in zip(perturbed[0], s))
                a_p = math.tanh(mean_p)
                q_p = min(self.critic1.forward(s + [a_p])[0], self.critic2.forward(s + [a_p])[0])
                grad = (q_p - objective) / h
                self.mean_net.weights[0][i] += self.actor_lr * grad

            # 温度alphaの自動調整
            alpha_loss_grad = -(log_pi_new + self.target_entropy)
            self.log_alpha += self.alpha_lr * alpha_loss_grad

        self.critic1_target.soft_update_from(self.critic1, self.tau)
        self.critic2_target.soft_update_from(self.critic2, self.tau)
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

type Transition = { s: number[]; a: number; r: number; sNext: number[]; done: boolean };

class SACAgent {
  meanNet: TinyLinearNet;
  logStdNet: TinyLinearNet;
  critic1: TinyLinearNet;
  critic2: TinyLinearNet;
  critic1Target: TinyLinearNet;
  critic2Target: TinyLinearNet;
  logAlpha = 0;

  constructor(
    stateDim: number,
    private gamma = 0.99,
    private tau = 0.005,
    private actorLr = 0.001,
    private criticLr = 0.001,
    private alphaLr = 0.001,
    private targetEntropy = -1.0,
  ) {
    this.meanNet = new TinyLinearNet(stateDim, 1);
    this.logStdNet = new TinyLinearNet(stateDim, 1);
    this.critic1 = new TinyLinearNet(stateDim + 1, 1);
    this.critic2 = new TinyLinearNet(stateDim + 1, 1);
    this.critic1Target = this.critic1.clone();
    this.critic2Target = this.critic2.clone();
  }

  get alpha(): number {
    return Math.exp(this.logAlpha);
  }

  sampleAction(state: number[], gauss: () => number = () => (Math.random() - 0.5) * 2): [number, number] {
    const mean = this.meanNet.forward(state)[0];
    const logStd = this.logStdNet.forward(state)[0];
    const std = Math.exp(Math.max(Math.min(logStd, 2), -5));

    const eps = gauss();
    const preTanh = mean + std * eps;
    const action = Math.tanh(preTanh);

    let logProb = -0.5 * (eps * eps + Math.log(2 * Math.PI)) - Math.log(std);
    logProb -= Math.log(Math.max(1 - action * action, 1e-6));
    return [action, logProb];
  }

  update(batch: Transition[]): void {
    for (const { s, a, r, sNext, done } of batch) {
      const [aNext, logPiNext] = this.sampleAction(sNext);
      const q1Next = this.critic1Target.forward([...sNext, aNext])[0];
      const q2Next = this.critic2Target.forward([...sNext, aNext])[0];
      const minQNext = Math.min(q1Next, q2Next) - this.alpha * logPiNext;
      const y = done ? r : r + this.gamma * minQNext;

      for (const critic of [this.critic1, this.critic2]) {
        const features = [...s, a];
        const qPred = critic.forward(features)[0];
        const tdError = y - qPred;
        for (let i = 0; i < features.length; i++) {
          critic.weights[0][i] += this.criticLr * tdError * features[i];
        }
      }

      // Actor更新: min(Q1,Q2) - alpha*log_pi を高める方向へ(数値勾配による簡略化)
      const [aNew, logPiNew] = this.sampleAction(s);
      const q1New = this.critic1.forward([...s, aNew])[0];
      const q2New = this.critic2.forward([...s, aNew])[0];
      const objective = Math.min(q1New, q2New) - this.alpha * logPiNew;

      const h = 1e-3;
      for (let i = 0; i < this.meanNet.weights[0].length; i++) {
        const perturbed = this.meanNet.weights.map((row) => [...row]);
        perturbed[0][i] += h;
        const meanP = perturbed[0].reduce((sum, w, k) => sum + w * s[k], 0);
        const aP = Math.tanh(meanP);
        const qP = Math.min(
          this.critic1.forward([...s, aP])[0],
          this.critic2.forward([...s, aP])[0],
        );
        const grad = (qP - objective) / h;
        this.meanNet.weights[0][i] += this.actorLr * grad;
      }

      // 温度alphaの自動調整
      const alphaLossGrad = -(logPiNew + this.targetEntropy);
      this.logAlpha += this.alphaLr * alphaLossGrad;
    }

    this.critic1Target.softUpdateFrom(this.critic1, this.tau);
    this.critic2Target.softUpdateFrom(this.critic2, this.tau);
  }
}
```
