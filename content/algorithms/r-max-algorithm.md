---
name: R-max法(R-max Algorithm)
category: 強化学習
subcategory: モデルベース・探索
complexity: O(状態数^2 × 行動数)(モデル更新・価値反復1回あたりの目安、実装依存)
summary: 未知・未経験の状態行動対を「達成可能な最大報酬が得られる」と楽観的に見なして遷移モデルを構築し、探索と活用の板挟みを理論的な最適性保証(PAC学習)付きで解決するモデルベース強化学習手法。
---

## 概要

[Q学習](/algorithms/q-learning)や[SARSA](/algorithms/sarsa)のようなモデルフリー手法は、ε-greedyのような単純なヒューリスティックで探索と活用のバランスを取るが、εの選び方に理論的な最適性の保証はなく、無駄な探索や逆に探索不足に陥ることがある。R-max法は、Brafman & Tennenholtzが2002年に提案したモデルベース強化学習手法で、「**楽観主義(Optimism in the Face of Uncertainty)**」という原則を極端な形で実装する——**まだ十分な回数試していない状態行動対は、「その先に到達可能な最大報酬`R_max`がその場で即座に得られる」と仮定して扱う**。この楽観的な仮定のもとで最適方策を計算すると、エージェントは自然に「まだよく分かっていない場所」を積極的に訪れるようになり、探索のための特別なランダム性(ε-greedyなど)を一切必要としない。R-max法の重要な貢献は、この単純な仕組みが**PAC(Probably Approximately Correct)学習**の枠組みで、多項式時間で準最適方策に収束することを理論的に証明した点にある。

## 仕組み

1. 全ての状態行動対`(s,a)`について、訪問回数`n(s,a) = 0`で初期化する。「既知(known)」と判定するために必要な最小訪問回数を`m`とする(ハイパーパラメータ)
2. 未知の状態行動対`(s,a)`(`n(s,a) < m`)については、**楽観的仮想状態**`s_max`への遷移を仮定する。この`s_max`は「自分自身に確率1で遷移し、毎ステップ最大報酬`R_max`を与え続ける」特別な吸収状態として扱う。つまり報酬モデルを `R(s,a) = R_max`、遷移モデルを `P(s_max | s, a) = 1` と仮に設定する
3. **既知**の状態行動対(`n(s,a) ≥ m`)については、実際に観測した`m`回の遷移・報酬から経験的な遷移確率`P(s'|s,a)`と平均報酬`R(s,a)`を推定し、これを真のモデルとして扱う
4. この(部分的に楽観的な仮定を含む)モデル全体に対して、[価値反復法](/algorithms/value-iteration)などで最適方策`π`を計算する
5. 計算した方策`π`に従って実際に行動し、報酬`r`と次状態`s'`を観測する
6. `n(s,a) < m` であれば、観測した`(r, s')`を記録し `n(s,a) ← n(s,a) + 1` とする。`n(s,a)`が`m`に達した瞬間、その状態行動対は「未知」から「既知」に切り替わり、モデルが更新される
7. モデルが更新されたら(未知→既知に切り替わる状態行動対が出るたびに)、再び4に戻って方策を計算し直す。モデルが変化しない限りは同じ方策`π`をそのまま使い続けてよい
8. 十分な回数繰り返すと、全ての到達可能な状態行動対が既知になり、方策は真の環境における最適方策に近づく

楽観的な仮定のもとで計算された最適方策は「まだよく知らない状態行動対の方が(仮の設定上)得に見える」ため、エージェントは自然にその状態行動対を試すように誘導される。試した結果、実際の報酬が`R_max`より低ければ「がっかりして」その知識をモデルに反映し、次はもう楽観的に見なくなる——この「試して現実を知る」というプロセス自体が、追加の探索メカニズムなしに体系的な探索を実現する。

## 特性・トレードオフ

- **理論的な最適性保証(PAC-MDP)**: R-max法は、高い確率で、多項式時間ステップ数の後には真の最適価値関数に近い(準最適な)方策を実行し続けることが証明されている。ε-greedyのような素朴な探索戦略にはこの種の保証がなく、R-max法は強化学習における探索理論の基礎的な結果の一つになっている
- **探索ヒューリスティックが不要**: ε-greedyやソフトマックス探索のような、ランダム性を注入するための調整パラメータが必要ない。探索は「未知の状態行動対を楽観的に評価する」という一貫した原則から自動的に導かれる
- **モデルベースゆえの計算コスト**: 状態行動対ごとに遷移モデル・報酬モデルを保持し、モデルが更新されるたびに(近似)価値反復を計算し直す必要があるため、状態空間が大きい問題では計算・メモリコストがモデルフリー手法より大きくなる。素朴な実装ではテーブル型のモデル保持を前提とするため、大規模な連続状態空間への直接適用は難しい
- **パラメータ`m`と`R_max`の選び方が性能を左右する**: `m`(既知と判定するための訪問回数)が小さすぎるとモデルの推定が不正確なまま活用に移ってしまい、大きすぎると探索に時間がかかりすぎる。`R_max`も環境の真の最大報酬以上の値を正しく設定する必要がある
- **使いどころ**: 状態空間が比較的小さく、探索の効率そのものが研究テーマになるような問題設定、モデルベース強化学習と探索理論(PAC学習)を結びつける教育的な題材、[ダイナQ](/algorithms/dyna-q)や[優先度スイープ](/algorithms/prioritized-sweeping)のような他のモデルベース手法と対比して「探索の仕方」の違いを学ぶ比較対象

