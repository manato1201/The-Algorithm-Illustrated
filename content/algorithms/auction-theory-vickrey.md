---
name: ヴィッカリーオークション (Vickrey Auction / 第二価格オークション)
category: ゲーム
subcategory: 数理ゲーム理論
complexity: O(n log n)(入札のソートによる落札者・価格決定)
summary: 最高額入札者が「2番目に高い入札額」を支払う仕組みにより、正直な入札が最適戦略になるよう設計されたオークション形式。
---

## 概要

通常の「最高額入札者がその金額をそのまま支払う」第一価格オークションでは、入札者は自分の本当の評価額をそのまま入札すると損をする可能性があるため、相手の入札額を予測して自分の評価額より低い金額を戦略的に入札する必要がある。1961年にウィリアム・ヴィッカリーが提案した第二価格オークション(ヴィッカリーオークション)は、この駆け引きを取り除くよう設計されている。最高額入札者が落札するのは同じだが、支払う金額は自分の入札額ではなく「2番目に高い入札額」である。この単純な変更により、各入札者にとって「自分の本当の評価額をそのまま正直に入札すること」が常に(他の入札者の行動に関わらず)最適な戦略になる、という強力な性質(**耐戦略性、strategy-proofness**)が成立する。この仕組みはオンライン広告オークション(Googleの広告枠オークションの一般化版であるVCGメカニズムの原型)など、現代のメカニズムデザインの基礎となっている。

## 仕組み

1. 各入札者は、他の入札者の情報を一切知らないまま、自分がそのアイテムに対して持つ本当の評価額(**私的価値**)を入札額として提出する
2. オークション主催者は全ての入札額を集め、最も高い入札をした人を落札者とする
3. 落札者が実際に支払う金額は、自分の入札額ではなく「2番目に高かった入札額」に設定する
4. この支払いルールのもとでは、入札者が自分の評価額より高く入札しても得をすることはなく(支払額は自分の入札額に依存しないため、高く入札すると評価額を超える金額を払うリスクだけが増える)、低く入札しても得をすることはない(落札を逃すリスクが増えるだけで支払額は変わらない)ため、正直な入札が**支配戦略**(相手が何をしようと最適な戦略)になることが証明できる
5. この耐戦略性のおかげで、入札者は相手の行動を推測する複雑な駆け引きを行う必要がなく、オークションの結果は参加者の真の評価額に基づいた効率的な配分(最も評価額の高い人が落札する)になることが保証される

## 特性・トレードオフ

- **計算量**: 入札額を降順にソートするだけで落札者(最大値)と支払額(2番目の値)が決まるため`O(n log n)`(最大値と2番目の値だけならO(n)の1パスでも求まる)
- **耐戦略性の強力さ**: 入札者が相手の戦略を推測して駆け引きする必要がなく、正直な入札が最適という単純な指針を提供する。これはゲーム理論的均衡分析を経ずに望ましい結果を導ける稀有な性質である
- **収益の同値性**: 期待収益の観点では、一定の条件下(独立private value、リスク中立な入札者等)で第一価格オークションと第二価格オークションの主催者の期待収益は等しくなることが**収益同値定理**として知られている
- **使いどころ**: オンライン広告枠の割当オークション(GoogleのAdWordsなどで使われるVCGメカニズムの基礎)、周波数帯オークション、複数財の同時オークションを扱うメカニズムデザイン全般

## 実装例

複数の入札者の入札額から、ヴィッカリーオークションの落札者と支払額を求める実装。

```python
from dataclasses import dataclass


@dataclass
class Bid:
    bidder_id: str
    amount: float


def run_vickrey_auction(bids: list[Bid]) -> tuple[str, float]:
    """落札者IDと支払額(2番目に高い入札額)を返す。入札者が1人の場合は支払額0とする"""
    if not bids:
        raise ValueError("入札がありません")

    sorted_bids = sorted(bids, key=lambda b: b.amount, reverse=True)
    winner = sorted_bids[0]
    payment = sorted_bids[1].amount if len(sorted_bids) > 1 else 0.0
    return winner.bidder_id, payment


bids = [Bid("A", 120), Bid("B", 95), Bid("C", 150), Bid("D", 80)]
winner_id, price = run_vickrey_auction(bids)
print(winner_id, price)  # C 120 (Cが落札、支払いは2番手Aの入札額)
```

```typescript
interface Bid {
  bidderId: string;
  amount: number;
}

function runVickreyAuction(bids: Bid[]): { winnerId: string; payment: number } {
  // 落札者IDと支払額(2番目に高い入札額)を返す。入札者が1人の場合は支払額0とする
  if (bids.length === 0) throw new Error("入札がありません");

  const sortedBids = [...bids].sort((a, b) => b.amount - a.amount);
  const winner = sortedBids[0];
  const payment = sortedBids.length > 1 ? sortedBids[1].amount : 0;
  return { winnerId: winner.bidderId, payment };
}

const bids: Bid[] = [
  { bidderId: "A", amount: 120 },
  { bidderId: "B", amount: 95 },
  { bidderId: "C", amount: 150 },
  { bidderId: "D", amount: 80 },
];
const { winnerId, payment } = runVickreyAuction(bids);
console.log(winnerId, payment); // C 120 (Cが落札、支払いは2番手Aの入札額)
```
