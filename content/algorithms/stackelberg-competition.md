---
name: シュタッケルベルク競争 (Stackelberg Competition)
category: ゲーム
subcategory: 数理ゲーム理論
complexity: O(n)(バックワード帰納法、フォロワーの反応関数が閉形式で求まる場合)
summary: 先手(リーダー)が後手(フォロワー)の最適反応を見越して先に行動を決める、非対称な逐次手番ゲームの解法。
---

## 概要

[ナッシュ均衡](/algorithms/nash-equilibrium)は全プレイヤーが同時に、対等な立場で戦略を選ぶことを前提とするが、現実の競争には「先に市場に参入した企業が生産量を決め、後発企業がそれを見てから自社の生産量を決める」といった明確な**手番の順序**と**情報の非対称性**が存在することが多い。ドイツの経済学者ハインリッヒ・フォン・シュタッケルベルクが1934年に定式化したシュタッケルベルク競争は、この状況を「リーダー」が先に行動を選び、「フォロワー」がリーダーの選択を観測してから自分の最適な行動を選ぶ、という逐次手番ゲームとしてモデル化する。合理的なリーダーは、フォロワーが自分の行動にどう反応するか(**反応関数**)を事前に見越した上で、その反応まで織り込んで自分にとって最も有利な行動を選ぶ。この「先読みして最適な先手を打つ」考え方は、価格・生産量競争だけでなく、セキュリティゲームでの警備配置(防御側がリーダー)などにも応用される。

## 仕組み

1. まずフォロワーの意思決定を分析する: リーダーがある行動`x`を選んだと仮定したとき、フォロワーはその`x`を所与として自分の利得を最大化する行動`y*(x)`(**最適反応関数**)を選ぶ
2. フォロワーの最適反応関数`y*(x)`を、リーダーの利得関数に代入する。これによりリーダーの利得は自分の行動`x`だけの関数として書き直せる(「フォロワーがどう反応するか」を織り込んだ利得)
3. リーダーは、この「フォロワーの反応込みの利得関数」を最大化する行動`x*`を選ぶ(通常は微分してゼロと置く、あるいは離散的な選択肢を全探索する)
4. 求めた`x*`をフォロワーの反応関数に代入し、フォロワーの実際の行動`y* = y*(x*)`を得る。`(x*, y*)`の組が**シュタッケルベルク均衡**であり、ゲーム木を末端から解く[バックワード帰納法](/algorithms/minimax)と同じ発想でリーダーの最適解を求めていることになる
5. 同時手番のナッシュ均衡(クールノー競争)と比較すると、多くの経済モデルでシュタッケルベルクのリーダーはクールノー均衡より高い利得(**先手優位、first-mover advantage**)を得られることが知られている

## 特性・トレードオフ

- **計算量**: フォロワーの反応関数が解析的に(閉形式で)求まる問題では、リーダーの最適化は`O(1)`の微分計算程度。離散的な選択肢しかない場合は、各リーダーの行動候補ごとにフォロワーの最適反応をシミュレートする`O(n)`の全探索になる
- **先手優位性**: リーダーは先に行動を確約(コミット)できるため、同時手番のナッシュ均衡より高い利得を得られることが多い。ただし、これはリーダーの行動が「後から変更できない」という確約(コミットメント)が信頼できることが前提になる
- **情報構造への依存**: フォロワーがリーダーの行動を正確に観測できることが前提であり、観測に不確実性がある場合はより複雑な不完全情報ゲームとしての扱いが必要になる
- **使いどころ**: 市場での価格・生産量競争のモデル化、セキュリティゲーム(警備配置を先に公開する防御側の最適配置)、プラットフォームの手数料設計(先に手数料を決め、参加者がそれに反応する)など

## 実装例

線形需要曲線を仮定したクールノー型のシュタッケルベルク複占モデル(企業1がリーダー、企業2がフォロワー)を実装し、フォロワーの反応関数を織り込んでリーダーの最適生産量を数値的に求める。

```python
def stackelberg_duopoly(demand_intercept: float, marginal_cost: float) -> tuple[float, float]:
    """線形需要 P = a - (q1+q2)、限界費用cのクールノー型複占でのシュタッケルベルク均衡を求める。
    フォロワー(企業2)の反応関数: q2*(q1) = (a - c - q1) / 2 を解析的に代入してリーダーの最適解を得る"""
    a, c = demand_intercept, marginal_cost

    # リーダーの利得 pi1(q1) = q1 * (a - q1 - q2*(q1) - c) を q1 で微分してゼロと置いた解析解
    q1_leader = (a - c) / 2
    q2_follower = (a - c - q1_leader) / 2  # フォロワーの反応関数にq1_leaderを代入

    return q1_leader, q2_follower


def best_response_follower(q1: float, demand_intercept: float, marginal_cost: float) -> float:
    """フォロワーの最適反応関数そのもの(検証用)"""
    return (demand_intercept - marginal_cost - q1) / 2


a, c = 100.0, 10.0
q1, q2 = stackelberg_duopoly(a, c)
print(f"leader={q1}, follower={q2}")  # leader=45.0, follower=22.5 (先手が2倍近く生産する)
assert abs(best_response_follower(q1, a, c) - q2) < 1e-9
```

```typescript
function stackelbergDuopoly(
  demandIntercept: number,
  marginalCost: number,
): { leader: number; follower: number } {
  // 線形需要 P = a - (q1+q2)、限界費用cのクールノー型複占でのシュタッケルベルク均衡を求める。
  // フォロワー(企業2)の反応関数: q2*(q1) = (a - c - q1) / 2 を解析的に代入してリーダーの最適解を得る
  const a = demandIntercept;
  const c = marginalCost;

  // リーダーの利得 pi1(q1) = q1 * (a - q1 - q2*(q1) - c) を q1 で微分してゼロと置いた解析解
  const qLeader = (a - c) / 2;
  const qFollower = (a - c - qLeader) / 2; // フォロワーの反応関数にqLeaderを代入

  return { leader: qLeader, follower: qFollower };
}

function bestResponseFollower(
  q1: number,
  demandIntercept: number,
  marginalCost: number,
): number {
  // フォロワーの最適反応関数そのもの(検証用)
  return (demandIntercept - marginalCost - q1) / 2;
}

const a = 100.0;
const c = 10.0;
const { leader, follower } = stackelbergDuopoly(a, c);
console.log(`leader=${leader}, follower=${follower}`); // leader=45, follower=22.5 (先手が2倍近く生産する)
console.assert(Math.abs(bestResponseFollower(leader, a, c) - follower) < 1e-9);
```
