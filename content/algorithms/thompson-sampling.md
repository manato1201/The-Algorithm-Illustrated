---
name: トンプソンサンプリング
category: 強化学習
subcategory: モデルベース・探索
complexity: 1回の選択 O(腕の数)(各腕の事後分布から1回ずつ標本を取る)
summary: 各選択肢の「当たりやすさ」を確率分布(事後分布)で持ち、そこから1回ずつ乱数で標本を引いて最大の腕を選ぶ。不確かな腕ほど高い値を引く可能性があるので、探索と活用が自然に両立する。
---

## 概要

多腕バンディット問題(どの選択肢が当たりか分からない状況で、損を最小にしながら試す問題)の解法として、[UCB1](/algorithms/ucb1-bandit)は「平均に不確かさの上積みを足す」という決定的な方法を取る。これに対し、**確率で考える**方法が、トンプソンサンプリングである。William R. Thompson が1933年に、2つの治療法のどちらが良いかを逐次的に決める問題で提案した、非常に古い考え方で、長く忘れられていたが、2010年前後に、オンライン広告での実験と理論の両面で優れていることが示され、広く使われるようになった。

考え方は直感的である。**各腕の「真の当たり確率」について、これまでのデータから信じている分布(事後分布)を持つ。選ぶときは、各腕の分布から値を1つずつ「抽選」し、抽選された値が最大の腕を選ぶ**。データが少ない腕は分布が広いので、たまたま高い値を引くことがあり、試される(探索)。データが十分にたまり、当たり確率が高いと分かった腕は、安定して高い値を引くので、よく選ばれる(活用)。探索の量を調整するパラメータは要らない。

## 仕組み

報酬が当たり/はずれの2値(ベルヌーイ試行)の場合、腕 `i` の当たり確率 `θᵢ` の事前分布に、Beta分布(一様分布に当たる Beta(1,1))を使う。ベータ分布は、ベルヌーイ試行に対する共役事前分布なので、更新が足し算だけで済む。

1. **初期化**: 各腕に `αᵢ = 1`(当たりの数+1)、`βᵢ = 1`(はずれの数+1)を持たせる
2. **標本抽出**: 各腕について `θ̂ᵢ ~ Beta(αᵢ, βᵢ)` を1つ引く
3. **選択**: `θ̂ᵢ` が最大の腕を選んで引く
4. **更新**: 当たりなら `αᵢ += 1`、はずれなら `βᵢ += 1`
5. 2〜4を繰り返す

Beta分布は、`α` と `β` が大きくなるほど平均 `α/(α+β)` の周りに鋭く集まる。つまり、試した回数が増えるほど、その腕の抽選値は真の当たり確率に近づく。

報酬が連続値の場合は、正規分布などの共役事前分布を使う。共役でない複雑なモデルでは、事後分布からの標本を、MCMCなどで近似して引く。

## 特性・トレードオフ

- **実用上強い**: 多くの実験で、UCB1などの決定的な方法より、少ない試行で良い結果を出す。リグレットの理論的な保証(O(log n)、問題によっては下限に一致)も示されている
- **事前分布の使いやすさ**: 過去の知識を事前分布に入れられる。たとえば、新しい広告でも似た広告の実績を事前の `α`・`β` に反映し、冷えた状態からの無駄な探索を減らせる
- **非定常にも拡張しやすい**: 古いデータの重みを割り引く(`α`、`β` を少しずつ減衰させる)ことで、当たりやすさが時間とともに変わる環境に追従できる
- **遅延フィードバックに強い**: 結果が遅れて届く(広告のクリックや購入)ときでも、選択をランダムに分散させるので、複数のリクエストが同じ腕に偏りにくい
- **乱数が必要**: 結果が実行ごとに変わる。再現性が欲しいときはシードを固定する。Beta分布の標本を引く関数が必要
- **使いどころ**: 広告・レコメンドの出し分け、A/Bテストの動的な割り当て、治験の適応的デザイン、ゲーム内の報酬設計の探索

## 実装例

```python
import random


def thompson_sampling(arm_probs, rounds, seed=0):
    rng = random.Random(seed)
    k = len(arm_probs)
    wins = [1] * k     # Beta の α(当たり数+1)
    losses = [1] * k   # Beta の β(はずれ数+1)
    pulls = [0] * k
    total = 0
    for _ in range(rounds):
        samples = [rng.betavariate(wins[i], losses[i]) for i in range(k)]   # 各腕の事後分布から抽選
        arm = max(range(k), key=lambda i: samples[i])
        reward = 1 if rng.random() < arm_probs[arm] else 0
        wins[arm] += reward
        losses[arm] += 1 - reward
        pulls[arm] += 1
        total += reward
    return pulls, [w / (w + l) for w, l in zip(wins, losses)], total


pulls, estimates, total = thompson_sampling([0.2, 0.5, 0.7], rounds=2000)
print(pulls)                                   # 最良の腕(0.7)に集中する
print([round(e, 2) for e in estimates])        # 各腕の事後平均
print("リグレット:", round(0.7 * 2000 - total, 1))  # 期待値との差なので、乱数の揺れで負になることもある
```

```typescript
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeSamplers(rng: () => number) {
  const normal = () =>
    Math.sqrt(-2 * Math.log(rng() + 1e-12)) * Math.cos(2 * Math.PI * rng());
  // Marsaglia-Tsang 法による Gamma(shape, 1)
  const gamma = (shape: number): number => {
    if (shape < 1) return gamma(shape + 1) * rng() ** (1 / shape);
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    for (;;) {
      const x = normal();
      const v = (1 + c * x) ** 3;
      if (v <= 0) continue;
      const u = rng();
      if (Math.log(u + 1e-300) < 0.5 * x * x + d - d * v + d * Math.log(v))
        return d * v;
    }
  };
  const beta = (a: number, b: number): number => {
    const x = gamma(a);
    return x / (x + gamma(b));
  };
  return { beta };
}

function thompsonSampling(armProbs: number[], rounds: number, seed = 0) {
  const rng = makeRng(seed);
  const { beta } = makeSamplers(rng);
  const k = armProbs.length;
  const wins = new Array<number>(k).fill(1);
  const losses = new Array<number>(k).fill(1);
  const pulls = new Array<number>(k).fill(0);
  let total = 0;
  for (let t = 0; t < rounds; t++) {
    const samples = wins.map((w, i) => beta(w, losses[i]));
    const arm = samples.indexOf(Math.max(...samples));
    const reward = rng() < armProbs[arm] ? 1 : 0;
    wins[arm] += reward;
    losses[arm] += 1 - reward;
    pulls[arm]++;
    total += reward;
  }
  return { pulls, estimates: wins.map((w, i) => w / (w + losses[i])), total };
}

const { pulls, estimates, total } = thompsonSampling([0.2, 0.5, 0.7], 2000);
console.log(
  pulls,
  estimates.map((e) => Number(e.toFixed(2))),
);
console.log("リグレット:", (0.7 * 2000 - total).toFixed(1));
```
