---
name: A3C(Asynchronous Advantage Actor-Critic)
category: 強化学習
subcategory: 方策勾配法
complexity: O(1)(ワーカー1体・1ステップの更新あたり、ワーカー数分だけ並列に発生)
summary: 複数のワーカーが並列に異なる環境のコピーで経験を集め、非同期にグローバルなネットワークを更新することで、リプレイバッファなしにオンポリシーのデータ相関を解消するActor-Critic手法。
---

## 概要

[DQN](/algorithms/dqn-deep-q-network)が経験再生によって時系列データの相関を断ち切ったのに対し、方策勾配法は本質的にオンポリシー([SARSA](/algorithms/sarsa)と同様、集めたデータをそのまま使わないと理論的な整合性が崩れやすい)であるため、同じ発想のリプレイバッファをそのまま使いにくいという課題があった。A3C(Asynchronous Advantage Actor-Critic)は、2016年にDeepMindが提案した手法で、この課題に別の角度から取り組む——**単一の環境で経験を貯めるのではなく、複数のワーカー(スレッド)がそれぞれ独立した環境のコピーの中で並行してエピソードを進め、非同期にグローバルなネットワークのパラメータを更新する**。同時に多数の異なる状況を経験することで、1本の軌跡だけでは避けられない時系列相関を、複数の独立した軌跡を混ぜ合わせることで解消する。各ワーカーは[Actor-Critic法](/algorithms/actor-critic)と同様にActor(方策)とCriticの両方を持ち、アドバンテージ`A(s,a) = Q(s,a) - V(s)`を学習信号として使う点は、後に同期版として整理される[A2C](/algorithms/a2c)と共通している。

## 仕組み

1. パラメータ`θ`(Actor)・`w`(Critic、あるいは共有ネットワークとして`θ`に統合されることも多い)を持つ**グローバルなネットワーク**を1つ用意する
2. グローバルネットワークのパラメータをコピーした**ローカルネットワーク**を持つワーカーを複数(CPUコア数程度)並列に起動し、それぞれ独立した環境のインスタンスと相互作用させる
3. 各ワーカーは、現在のローカルネットワークのパラメータを使って一定ステップ数(`t_max`、例えば5〜20ステップ)分だけ環境を進め、軌跡`(s_t,a_t,r_t)`を集める(エピソードの途中で打ち切ってよい)
4. 集めた軌跡について、[A2C](/algorithms/a2c)と同様に各時刻の**アドバンテージ**を計算する。1ステップのTD誤差ではなく、`t_max`ステップ分の割引報酬和とCriticのブートストラップを組み合わせたN-step収益を使うのが典型的:
   `A_t = (Σ_{k=0}^{n-1} γ^k r_{t+k}) + γ^n・V_w(s_{t+n}) - V_w(s_t)`
5. アドバンテージを使ってActorとCriticそれぞれの**勾配をローカルネットワーク上で計算する**(グローバルネットワークのパラメータではなく、その時点でワーカーが使っていたローカルのパラメータに対する勾配であることに注意)
6. 計算した勾配を**グローバルネットワークに非同期に(ロックなしで)適用する**。複数のワーカーがほぼ同時にグローバルパラメータを更新することがあり、他のワーカーの更新を待たない(ここが「非同期」と呼ばれる所以)
7. 更新後、ワーカーは最新のグローバルパラメータを自分のローカルネットワークに再度コピーし、3に戻って次のロールアウトを開始する。全ワーカーがこれを独立に繰り返す

## 特性・トレードオフ

- **非同期更新によるデータ相関の解消**: 複数の環境インスタンスが同時に異なる状況を経験しているため、グローバルネットワークに届く勾配は、単一の環境の時系列相関に強く依存しない。これはDQNの経験再生と同じ問題を、リプレイバッファを使わずに解決する別解であり、オンポリシーの方策勾配法とリプレイバッファの相性の悪さを回避できる
- **「非同期」であることの功罪**: 複数のワーカーが古いパラメータに基づいて計算した勾配を、ロックなしでグローバルネットワークに適用する(Hogwild!スタイルの更新)ため、ある勾配が計算された時点と適用される時点でグローバルパラメータが他のワーカーによって既に変わっている「非同一性(staleness)」が生じる。実用上はこれが大きな問題になることは少ないとされるが、更新の再現性やデバッグのしやすさという点ではGPUでの同期バッチ処理に劣る
- **A2Cへの整理**: 後にOpenAIの実装・報告により、非同期性そのものは性能向上に本質的な寄与をしておらず、複数環境のロールアウトを**同期的に**まとめてバッチ更新する[A2C](/algorithms/a2c)でも同等以上の性能が得られることが示された。A2CはGPU上でのバッチ処理と相性が良く実装も単純なため、以後はA3Cよりも同期版のA2Cが標準的な実装として選ばれることが多くなった
- **使いどころ**: CPUコアを多数使える環境でGPUバッチ処理よりもCPU並列のスループットを活かしたい場合、経験再生を使いにくいオンポリシー手法において多様なデータを確保したい場合。教育的には、[A2C](/algorithms/a2c)がなぜ「Aが2つ(Advantage, Actor-Critic)」の名前で同期版として整理されたのかを理解するための歴史的な前提として位置づけられる

## 実装例

グローバルパラメータを共有し、各ワーカーがロールアウトを集めてアドバンテージで勾配を計算し、ロックなしで直接グローバルパラメータへ加算する非同期更新の骨格を示す(実運用ではマルチプロセス・共有メモリでの実装が必要だが、ここでは非同期更新の考え方が伝わる単純化した形にしている)。

