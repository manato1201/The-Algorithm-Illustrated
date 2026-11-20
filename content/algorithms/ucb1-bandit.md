---
name: UCB1(多腕バンディット)
category: 強化学習
subcategory: 価値ベース手法
complexity: 1回の選択 O(腕の数)、累積リグレットは O(log n)
summary: 各選択肢の平均報酬に「試した回数が少ないほど大きい上積み」を足した上限値で選ぶ。探索と活用のバランスを、乱数なしで理論的な保証つきで取る。
---

## 概要

複数の選択肢(腕)があって、どれが当たりかは引いてみないと分からない。スロットマシンの台を何台も前にした状況にたとえて「多腕バンディット問題」と呼ばれる。いま最もよさそうな台を引き続ければ(活用)、より良い台を見逃すかもしれない。かといって、いろいろ試し続ければ(探索)、損が増える。広告の出し分け、A/Bテスト、レコメンド、治験の割り当て、ゲームの強化学習の探索など、現実の多くの場面がこの形をしている。

素朴な方法に、ε-greedy(確率 ε でランダムに試す)がある。しかし ε が固定だと、十分に学習したあとも無駄な探索を続けてしまい、損失が回数に比例して増える。UCB1(Auer、Cesa-Bianchi、Fischer、2002年)は、**「楽観的に見積もる」**という原則で、これを解決した。各腕について「平均報酬+不確かさの上積み」という信頼区間の**上限(Upper Confidence Bound)**を計算し、上限が最大の腕を選ぶ。試行が少ない腕は不確かさが大きいので、上限が高くなり、自然に試される。多く試した腕は、上積みが小さくなり、平均が正直に評価される。結果として、損失(リグレット)が回数の対数 O(log n) でしか増えない。[モンテカルロ木探索](/algorithms/monte-carlo-tree-search)の UCT は、この UCB1 を木の各ノードの選択に使ったものである。

## 仕組み

腕 `i` について、これまでに選んだ回数 `nᵢ` と、平均報酬 `x̄ᵢ`(報酬は0〜1に収まると仮定)を持つ。合計の試行回数を `n` とする。

1. **初期化**: まず各腕を1回ずつ引く(`nᵢ = 0` の腕があると、式が定義できないため)
2. **選択**: 各腕のスコアを計算し、最大の腕を選ぶ
   `UCBᵢ = x̄ᵢ + √( 2 · ln n / nᵢ )`
   - 第1項は、これまでの実績(活用)
   - 第2項は、不確かさの大きさ(探索)。`nᵢ` が小さいほど大きく、全体の回数 `n` が増えると、少しずつ大きくなる(長く放置された腕が再び試される)
3. 選んだ腕を引いて報酬を観測し、`nᵢ` と `x̄ᵢ` を更新する
4. 2〜3を繰り返す

第2項の根拠は、Hoeffdingの不等式。平均の推定値が真の平均から外れる確率が、`nᵢ` に応じて小さくなることを使い、「真の平均がこの上限を超えている確率は小さい」ように定数が選ばれている。

## 特性・トレードオフ

- **理論的な保証**: 最適な腕を選び続けた場合との差(リグレット)が、回数 `n` に対して O(log n) で抑えられる。固定の ε-greedy の線形増加より、ずっと良い
- **乱数なしで決定的**: 選択は計算だけで決まる(同点以外は乱数が要らない)。デバッグや再現がしやすい
- **報酬の範囲が前提**: 報酬が0〜1(有界)であることを仮定する。範囲が違う場合は、正規化するか、定数を調整する。`√(2 ln n / nᵢ)` の係数(探索の強さ)も、実際の問題では調整されることが多い
- **非定常な環境に弱い**: 腕の当たりやすさが時間とともに変わる場合、過去の平均が古くなる。直近だけを重視する版(割引UCB、スライディングウィンドウ)を使う
- **実用での比較**: 実データでは、トンプソンサンプリング([Thompson sampling](/algorithms/thompson-sampling))のほうが、少ない試行で良い結果を出すことが多い。ただし UCB1 は理論の保証が明快で、実装が非常に簡単
- **使いどころ**: オンライン広告・コンテンツの出し分け、A/Bテストの動的な配分、ゲーム木探索(UCT)、ハイパーパラメータ探索の割り当て

## 実装例

```python
import math
import random


def ucb1(arm_probs, rounds, seed=0):
    rng = random.Random(seed)
    k = len(arm_probs)
    counts = [0] * k
    means = [0.0] * k
    total = 0.0
    for t in range(1, rounds + 1):
        if t <= k:
            arm = t - 1                                   # まず全部の腕を1回ずつ
        else:
            arm = max(range(k), key=lambda i: means[i] + math.sqrt(2 * math.log(t) / counts[i]))
        reward = 1.0 if rng.random() < arm_probs[arm] else 0.0
        counts[arm] += 1
        means[arm] += (reward - means[arm]) / counts[arm]   # 平均の逐次更新
        total += reward
    return counts, means, total


counts, means, total = ucb1([0.2, 0.5, 0.7], rounds=2000)
print(counts)                      # 最も当たりやすい腕(0.7)が圧倒的に多く引かれる
print([round(m, 2) for m in means])
print("リグレット:", round(0.7 * 2000 - total, 1))  # 常に最良の腕を引いた場合の期待報酬との差(乱数の揺れで負になることもある)
```

```typescript
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function ucb1(armProbs: number[], rounds: number, seed = 0) {
  const rng = makeRng(seed);
  const k = armProbs.length;
  const counts = new Array<number>(k).fill(0);
  const means = new Array<number>(k).fill(0);
  let total = 0;
  for (let t = 1; t <= rounds; t++) {
    let arm = t - 1;
    if (t > k) {
      let best = -Infinity;
      for (let i = 0; i < k; i++) {
        const score = means[i] + Math.sqrt((2 * Math.log(t)) / counts[i]);
        if (score > best) {
          best = score;
          arm = i;
        }
      }
    }
    const reward = rng() < armProbs[arm] ? 1 : 0;
    counts[arm]++;
    means[arm] += (reward - means[arm]) / counts[arm];
    total += reward;
  }
  return { counts, means, total };
}

const { counts, means, total } = ucb1([0.2, 0.5, 0.7], 2000);
console.log(
  counts,
  means.map((m) => Number(m.toFixed(2))),
);
console.log("リグレット:", (0.7 * 2000 - total).toFixed(1));
```
