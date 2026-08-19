---
name: モンテカルロ制御法(強化学習)(Monte Carlo Control)
category: 強化学習
subcategory: 価値ベース手法
complexity: O(1)(1ステップの更新あたり、ただし更新自体はエピソード終了後にまとめて発生)
summary: 1エピソードが終わるまで待ち、実際に得られた収益(リターン)の平均でQ値を推定することで、ブートストラップに頼らず偏りのない価値推定から最適方策を学ぶ強化学習手法。
---

## 概要

[Q学習](/algorithms/q-learning)や[SARSA](/algorithms/sarsa)は「1ステップ進むたびに」Q値を更新するTD(Temporal Difference)法であり、更新のたびに「次状態のQ値の現在の推定値」を使って目標値を組み立てる——これを**ブートストラップ**と呼ぶ。ブートストラップは学習を素早く進められる一方、まだ不正確な推定値を使って別の推定値を更新するため、体系的な偏り(バイアス)が入り込む余地がある。モンテカルロ制御法はこれと対照的なアプローチを取る。エピソードが終わるまで一切Q値を更新せず、**エピソード終了後に、実際に観測された報酬列から計算した本物の収益(リターン)**`G_t = r_t + γr_{t+1} + γ^2 r_{t+2} + ...`を使ってQ値を更新する。推定値を推定値で置き換えるのではなく、実際に得られた結果の平均を取るという素朴な発想であり、モデルフリー強化学習の中でも最も直接的な価値推定の方法の一つである。

## 仕組み

1. Q値のテーブル`Q(s,a)`と、各状態行動対ごとの収益を集計するためのリスト(またはカウンタ)を初期化する
2. 現在の方策(通常はε-greedy)に従って1エピソード分を最後まで実行し、`(s_0,a_0,r_1,s_1,a_1,r_2,...,s_T)`という状態・行動・報酬の系列を記録する。**エピソード全体が終わるまでQ値は一切更新しない**のが、1ステップごとに更新するTD法との最大の違い
3. エピソード終了後、系列を後ろから辿りながら各時刻`t`について収益`G_t = r_{t+1} + γ・G_{t+1}`を計算する(末尾から漸化式で計算すると効率的)
4. 各状態行動対`(s_t, a_t)`について、そのエピソードで得られた収益`G_t`を記録する。**First-visit方式**(そのエピソードで`(s_t,a_t)`が最初に現れた時点の`G_t`だけを使う)と、**Every-visit方式**(現れるたびに全て使う)の2通りの流儀がある
5. `Q(s,a)`を、これまで観測した全エピソードにおける`(s,a)`の収益の**平均**として更新する:
   `Q(s,a) ← Q(s,a) + α・[G_t - Q(s,a)]`(逐次平均を取る形。`α`を訪問回数の逆数`1/N(s,a)`にすれば単純平均、固定値にすれば直近の経験を重視する移動平均になる)
6. 更新したQ値を使って方策をε-greedyに改善し(**方策改善**)、2に戻って次のエピソードを実行する。方策の評価(2〜5)と改善(6)を交互に繰り返す**GPI(Generalized Policy Iteration)**の枠組みに従い、十分なエピソード数と探索のもとでQ値は最適行動価値関数に収束する

## 特性・トレードオフ

