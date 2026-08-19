---
name: 桁DP(Digit DP)
category: 動的計画法
subcategory: 数列・部分列
complexity: O(桁数 × 状態数)
summary: 数値を上位桁から1桁ずつ確定させ、上限との一致状態を持つことである範囲内の条件付き整数を数え上げる。
---

## 概要

「1以上N以下の整数のうち、各桁の和がSになるものはいくつあるか」「1以上N以下の整数のうち、'4'を含まないものはいくつあるか」——このように、**非常に大きな範囲(N自体が10^18のような桁になることもある)の中から特定の条件を満たす整数の個数を数える**問題は、Nまで1つずつ数え上げていては到底間に合わない。桁DP(Digit DP)は、整数を「桁の並び(文字列)」として捉え、上位桁から1桁ずつ確定させながらDPを行うことで、この種の「範囲内の条件付き整数の個数」を桁数に対してほぼ線形の計算量で求めるテクニックである。競技プログラミングで頻出する一方、初めて学ぶ際は「なぜこれでNを超えないことが保証されるのか」でつまずきやすい。

## 仕組み

桁DPの核心は、**「これまでに置いた桁が、上限Nの対応する桁と完全に一致しているかどうか」を状態として持つ**ことにある。この状態を`tight`(締まっている)フラグと呼ぶ。

1. 上限Nを文字列(桁の配列)として扱う。例えばN=345なら`['3', '4', '5']`
2. 上位桁から順に、各桁にどの数字(0〜9)を置くかを決めていく再帰(またはDP)を行う。状態は主に次の3つ:
   - `pos`: 今何桁目を決めているか
   - `tight`: これまで置いた桁がNの対応する桁と完全一致しているか(true/false)
   - 問題固有の状態(桁和が知りたいなら「これまでの桁の和」、特定の数字を含むか知りたいなら「含んだかどうかのフラグ」など)
3. `tight = true`のとき、今置ける桁の上限はNのその桁の数字までに制限される(それを超えるとNを超えてしまう)。`tight = false`のときは自由に0〜9のどれでも置ける(すでにNより小さいことが確定しているため)
4. ある桁で「Nのその桁の数字ちょうど」を置けば`tight`は次の桁でも`true`のまま引き継がれ、それより小さい数字を置けば次の桁からは`tight = false`になる
5. 全桁を置き終えた状態(`pos`が桁数に達した状態)が、問題固有の条件(桁和がSと一致するなど)を満たしていれば1通りとしてカウントする
6. 同じ`(pos, tight, 問題固有の状態)`の組み合わせは何度も現れるため、メモ化(通常は`tight = false`の場合のみ、`tight = true`は経路上で高々1通りしか存在しないためメモ化不要)することで計算量を抑える

「1以上N以下」ではなく「A以上B以下」を数えたい場合は、`f(B) - f(A-1)`(0以上B以下の個数から0以上A-1以下の個数を引く)という**累積の差分**に帰着させるのが定石で、これにより「下限も上限もある」という扱いにくい問題を「上限だけがある」問題に単純化できる。

## 特性・トレードオフ

- **計算量**: 桁数をDとすると、`tight = false`の状態でメモ化される部分問題は概ねO(D × 問題固有の状態数)通りしかなく、各遷移で高々10通りの数字を試すため、全体でO(D × 状態数 × 10)程度に収まる。Nが10^18のような桁数18の数でも現実的な時間で解ける
- **「tightを状態に持つ」という発想の一般性**: 単純な範囲カウントだけでなく、「Nを超えない範囲で、ある性質を満たす数を数える」というあらゆる問題に応用できる。桁和、特定の数字の出現回数・禁止、隣接する桁の大小関係など、問題固有の状態を`tight`と組み合わせることで幅広いバリエーションに対応できる
- **メモ化の対象を見極める重要性**: `tight = true`の経路は「今まさにNと同じ数字をなぞっている」唯一の経路であり、桁数分しか存在しないため再利用の必要がない。メモ化テーブルは基本的に`tight = false`の状態だけに絞ることで、無駄なメモリ消費を避けられる
- **使いどころ**: 競技プログラミングにおける「N以下の整数を数える」系の問題全般、特定の数字パターンを含む/含まない電話番号や製品番号の個数のカウント、桁の統計的性質(桁和の分布など)を扱う問題。「表を埋める」典型的なDPとは違い、**探索木を辿りながらメモ化する再帰的DP(いわゆるトップダウンDP)**として実装されることが多い

## 実装例

以下は「1以上N以下の整数のうち、各桁の和がちょうどSになるものの個数」を数える例。

