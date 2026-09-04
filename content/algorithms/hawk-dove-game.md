---
name: タカハトゲーム (Hawk-Dove Game)
category: ゲーム
subcategory: 数理ゲーム理論
complexity: O(1)(解析解、集団シミュレーションはO(世代数×個体数))
summary: 攻撃的な「タカ」戦略と譲歩的な「ハト」戦略の混在集団が、進化的に安定な比率へ収束することを示す進化ゲームのモデル。
---

## 概要

動物が資源(縄張り、餌、配偶相手)を巡って争うとき、常に全力で戦う「タカ」戦略の個体ばかりの集団になるのが進化的に有利とは限らない。1973年にジョン・メイナード=スミスとジョージ・プライスが導入したタカハトゲームは、この直感を数理的に定式化した進化ゲーム理論の基礎モデルである。集団中の個体は、資源を巡って対立したとき徹底的に戦う「タカ戦略」か、相手が攻撃的なら譲る「ハト戦略」のいずれかを取る。全員がタカならば頻繁な激しい闘争でコストが嵩み、全員がハトならば争いは起きないが縄張りをすぐ諦めてしまう。このゲームの重要な結論は、特定の条件下では「全員がタカ」でも「全員がハト」でもなく、タカとハトが特定の比率で共存する状態、あるいは各個体がその比率で確率的に戦略を選ぶ状態が[進化的安定戦略(ESS)](/algorithms/evolutionary-stable-strategy)になるという点にある。生物の攻撃性の進化、企業間の価格競争、国際紛争のエスカレーション分析など幅広い応用を持つ。

## 仕組み

1. 資源の価値`V`と、闘争に負けたときのコスト`C`(怪我など)を設定する。通常`C > V`(争いのコストが資源の価値を上回る)状況を想定する
2. 2個体が出会ったときの利得を、戦略の組み合わせごとに定義する: タカ×ハトなら「タカが資源を独占し利得`V`、ハトは争わず利得`0`」、ハト×ハトなら「資源を分け合い両者`V/2`」、タカ×タカなら「激しく争い勝敗が五分五分、期待利得は`(V - C) / 2`」
3. 集団中のタカの割合を`p`とすると、ランダムに相手と出会うと仮定したときのタカ戦略の期待利得`E[hawk]`とハト戦略の期待利得`E[dove]`を、上記の利得表と出会う確率`p`, `1-p`から計算できる
4. `E[hawk] = E[dove]`となる`p`が存在すれば、それが**進化的に安定な比率**`p* = V / C`である。この均衡では、どちらの戦略も一方的に有利にならず、突然変異でどちらかの戦略が増えても自然に元の比率に引き戻される
5. `p*`は「集団中のタカの割合」としても、「各個体が確率`p*`でタカを選ぶ混合戦略」としても解釈でき、どちらも同じ進化的安定戦略に対応する(**個体群解釈**と**個体解釈**の等価性)

## 特性・トレードオフ

- **計算量**: 利得のパラメータ`V`, `C`から均衡比率`p* = V/C`を求める解析解は`O(1)`。実際の集団の動態を世代交代シミュレーションで再現する場合は世代数と個体数に比例した計算コストがかかる
- **争いのコストという要因**: 全員がタカ戦略に固定されないのは、争いのコスト`C`が有限で`V`より大きいことが本質的な理由になっている。`C`が非常に小さければタカ戦略が支配的になる
- **ナッシュ均衡との関係**: この混合戦略均衡は[ナッシュ均衡](/algorithms/nash-equilibrium)の一種でもあるが、進化ゲーム理論では「合理的な意思決定」ではなく「自然選択による集団の安定性」として同じ均衡を導出する点が異なる視座を提供する
- **使いどころ**: 動物の闘争行動や縄張り防衛戦略の進化の説明、ゲームバランス調整での「攻撃的プレイ」と「安全なプレイ」の均衡分析、企業の価格競争や国家間の軍拡競争のモデル化など

## 実装例

利得パラメータ`V`, `C`から進化的安定比率を解析的に求める関数と、集団シミュレーションでタカの割合が理論値に収束することを確認する簡易実装を示す。

