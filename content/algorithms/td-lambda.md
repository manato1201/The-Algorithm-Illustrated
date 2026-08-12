---
name: TD(λ)学習(適格度トレース, Eligibility Trace)
category: 強化学習
subcategory: 価値ベース手法
complexity: O(1)(1ステップの更新あたり、状態数に対しては全状態のトレース更新でO(状態数))
summary: あらゆる先読み長のn-step収益を減衰率λで指数的に重み付けして1つのターゲットに統合し、適格度トレースという逆方向の記憶機構によって、TD(0)並みの効率でモンテカルロ法に迫る性能を実現する統一的な学習手法。
---

## 概要

[N-step TD学習](/algorithms/n-step-td-learning)は、先読みステップ数`n`を1つ選ぶことでTD(0)とモンテカルロ法の間のバイアス・分散トレードオフを調整した。しかし「最適なnはいくつか」は問題ごとに異なり、事前に決め打つのは不自然でもある。TD(λ)学習は、**特定のnを1つ選ぶのではなく、あらゆるn(n=1,2,3,...)のn-step収益を、`λ^(n-1)`という指数的に減衰する重みで加重平均して1つのターゲット(λ収益)にまとめてしまう**という発想に基づく。λ=0のときこの加重平均は事実上n=1の項だけが残りTD(0)に一致し、λ=1のときは全てのnが減衰なしで効いてモンテカルロ法に一致する。TD(λ)はさらに、この「未来の全てのnを混ぜる」という前向きな定義を、**適格度トレース(eligibility trace)**という「過去に訪れた状態の記憶を指数的に減衰させながら保持する」逆向きの仕組みで等価に実装できることを示し、1ステップごとに完結するオンライン更新を可能にした。

## 仕組み

**前向きの定義(λ収益)**

1. n-step収益`G_t^(n)`を[N-step TD学習](/algorithms/n-step-td-learning)と同様に定義する
2. **λ収益**を、全てのnについての加重平均として定義する:
   `G_t^λ = (1-λ)・Σ_{n=1}^∞ λ^(n-1)・G_t^(n)`
   重み`(1-λ)・λ^(n-1)`は`n`が増えるごとに幾何級数的に小さくなり、全ての重みの総和は1になるよう正規化されている
3. 更新式は `V(s_t) ← V(s_t) + α・[G_t^λ - V(s_t)]`

この定義は直感的だが、`G_t^λ`を計算するには未来の報酬を全て見る必要があり、そのままではオンラインに(1ステップずつ)実装できない。そこで実用上は以下の**後ろ向きの定義**を使う。

**後ろ向きの定義(適格度トレース、TD(0)の逐次更新に近い形)**

1. 全ての状態`s`について**適格度トレース**`e(s)`を0で初期化する
2. 各ステップで、まず現在の状態`s_t`のトレースを1増やす(累積型トレースの場合): `e(s_t) ← e(s_t) + 1`
3. 通常のTD誤差を計算する: `δ_t = r_{t+1} + γ・V(s_{t+1}) - V(s_t)`
4. **全ての状態**`s`について、TD誤差とそのトレースの積で価値を更新する: `V(s) ← V(s) + α・δ_t・e(s)`
5. **全ての状態**についてトレースを減衰させる: `e(s) ← γ・λ・e(s)`
6. 次のステップに進む

トレース`e(s)`は「その状態が最近どれだけ頻繁に・最近訪れられたか」を表し、`γ・λ`という減衰率で指数的に忘却されていく。TD誤差`δ_t`が発生すると、現在の状態だけでなく、**過去に訪れた全ての状態にトレースの大きさに応じて按分された形で**価値の修正が伝播する。これにより「未来の報酬を待つ」前向きの定義と数学的に等価な更新を、1ステップごとに完結する形で実現できる。

## 特性・トレードオフ