- **ブートストラップを使わないため偏りがない**: TD法は「まだ学習途中の推定値」を目標値の計算に使うためバイアスが入り込むが、モンテカルロ法は実際に観測された報酬の系列だけから収益を計算するため、統計的に不偏な推定量になる。その代わり、1エピソードの報酬列全体のばらつきをそのまま引き継ぐため**分散が大きくなりやすい**——これはTD法とは逆の弱点である
- **エピソードが終わるまで学習できない**: 更新にはエピソード全体の収益が必要なため、エピソードが非常に長い、あるいは終わりのない(継続的な)タスクにはそのままでは適用しにくい。[Q学習](/algorithms/q-learning)や[SARSA](/algorithms/sarsa)のように1ステップごとに逐次学習することはできず、学習の反映が遅れる
- **探索の維持が必須**: モンテカルロ制御が最適方策に収束するには、全ての状態行動対が無限回訪問される必要がある(Exploring Starts条件、またはε-greedyのような継続的な探索)。訪問されない状態行動対の収益は永遠に更新されないため、探索が不十分だと局所的に偏った方策に留まってしまう
- **使いどころ**: エピソードが短く区切られたタスク(ボードゲームの1局、単発のシミュレーション)、ブートストラップによるバイアスを避けたい場面、TD法とのバイアス・分散トレードオフを学ぶ教育的な題材。TD法とモンテカルロ法を組み合わせて両者の利点を折衷する[TD(λ)](/algorithms/td-lambda)や[N-step TD学習](/algorithms/n-step-td-learning)は、この対比の延長線上にある発展形

## 実装例

```python
import random
from collections import defaultdict

class MonteCarloControlAgent:
    def __init__(self, n_actions: int, gamma: float = 0.95, epsilon: float = 0.1):
        self.q: dict[tuple, list[float]] = defaultdict(lambda: [0.0] * n_actions)
        self.visit_counts: dict[tuple, list[int]] = defaultdict(lambda: [0] * n_actions)
        self.n_actions = n_actions
        self.gamma = gamma
        self.epsilon = epsilon

    def choose_action(self, state: tuple) -> int:
        if random.random() < self.epsilon:
            return random.randrange(self.n_actions)
        return max(range(self.n_actions), key=lambda a: self.q[state][a])

    def update_from_episode(self, episode: list[tuple]) -> None:
        """episode: [(state, action, reward), ...] 最後まで実行した1エピソード分"""
        g = 0.0
        returns_seen: set[tuple] = set()
        # 後ろから辿って収益Gを漸化式で計算(first-visit方式)
        for state, action, reward in reversed(episode):
            g = reward + self.gamma * g
            key = (state, action)
            if key in returns_seen:
                continue  # そのエピソード内で2回目以降の出現は無視(first-visit)
            returns_seen.add(key)
            self.visit_counts[state][action] += 1
            n = self.visit_counts[state][action]
            # 逐次平均: Q ← Q + (1/N)・(G - Q)
            self.q[state][action] += (g - self.q[state][action]) / n
```

```typescript
type Transition = { state: string; action: number; reward: number };

class MonteCarloControlAgent {
  private q = new Map<string, number[]>();
  private visitCounts = new Map<string, number[]>();

  constructor(
    private nActions: number,
    private gamma = 0.95,
    private epsilon = 0.1,
  ) {}

  private qRow(state: string): number[] {
    if (!this.q.has(state)) this.q.set(state, new Array(this.nActions).fill(0));
    return this.q.get(state)!;
  }

  private visitRow(state: string): number[] {
    if (!this.visitCounts.has(state))
      this.visitCounts.set(state, new Array(this.nActions).fill(0));
    return this.visitCounts.get(state)!;
  }

  chooseAction(state: string, rand: () => number = Math.random): number {
    if (rand() < this.epsilon) return Math.floor(rand() * this.nActions);
    const row = this.qRow(state);
    let best = 0;
    for (let a = 1; a < this.nActions; a++) if (row[a] > row[best]) best = a;
    return best;
  }

  updateFromEpisode(episode: Transition[]): void {
    let g = 0;
    const returnsSeen = new Set<string>();
    // 後ろから辿って収益Gを漸化式で計算(first-visit方式)
    for (let i = episode.length - 1; i >= 0; i--) {
      const { state, action, reward } = episode[i];
      g = reward + this.gamma * g;
      const key = `${state}:${action}`;
      if (returnsSeen.has(key)) continue;
      returnsSeen.add(key);

      const visits = this.visitRow(state);
      visits[action] += 1;
      const n = visits[action];
      const row = this.qRow(state);
      row[action] += (g - row[action]) / n;
    }
  }
}
```
