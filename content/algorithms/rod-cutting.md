---
name: 棒の切断問題(Rod Cutting)
category: 動的計画法
subcategory: ナップサック・組合せ最適化
complexity: O(n²)
summary: 棒をどう切り分ければ売却額を最大化できるかを、部分問題の組み合わせで求める。
---

## 概要

長さnの棒があり、長さごとに売却価格が決まっている(長さは切り分けても売れるが、長く切り分けるほど単価が高い場合とそうでない場合が混在しうる)とき、**どこで切り分ければ総売却額を最大化できるか**を求める問題。0-1ナップサック問題と並んで、動的計画法の入門書で最初期に登場する定番の題材のひとつ。

## 仕組み

`dp[L]` を「長さLの棒から得られる最大の売却額」と定義する。

1. `dp[0] = 0`(長さ0の棒からは何も得られない)で初期化する
2. 長さを1からnまで順に求めていく
3. 長さLの棒について、**最初の1回の切り口をどこに入れるか**を全通り試す。長さiで切り分けたとすると、その部分の価格 `price[i]` と、残りの長さ(L-i)から得られる最大額 `dp[L-i]` を足したものが候補になる: `dp[L] = max(price[i] + dp[L-i])` (iは1からLまで)
4. 全ての候補の中で最大のものを `dp[L]` として採用する
5. `dp[n]` が最終的な答え

「1回だけ切って、残りは既に解いた小さい問題(dp[L-i])に任せる」という発想により、n通りの切り方の組み合わせを毎回全部試す必要がなくなる。

## 特性・トレードオフ

- **計算量**: O(n²)。各長さLについて、切り口の候補をL通り試すため
- **0-1ナップサック問題との類似性**: 「価格表から最適な組み合わせを選ぶ」という点でナップサック問題と発想が近いが、こちらは「同じ長さの棒を何度でも切り出せる」(重複利用可能)という点が異なり、硬貨交換問題(コインチェンジ)により近い構造を持つ
- **最適な切り方の復元**: 最大額だけでなく実際の切り方(どこで切ったか)を知りたい場合は、各`dp[L]`を計算する際に「どのiを選んだか」も記録しておき、後からたどり直す
- **使いどころ**: 素材の歩留まり最適化(建材や布地をどう切り分ければ無駄が少ないか)、広告枠の分割販売の収益最大化など、「1つのリソースを分割して売る」場面の抽象化

## 実装例

```python
def rod_cutting(prices: list[int]) -> int:
    n = len(prices)
    dp = [0] * (n + 1)
    for length in range(1, n + 1):
        best = 0
        for i in range(1, length + 1):
            best = max(best, prices[i - 1] + dp[length - i])
        dp[length] = best
    return dp[n]
```

```typescript
function rodCutting(prices: number[]): number {
  const n = prices.length;
  const dp: number[] = new Array(n + 1).fill(0);
  for (let length = 1; length <= n; length++) {
    let best = 0;
    for (let i = 1; i <= length; i++) {
      best = Math.max(best, prices[i - 1] + dp[length - i]);
    }
    dp[length] = best;
  }
  return dp[n];
}
```

```cpp
#include <vector>
#include <algorithm>

int rodCutting(const std::vector<int>& prices) {
    int n = static_cast<int>(prices.size());
    std::vector<int> dp(n + 1, 0);
    for (int length = 1; length <= n; length++) {
        int best = 0;
        for (int i = 1; i <= length; i++) {
            best = std::max(best, prices[i - 1] + dp[length - i]);
        }
        dp[length] = best;
    }
    return dp[n];
}
```

```rust
fn rod_cutting(prices: &[i32]) -> i32 {
    let n = prices.len();
    let mut dp = vec![0i32; n + 1];
    for length in 1..=n {
        let mut best = 0;
        for i in 1..=length {
            best = best.max(prices[i - 1] + dp[length - i]);
        }
        dp[length] = best;
    }
    dp[n]
}
```

```csharp
static int RodCutting(int[] prices)
{
    int n = prices.Length;
    var dp = new int[n + 1];
    for (int length = 1; length <= n; length++)
    {
        int best = 0;
        for (int i = 1; i <= length; i++)
        {
            best = Math.Max(best, prices[i - 1] + dp[length - i]);
        }
        dp[length] = best;
    }
    return dp[n];
}
```
