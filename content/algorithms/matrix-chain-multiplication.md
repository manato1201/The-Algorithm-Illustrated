---
name: 行列連鎖積(区間DP)
category: 動的計画法
subcategory: 区間分割DP
complexity: O(n³)
summary: 行列の掛け算の順序を工夫することで、総計算量を最小化する。
---

## 概要

複数の行列を順番に掛け合わせるとき、行列の積は結合法則を満たす(どこから先に計算しても結果は同じ)が、**計算にかかるコストは掛ける順序によって大きく変わる**。例えば10×100の行列と100×5の行列、5×50の行列を掛ける場合、どの2つを先に計算するかで最終的な乗算回数が桁違いに変わることがある。この最適な順序を求める問題が行列連鎖積で、DPの中でも「区間DP」と呼ばれる典型パターンの入門としてよく扱われる。

## 仕組み

`dp[i][j]` を「i番目からj番目までの行列を掛け合わせるのに必要な最小の乗算回数」と定義する。

1. 区間の長さが1(単一の行列)のときは乗算不要なので `dp[i][i] = 0`
2. 区間の長さを2、3、...と広げながら、区間 `[i, j]` の中で「どこで2つのグループに分けるか(分割点k)」を全通り試す
3. 各分割点kについて、`dp[i][k] + dp[k+1][j] + (i番目の行の数 × k番目の列の数 × j番目の列の数)` を計算する(左半分のコスト+右半分のコスト+2つのグループを最後に掛け合わせるコスト)
4. 全ての分割点の中で最小のものを `dp[i][j]` として採用する
5. 最終的に `dp[1][n]` が、全行列を掛け合わせる最小コストになる

「大きな区間の答えを、小さな区間の答えの組み合わせから作る」という発想が区間DPの本質で、この問題はその最もわかりやすい入門例になっている。

## 特性・トレードオフ

- **計算量**: O(n³)。区間の選び方がO(n²)通りあり、それぞれについて分割点をO(n)通り試すため
- **区間DPの典型**: 「区間を分割点で2つに分け、それぞれの最適解を組み合わせる」というこの構造は、他の多くの区間DP問題(最適二分探索木、文字列の最適な結合順序など)にも共通するパターン
- **実際の行列積アルゴリズムとは独立**: この問題が最適化するのは「どの順序で掛けるか」であり、1回1回の行列積自体の計算方法(愚直なO(n³)か、シュトラッセン法のような高速アルゴリズムか)とは別の問題である点に注意
- **使いどころ**: コンパイラの最適化(式の評価順序の決定)、データベースのクエリ最適化(複数テーブルの結合順序)など、「同じ結果を得るための計算順序を最適化する」という発想はソフトウェア工学の随所に現れる

## 実装例

```python
def matrix_chain_order(dims: list[int]) -> int:
    n = len(dims) - 1
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = float("inf")
            for k in range(i, j):
                cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1]
                dp[i][j] = min(dp[i][j], cost)
    return dp[0][n - 1]
```

```typescript
function matrixChainOrder(dims: number[]): number {
  const n = dims.length - 1;
  const dp: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let length = 2; length <= n; length++) {
    for (let i = 0; i + length - 1 < n; i++) {
      const j = i + length - 1;
      dp[i][j] = Infinity;
      for (let k = i; k < j; k++) {
        const cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1];
        if (cost < dp[i][j]) dp[i][j] = cost;
      }
    }
  }
  return dp[0][n - 1];
}
```

```cpp
#include <vector>
#include <limits>
#include <algorithm>

long long matrixChainOrder(const std::vector<int>& dims) {
    int n = static_cast<int>(dims.size()) - 1;
    std::vector<std::vector<long long>> dp(n, std::vector<long long>(n, 0));
    for (int length = 2; length <= n; length++) {
        for (int i = 0; i + length - 1 < n; i++) {
            int j = i + length - 1;
            dp[i][j] = std::numeric_limits<long long>::max();
            for (int k = i; k < j; k++) {
                long long cost = dp[i][k] + dp[k + 1][j] +
                    static_cast<long long>(dims[i]) * dims[k + 1] * dims[j + 1];
                dp[i][j] = std::min(dp[i][j], cost);
            }
        }
    }
    return dp[0][n - 1];
}
```

```rust
fn matrix_chain_order(dims: &[i64]) -> i64 {
    let n = dims.len() - 1;
    let mut dp = vec![vec![0i64; n]; n];
    for length in 2..=n {
        for i in 0..=(n - length) {
            let j = i + length - 1;
            let mut best = i64::MAX;
            for k in i..j {
                let cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1];
                best = best.min(cost);
            }
            dp[i][j] = best;
        }
    }
    dp[0][n - 1]
}
```

```csharp
static long MatrixChainOrder(int[] dims)
{
    int n = dims.Length - 1;
    var dp = new long[n, n];
    for (int length = 2; length <= n; length++)
    {
        for (int i = 0; i + length - 1 < n; i++)
        {
            int j = i + length - 1;
            dp[i, j] = long.MaxValue;
            for (int k = i; k < j; k++)
            {
                long cost = dp[i, k] + dp[k + 1, j] + (long)dims[i] * dims[k + 1] * dims[j + 1];
                if (cost < dp[i, j]) dp[i, j] = cost;
            }
        }
    }
    return dp[0, n - 1];
}
```