```python
from functools import lru_cache


def count_with_digit_sum(n: int, target_sum: int) -> int:
    digits = list(map(int, str(n)))
    length = len(digits)

    @lru_cache(maxsize=None)
    def dp(pos: int, remaining_sum: int, tight: bool) -> int:
        if remaining_sum < 0:
            return 0
        if pos == length:
            return 1 if remaining_sum == 0 else 0

        limit = digits[pos] if tight else 9
        total = 0
        for d in range(0, limit + 1):
            next_tight = tight and (d == limit)
            total += dp(pos + 1, remaining_sum - d, next_tight)
        return total

    result = dp(0, target_sum, True)
    dp.cache_clear()
    return result
```

```typescript
function countWithDigitSum(n: number, targetSum: number): number {
  const digits = String(n).split("").map(Number);
  const length = digits.length;
  const memo = new Map<string, number>();

  function dp(pos: number, remainingSum: number, tight: boolean): number {
    if (remainingSum < 0) return 0;
    if (pos === length) return remainingSum === 0 ? 1 : 0;

    // tight=trueの経路はメモ化しない(高々length通りしか出現しないため)
    const key = tight ? "" : `${pos}:${remainingSum}`;
    if (!tight && memo.has(key)) return memo.get(key)!;

    const limit = tight ? digits[pos] : 9;
    let total = 0;
    for (let d = 0; d <= limit; d++) {
      const nextTight = tight && d === limit;
      total += dp(pos + 1, remainingSum - d, nextTight);
    }

    if (!tight) memo.set(key, total);
    return total;
  }

  return dp(0, targetSum, true);
}
```

```cpp
#include <string>
#include <vector>
#include <cstring>

int digits_[20];
int length_;
int memo_[20][200];
bool visited_[20][200];

int dp(int pos, int remainingSum, bool tight) {
    if (remainingSum < 0) return 0;
    if (pos == length_) return remainingSum == 0 ? 1 : 0;
    if (!tight && visited_[pos][remainingSum]) return memo_[pos][remainingSum];

    int limit = tight ? digits_[pos] : 9;
    int total = 0;
    for (int d = 0; d <= limit; d++) {
        bool nextTight = tight && (d == limit);
        total += dp(pos + 1, remainingSum - d, nextTight);
    }

    if (!tight) {
        visited_[pos][remainingSum] = true;
        memo_[pos][remainingSum] = total;
    }
    return total;
}

int countWithDigitSum(long long n, int targetSum) {
    std::string s = std::to_string(n);
    length_ = static_cast<int>(s.size());
    for (int i = 0; i < length_; i++) digits_[i] = s[i] - '0';
    std::memset(visited_, 0, sizeof(visited_));
    return dp(0, targetSum, true);
}
```

```rust
use std::collections::HashMap;

fn count_with_digit_sum(n: u64, target_sum: i32) -> u64 {
    let digits: Vec<i32> = n.to_string().chars().map(|c| c.to_digit(10).unwrap() as i32).collect();
    let length = digits.len();
    let mut memo: HashMap<(usize, i32), u64> = HashMap::new();

    fn dp(
        pos: usize,
        remaining_sum: i32,
        tight: bool,
        digits: &[i32],
        length: usize,
        memo: &mut HashMap<(usize, i32), u64>,
    ) -> u64 {
        if remaining_sum < 0 {
            return 0;
        }
        if pos == length {
            return if remaining_sum == 0 { 1 } else { 0 };
        }
        if !tight {
            if let Some(&v) = memo.get(&(pos, remaining_sum)) {
                return v;
            }
        }

        let limit = if tight { digits[pos] } else { 9 };
        let mut total = 0u64;
        for d in 0..=limit {
            let next_tight = tight && d == limit;
            total += dp(pos + 1, remaining_sum - d, next_tight, digits, length, memo);
        }

        if !tight {
            memo.insert((pos, remaining_sum), total);
        }
        total
    }

    dp(0, target_sum, true, &digits, length, &mut memo)
}
```

```csharp
using System.Collections.Generic;

static class DigitDp
{
    public static long CountWithDigitSum(long n, int targetSum)
    {
        var digits = n.ToString();
        int length = digits.Length;
        var memo = new Dictionary<(int, int), long>();

        long Dp(int pos, int remainingSum, bool tight)
        {
            if (remainingSum < 0) return 0;
            if (pos == length) return remainingSum == 0 ? 1 : 0;

            var key = (pos, remainingSum);
            if (!tight && memo.TryGetValue(key, out var cached)) return cached;

            int limit = tight ? digits[pos] - '0' : 9;
            long total = 0;
            for (int d = 0; d <= limit; d++)
            {
                bool nextTight = tight && d == limit;
                total += Dp(pos + 1, remainingSum - d, nextTight);
            }

            if (!tight) memo[key] = total;
            return total;
        }

        return Dp(0, targetSum, true);
    }
}
```
