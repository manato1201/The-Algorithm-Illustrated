---
name: Hindsight Experience Replay(HER)
category: 強化学習
subcategory: 価値ベース手法
complexity: O(1)(1経験あたりの追加ラベリングコスト、既存のoff-policy手法の学習コストは別途)
summary: 目標達成に失敗したエピソードでも「実際に到達した状態」を事後的に目標だったことにして経験を再ラベリングすることで、報酬がほとんど得られない疎な報酬環境でも学習信号を確保する経験再生の拡張手法。
---

## 概要

ロボットアームを目標位置まで動かす、といった目標到達タスムでは、「目標にちょうど到達できたら報酬+1、それ以外は報酬0」という**疎な報酬**(sparse reward)が最も自然で扱いやすい報酬設計になることが多い。しかし学習の初期段階では、ランダムに近い方策がたまたま目標にぴったり到達する確率は極めて低く、[DQN](/algorithms/dqn-deep-q-network)や[DDPG](/algorithms/ddpg)のリプレイバッファには「報酬0だった失敗経験」ばかりが溜まり、学習信号がほとんど得られない。Hindsight Experience Replay(HER)は、OpenAIが2017年に提案したシンプルだが強力なアイデアで、「目標には到達できなかったが、代わりに別のどこかには到達した」という**事後的な視点(hindsight)**に着目する。失敗したエピソードであっても、「実際にエージェントが到達した状態」を後から「これが最初から目標だったことにする」と再ラベリングすれば、そのエピソードは目標達成に成功した経験として扱える。この再ラベリングされた経験を通常の経験と一緒にリプレイバッファに追加することで、報酬がほとんど得られない疎な報酬環境でも、既存のoff-policy手法(DQN・DDPGなど)がそのまま効率よく学習できるようになる。

## 仕組み

1. **目標条件付き方策・価値関数を前提とする**: HERを使うには、方策・Q関数が現在の状態`s`だけでなく目標`g`も入力に取る形`π(s,g)`・`Q(s,a,g)`である必要がある(Universal Value Function Approximatorsの考え方)。報酬は「目標`g`に到達したら+1(または0)、それ以外は-1(または0)」のような疎な関数`r(s,a,g)`として設計される
2. **通常通りエピソードを収集する**: 方策`π`に従って行動し、目標`g`に向かって`(s₀,a₀,r₀,s₁), (s₁,a₁,r₁,s₂), ..., (s_{T-1},a_{T-1},r_{T-1},s_T)`という遷移の系列(1エピソード)を集める。多くの場合、このエピソードは目標`g`に到達できず、報酬は全ステップで「未達成」を意味する値のままになる
3. **通常の経験をそのままリプレイバッファに追加する**: 元の目標`g`のままの経験`(s_t, a_t, r_t, s_{t+1}, g)`を通常通りバッファに保存する(これは従来の[DQN](/algorithms/dqn-deep-q-network)・[DDPG](/algorithms/ddpg)の経験再生と同じ)
4. **事後的な再ラベリング(hindsight relabeling)**: 同じエピソードについて、実際に到達した状態(例えばエピソード終端の状態`s_T`、あるいはエピソード中の任意の状態`s_k`(`k > t`))を**新しい目標**`g'`として選び直し、報酬を`g'`に対して再計算した経験`(s_t, a_t, r'_t, s_{t+1}, g')`を作る。`g' = s_{t+1}`(遷移直後の状態自体を目標にする)のように選べば、その経験は必ず目標達成の報酬が得られる。この再ラベリングされた経験も同じくリプレイバッファに追加する
5. **目標のサンプリング戦略**: どの状態を「事後的な目標」に選ぶかにはいくつかの戦略がある——エピソードの最終状態を使う`final`戦略、エピソード中からランダムに複数選ぶ`future`戦略(遷移より後の時刻からサンプルする、最も広く使われる)、エピソード全体からランダムに選ぶ`episode`戦略など。1つの実際の遷移につき、元の目標に加えて複数の再ラベリングされた目標を追加するのが一般的である
6. **通常のoff-policy学習をそのまま実行する**: こうして水増しされたリプレイバッファに対して、[DQN](/algorithms/dqn-deep-q-network)や[DDPG](/algorithms/ddpg)の通常の更新則(ターゲットネットワークを使ったTD誤差の最小化)をそのまま適用する。HER自体は新しい学習アルゴリズムではなく、既存のoff-policy手法に「どんな経験をリプレイバッファに入れるか」という前処理を追加するだけの、アルゴリズムに依存しない汎用的な拡張である

