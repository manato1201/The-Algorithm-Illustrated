---
name: 部分和問題(Subset Sum)
category: 動的計画法
subcategory: ナップサック・組合せ最適化
complexity: O(nW)
summary: 与えられた集合から和が目標値になる部分集合が存在するかを判定する、ナップサック問題の姉妹形。
---

## 概要

与えられた数の集合の中から、いくつかを選んで(あるいは選ばずに)合計するとちょうど目標の値になる組み合わせが**存在するかどうか**を判定する問題。0-1ナップサック問題から「価値」の概念を取り除き、「重さ(=値そのもの)がぴったり目標値になるか」だけに注目した、いわば単純化版にあたる。NP完全な問題として知られながら、目標値が大きすぎなければDPで効率的に解ける典型例でもある。

## 仕組み

`dp[i][w]` を「最初のi個の数の中から選んで、合計をちょうどwにできるかどうか(true/false)」と定義する。

1. `dp[0][0] = true`(何も選ばなければ合計0は作れる)、それ以外の `dp[0][w]`(w>0)は全てfalseで初期化する
2. i番目の数を検討するとき、選択肢は2つ:
   - **選ばない**: `dp[i][w] = dp[i-1][w]` がtrueならそのまま引き継ぐ
   - **選ぶ**(i番目の数がw以下の場合のみ): `dp[i-1][w - i番目の数]` がtrueなら、i番目を足すことで合計wが作れる
3. どちらかの選択肢でtrueになれば `dp[i][w] = true`
4. 全ての数・全ての目標値を試したあと、`dp[n][W]` が最終的な判定結果になる(Wは目標値)

0-1ナップサック問題の「価値を最大化する」という最適化を、「作れるか作れないか」という判定(bool値)に置き換えただけの、非常に近い親戚関係にある問題であることがわかる。

## 特性・トレードオフ

- **計算量**: O(nW)(n=数の個数、W=目標値)。**Wが目標値の"大きさ"に比例するため、Wが指数的に大きい(桁数が多い)場合はこの計算量は現実的でなくなる**(擬似多項式時間と呼ばれる所以で、これがNP完全性と矛盾しない理由でもある)
- **メモリ圧縮**: `dp[i][w]`が1つ前の行にしか依存しないため、1次元のブール配列O(W)まで圧縮できる(ただし更新順序をwの大きい方から小さい方へ処理する必要がある点に注意)
- **NP完全性との関係**: 部分和問題自体はNP完全だが、これは「入力の数値の大きさ」を考慮した計算複雑性理論上の分類であり、Wが小さい実用的な範囲では上記のDPで十分高速に解ける
- **使いどころ**: 予算内でぴったり使い切る組み合わせを探す、暗号理論のナップサック暗号(部分和問題の困難さを安全性の根拠にした古典的な暗号方式)、ビットパッキングの最適化など

## 実装例

```python
def subset_sum(nums: list[int], target: int) -> bool:
    n = len(nums)
    dp = [[False] * (target + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = True
    for i in range(1, n + 1):
        for w in range(target + 1):
            dp[i][w] = dp[i - 1][w]
            if nums[i - 1] <= w and dp[i - 1][w - nums[i - 1]]:
                dp[i][w] = True
    return dp[n][target]
```

```typescript
function subsetSum(nums: number[], target: number): boolean {
  const n = nums.length;
  const dp: boolean[][] = Array.from({ length: n + 1 }, () => new Array(target + 1).fill(false));
  for (let i = 0; i <= n; i++) dp[i][0] = true;
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= target; w++) {
      dp[i][w] = dp[i - 1][w];
      if (nums[i - 1] <= w && dp[i - 1][w - nums[i - 1]]) {
        dp[i][w] = true;
      }
    }
  }
  return dp[n][target];
}
```

```cpp
#include <vector>

bool subsetSum(const std::vector<int>& nums, int target) {
    int n = static_cast<int>(nums.size());
    std::vector<std::vector<bool>> dp(n + 1, std::vector<bool>(target + 1, false));
    for (int i = 0; i <= n; i++) dp[i][0] = true;
    for (int i = 1; i <= n; i++) {
        for (int w = 0; w <= target; w++) {
            dp[i][w] = dp[i - 1][w];
            if (nums[i - 1] <= w && dp[i - 1][w - nums[i - 1]]) {
                dp[i][w] = true;
            }
        }
    }
    return dp[n][target];
}
```

```rust
fn subset_sum(nums: &[i32], target: usize) -> bool {
    let n = nums.len();
    let mut dp = vec![vec![false; target + 1]; n + 1];
    for row in dp.iter_mut() {
        row[0] = true;
    }
    for i in 1..=n {
        let num = nums[i - 1] as usize;
        for w in 0..=target {
            dp[i][w] = dp[i - 1][w];
            if num <= w && dp[i - 1][w - num] {
                dp[i][w] = true;
            }
        }
    }
    dp[n][target]
}
```

```csharp
static bool SubsetSum(int[] nums, int target)
{
    int n = nums.Length;
    var dp = new bool[n + 1, target + 1];
    for (int i = 0; i <= n; i++) dp[i, 0] = true;
    for (int i = 1; i <= n; i++)
    {
        for (int w = 0; w <= target; w++)
        {
            dp[i, w] = dp[i - 1, w];
            if (nums[i - 1] <= w && dp[i - 1, w - nums[i - 1]])
            {
                dp[i, w] = true;
            }
        }
    }
    return dp[n, target];
}
```
