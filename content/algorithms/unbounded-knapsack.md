---
name: 完全ナップサック問題(Unbounded Knapsack)
category: 動的計画法
subcategory: ナップサック・組合せ最適化
complexity: O(nW)(nは品物の種類数、Wはナップサックの容量)
summary: 0-1ナップサック問題では各品物が1個しか使えないのに対し、同じ品物を何個でも使ってよいという制約緩和を行った変種で、DPテーブルの走査順序を1箇所変えるだけで解ける、制約の違いがアルゴリズム設計に与える影響を学べる好例。
---

## 概要

[0-1ナップサック問題](/algorithms/knapsack-dp)は「各品物を選ぶか選ばないかの二択」だったが、完全ナップサック問題(Unbounded Knapsack)では「同じ種類の品物を、容量が許す限り何個でも(0個、1個、2個、…と)選んでよい」という制約緩和がなされる。一見すると品物の個数が無限に増える分だけ難しくなりそうだが、実際には[0-1ナップサック問題](/algorithms/knapsack-dp)のDPテーブルを埋める際の走査順序をほんの少し変えるだけで解けてしまう——この「制約が変わるとDPの走査順序がどう変わるべきか」という関係性そのものが、動的計画法を深く理解する上で非常に教育的な題材になっている。

## 仕組み

1. `dp[w]`を「容量`w`のナップサックに詰められる価値の最大値」とする1次元テーブルとする(2次元`dp[i][w]`から1次元に圧縮した形で説明する)
2. [0-1ナップサック問題](/algorithms/knapsack-dp)を1次元DPで解く場合、各品物について容量`w`を**大きい方から小さい方へ**(降順に)更新していく必要がある——これは「同じ品物を2回使ってしまう」ことを防ぐための工夫で、降順に更新すれば`dp[w - weight[i]]`を参照する時点でまだ品物`i`を含まない古い値が使われる
3. 完全ナップサック問題では、逆に容量`w`を**小さい方から大きい方へ**(昇順に)更新する。昇順に更新すると、`dp[w - weight[i]]`を参照する時点で、既にその回の更新で品物`i`が使われた後の新しい値になっている可能性があり、これがまさに「同じ品物を何度でも使ってよい」という制約を自然に反映することになる
4. 各品物`i`(価値`value[i]`、重さ`weight[i]`)について、`w = weight[i]`から`W`まで昇順に`dp[w] = max(dp[w], dp[w - weight[i]] + value[i])`と更新していく
5. 全品物を処理し終えた後の`dp[W]`が、容量`W`での最大価値になる

## 特性・トレードオフ

- **計算量**: [0-1ナップサック問題](/algorithms/knapsack-dp)と全く同じ`O(nW)`(`n`は品物の種類数、`W`は容量)——制約が緩和されているにもかかわらず計算量のオーダーは変わらない、走査順序の変更だけで対応できる点がこの問題の面白さ
- **走査順序が意味を持つという教訓**: 同じ漸化式の形をしていても、DPテーブルをどちらの方向に埋めるかによって「品物を1回しか使わない」問題と「品物を何回でも使える」問題という全く異なる制約を表現できる——動的計画法の実装では、テーブルの更新順序自体がアルゴリズムのロジックの一部であることを端的に示す好例
- **[コイン問題](/algorithms/coin-change)との等価性**: 完全ナップサック問題は、実は「金額の代わりに価値を最大化する[コイン問題](/algorithms/coin-change)」と本質的に同じ構造を持つ——コイン問題は「同じコインを何度でも使ってよい」制約が最初から前提になっているため、昇順更新の完全ナップサックDPそのものと言える
- **使いどころ**: 在庫が無制限にある商品の詰め合わせ最適化、切手の組み合わせ問題、繰り返し使用可能な資源の割り当て計画、[ロッド切断問題](/algorithms/rod-cutting)のような「同じ選択肢を繰り返し使える」最適化問題全般

## 実装例

```python
def unbounded_knapsack(values: list[int], weights: list[int], capacity: int) -> int:
    dp = [0] * (capacity + 1)
    for i in range(len(values)):
        for w in range(weights[i], capacity + 1):
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    return dp[capacity]
```

```typescript
function unboundedKnapsack(values: number[], weights: number[], capacity: number): number {
  const dp = new Array(capacity + 1).fill(0);
  for (let i = 0; i < values.length; i++) {
    for (let w = weights[i]; w <= capacity; w++) {
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
    }
  }
  return dp[capacity];
}
```

```cpp
#include <algorithm>
#include <vector>

int unboundedKnapsack(const std::vector<int>& values, const std::vector<int>& weights, int capacity) {
    std::vector<int> dp(capacity + 1, 0);
    for (size_t i = 0; i < values.size(); i++) {
        for (int w = weights[i]; w <= capacity; w++) {
            dp[w] = std::max(dp[w], dp[w - weights[i]] + values[i]);
        }
    }
    return dp[capacity];
}
```

```rust
fn unbounded_knapsack(values: &[i32], weights: &[i32], capacity: usize) -> i32 {
    let mut dp = vec![0; capacity + 1];
    for i in 0..values.len() {
        let weight = weights[i] as usize;
        for w in weight..=capacity {
            dp[w] = dp[w].max(dp[w - weight] + values[i]);
        }
    }
    dp[capacity]
}
```

```csharp
static int UnboundedKnapsack(int[] values, int[] weights, int capacity)
{
    var dp = new int[capacity + 1];
    for (int i = 0; i < values.Length; i++)
    {
        for (int w = weights[i]; w <= capacity; w++)
        {
            dp[w] = Math.Max(dp[w], dp[w - weights[i]] + values[i]);
        }
    }
    return dp[capacity];
}
```