```python
import random


def evolutionarily_stable_hawk_ratio(value: float, cost: float) -> float:
    """タカハトゲームの進化的安定戦略における集団中のタカの割合 p* = V/C を返す"""
    if cost <= 0:
        raise ValueError("コストは正の値である必要があります")
    return min(value / cost, 1.0)


def simulate_population(
    value: float, cost: float, population: int = 1000, generations: int = 200, seed: int | None = None
) -> float:
    """個体同士をランダムに対戦させ、利得に応じて戦略を模倣する単純な進化シミュレーション"""
    rng = random.Random(seed)
    strategies = [rng.random() < 0.5 for _ in range(population)]  # True=タカ, False=ハト

    for _ in range(generations):
        payoffs = [0.0] * population
        rng.shuffle(strategies)
        for i in range(0, population - 1, 2):
            a, b = strategies[i], strategies[i + 1]
            if a and b:  # タカ vs タカ
                payoffs[i] = payoffs[i + 1] = (value - cost) / 2
            elif a and not b:  # タカ vs ハト
                payoffs[i], payoffs[i + 1] = value, 0.0
            elif not a and b:  # ハト vs タカ
                payoffs[i], payoffs[i + 1] = 0.0, value
            else:  # ハト vs ハト
                payoffs[i] = payoffs[i + 1] = value / 2

        # 利得が高い戦略を、確率的に模倣する(簡易的なレプリケータダイナミクス)
        hawk_avg = sum(p for s, p in zip(strategies, payoffs) if s) / max(1, sum(strategies))
        dove_avg = sum(p for s, p in zip(strategies, payoffs) if not s) / max(1, population - sum(strategies))
        if hawk_avg > dove_avg:
            flip_target = False
        else:
            flip_target = True
        for i in range(population):
            if rng.random() < 0.02:
                strategies[i] = not flip_target

    return sum(strategies) / population
```

```typescript
function evolutionarilyStableHawkRatio(value: number, cost: number): number {
  // タカハトゲームの進化的安定戦略における集団中のタカの割合 p* = V/C を返す
  if (cost <= 0) throw new Error("コストは正の値である必要があります");
  return Math.min(value / cost, 1.0);
}

function simulatePopulation(
  value: number,
  cost: number,
  population = 1000,
  generations = 200,
): number {
  // 個体同士をランダムに対戦させ、利得に応じて戦略を模倣する単純な進化シミュレーション
  let strategies: boolean[] = Array.from({ length: population }, () => Math.random() < 0.5); // true=タカ

  const shuffle = (arr: boolean[]): void => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  };

  for (let gen = 0; gen < generations; gen++) {
    const payoffs = new Array<number>(population).fill(0);
    shuffle(strategies);
    for (let i = 0; i < population - 1; i += 2) {
      const a = strategies[i];
      const b = strategies[i + 1];
      if (a && b) {
        payoffs[i] = payoffs[i + 1] = (value - cost) / 2; // タカ vs タカ
      } else if (a && !b) {
        payoffs[i] = value;
        payoffs[i + 1] = 0; // タカ vs ハト
      } else if (!a && b) {
        payoffs[i] = 0;
        payoffs[i + 1] = value; // ハト vs タカ
      } else {
        payoffs[i] = payoffs[i + 1] = value / 2; // ハト vs ハト
      }
    }

    // 利得が高い戦略を、確率的に模倣する(簡易的なレプリケータダイナミクス)
    const hawkCount = strategies.filter((s) => s).length;
    const hawkAvg =
      strategies.reduce((sum, s, i) => (s ? sum + payoffs[i] : sum), 0) / Math.max(1, hawkCount);
    const doveAvg =
      strategies.reduce((sum, s, i) => (!s ? sum + payoffs[i] : sum), 0) /
      Math.max(1, population - hawkCount);
    const flipTarget = hawkAvg <= doveAvg;
    strategies = strategies.map((s) => (Math.random() < 0.02 ? !flipTarget : s));
  }

  return strategies.filter((s) => s).length / population;
}
```
