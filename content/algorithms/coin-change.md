---
name: 硬貨交換問題(コインチェンジ)
category: 動的計画法
subcategory: ナップサック・組合せ最適化
complexity: O(nW)
summary: 目的金額を作る最小枚数(または組み合わせ数)を、部分問題の再利用で求める。
---

## 概要

決まった額面の硬貨(例: 1円、5円、10円、50円)を使って、目的の金額を作るために必要な**最小の硬貨枚数**を求める問題(組み合わせの総数を数える亜種もある)。「大きい額面から貪欲に使えばよいのでは」と直感的に思えるが、それが常に最適とは限らないことを示す好例でもあり、貪欲法とDPの違いを学ぶ教材として広く使われている。

## 仕組み

`dp[w]` を「金額wを作るために必要な最小の硬貨枚数」と定義する。

1. `dp[0] = 0`(金額0を作るには硬貨0枚)で初期化し、それ以外は「まだ求まっていない(無限大)」とする
2. 金額を1から目的の金額まで順に見ていく
3. 各金額wについて、使える各硬貨の額面cを試し、`c ≤ w` であれば `dp[w] = min(dp[w], dp[w - c] + 1)` を計算する(額面cの硬貨を1枚使い、残りw-cを最小枚数で作った場合との比較)
4. 目的の金額に到達したときの `dp[目的金額]` が答えになる

## 特性・トレードオフ

- **計算量**: O(nW)(n=硬貨の種類数、W=目的金額)。0-1ナップサック問題と似た構造だが、こちらは同じ額面の硬貨を何度でも使える点が異なる(ナップサック問題の「無制限版」に近い)
- **貪欲法が通用しない例がある**: 額面が {1, 3, 4} で目的金額が6の場合、貪欲に大きい額面から使うと 4+1+1=3枚になるが、実は 3+3=2枚が最適。**額面の組み合わせによっては貪欲法が最適解を出さない**ため、確実に最小枚数を求めるにはDPが必要になる(ただし日本や米国のような一般的な貨幣制度では、貪欲法でも最適解になることが知られている)
- **組み合わせ数を数える亜種**: 「最小枚数」ではなく「何通りの組み合わせがあるか」を数える場合は漸化式が変わり、硬貨の種類でループを外側に置くか内側に置くかで「順序を区別するか」が変わる、というDPならではの繊細な違いも学べる
- **使いどころ**: おつりの計算、ポイント消費の最適化、切手の組み合わせなど、「決まった単位の組み合わせで目的の量を作る」あらゆる場面

## 実装例

```python
def coin_change(coins: list[int], amount: int) -> int:
    INF = float("inf")
    dp = [0] + [INF] * amount
    for w in range(1, amount + 1):
        for c in coins:
            if c <= w and dp[w - c] + 1 < dp[w]:
                dp[w] = dp[w - c] + 1
    return dp[amount] if dp[amount] != INF else -1
```

```typescript
function coinChange(coins: number[], amount: number): number {
  const INF = Infinity;
  const dp: number[] = new Array(amount + 1).fill(INF);
  dp[0] = 0;
  for (let w = 1; w <= amount; w++) {
    for (const c of coins) {
      if (c <= w && dp[w - c] + 1 < dp[w]) {
        dp[w] = dp[w - c] + 1;
      }
    }
  }
  return dp[amount] === INF ? -1 : dp[amount];
}
```

```cpp
#include <vector>
#include <climits>

int coinChange(const std::vector<int>& coins, int amount) {
    const int INF = INT_MAX / 2;
    std::vector<int> dp(amount + 1, INF);
    dp[0] = 0;
    for (int w = 1; w <= amount; w++) {
        for (int c : coins) {
            if (c <= w && dp[w - c] + 1 < dp[w]) {
                dp[w] = dp[w - c] + 1;
            }
        }
    }
    return dp[amount] >= INF ? -1 : dp[amount];
}
```

```rust
fn coin_change(coins: &[i32], amount: i32) -> i32 {
    const INF: i32 = i32::MAX / 2;
    let amount = amount as usize;
    let mut dp = vec![INF; amount + 1];
    dp[0] = 0;
    for w in 1..=amount {
        for &c in coins {
            let c = c as usize;
            if c <= w && dp[w - c] + 1 < dp[w] {
                dp[w] = dp[w - c] + 1;
            }
        }
    }
    if dp[amount] >= INF { -1 } else { dp[amount] }
}
```

```csharp
static int CoinChange(int[] coins, int amount)
{
    const int INF = int.MaxValue / 2;
    var dp = new int[amount + 1];
    Array.Fill(dp, INF);
    dp[0] = 0;
    for (int w = 1; w <= amount; w++)
    {
        foreach (int c in coins)
        {
            if (c <= w && dp[w - c] + 1 < dp[w])
            {
                dp[w] = dp[w - c] + 1;
            }
        }
    }
    return dp[amount] >= INF ? -1 : dp[amount];
}
```