```python
import math
import random
import threading

def softmax(scores: list[float]) -> list[float]:
    m = max(scores)
    exps = [math.exp(s - m) for s in scores]
    total = sum(exps)
    return [e / total for e in exps]


class GlobalNetwork:
    """Actor(theta)とCritic(v)のグローバルパラメータ。複数ワーカーから非同期に更新される。"""

    def __init__(self, n_states: int, n_actions: int):
        self.theta = [[0.0] * n_actions for _ in range(n_states)]
        self.v = [0.0] * n_states
        self.lock = threading.Lock()  # 実運用では省略/緩和されることもある「非同期」の名の通り

    def snapshot(self) -> tuple[list[list[float]], list[float]]:
        with self.lock:
            return [row[:] for row in self.theta], self.v[:]

    def apply_gradients(
        self,
        theta_grad: list[list[float]],
        v_grad: list[float],
        alpha: float,
        beta: float,
    ) -> None:
        # ロックの粒度を最小限にし、他のワーカーの更新をブロックしないようにする
        with self.lock:
            for s, row in enumerate(theta_grad):
                for a, g in enumerate(row):
                    self.theta[s][a] += alpha * g
            for s, g in enumerate(v_grad):
                self.v[s] += beta * g


def worker_rollout(
    global_net: GlobalNetwork,
    env_step,  # (state, action) -> (reward, next_state, done) を返す環境シミュレータ
    start_state: int,
    n_actions: int,
    t_max: int = 5,
    gamma: float = 0.99,
) -> None:
    theta, v = global_net.snapshot()  # ローカルネットワークとしてグローバルパラメータをコピー
    state = start_state
    trajectory: list[tuple[int, int, float]] = []

    for _ in range(t_max):
        probs = softmax(theta[state])
        action = random.choices(range(n_actions), weights=probs)[0]
        reward, next_state, done = env_step(state, action)
        trajectory.append((state, action, reward))
        state = next_state
        if done:
            break

    bootstrap = 0.0 if done else v[state]
    theta_grad = [[0.0] * n_actions for _ in range(len(theta))]
    v_grad = [0.0] * len(v)

    g = bootstrap
    for s, a, r in reversed(trajectory):
        g = r + gamma * g
        advantage = g - v[s]
        v_grad[s] += advantage
        probs = softmax(theta[s])
        for act in range(n_actions):
            grad_log_pi = (1.0 if act == a else 0.0) - probs[act]
            theta_grad[s][act] += advantage * grad_log_pi

    global_net.apply_gradients(theta_grad, v_grad, alpha=0.1, beta=0.1)
```

```typescript
function softmax(scores: number[]): number[] {
  const m = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - m));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / total);
}

function sampleFromProbs(probs: number[], rand: () => number = Math.random): number {
  const r = rand();
  let cumulative = 0;
  for (let i = 0; i < probs.length; i++) {
    cumulative += probs[i];
    if (r < cumulative) return i;
  }
  return probs.length - 1;
}

class GlobalNetwork {
  // Actor(theta)とCritic(v)のグローバルパラメータ。複数ワーカーから非同期に更新される想定。
  theta: number[][];
  v: number[];

  constructor(nStates: number, nActions: number) {
    this.theta = Array.from({ length: nStates }, () => new Array(nActions).fill(0));
    this.v = new Array(nStates).fill(0);
  }

  snapshot(): { theta: number[][]; v: number[] } {
    return { theta: this.theta.map((row) => [...row]), v: [...this.v] };
  }

  applyGradients(thetaGrad: number[][], vGrad: number[], alpha: number, beta: number): void {
    for (let s = 0; s < thetaGrad.length; s++) {
      for (let a = 0; a < thetaGrad[s].length; a++) {
        this.theta[s][a] += alpha * thetaGrad[s][a];
      }
    }
    for (let s = 0; s < vGrad.length; s++) {
      this.v[s] += beta * vGrad[s];
    }
  }
}

type EnvStep = (state: number, action: number) => { reward: number; nextState: number; done: boolean };

function workerRollout(
  globalNet: GlobalNetwork,
  envStep: EnvStep,
  startState: number,
  nActions: number,
  tMax = 5,
  gamma = 0.99,
): void {
  const { theta, v } = globalNet.snapshot(); // ローカルネットワークとしてグローバルパラメータをコピー
  let state = startState;
  const trajectory: [number, number, number][] = [];
  let done = false;

  for (let i = 0; i < tMax; i++) {
    const probs = softmax(theta[state]);
    const action = sampleFromProbs(probs);
    const step = envStep(state, action);
    trajectory.push([state, action, step.reward]);
    state = step.nextState;
    done = step.done;
    if (done) break;
  }

  const bootstrap = done ? 0 : v[state];
  const thetaGrad = theta.map((row) => new Array(row.length).fill(0));
  const vGrad = new Array(v.length).fill(0);

  let g = bootstrap;
  for (let i = trajectory.length - 1; i >= 0; i--) {
    const [s, a, r] = trajectory[i];
    g = r + gamma * g;
    const advantage = g - v[s];
    vGrad[s] += advantage;
    const probs = softmax(theta[s]);
    for (let act = 0; act < nActions; act++) {
      const gradLogPi = (act === a ? 1 : 0) - probs[act];
      thetaGrad[s][act] += advantage * gradLogPi;
    }
  }

  globalNet.applyGradients(thetaGrad, vGrad, 0.1, 0.1);
}
```