## 実装例

```python
class RMaxAgent:
    def __init__(self, n_states: int, n_actions: int, r_max: float,
                 m: int = 5, gamma: float = 0.95, theta: float = 1e-3):
        self.n_states = n_states
        self.n_actions = n_actions
        self.r_max = r_max
        self.m = m
        self.gamma = gamma
        self.theta = theta

        self.visit_count = [[0] * n_actions for _ in range(n_states)]
        self.reward_sum = [[0.0] * n_actions for _ in range(n_states)]
        # transition_count[s][a][s'] = 遷移回数
        self.transition_count = [[dict() for _ in range(n_actions)] for _ in range(n_states)]

        self.v = [0.0] * n_states
        self.policy = [0] * n_states
        self._plan()

    def is_known(self, s: int, a: int) -> bool:
        return self.visit_count[s][a] >= self.m

    def choose_action(self, s: int) -> int:
        return self.policy[s]

    def observe(self, s: int, a: int, r: float, s_next: int) -> None:
        if self.is_known(s, a):
            return  # 既知の状態行動対はもうモデルを更新しない
        self.visit_count[s][a] += 1
        self.reward_sum[s][a] += r
        self.transition_count[s][a][s_next] = self.transition_count[s][a].get(s_next, 0) + 1

        if self.is_known(s, a):
            self._plan()  # 未知→既知に切り替わった瞬間だけ計画を立て直す

    def _plan(self, max_iters: int = 1000) -> None:
        """楽観的モデルのもとで価値反復を実行する。"""
        for _ in range(max_iters):
            delta = 0.0
            for s in range(self.n_states):
                best_q = float("-inf")
                for a in range(self.n_actions):
                    q = self._q_value(s, a)
                    if q > best_q:
                        best_q = q
                delta = max(delta, abs(best_q - self.v[s]))
                self.v[s] = best_q
            if delta < self.theta:
                break

        for s in range(self.n_states):
            self.policy[s] = max(range(self.n_actions), key=lambda a: self._q_value(s, a))

    def _q_value(self, s: int, a: int) -> float:
        if not self.is_known(s, a):
            # 未知: 楽観的仮想状態s_maxを仮定。R_maxが毎ステップ得られ続けるとみなす
            return self.r_max + self.gamma * self.r_max / (1 - self.gamma) if self.gamma < 1 else self.r_max

        n = self.visit_count[s][a]
        avg_reward = self.reward_sum[s][a] / n
        expected_next_v = 0.0
        for s_next, count in self.transition_count[s][a].items():
            expected_next_v += (count / n) * self.v[s_next]
        return avg_reward + self.gamma * expected_next_v
```

```typescript
class RMaxAgent {
  visitCount: number[][];
  rewardSum: number[][];
  transitionCount: Map<number, number>[][];
  v: number[];
  policy: number[];

  constructor(
    private nStates: number,
    private nActions: number,
    private rMax: number,
    private m = 5,
    private gamma = 0.95,
    private theta = 1e-3,
  ) {
    this.visitCount = Array.from({ length: nStates }, () => new Array(nActions).fill(0));
    this.rewardSum = Array.from({ length: nStates }, () => new Array(nActions).fill(0));
    this.transitionCount = Array.from({ length: nStates }, () =>
      Array.from({ length: nActions }, () => new Map<number, number>()),
    );
    this.v = new Array(nStates).fill(0);
    this.policy = new Array(nStates).fill(0);
    this.plan();
  }

  isKnown(s: number, a: number): boolean {
    return this.visitCount[s][a] >= this.m;
  }

  chooseAction(s: number): number {
    return this.policy[s];
  }

  observe(s: number, a: number, r: number, sNext: number): void {
    if (this.isKnown(s, a)) return;
    this.visitCount[s][a] += 1;
    this.rewardSum[s][a] += r;
    const map = this.transitionCount[s][a];
    map.set(sNext, (map.get(sNext) ?? 0) + 1);

    if (this.isKnown(s, a)) {
      this.plan();
    }
  }

  private qValue(s: number, a: number): number {
    if (!this.isKnown(s, a)) {
      return this.gamma < 1 ? this.rMax + (this.gamma * this.rMax) / (1 - this.gamma) : this.rMax;
    }
    const n = this.visitCount[s][a];
    const avgReward = this.rewardSum[s][a] / n;
    let expectedNextV = 0;
    for (const [sNext, count] of this.transitionCount[s][a]) {
      expectedNextV += (count / n) * this.v[sNext];
    }
    return avgReward + this.gamma * expectedNextV;
  }

  private plan(maxIters = 1000): void {
    for (let iter = 0; iter < maxIters; iter++) {
      let delta = 0;
      for (let s = 0; s < this.nStates; s++) {
        let bestQ = -Infinity;
        for (let a = 0; a < this.nActions; a++) {
          const q = this.qValue(s, a);
          if (q > bestQ) bestQ = q;
        }
        delta = Math.max(delta, Math.abs(bestQ - this.v[s]));
        this.v[s] = bestQ;
      }
      if (delta < this.theta) break;
    }

    for (let s = 0; s < this.nStates; s++) {
      let best = 0;
      let bestQ = this.qValue(s, 0);
      for (let a = 1; a < this.nActions; a++) {
        const q = this.qValue(s, a);
        if (q > bestQ) {
          bestQ = q;
          best = a;
        }
      }
      this.policy[s] = best;
    }
  }
}
```
