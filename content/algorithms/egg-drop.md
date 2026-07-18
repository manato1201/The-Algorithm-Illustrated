---
name: 卵割り問題(Egg Drop Puzzle)
category: 動的計画法
subcategory: ナップサック・組合せ最適化
complexity: O(n・k²)(素朴な実装)
summary: 割れる階数を最小の試行回数で特定する、最悪ケース最適化の古典的DP。
---

## 概要

「n個の卵と、k階建ての建物がある。ある階以上から落とすと卵は割れ、それ未満なら割れない(その境目の階を知りたい)。卵が割れる回数の上限がある中で、**最悪の場合でも**境目の階を特定するのに必要な最小の試行回数は何回か」という、一見パズルのような有名問題。単なる二分探索では解けない点が面白く、「最悪ケースを最小化する」という視点をDPで学べる教材として知られている。

## 仕組み

もし卵が無限にあれば、単純な二分探索(毎回半分の階から落とす)で済む。しかし卵の数に制限があると、卵を1つ割ってしまうリスクを考慮した戦略が必要になる。

`dp[e][t]` を「卵e個、試行回数t回で判別できる最大の階数」と定義すると、逆から考えやすい。

1. ある階からe個の卵のうち1個を落とすとき、結果は2通り:
   - **割れた場合**: 残り卵はe-1個、試行回数はt-1回で、それより下の階を調べる必要がある → `dp[e-1][t-1]` 階分をカバーできる
   - **割れなかった場合**: 卵はe個のまま、試行回数はt-1回で、それより上の階を調べる必要がある → `dp[e][t-1]` 階分をカバーできる
2. これらを合わせると、1回の試行で `dp[e][t] = dp[e-1][t-1] + dp[e][t-1] + 1`(割れた場合の階数 + 割れなかった場合の階数 + 今落とした階自身)だけの階数をカバーできる
3. `dp[e][t] ≥ k` となる最小のtを求めれば、それが答え(必要な最小試行回数)になる

「卵が割れるか割れないか」という2つの未来をどちらも同時に最悪ケースとして見積もる、という発想がこの問題の核心。

## 特性・トレードオフ

- **計算量**: 素朴なDPはO(n・k²)だが、上記の「dp[e][t]がカバーできる階数」という逆転の発想を使うとO(n log k)まで改善できる
- **最悪ケース最適化の教材**: 平均的な試行回数ではなく、「保証できる最悪の試行回数」を最小化するという目的関数が、通常の最短経路問題などとは異なる思考を要求する
- **卵2個の特殊ケース**: 卵がちょうど2個のときは、最初の卵を「等差数列的に」間隔を狭めながら落とす戦略が最適になることが知られており、直感的に理解しやすい入り口になる
- **使いどころ**: 直接の実務応用は少ないが、「限られた試行回数の中でリスクを管理しながら二分探索的に絞り込む」という考え方は、ソフトウェアのバグが混入したコミットを特定する`git bisect`のような、失敗コストが伴う探索の設計に通じるものがある

## 実装例

```python
def egg_drop(eggs: int, floors: int) -> int:
    # dp[e] = 現在の試行回数で、卵e個で判別できる最大の階数
    dp = [0] * (eggs + 1)
    trials = 0
    while dp[eggs] < floors:
        trials += 1
        prev = 0
        for e in range(1, eggs + 1):
            cur = dp[e]
            dp[e] = dp[e] + prev + 1
            prev = cur
    return trials
```

```typescript
function eggDrop(eggs: number, floors: number): number {
  // dp[e] = 現在の試行回数で、卵e個で判別できる最大の階数
  const dp = new Array(eggs + 1).fill(0);
  let trials = 0;
  while (dp[eggs] < floors) {
    trials++;
    let prev = 0;
    for (let e = 1; e <= eggs; e++) {
      const cur = dp[e];
      dp[e] = dp[e] + prev + 1;
      prev = cur;
    }
  }
  return trials;
}
```

```cpp
#include <vector>

int eggDrop(int eggs, int floors) {
    // dp[e] = 現在の試行回数で、卵e個で判別できる最大の階数
    std::vector<int> dp(eggs + 1, 0);
    int trials = 0;
    while (dp[eggs] < floors) {
        trials++;
        int prev = 0;
        for (int e = 1; e <= eggs; e++) {
            int cur = dp[e];
            dp[e] = dp[e] + prev + 1;
            prev = cur;
        }
    }
    return trials;
}
```

```rust
fn egg_drop(eggs: usize, floors: i64) -> i64 {
    // dp[e] = 現在の試行回数で、卵e個で判別できる最大の階数
    let mut dp = vec![0i64; eggs + 1];
    let mut trials = 0i64;
    while dp[eggs] < floors {
        trials += 1;
        let mut prev = 0i64;
        for e in 1..=eggs {
            let cur = dp[e];
            dp[e] = dp[e] + prev + 1;
            prev = cur;
        }
    }
    trials
}
```

```csharp
static int EggDrop(int eggs, int floors)
{
    // dp[e] = 現在の試行回数で、卵e個で判別できる最大の階数
    var dp = new int[eggs + 1];
    int trials = 0;
    while (dp[eggs] < floors)
    {
        trials++;
        int prev = 0;
        for (int e = 1; e <= eggs; e++)
        {
            int cur = dp[e];
            dp[e] = dp[e] + prev + 1;
            prev = cur;
        }
    }
    return trials;
}
```
