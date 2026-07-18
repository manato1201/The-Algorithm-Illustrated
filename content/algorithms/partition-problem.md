---
name: 集合分割問題(Partition Problem)
category: 動的計画法
subcategory: ナップサック・組合せ最適化
complexity: O(nS)(nは要素数、Sは全要素の合計値)
summary: 与えられた数の集合を、合計値が等しくなる2つの部分集合に分割できるかを判定する問題で、「合計の半分をちょうど作れる部分集合が存在するか」という部分和問題に帰着させることで0-1ナップサックと同じ枠組みで解ける。
---

## 概要

`{1, 5, 11, 5}`のような数の集合が与えられたとき、これを2つのグループに分けて、両方のグループの合計値を等しくできるか(この例では`{1, 5, 5}`と`{11}`でどちらも合計11になる)を判定したい。この問題は一見すると「集合をどう2分割するか」という組み合わせ的な難しさを持つように見えるが、実は「全要素の合計`S`がちょうど半分の`S/2`になるような部分集合が存在するか」という[部分和問題(Subset Sum)](/algorithms/subset-sum)に完全に帰着できる——なぜなら、片方のグループの合計が`S/2`であれば、残り(もう片方のグループ)の合計も自動的に`S/2`になるからである。この帰着に気づけるかどうかが、この問題を解く上での本質的なポイントになっている。

## 仕組み

1. まず全要素の合計`S`を計算する。`S`が奇数であれば、2つの等しい整数値に分割することは不可能なので即座に「不可能」と判定できる
2. `S`が偶数であれば、「合計がちょうど`S/2`になる部分集合が存在するか」という問題に帰着させる——これは[部分和問題](/algorithms/subset-sum)そのものであり、[0-1ナップサック問題](/algorithms/knapsack-dp)の判定版(価値を無視し、重さの合計がちょうど目標値になるかだけを問う)として解ける
3. `dp[i][s]`を「最初の`i`個の要素を使って、合計がちょうど`s`になる部分集合を作れるか」を表すブール値のテーブルとする
4. 各要素`i`について、それを選ばない場合(`dp[i-1][s]`がtrueならtrue)、または選ぶ場合(`s ≥ nums[i]`かつ`dp[i-1][s - nums[i]]`がtrueならtrue)のいずれかが成り立てば`dp[i][s] = true`とする
5. `dp[n][S/2]`が最終的な判定結果になる。1次元配列に圧縮する場合は、[完全ナップサック問題](/algorithms/unbounded-knapsack)とは逆に、容量(この場合は目標和)を大きい方から小さい方へ降順に更新することで、各要素を1回しか使わない制約を守る

## 特性・トレードオフ

- **計算量**: `O(nS)`(`n`は要素数、`S`は全要素の合計)——これは擬多項式時間(pseudo-polynomial time)であり、`S`が要素数`n`に対して指数的に大きい場合(例えば要素の値が非常に大きい場合)は実用的な速度で解けなくなる、[NP困難](/algorithms/knapsack-dp)な問題群に典型的な性質を持つ
- **[部分和問題](/algorithms/subset-sum)への帰着という設計テクニック**: 一見異なる問題設定(2分割 vs 部分集合の存在判定)が、数学的な観察(「半分が決まればもう半分も決まる」)によって同一の計算問題に還元できるという点が、この問題の最大の学びどころであり、動的計画法の問題を解く際の「まず問題を単純な既知の形に変形できないか考える」という一般的な戦略の好例になっている
- **NP困難性との関係**: 一般の集合分割問題(数値が任意の大きさを取りうる場合)は[NP困難](/algorithms/knapsack-dp)であり、多項式時間アルゴリズムは知られていない。この動的計画法による解法はあくまで数値が適度な範囲に収まる場合に実用的な擬多項式時間解法である
- **使いどころ**: マルチプロセッサへのタスク負荷分散(2つのプロセッサへ処理時間の合計が均等になるよう仕事を割り振る)、公平な資産・遺産分割問題、スポーツのチーム分けにおける戦力均衡化

## 実装例

```python
def can_partition(nums: list[int]) -> bool:
    total = sum(nums)
    if total % 2 != 0:
        return False
    target = total // 2
    dp = [False] * (target + 1)
    dp[0] = True
    for num in nums:
        for s in range(target, num - 1, -1):
            if dp[s - num]:
                dp[s] = True
    return dp[target]
```

```typescript
function canPartition(nums: number[]): boolean {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % 2 !== 0) return false;
  const target = total / 2;
  const dp = new Array(target + 1).fill(false);
  dp[0] = true;
  for (const num of nums) {
    for (let s = target; s >= num; s--) {
      if (dp[s - num]) dp[s] = true;
    }
  }
  return dp[target];
}
```

```cpp
#include <numeric>
#include <vector>

bool canPartition(const std::vector<int>& nums) {
    int total = std::accumulate(nums.begin(), nums.end(), 0);
    if (total % 2 != 0) return false;
    int target = total / 2;
    std::vector<bool> dp(target + 1, false);
    dp[0] = true;
    for (int num : nums) {
        for (int s = target; s >= num; s--) {
            if (dp[s - num]) dp[s] = true;
        }
    }
    return dp[target];
}
```

```rust
fn can_partition(nums: &[i32]) -> bool {
    let total: i32 = nums.iter().sum();
    if total % 2 != 0 {
        return false;
    }
    let target = (total / 2) as usize;
    let mut dp = vec![false; target + 1];
    dp[0] = true;
    for &num in nums {
        let num = num as usize;
        for s in (num..=target).rev() {
            if dp[s - num] {
                dp[s] = true;
            }
        }
    }
    dp[target]
}
```

```csharp
using System.Linq;

static bool CanPartition(int[] nums)
{
    int total = nums.Sum();
    if (total % 2 != 0) return false;
    int target = total / 2;
    var dp = new bool[target + 1];
    dp[0] = true;
    foreach (var num in nums)
    {
        for (int s = target; s >= num; s--)
        {
            if (dp[s - num]) dp[s] = true;
        }
    }
    return dp[target];
}
```
