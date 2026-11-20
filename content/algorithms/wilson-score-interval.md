---
name: ウィルソンスコア(評価の信頼下限によるランキング)
category: 情報検索・ランキング
subcategory: スコアリング
complexity: O(1)(1項目あたりの計算)
summary: 「高評価の割合」ではなく、その割合の信頼区間の下限でランキングする。評価の数が少ない項目が、たまたま満点で1位になるのを防ぐ。
---

## 概要

レビューサイトで商品を「高評価の割合」の順に並べると、評価が2件だけで2件とも高評価の商品(100%)が、950件中920件が高評価(約97%)の定番商品より上に来てしまう。割合は同じように見えても、評価数が違えば**信頼できる度合いが違う**。2件の100%は運がよかっただけかもしれないが、1000件の92%は本当に評判がよいと考えられる。

この問題に対し、「**真の高評価率が、ある確率(たとえば95%)で少なくともこの値以上だと言える下限**」を、並べ替えの基準にする、というのがウィルソンスコア(Wilson score interval の下限)による順位づけである。区間の公式はEdwin B. Wilsonが1927年に二項分布の比率の推定のために示したもので、ウェブ上の評価の順位づけに応用する方法は、2000年代後半に広く紹介された。評価が少なければ区間が広がり、下限は小さくなる。評価が増えるほど区間が狭まり、下限が観測された割合に近づく。

## 仕組み

`n` 件の評価のうち高評価が `k` 件、`p̂ = k / n` とする。`z` は信頼水準に対応する正規分布の分位点(95%なら約 1.96)。ウィルソンスコアの下限は次の式で求まる。

`下限 = ( p̂ + z²/(2n) − z · √( p̂(1−p̂)/n + z²/(4n²) ) ) / ( 1 + z²/n )`

1. 項目ごとに `n` と `k` を数える。`n = 0` ならスコアは0とする
2. 式にあてはめて下限を計算する
3. 下限の大きい順に並べる

直感的には、観測された割合 `p̂` を、評価が少ないほど強く「中央(0.5)」の側へ引き寄せたうえで、不確かさ(誤差の幅)を引いた値である。評価数が多くなると、補正が小さくなって `p̂` に近づく。

## 特性・トレードオフ

- **少数の評価に強い**: 2件満点の項目は、2件で信頼できるとは言えないので下限が低くなる。評価が貯まるにつれて、実力どおりの位置へ上がる
- **慎重な順位づけ**: 新しい項目は、実力があっても評価が集まるまで上位に出にくい(コールドスタート問題)。新着枠を別に設ける、事前の期待値を加える(ベイズ平均と併用)などで補う
- **二値評価が前提**: 高評価・低評価(あるいは「役に立った・立たなかった」)の二択のデータ向け。5段階評価の平均には、そのままは使えない。5段階の場合は、「4以上」を高評価とみなす、またはベイズ平均や別の信頼区間を使う
- **正規近似の限界**: 区間の導出に正規近似を使うが、ウィルソン法は、極端な割合や小さな n でも、単純な正規近似(ワルド区間)より安定している。ただし、まったく評価がつかない項目の扱いは別途決める必要がある
- **使いどころ**: レビューやコメントの「役に立った順」、掲示板の投稿の並べ替え、Q&Aの回答の順位、A/Bテストの簡易判定

## 実装例

```python
from math import sqrt


def wilson_lower_bound(positive, total, z=1.96):
    if total == 0:
        return 0.0
    p = positive / total
    center = p + z * z / (2 * total)
    margin = z * sqrt(p * (1 - p) / total + z * z / (4 * total * total))
    return (center - margin) / (1 + z * z / total)


items = {"A": (2, 2), "B": (9, 10), "C": (45, 50), "D": (180, 200), "E": (920, 1000), "F": (3, 5)}
by_naive = sorted(items, key=lambda k: -items[k][0] / items[k][1])
by_wilson = sorted(items, key=lambda k: -wilson_lower_bound(*items[k]))
print("割合順  :", by_naive)    # A が1位(2件だけの100%)
print("ウィルソン:", by_wilson)  # E が1位(1000件の92%)
for k in by_wilson:
    print(k, round(wilson_lower_bound(*items[k]) * 100, 1))
```

```typescript
function wilsonLowerBound(positive: number, total: number, z = 1.96): number {
  if (total === 0) return 0;
  const p = positive / total;
  const center = p + (z * z) / (2 * total);
  const margin =
    z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
  return (center - margin) / (1 + (z * z) / total);
}

const items: Record<string, [number, number]> = {
  A: [2, 2],
  B: [9, 10],
  C: [45, 50],
  D: [180, 200],
  E: [920, 1000],
  F: [3, 5],
};
const byWilson = Object.keys(items).sort(
  (a, b) => wilsonLowerBound(...items[b]) - wilsonLowerBound(...items[a]),
);
console.log(byWilson); // E が先頭、A はずっと下
console.log(
  byWilson.map((k) => (wilsonLowerBound(...items[k]) * 100).toFixed(1)),
);
```