## 特性・トレードオフ

- **疎な報酬環境での学習効率を劇的に改善する**: 再ラベリングによって「常に何かしらの目標には到達した」という情報を持つ経験を大量に生成できるため、報酬整形(reward shaping、目標に近づくほど報酬を与えるような人手の工夫)なしで、疎な0/1報酬のままでも学習が進むようになる。ロボット操作タスクなど、密な報酬関数を設計するのが難しい・不自然になりがちな問題でHERの価値が最も顕著に現れる
- **off-policyアルゴリズムが前提**: HERは「集めた経験を後から目標を変えて再利用する」という発想のため、経験再生バッファを使うoff-policy手法([DQN](/algorithms/dqn-deep-q-network)・[DDPG](/algorithms/ddpg)・[SAC](/algorithms/sac-soft-actor-critic)など)と組み合わせて初めて機能する。収集したデータをすぐ捨ててしまうon-policy手法([PPO](/algorithms/ppo)や[A2C](/algorithms/a2c)など)には基本的には適用できない
- **目標条件付き設計が前提となる**: HERを使うには、方策・価値関数が目標`g`を明示的な入力として受け取る目標条件付きの設計(multi-goal RL)になっている必要があり、単一の固定目標しか持たない通常の強化学習の問題設定にはそのままでは適用できない。逆に言えば、複数の目標を扱う設計にさえしておけば、報酬設計の負担を大きく減らせる
- **「たまたま良い行動をした」ことと「意図した目標に到達した」ことの違い**: 再ラベリングされた経験は「エージェントが実際に到達した状態への到達の仕方」を学習するのに役立つが、それ自体は「元々指示された目標に到達する能力」を直接教えるものではない。方策が様々な目標に対して汎化して学習することで、結果的に元の目標への到達能力も向上する、という間接的な効果に依存している
- **使いどころ**: ロボットアームの位置決め・把持タスクのような疎な報酬しか自然に定義できない目標到達問題、複数の目標を扱うマルチゴール強化学習、報酬整形の手作業を避けたい・報酬関数の設計ミスによるバイアスを避けたい場面、[DQN](/algorithms/dqn-deep-q-network)や[DDPG](/algorithms/ddpg)など既存のoff-policy手法に低コストで組み込める拡張技法を探している場合

## 実装例

グリッド上のエージェントが目標セルに到達するタスクを想定し、通常のリプレイバッファへの追加に加えて、エピソード終端の状態を事後的な目標として再ラベリングした経験を追加する`future`戦略の簡略版を実装する。

```python
import random
from collections import deque
from dataclasses import dataclass


@dataclass
class Transition:
    state: tuple[int, int]
    action: int
    next_state: tuple[int, int]
    goal: tuple[int, int]
    reward: float
    done: bool


def compute_reward(achieved_state: tuple[int, int], goal: tuple[int, int]) -> float:
    """目標に到達していれば0、していなければ-1という疎な報酬。"""
    return 0.0 if achieved_state == goal else -1.0


class HindsightReplayBuffer:
    def __init__(self, capacity: int = 100000, k_future: int = 4):
        self.buffer: deque[Transition] = deque(maxlen=capacity)
        self.k_future = k_future  # 1遷移あたり追加する再ラベリング経験の数

    def store_episode(self, episode: list[tuple], original_goal: tuple[int, int]) -> None:
        """episode: [(state, action, next_state), ...] という1エピソード分の遷移列。"""
        n = len(episode)
        for t, (s, a, s_next) in enumerate(episode):
            # 1. 元の目標のままの通常の経験を追加
            r = compute_reward(s_next, original_goal)
            done = r == 0.0
            self.buffer.append(Transition(s, a, s_next, original_goal, r, done))

            # 2. hindsight再ラベリング(future戦略): tより後の時刻からk個サンプルし、
            #    その時刻の到達状態を「最初から目標だったこと」にする
            future_indices = [i for i in range(t + 1, n)]
            if not future_indices:
                continue
            sampled = random.sample(future_indices, min(self.k_future, len(future_indices)))
            for future_t in sampled:
                new_goal = episode[future_t][2]  # future_t時点でのnext_state
                r_relabel = compute_reward(s_next, new_goal)
                done_relabel = r_relabel == 0.0
                self.buffer.append(Transition(s, a, s_next, new_goal, r_relabel, done_relabel))

    def sample(self, batch_size: int) -> list[Transition]:
        return random.sample(self.buffer, min(batch_size, len(self.buffer)))

    def __len__(self) -> int:
        return len(self.buffer)


# 使用例: 目標(5,5)に到達できなかった5ステップのエピソードでも、
# hindsight再ラベリングにより「目標達成」の学習信号を持つ経験が複数生成される
episode = [
    ((0, 0), 0, (1, 0)),
    ((1, 0), 1, (1, 1)),
    ((1, 1), 0, (2, 1)),
    ((2, 1), 1, (2, 2)),
    ((2, 2), 0, (3, 2)),
]
buffer = HindsightReplayBuffer(k_future=2)
buffer.store_episode(episode, original_goal=(5, 5))
```