- **TD(0)とモンテカルロ法を統一する連続パラメータ**: λ=0でTD(0)(1ステップ先だけを見る、バイアスは大きいが分散は小さい)、λ=1でモンテカルロ法相当(バイアスはないが分散が大きい)に一致し、その間の任意の値でバイアスと分散を連続的に調整できる。多くの環境で0<λ<1の中間的な値が最良の学習速度を与えることが経験的に知られている
- **[N-step TD学習](/algorithms/n-step-td-learning)との違い**: n-step法は「特定の1つのn」だけを使うのに対し、TD(λ)は「全てのnを同時に、指数重みで」使う。適格度トレースによる後ろ向きの実装は、この「全てのnを混ぜる」計算を、追加のバッファを持たずに1ステップごとのオンライン更新だけで実現できる点が実装上の大きな利点である
- **報酬の逆伝播が速い**: トレースを使うと、報酬が発生した時点で、その報酬の情報が「最近訪れた全ての状態」に一度に(トレースの重みに応じて)伝わる。TD(0)では1エピソードごとに1ステップずつしか価値の情報が伝わらないのに対し、TD(λ)(特にλが1に近いとき)は情報伝播が大幅に速く、特に報酬が疎な環境で学習の立ち上がりが速くなる
- **Q学習・SARSAへの拡張**: 適格度トレースの考え方はV(s)だけでなくQ(s,a)にも適用でき、SARSA(λ)やQ(λ)として拡張される。ただしQ学習にトレースを組み合わせる場合、探索的な(非貪欲な)行動を取った時点でトレースをリセットする必要があるなど、off-policyとの整合性に注意が必要になる
- **使いどころ**: 報酬が疎で、TD(0)では学習が遅すぎる環境、モンテカルロ法では分散が大きすぎる長いエピソードのタスク、[N-step TD学習](/algorithms/n-step-td-learning)のnを個別に選ぶ手間を避けたい場合、古典的な強化学習の理論(前向き/後ろ向きの等価性)を学ぶ教材

## 実装例

```python
class TDLambdaAgent:
    def __init__(self, n_states: int, alpha: float = 0.1, gamma: float = 0.95, lam: float = 0.8):
        self.v = [0.0] * n_states
        self.e = [0.0] * n_states  # 適格度トレース
        self.alpha = alpha
        self.gamma = gamma
        self.lam = lam

    def start_episode(self) -> None:
        self.e = [0.0] * len(self.v)

    def update(self, state: int, reward: float, next_state: int, done: bool) -> None:
        next_v = 0.0 if done else self.v[next_state]
        td_error = reward + self.gamma * next_v - self.v[state]

        # 現在の状態のトレースを増やす(累積型トレース)
        self.e[state] += 1.0

        # 全状態をTD誤差とトレースの積で更新し、トレースを減衰させる
        for s in range(len(self.v)):
            if self.e[s] == 0.0:
                continue
            self.v[s] += self.alpha * td_error * self.e[s]
            self.e[s] *= self.gamma * self.lam
```

```typescript
class TDLambdaAgent {
  v: number[];
  private e: number[]; // 適格度トレース

  constructor(
    nStates: number,
    private alpha = 0.1,
    private gamma = 0.95,
    private lam = 0.8,
  ) {
    this.v = new Array(nStates).fill(0);
    this.e = new Array(nStates).fill(0);
  }

  startEpisode(): void {
    this.e = new Array(this.v.length).fill(0);
  }

  update(
    state: number,
    reward: number,
    nextState: number,
    done: boolean,
  ): void {
    const nextV = done ? 0 : this.v[nextState];
    const tdError = reward + this.gamma * nextV - this.v[state];

    // 現在の状態のトレースを増やす(累積型トレース)
    this.e[state] += 1;

    // 全状態をTD誤差とトレースの積で更新し、トレースを減衰させる
    for (let s = 0; s < this.v.length; s++) {
      if (this.e[s] === 0) continue;
      this.v[s] += this.alpha * tdError * this.e[s];
      this.e[s] *= this.gamma * this.lam;
    }
  }
}
```
