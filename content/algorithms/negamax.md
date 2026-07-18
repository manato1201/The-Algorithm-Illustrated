---
name: ネガマックス法
category: ゲーム
subcategory: ゲームAI・意思決定
complexity: O(b^d)
summary: ミニマックス法を「評価値の符号を反転して常に自分の最大化として扱う」形に書き換えた、実装がより簡潔な等価アルゴリズム。
---

## 概要

[ミニマックス法](/algorithms/minimax)の実装では、自分の手番では最大値を、相手の手番では最小値を取るという2種類のロジックを手番ごとに分岐させる必要があり、コードが煩雑になりやすい。ネガマックス法は、二人零和ゲームでは「相手にとっての評価値は、自分にとっての評価値の符号を反転したものに等しい」という性質を利用し、常に「自分の視点で最大化する」という一種類の処理だけで再帰を書けるように整理した、ミニマックス法と数学的に完全に等価なアルゴリズムである。アルゴリズムとしての振る舞いは変わらないが、実装がシンプルになるため、実用のゲームエンジンではミニマックス法そのものよりもネガマックス形式で書かれることが多い。

## 仕組み

1. 各再帰呼び出しでは「今、手番を持っているプレイヤーの視点」で評価値を計算する
2. 末端局面では、手番を持っているプレイヤーにとっての評価値を返す
3. 子ノードを再帰的に評価する際、子ノードは「相手の視点」での最大化になっているので、返ってきた値の**符号を反転**してから自分の候補と比較する: `value = max(候補たち, -negamax(子ノード))`
4. 全ての子について3を行い、最大値を現在のノードの評価値として返す

このとき`negamax(子ノード)`は「相手にとっての最良の結果」を表すので、それを反転した`-negamax(子ノード)`が「自分にとってのその手の結果」になる——これがミニマックス法の「自分の手番ではmax、相手の手番ではmin」と数学的に同じ結果を生む理由である。

## 特性・トレードオフ

- **計算量**: ミニマックス法と完全に同一(`O(b^d)`)。あくまで実装の整理であり、探索の効率自体は変わらない
- **前提条件**: 二人零和ゲームであることが必須。「相手の得点=自分の得点の符号反転」という関係が成り立たない非零和ゲームには適用できない
- **アルファベータ枝刈りとの相性**: [アルファベータ枝刈り](/algorithms/alpha-beta-pruning)もネガマックス形式(α/βの役割を再帰のたびに符号反転して引き継ぐ「ネガアルファベータ」)に書き換えられ、実装がさらに簡潔になる。多くのゲームエンジンの実装はこの形式を採用している
- **使いどころ**: 実装の可読性・保守性を重視するゲームAIエンジンのほぼデファクトスタンダード。理論的な理解にはミニマックス法、実装にはネガマックス法、という使い分けがよくされる

## 実装例

```python
def negamax(leaves: list[int], depth: int, index: int, sign: int) -> int:
    """深さ固定の二分木を「常に自分の視点で最大化する」形で評価する。signは手番を1/-1で表す"""
    if depth == 0:
        return sign * leaves[index]

    value = float("-inf")
    for child in (index * 2, index * 2 + 1):
        # 子ノードは相手の視点での最良値なので、符号を反転して自分にとっての結果に変換する
        value = max(value, -negamax(leaves, depth - 1, child, -sign))
    return value
```

```typescript
// 深さ固定の二分木を「常に自分の視点で最大化する」形で評価する。signは手番を1/-1で表す
function negamax(leaves: number[], depth: number, index: number, sign: number): number {
  if (depth === 0) return sign * leaves[index];

  let value = -Infinity;
  for (const child of [index * 2, index * 2 + 1]) {
    // 子ノードは相手の視点での最良値なので、符号を反転して自分にとっての結果に変換する
    value = Math.max(value, -negamax(leaves, depth - 1, child, -sign));
  }
  return value;
}
```

```cpp
#include <vector>
#include <algorithm>
#include <limits>

// 深さ固定の二分木を「常に自分の視点で最大化する」形で評価する。signは手番を1/-1で表す
int negamax(const std::vector<int>& leaves, int depth, int index, int sign) {
    if (depth == 0) return sign * leaves[index];

    int value = std::numeric_limits<int>::min();
    for (int child : {index * 2, index * 2 + 1}) {
        // 子ノードは相手の視点での最良値なので、符号を反転して自分にとっての結果に変換する
        value = std::max(value, -negamax(leaves, depth - 1, child, -sign));
    }
    return value;
}
```

```rust
// 深さ固定の二分木を「常に自分の視点で最大化する」形で評価する。signは手番を1/-1で表す
fn negamax(leaves: &[i32], depth: u32, index: usize, sign: i32) -> i32 {
    if depth == 0 {
        return sign * leaves[index];
    }

    let mut value = i32::MIN;
    for child in [index * 2, index * 2 + 1] {
        // 子ノードは相手の視点での最良値なので、符号を反転して自分にとっての結果に変換する
        value = value.max(-negamax(leaves, depth - 1, child, -sign));
    }
    value
}
```

```csharp
// 深さ固定の二分木を「常に自分の視点で最大化する」形で評価する。signは手番を1/-1で表す
static int Negamax(int[] leaves, int depth, int index, int sign)
{
    if (depth == 0) return sign * leaves[index];

    int value = int.MinValue;
    foreach (var child in new[] { index * 2, index * 2 + 1 })
    {
        // 子ノードは相手の視点での最良値なので、符号を反転して自分にとっての結果に変換する
        value = Math.Max(value, -Negamax(leaves, depth - 1, child, -sign));
    }
    return value;
}
```