```typescript
interface Transition {
  state: [number, number];
  action: number;
  nextState: [number, number];
  goal: [number, number];
  reward: number;
  done: boolean;
}

function computeReward(achievedState: [number, number], goal: [number, number]): number {
  // 目標に到達していれば0、していなければ-1という疎な報酬
  return achievedState[0] === goal[0] && achievedState[1] === goal[1] ? 0.0 : -1.0;
}

class HindsightReplayBuffer {
  private buffer: Transition[] = [];

  constructor(
    private capacity: number = 100000,
    private kFuture: number = 4 // 1遷移あたり追加する再ラベリング経験の数
  ) {}

  private push(t: Transition): void {
    this.buffer.push(t);
    if (this.buffer.length > this.capacity) this.buffer.shift();
  }

  storeEpisode(
    episode: Array<{ state: [number, number]; action: number; nextState: [number, number] }>,
    originalGoal: [number, number]
  ): void {
    const n = episode.length;
    for (let t = 0; t < n; t++) {
      const { state: s, action: a, nextState: sNext } = episode[t];

      // 1. 元の目標のままの通常の経験を追加
      const r = computeReward(sNext, originalGoal);
      const done = r === 0.0;
      this.push({ state: s, action: a, nextState: sNext, goal: originalGoal, reward: r, done });

      // 2. hindsight再ラベリング(future戦略): tより後の時刻からk個サンプルし、
      //    その時刻の到達状態を「最初から目標だったこと」にする
      const futureIndices: number[] = [];
      for (let i = t + 1; i < n; i++) futureIndices.push(i);
      if (futureIndices.length === 0) continue;

      const shuffled = [...futureIndices].sort(() => Math.random() - 0.5);
      const sampled = shuffled.slice(0, Math.min(this.kFuture, futureIndices.length));
      for (const futureT of sampled) {
        const newGoal = episode[futureT].nextState;
        const rRelabel = computeReward(sNext, newGoal);
        const doneRelabel = rRelabel === 0.0;
        this.push({ state: s, action: a, nextState: sNext, goal: newGoal, reward: rRelabel, done: doneRelabel });
      }
    }
  }

  sample(batchSize: number): Transition[] {
    const result: Transition[] = [];
    const n = Math.min(batchSize, this.buffer.length);
    for (let i = 0; i < n; i++) {
      result.push(this.buffer[Math.floor(Math.random() * this.buffer.length)]);
    }
    return result;
  }

  get length(): number {
    return this.buffer.length;
  }
}

// 使用例: 目標(5,5)に到達できなかった5ステップのエピソードでも、
// hindsight再ラベリングにより「目標達成」の学習信号を持つ経験が複数生成される
const episode: Array<{ state: [number, number]; action: number; nextState: [number, number] }> = [
  { state: [0, 0], action: 0, nextState: [1, 0] },
  { state: [1, 0], action: 1, nextState: [1, 1] },
  { state: [1, 1], action: 0, nextState: [2, 1] },
  { state: [2, 1], action: 1, nextState: [2, 2] },
  { state: [2, 2], action: 0, nextState: [3, 2] },
];
const buffer = new HindsightReplayBuffer(100000, 2);
buffer.storeEpisode(episode, [5, 5]);
```
